import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeagueMessage } from './league-message.entity';
import { League } from '../leagues/league.entity';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(LeagueMessage)
    private messageRepository: Repository<LeagueMessage>,
    @InjectRepository(League)
    private leagueRepository: Repository<League>,
    private redisService: RedisService,
  ) {}

  /**
   * Send a message to a league chat
   */
  async sendMessage(
    leagueId: string,
    userId: string,
    message: string,
    replyToId?: string,
  ): Promise<LeagueMessage> {
    const league = await this.leagueRepository.findOne({
      where: { id: leagueId },
    });

    if (!league) {
      throw new NotFoundException('League not found');
    }

    if (!message.trim()) {
      throw new BadRequestException('Message cannot be empty');
    }

    if (message.length > 1000) {
      throw new BadRequestException('Message too long (max 1000 characters)');
    }

    const leagueMessage = this.messageRepository.create({
      leagueId,
      userId,
      message: message.trim(),
      replyToId: replyToId || null,
    });

    const saved = await this.messageRepository.save(leagueMessage);

    // Publish to Redis for real-time updates
    await this.redisService.publish('chat:message', {
      leagueId,
      message: saved,
    });

    return saved;
  }

  /**
   * Get messages for a league
   */
  async getLeagueMessages(leagueId: string, limit: number = 50): Promise<LeagueMessage[]> {
    return this.messageRepository.find({
      where: { leagueId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Pin/unpin a message (commissioner only)
   */
  async pinMessage(messageId: string, leagueId: string, userId: string): Promise<LeagueMessage> {
    const league = await this.leagueRepository.findOne({
      where: { id: leagueId },
    });

    if (!league) {
      throw new NotFoundException('League not found');
    }

    if (league.commissionerId !== userId) {
      throw new BadRequestException('Only commissioner can pin messages');
    }

    const message = await this.messageRepository.findOne({
      where: { id: messageId, leagueId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    message.isPinned = !message.isPinned;
    return this.messageRepository.save(message);
  }

  /**
   * Delete a message (own message or commissioner)
   */
  async deleteMessage(messageId: string, leagueId: string, userId: string): Promise<void> {
    const league = await this.leagueRepository.findOne({
      where: { id: leagueId },
    });

    if (!league) {
      throw new NotFoundException('League not found');
    }

    const message = await this.messageRepository.findOne({
      where: { id: messageId, leagueId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.userId !== userId && league.commissionerId !== userId) {
      throw new BadRequestException('You can only delete your own messages');
    }

    await this.messageRepository.remove(message);

    // Publish deletion event
    await this.redisService.publish('chat:delete', {
      leagueId,
      messageId,
    });
  }
}

