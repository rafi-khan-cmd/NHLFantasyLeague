import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Waiver } from '../rosters/waiver.entity';
import { League } from '../leagues/league.entity';
import { Roster } from '../rosters/roster.entity';
import { RostersService } from '../rosters/rosters.service';

@Injectable()
export class WaiversService {
  private readonly logger = new Logger(WaiversService.name);

  constructor(
    @InjectRepository(Waiver)
    private waiverRepository: Repository<Waiver>,
    @InjectRepository(League)
    private leagueRepository: Repository<League>,
    @InjectRepository(Roster)
    private rosterRepository: Repository<Roster>,
    @Inject(forwardRef(() => RostersService))
    private rostersService: RostersService,
  ) {}

  /**
   * Add a player to waivers when they're dropped
   */
  async addToWaivers(
    leagueId: string,
    nhlPlayerId: number,
    playerName: string,
    position: string,
    nhlTeam: string,
    droppedByRosterId: string,
  ): Promise<Waiver> {
    // Waiver period is 2 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 2);

    const waiver = this.waiverRepository.create({
      leagueId,
      nhlPlayerId,
      playerName,
      position,
      nhlTeam,
      droppedByRosterId,
      waiverExpiresAt: expiresAt,
      status: 'pending',
    });

    return this.waiverRepository.save(waiver);
  }

  /**
   * Claim a player from waivers
   */
  async claimFromWaivers(waiverId: string, rosterId: string, userId: string): Promise<void> {
    const waiver = await this.waiverRepository.findOne({
      where: { id: waiverId },
    });

    if (!waiver) {
      throw new NotFoundException('Waiver not found');
    }

    if (waiver.status !== 'pending') {
      throw new BadRequestException('Player is no longer on waivers');
    }

    if (new Date() > waiver.waiverExpiresAt) {
      throw new BadRequestException('Waiver period has expired');
    }

    // Check if roster can add player (salary cap, roster size, etc.)
    const roster = await this.rosterRepository.findOne({
      where: { id: rosterId },
    });

    if (!roster) {
      throw new NotFoundException('Roster not found');
    }

    if (roster.ownerId !== userId) {
      throw new BadRequestException('You do not own this roster');
    }

    // Add player to roster
    await this.rostersService.addPlayer(
      rosterId,
      {
        nhlPlayerId: waiver.nhlPlayerId,
        playerName: waiver.playerName,
        position: waiver.position,
        nhlTeam: waiver.nhlTeam,
      },
      userId,
    );

    // Update waiver status
    await this.waiverRepository.update(waiverId, {
      status: 'claimed',
      claimedByRosterId: rosterId,
    });
  }

  /**
   * Get all pending waivers for a league
   */
  async getLeagueWaivers(leagueId: string): Promise<Waiver[]> {
    return this.waiverRepository.find({
      where: {
        leagueId,
        status: 'pending',
        waiverExpiresAt: LessThan(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)), // Not expired
      },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Process expired waivers (convert to free agents)
   */
  async processExpiredWaivers(): Promise<void> {
    const expired = await this.waiverRepository.find({
      where: {
        status: 'pending',
        waiverExpiresAt: LessThan(new Date()),
      },
    });

    for (const waiver of expired) {
      await this.waiverRepository.update(waiver.id, {
        status: 'cleared',
      });
    }

    this.logger.log(`Processed ${expired.length} expired waivers`);
  }
}

