import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Roster } from '../rosters/roster.entity';
import { RosterPlayer } from '../rosters/roster-player.entity';
import { ScoringEvent } from '../scoring/scoring-event.entity';
import { RosterTransaction } from '../rosters/roster-transaction.entity';
import { ScoringService } from '../scoring/scoring.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Roster)
    private rosterRepository: Repository<Roster>,
    @InjectRepository(RosterPlayer)
    private rosterPlayerRepository: Repository<RosterPlayer>,
    @InjectRepository(ScoringEvent)
    private scoringEventRepository: Repository<ScoringEvent>,
    @InjectRepository(RosterTransaction)
    private transactionRepository: Repository<RosterTransaction>,
    private scoringService: ScoringService,
  ) {}

  /**
   * Get team efficiency metrics (points per dollar spent)
   */
  async getTeamEfficiency(rosterId: string): Promise<{
    rosterId: string;
    teamName: string;
    totalPoints: number;
    totalSalary: number;
    pointsPerDollar: number;
    efficiencyRank: number;
  }> {
    const roster = await this.rosterRepository.findOne({
      where: { id: rosterId },
      relations: ['players'],
    });

    if (!roster) {
      throw new Error('Roster not found');
    }

    const totalPoints = await this.scoringService.getRosterTotalPoints(rosterId);
    const totalSalary = Number(roster.totalSalary || 0);
    const pointsPerDollar = totalSalary > 0 ? totalPoints / (totalSalary / 1000000) : 0; // Points per million dollars

    // Get all rosters for ranking
    const allRosters = await this.rosterRepository.find({
      relations: ['players'],
    });

    const efficiencies = await Promise.all(
      allRosters.map(async (r) => {
        const points = await this.scoringService.getRosterTotalPoints(r.id);
        const salary = Number(r.totalSalary || 0);
        const ppd = salary > 0 ? points / (salary / 1000000) : 0;
        return { rosterId: r.id, pointsPerDollar: ppd };
      }),
    );

    efficiencies.sort((a, b) => b.pointsPerDollar - a.pointsPerDollar);
    const efficiencyRank = efficiencies.findIndex((e) => e.rosterId === rosterId) + 1;

    return {
      rosterId,
      teamName: roster.teamName,
      totalPoints,
      totalSalary,
      pointsPerDollar,
      efficiencyRank,
    };
  }

  /**
   * Get best/worst transactions
   */
  async getTransactionAnalysis(rosterId: string, days: number = 30): Promise<{
    bestAdds: Array<{
      nhlPlayerId: number;
      playerName: string;
      addedDate: Date;
      pointsSinceAdd: number;
      salary: number;
    }>;
    worstDrops: Array<{
      nhlPlayerId: number;
      playerName: string;
      droppedDate: Date;
      pointsSinceDrop: number;
    }>;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const transactions = await this.transactionRepository.find({
      where: {
        rosterId,
        createdAt: Between(cutoffDate, new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    const bestAdds = await Promise.all(
      transactions
        .filter((t) => t.type === 'add')
        .slice(0, 10)
        .map(async (t) => {
          // Get points since this player was added
          const pointsSinceAdd = await this.scoringEventRepository
            .createQueryBuilder('event')
            .select('SUM(event.pointsAwarded)', 'total')
            .where('event.rosterId = :rosterId', { rosterId })
            .andWhere('event.nhlPlayerId = :nhlPlayerId', { nhlPlayerId: t.nhlPlayerId })
            .andWhere('event.createdAt >= :addedDate', { addedDate: t.createdAt })
            .getRawOne();

          const player = await this.rosterPlayerRepository.findOne({
            where: { rosterId, nhlPlayerId: t.nhlPlayerId },
          });

          return {
            nhlPlayerId: t.nhlPlayerId,
            playerName: t.playerName,
            addedDate: t.createdAt,
            pointsSinceAdd: parseFloat(pointsSinceAdd?.total || '0'),
            salary: player ? Number(player.salary || 0) : 0,
          };
        }),
    );

    const worstDrops = await Promise.all(
      transactions
        .filter((t) => t.type === 'drop')
        .slice(0, 10)
        .map(async (t) => {
          // Get points this player scored after being dropped (in other rosters)
          const pointsSinceDrop = await this.scoringEventRepository
            .createQueryBuilder('event')
            .select('SUM(event.pointsAwarded)', 'total')
            .where('event.nhlPlayerId = :nhlPlayerId', { nhlPlayerId: t.nhlPlayerId })
            .andWhere('event.createdAt >= :droppedDate', { droppedDate: t.createdAt })
            .andWhere('event.rosterId != :rosterId', { rosterId })
            .getRawOne();

          return {
            nhlPlayerId: t.nhlPlayerId,
            playerName: t.playerName,
            droppedDate: t.createdAt,
            pointsSinceDrop: parseFloat(pointsSinceDrop?.total || '0'),
          };
        }),
    );

    return {
      bestAdds: bestAdds.sort((a, b) => b.pointsSinceAdd - a.pointsSinceAdd),
      worstDrops: worstDrops.sort((a, b) => b.pointsSinceDrop - a.pointsSinceDrop),
    };
  }

  /**
   * Get projected standings based on current pace
   */
  async getProjectedStandings(leagueId: string): Promise<
    Array<{
      rosterId: string;
      teamName: string;
      currentPoints: number;
      currentRank: number;
      projectedPoints: number;
      projectedRank: number;
      gamesRemaining: number;
    }>
  > {
    const rosters = await this.rosterRepository.find({
      where: { leagueId },
      relations: ['players'],
    });

    // Estimate games remaining (rough estimate: ~82 games per season, assume we're ~20% through)
    const estimatedGamesRemaining = 66; // Rough estimate

    const standings = await Promise.all(
      rosters.map(async (roster) => {
        const currentPoints = await this.scoringService.getRosterTotalPoints(roster.id);
        const currentGames = await this.getRosterGamesPlayed(roster.id);
        const pointsPerGame = currentGames > 0 ? currentPoints / currentGames : 0;
        const projectedPoints = currentPoints + pointsPerGame * estimatedGamesRemaining;

        return {
          rosterId: roster.id,
          teamName: roster.teamName,
          currentPoints,
          currentRank: 0, // Will be set after sorting
          projectedPoints,
          projectedRank: 0, // Will be set after sorting
          gamesRemaining: estimatedGamesRemaining,
        };
      }),
    );

    // Sort by current points for current rank
    standings.sort((a, b) => b.currentPoints - a.currentPoints);
    standings.forEach((s, i) => {
      s.currentRank = i + 1;
    });

    // Sort by projected points for projected rank
    standings.sort((a, b) => b.projectedPoints - a.projectedPoints);
    standings.forEach((s, i) => {
      s.projectedRank = i + 1;
    });

    return standings;
  }

  /**
   * Get player value over replacement (VORP)
   */
  async getPlayerVORP(nhlPlayerId: number, position: 'F' | 'D' | 'G'): Promise<{
    nhlPlayerId: number;
    playerName: string;
    totalPoints: number;
    replacementLevelPoints: number;
    vorp: number;
  }> {
    const player = await this.rosterPlayerRepository.findOne({
      where: { nhlPlayerId },
    });

    if (!player) {
      throw new Error('Player not found');
    }

    const totalPoints = await this.scoringService.getPlayerTotalPoints(nhlPlayerId);

    // Calculate replacement level (average of bottom 20% of players at this position)
    const allPlayers = await this.rosterPlayerRepository
      .createQueryBuilder('rp')
      .where('rp.position = :position', { position })
      .select('DISTINCT rp.nhlPlayerId', 'nhlPlayerId')
      .getRawMany();

    const playerPoints = await Promise.all(
      allPlayers.map(async (p) => ({
        nhlPlayerId: p.nhlPlayerId,
        points: await this.scoringService.getPlayerTotalPoints(p.nhlPlayerId),
      })),
    );

    playerPoints.sort((a, b) => a.points - b.points);
    const bottom20Percent = Math.floor(playerPoints.length * 0.2);
    const replacementPlayers = playerPoints.slice(0, bottom20Percent);
    const replacementLevelPoints =
      replacementPlayers.length > 0
        ? replacementPlayers.reduce((sum, p) => sum + p.points, 0) / replacementPlayers.length
        : 0;

    const vorp = totalPoints - replacementLevelPoints;

    return {
      nhlPlayerId,
      playerName: player.playerName,
      totalPoints,
      replacementLevelPoints,
      vorp,
    };
  }

  /**
   * Helper: Get games played for a roster
   */
  private async getRosterGamesPlayed(rosterId: string): Promise<number> {
    const result = await this.scoringEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.nhlGameId)', 'games')
      .where('event.rosterId = :rosterId', { rosterId })
      .getRawOne();

    return parseInt(result?.games || '0');
  }
}

