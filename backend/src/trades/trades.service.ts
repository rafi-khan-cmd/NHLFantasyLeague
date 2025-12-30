import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trade } from './trade.entity';
import { TradePlayer } from './trade-player.entity';
import { League } from '../leagues/league.entity';
import { Roster } from '../rosters/roster.entity';
import { RostersService } from '../rosters/rosters.service';

@Injectable()
export class TradesService {
  private readonly logger = new Logger(TradesService.name);

  constructor(
    @InjectRepository(Trade)
    private tradeRepository: Repository<Trade>,
    @InjectRepository(TradePlayer)
    private tradePlayerRepository: Repository<TradePlayer>,
    @InjectRepository(League)
    private leagueRepository: Repository<League>,
    @InjectRepository(Roster)
    private rosterRepository: Repository<Roster>,
    private rostersService: RostersService,
  ) {}

  /**
   * Propose a trade
   */
  async proposeTrade(
    proposingRosterId: string,
    receivingRosterId: string,
    proposingPlayers: Array<{ nhlPlayerId: number; playerName: string; position: string; nhlTeam: string }>,
    receivingPlayers: Array<{ nhlPlayerId: number; playerName: string; position: string; nhlTeam: string }>,
    message?: string,
    userId?: string,
  ): Promise<Trade> {
    // Verify proposing roster ownership
    const proposingRoster = await this.rosterRepository.findOne({
      where: { id: proposingRosterId },
    });

    if (!proposingRoster) {
      throw new NotFoundException('Proposing roster not found');
    }

    if (userId && proposingRoster.ownerId !== userId) {
      throw new BadRequestException('You do not own the proposing roster');
    }

    // Verify receiving roster exists
    const receivingRoster = await this.rosterRepository.findOne({
      where: { id: receivingRosterId },
    });

    if (!receivingRoster) {
      throw new NotFoundException('Receiving roster not found');
    }

    if (proposingRoster.leagueId !== receivingRoster.leagueId) {
      throw new BadRequestException('Rosters must be in the same league');
    }

    // Verify all players exist on respective rosters
    // TODO: Add validation

    // Create trade
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 2); // Trade expires in 2 days

    const trade = this.tradeRepository.create({
      leagueId: proposingRoster.leagueId,
      proposingRosterId,
      receivingRosterId,
      status: 'pending',
      expiresAt,
      message,
    });

    const savedTrade = await this.tradeRepository.save(trade);

    // Add trade players
    for (const player of proposingPlayers) {
      await this.tradePlayerRepository.save({
        tradeId: savedTrade.id,
        fromRosterId: proposingRosterId,
        toRosterId: receivingRosterId,
        nhlPlayerId: player.nhlPlayerId,
        playerName: player.playerName,
        position: player.position,
        nhlTeam: player.nhlTeam,
      });
    }

    for (const player of receivingPlayers) {
      await this.tradePlayerRepository.save({
        tradeId: savedTrade.id,
        fromRosterId: receivingRosterId,
        toRosterId: proposingRosterId,
        nhlPlayerId: player.nhlPlayerId,
        playerName: player.playerName,
        position: player.position,
        nhlTeam: player.nhlTeam,
      });
    }

    return this.tradeRepository.findOne({
      where: { id: savedTrade.id },
      relations: ['players', 'proposingRoster', 'receivingRoster'],
    });
  }

  /**
   * Accept a trade
   */
  async acceptTrade(tradeId: string, userId: string): Promise<Trade> {
    const trade = await this.tradeRepository.findOne({
      where: { id: tradeId },
      relations: ['players', 'proposingRoster', 'receivingRoster'],
    });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    if (trade.status !== 'pending') {
      throw new BadRequestException('Trade is no longer pending');
    }

    // Verify user owns the receiving roster
    if (trade.receivingRoster.ownerId !== userId) {
      throw new BadRequestException('You can only accept trades sent to you');
    }

    // Execute the trade: move players between rosters
    for (const tradePlayer of trade.players) {
      // Remove player from source roster
      const sourceRoster = await this.rostersService.findOne(tradePlayer.fromRosterId);
      const player = sourceRoster.players.find((p) => p.nhlPlayerId === tradePlayer.nhlPlayerId);
      
      if (player) {
        await this.rostersService.removePlayer(tradePlayer.fromRosterId, player.id, sourceRoster.ownerId);
      }

      // Add player to destination roster
      await this.rostersService.addPlayer(
        tradePlayer.toRosterId,
        {
          nhlPlayerId: tradePlayer.nhlPlayerId,
          playerName: tradePlayer.playerName,
          position: tradePlayer.position,
          nhlTeam: tradePlayer.nhlTeam,
        },
        tradePlayer.toRosterId === trade.proposingRosterId 
          ? trade.proposingRoster.ownerId 
          : trade.receivingRoster.ownerId,
      );
    }

    // Update trade status
    await this.tradeRepository.update(tradeId, {
      status: 'accepted',
    });

    return this.tradeRepository.findOne({
      where: { id: tradeId },
      relations: ['players', 'proposingRoster', 'receivingRoster'],
    });
  }

  /**
   * Reject a trade
   */
  async rejectTrade(tradeId: string, userId: string): Promise<Trade> {
    const trade = await this.tradeRepository.findOne({
      where: { id: tradeId },
    });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    if (trade.receivingRoster.ownerId !== userId) {
      throw new BadRequestException('You can only reject trades sent to you');
    }

    await this.tradeRepository.update(tradeId, {
      status: 'rejected',
    });

    return this.tradeRepository.findOne({
      where: { id: tradeId },
      relations: ['players', 'proposingRoster', 'receivingRoster'],
    });
  }

  /**
   * Get trades for a league
   */
  async getLeagueTrades(leagueId: string): Promise<Trade[]> {
    return this.tradeRepository.find({
      where: { leagueId },
      relations: ['players', 'proposingRoster', 'receivingRoster'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get trades for a specific roster
   */
  async getRosterTrades(rosterId: string): Promise<Trade[]> {
    return this.tradeRepository.find({
      where: [
        { proposingRosterId: rosterId },
        { receivingRosterId: rosterId },
      ],
      relations: ['players', 'proposingRoster', 'receivingRoster'],
      order: { createdAt: 'DESC' },
    });
  }
}

