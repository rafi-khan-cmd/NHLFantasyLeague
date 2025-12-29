import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('league/:leagueId')
  @UseGuards(JwtAuthGuard)
  async getMessages(@Param('leagueId') leagueId: string, @Query('limit') limit?: string) {
    return this.chatService.getLeagueMessages(leagueId, limit ? parseInt(limit) : 50);
  }

  @Post('league/:leagueId')
  @UseGuards(JwtAuthGuard)
  async sendMessage(
    @Param('leagueId') leagueId: string,
    @Body() body: { message: string; replyToId?: string },
    @Request() req,
  ) {
    return this.chatService.sendMessage(leagueId, req.user.id, body.message, body.replyToId);
  }

  @Post('message/:messageId/pin')
  @UseGuards(JwtAuthGuard)
  async pinMessage(
    @Param('messageId') messageId: string,
    @Body() body: { leagueId: string },
    @Request() req,
  ) {
    return this.chatService.pinMessage(messageId, body.leagueId, req.user.id);
  }

  @Delete('message/:messageId')
  @UseGuards(JwtAuthGuard)
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Query('leagueId') leagueId: string,
    @Request() req,
  ) {
    return this.chatService.deleteMessage(messageId, leagueId, req.user.id);
  }
}

