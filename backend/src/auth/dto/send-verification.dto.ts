import { IsEmail } from 'class-validator';

export class SendVerificationDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

