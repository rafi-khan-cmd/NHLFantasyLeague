import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
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
    
    // Store code in Redis with 10-minute expiration (if Redis is available)
    // If Redis is disabled, we'll still send the email and log the code
    try {
      await this.redisService.set(cacheKey, code, 600);
    } catch (error) {
      this.logger.warn('⚠️  Redis not available for storing verification code - code will be logged only');
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
    
    try {
      const storedCode = await this.redisService.get(cacheKey);

      if (!storedCode) {
        this.logger.warn(`No verification code found for ${email} (Redis may be unavailable)`);
        // If Redis is unavailable, we can't verify codes - this is a problem
        // For now, we'll return false, but in production without Redis, we need a fallback
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

      // Delete the verification code
      try {
        await this.redisService.del(cacheKey);
      } catch (error) {
        // Ignore Redis errors
      }

      this.logger.log(`✅ Email ${email} verified successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Error verifying code for ${email}:`, error);
      return false;
    }
  }

  /**
   * Check if email is verified
   */
  async isEmailVerified(email: string): Promise<boolean> {
    try {
      const verifiedKey = `email:verified:${email}`;
      const verified = await this.redisService.get(verifiedKey);
      return verified === 'true';
    } catch (error) {
      this.logger.warn('⚠️  Redis not available for checking verification status');
      // If Redis is unavailable, we can't check verification
      // For production without Redis, we might need a database fallback
      return false;
    }
  }

  /**
   * Invalidate verification (after successful registration)
   */
  async invalidateVerification(email: string): Promise<void> {
    const verifiedKey = `email:verified:${email}`;
    await this.redisService.del(verifiedKey);
  }
}

