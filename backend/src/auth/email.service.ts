import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { RedisService } from '../redis/redis.service';
import { EmailVerification } from './email-verification.entity';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
    @InjectRepository(EmailVerification)
    private emailVerificationRepository: Repository<EmailVerification>,
  ) {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com',
      port: parseInt(this.configService.get<string>('SMTP_PORT') || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  /**
   * Generate a 6-digit verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send verification code to email
   */
  async sendVerificationCode(email: string): Promise<string> {
    const code = this.generateVerificationCode();
    const cacheKey = `email:verification:${email}`;
    const expiresAt = new Date(Date.now() + 600 * 1000); // 10 minutes from now
    
    // Store code in Redis with 10-minute expiration (if Redis is available)
    try {
      await this.redisService.set(cacheKey, code, 600);
    } catch (error) {
      this.logger.warn('⚠️  Redis not available for storing verification code - using database only');
    }

    // Store code in database as a fallback (or primary if Redis is unavailable)
    try {
      // Delete any old codes for this email first
      await this.emailVerificationRepository.delete({ email });
      await this.emailVerificationRepository.save({ email, code, expiresAt });
      this.logger.log(`✅ Verification code stored in database for ${email}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to store verification code in database for ${email}:`, error.message);
      // If DB fails, we can't proceed with verification, so re-throw
      throw new Error('Failed to store verification code. Please try again.');
    }

    // Try to send email
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (smtpUser && smtpPass) {
      try {
        await this.transporter.sendMail({
          from: `"NHL Fantasy League" <${smtpUser}>`,
          to: email,
          subject: 'NHL Fantasy League - Email Verification',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #003e7e 0%, #c8102e 100%); color: white; border-radius: 10px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: white; margin: 0;">🏒 NHL Fantasy League</h1>
              </div>
              <div style="background: rgba(255, 255, 255, 0.1); padding: 30px; border-radius: 8px; backdrop-filter: blur(10px);">
                <h2 style="color: white; margin-top: 0;">Email Verification</h2>
                <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6;">
                  Thank you for signing up! Please use the verification code below to complete your registration:
                </p>
                <div style="background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
                  <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: white; font-family: 'Courier New', monospace;">
                    ${code}
                  </div>
                </div>
                <p style="color: #e0e0e0; font-size: 14px; margin-top: 20px;">
                  This code will expire in <strong>10 minutes</strong>.
                </p>
                <p style="color: #e0e0e0; font-size: 12px; margin-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 20px;">
                  If you didn't request this code, please ignore this email.
                </p>
              </div>
            </div>
          `,
        });
        this.logger.log(`✅ Verification email sent to ${email}`);
      } catch (error: any) {
        this.logger.error(`❌ Failed to send email to ${email}:`, error.message);
        // Fallback: log to console if email fails
        this.logger.log(`📧 Verification code for ${email}: ${code} (email sending failed, check server logs)`);
      }
    } else {
      // No SMTP configured, log to console
      this.logger.log(`📧 Verification code for ${email}: ${code}`);
      this.logger.warn(`⚠️  SMTP not configured. Add SMTP_USER and SMTP_PASS to .env to enable email sending.`);
    }

    return code;
  }

  /**
   * Verify the code for an email
   */
  async verifyCode(email: string, code: string): Promise<boolean> {
    const cacheKey = `email:verification:${email}`;
    let storedCode: string | null = null;

    // Try fetching from Redis first
    try {
      storedCode = await this.redisService.get(cacheKey);
    } catch (error) {
      this.logger.warn('⚠️  Redis not available for fetching verification code');
    }

    // If not in Redis or Redis failed, try fetching from database
    if (!storedCode) {
      try {
        const dbVerification = await this.emailVerificationRepository.findOne({
          where: { email },
        });
        if (dbVerification && dbVerification.expiresAt && dbVerification.expiresAt > new Date()) {
          storedCode = dbVerification.code;
        } else if (dbVerification) {
          // Code expired in DB, delete it
          await this.emailVerificationRepository.delete({ email });
        }
      } catch (error: any) {
        this.logger.error(`Error fetching verification code from database:`, error.message);
      }
    }

    if (!storedCode) {
      this.logger.warn(`No active verification code found for ${email}`);
      return false;
    }

    if (storedCode !== code) {
      this.logger.warn(`Invalid verification code for ${email}`);
      return false;
    }

    // Code is valid, mark email as verified (store for 30 minutes)
    const verifiedKey = `email:verified:${email}`;
    try {
      await this.redisService.set(verifiedKey, 'true', 1800);
    } catch (error) {
      this.logger.warn('⚠️  Redis not available for storing verification status');
    }

    // Store verified status in database
    try {
      const dbVerification = await this.emailVerificationRepository.findOne({
        where: { email },
      });
      if (dbVerification) {
        // Mark as verified and update expiresAt to 30 minutes from now
        dbVerification.verified = true;
        dbVerification.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        await this.emailVerificationRepository.save(dbVerification);
      }
    } catch (error: any) {
      this.logger.error(`Error storing verified status in database:`, error.message);
    }

    // Delete the verification code from both Redis and DB
    try {
      await this.redisService.del(cacheKey);
    } catch (error) {
      // Ignore Redis errors
    }

    this.logger.log(`✅ Email ${email} verified successfully`);
    return true;
  }

  /**
   * Check if email is verified
   */
  async isEmailVerified(email: string): Promise<boolean> {
    // Check Redis first
    const redisClient = this.redisService.getClient();
    if (redisClient && redisClient.status === 'ready') {
      try {
        const verifiedKey = `email:verified:${email}`;
        const verified = await this.redisService.get(verifiedKey);
        if (verified === 'true') {
          return true;
        }
      } catch (error) {
        // Redis failed, check database
      }
    }
    
    // Check database as fallback
    try {
      const dbVerification = await this.emailVerificationRepository.findOne({
        where: { email, verified: true },
        order: { createdAt: 'DESC' },
      });
      
      // Check if verification is recent (within last 30 minutes)
      if (dbVerification && dbVerification.expiresAt) {
        const now = new Date();
        if (dbVerification.expiresAt > now) {
          return true;
        }
      }
    } catch (error: any) {
      this.logger.error(`Error checking database for verification status:`, error.message);
    }
    
    return false;
  }

  /**
   * Invalidate verification (after successful registration)
   */
  async invalidateVerification(email: string): Promise<void> {
    // Delete from Redis
    const redisClient = this.redisService.getClient();
    if (redisClient && redisClient.status === 'ready') {
      try {
        const verifiedKey = `email:verified:${email}`;
        await this.redisService.del(verifiedKey);
      } catch (error) {
        // Ignore Redis errors
      }
    }
    
    // Delete from database
    try {
      await this.emailVerificationRepository.delete({ email });
    } catch (error: any) {
      this.logger.error(`Error deleting verification from database:`, error.message);
    }
  }
}

