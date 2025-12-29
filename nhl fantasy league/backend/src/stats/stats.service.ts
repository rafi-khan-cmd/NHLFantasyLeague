import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RosterPlayer } from '../rosters/roster-player.entity';
import { ScoringEvent } from '../scoring/scoring-event.entity';
import { RosterTransaction } from '../rosters/roster-transaction.entity';
import { Roster } from '../rosters/roster.entity';
import { ScoringService } from '../scoring/scoring.service';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    @InjectRepository(RosterPlayer)
    private rosterPlayerRepository: Repository<RosterPlayer>,
    @InjectRepository(ScoringEvent)
    private scoringEventRepository: Repository<ScoringEvent>,
    @InjectRepository(RosterTransaction)
    private transactionRepository: Repository<RosterTransaction>,
    @InjectRepository(Roster)
    private rosterRepository: Repository<Roster>,
    private scoringService: ScoringService,
  ) {}

  /**
   * Get player performance trends (last 7/14/30 days)
   */
  async getPlayerTrends(nhlPlayerId: number, days: number = 7): Promise<{
    totalPoints: number;
    gamesPlayed: number;
    pointsPerGame: number;
    events: Array<{ date: string; points: number; eventType: string }>;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const events = await this.scoringEventRepository
      .createQueryBuilder('event')
      .where('event.nhlPlayerId = :nhlPlayerId', { nhlPlayerId })
      .andWhere('event.createdAt >= :cutoffDate', { cutoffDate })
      .orderBy('event.createdAt', 'ASC')
      .getMany();

    const totalPoints = events.reduce((sum, e) => sum + (e.pointsAwarded || 0), 0);
    const gamesPlayed = new Set(events.map((e) => e.nhlGameId)).size;
    const pointsPerGame = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0;

    const eventsByDate = events.map((e) => ({
      date: e.createdAt.toISOString().split('T')[0],
      points: e.pointsAwarded || 0,
      eventType: e.eventType,
    }));

    return {
      totalPoints,
      gamesPlayed,
      pointsPerGame,
      events: eventsByDate,
    };
  }

  /**
   * Get position rankings (top players by position)
   */
  async getPositionRankings(position: 'F' | 'D' | 'G', limit: number = 20): Promise<
    Array<{
      nhlPlayerId: number;
      playerName: string;
      totalPoints: number;
      gamesPlayed: number;
      pointsPerGame: number;
      rosterCount: number; // How many rosters have this player
    }>
  > {
    const players = await this.rosterPlayerRepository
      .createQueryBuilder('rp')
      .where('rp.position = :position', { position })
      .select('rp.nhlPlayerId', 'nhlPlayerId')
      .addSelect('rp.playerName', 'playerName')
      .addSelect('COUNT(DISTINCT rp.id)', 'rosterCount')
      .groupBy('rp.nhlPlayerId')
      .addGroupBy('rp.playerName')
      .getRawMany();

    const rankings = await Promise.all(
      players.map(async (player) => {
        const totalPoints = await this.scoringService.getPlayerTotalPoints(player.nhlPlayerId);
        const gamesPlayed = await this.getPlayerGamesPlayed(player.nhlPlayerId);
        const pointsPerGame = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0;

        return {
          nhlPlayerId: player.nhlPlayerId,
          playerName: player.playerName,
          totalPoints,
          gamesPlayed,
          pointsPerGame,
          rosterCount: parseInt(player.rosterCount) || 0,
        };
      }),
    );

    return rankings.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, limit);
  }

  /**
   * Get most added/dropped players
   */
  async getTransactionTrends(days: number = 7): Promise<{
    mostAdded: Array<{ nhlPlayerId: number; playerName: string; count: number }>;
    mostDropped: Array<{ nhlPlayerId: number; playerName: string; count: number }>;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const adds = await this.transactionRepository
      .createQueryBuilder('t')
      .where('t.type = :type', { type: 'add' })
      .andWhere('t.createdAt >= :cutoffDate', { cutoffDate })
      .select('t.nhlPlayerId', 'nhlPlayerId')
      .addSelect('t.playerName', 'playerName')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.nhlPlayerId')
      .addGroupBy('t.playerName')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    const drops = await this.transactionRepository
      .createQueryBuilder('t')
      .where('t.type = :type', { type: 'drop' })
      .andWhere('t.createdAt >= :cutoffDate', { cutoffDate })
      .select('t.nhlPlayerId', 'nhlPlayerId')
      .addSelect('t.playerName', 'playerName')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.nhlPlayerId')
      .addGroupBy('t.playerName')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      mostAdded: adds.map((a) => ({
        nhlPlayerId: a.nhlPlayerId,
        playerName: a.playerName,
        count: parseInt(a.count) || 0,
      })),
      mostDropped: drops.map((d) => ({
        nhlPlayerId: d.nhlPlayerId,
        playerName: d.playerName,
        count: parseInt(d.count) || 0,
      })),
    };
  }

  /**
   * Get hot/cold streaks
   */
  async getPlayerStreaks(days: number = 7): Promise<{
    hot: Array<{ nhlPlayerId: number; playerName: string; recentPoints: number; avgPoints: number }>;
    cold: Array<{ nhlPlayerId: number; playerName: string; recentPoints: number; avgPoints: number }>;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get all players with recent activity
    const recentEvents = await this.scoringEventRepository
      .createQueryBuilder('event')
      .where('event.createdAt >= :cutoffDate', { cutoffDate })
      .select('event.nhlPlayerId', 'nhlPlayerId')
      .addSelect('SUM(event.pointsAwarded)', 'recentPoints')
      .groupBy('event.nhlPlayerId')
      .getRawMany();

    const streaks = await Promise.all(
      recentEvents.map(async (recent) => {
        const totalPoints = await this.scoringService.getPlayerTotalPoints(recent.nhlPlayerId);
        const gamesPlayed = await this.getPlayerGamesPlayed(recent.nhlPlayerId);
        const avgPoints = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0;
        const recentPoints = parseFloat(recent.recentPoints) || 0;

        const player = await this.rosterPlayerRepository.findOne({
          where: { nhlPlayerId: recent.nhlPlayerId },
        });

        return {
          nhlPlayerId: recent.nhlPlayerId,
          playerName: player?.playerName || 'Unknown',
          recentPoints,
          avgPoints,
        };
      }),
    );

    // Hot: recent points > average
    const hot = streaks
      .filter((s) => s.recentPoints > s.avgPoints)
      .sort((a, b) => b.recentPoints - a.recentPoints)
      .slice(0, 10);

    // Cold: recent points < average
    const cold = streaks
      .filter((s) => s.recentPoints < s.avgPoints && s.avgPoints > 0)
      .sort((a, b) => a.recentPoints - b.recentPoints)
      .slice(0, 10);

    return { hot, cold };
  }

  /**
   * Helper: Get total games played for a player
   */
  private async getPlayerGamesPlayed(nhlPlayerId: number): Promise<number> {
    const result = await this.scoringEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.nhlGameId)', 'games')
      .where('event.nhlPlayerId = :nhlPlayerId', { nhlPlayerId })
      .getRawOne();

    return parseInt(result?.games || '0');
  }

  /**
   * Get all player statistics for the dashboard
   */
  async getPlayerDashboard(): Promise<{
    topForwards: Array<{
      nhlPlayerId: number;
      playerName: string;
      totalPoints: number;
      gamesPlayed: number;
      pointsPerGame: number;
      rosterCount: number;
    }>;
    topDefensemen: Array<{
      nhlPlayerId: number;
      playerName: string;
      totalPoints: number;
      gamesPlayed: number;
      pointsPerGame: number;
      rosterCount: number;
    }>;
    topGoalies: Array<{
      nhlPlayerId: number;
      playerName: string;
      totalPoints: number;
      gamesPlayed: number;
      pointsPerGame: number;
      rosterCount: number;
    }>;
    transactionTrends: {
      mostAdded: Array<{ nhlPlayerId: number; playerName: string; count: number }>;
      mostDropped: Array<{ nhlPlayerId: number; playerName: string; count: number }>;
    };
    streaks: {
      hot: Array<{ nhlPlayerId: number; playerName: string; recentPoints: number; avgPoints: number }>;
      cold: Array<{ nhlPlayerId: number; playerName: string; recentPoints: number; avgPoints: number }>;
    };
  }> {
    const [topForwards, topDefensemen, topGoalies, transactionTrends, streaks] = await Promise.all([
      this.getPositionRankings('F', 20),
      this.getPositionRankings('D', 20),
      this.getPositionRankings('G', 20),
      this.getTransactionTrends(7),
      this.getPlayerStreaks(7),
    ]);

    return {
      topForwards,
      topDefensemen,
      topGoalies,
      transactionTrends,
      streaks,
    };
  }
}

