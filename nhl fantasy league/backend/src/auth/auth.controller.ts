import { Controller, Post, Body, Get, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendVerificationDto } from './dto/send-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailService } from './email.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Post('send-verification')
  async sendVerification(@Body() dto: SendVerificationDto) {
    // Check if email is already registered
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('This email is already registered');
    }

    await this.emailService.sendVerificationCode(dto.email);
    return {
      message: 'Verification code sent to your email. Please check your inbox.',
      // In development, the code is logged to server console
    };
  }

  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const isValid = await this.emailService.verifyCode(dto.email, dto.code);
    
    if (!isValid) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    return {
      message: 'Email verified successfully. You can now complete registration.',
      verified: true,
    };
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return req.user;
  }
}

