import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { League } from '../leagues/league.entity';
import { Roster } from '../rosters/roster.entity';
import { RosterPlayer } from '../rosters/roster-player.entity';
import { ScoringEvent } from '../scoring/scoring-event.entity';
import { RosterTransaction } from '../rosters/roster-transaction.entity';
import { ScoringService } from '../scoring/scoring.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(League)
    private leagueRepository: Repository<League>,
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
   * Generate weekly league report
   */
  async getWeeklyReport(leagueId: string, weekStart?: Date): Promise<{
    week: { start: Date; end: Date };
    leagueName: string;
    bestPerformers: Array<{
      rosterId: string;
      teamName: string;
      points: number;
      rank: number;
    }>;
    worstPerformers: Array<{
      rosterId: string;
      teamName: string;
      points: number;
      rank: number;
    }>;
    playerOfTheWeek: {
      nhlPlayerId: number;
      playerName: string;
      points: number;
      rosterCount: number;
    } | null;
    transactionSummary: {
      totalAdds: number;
      totalDrops: number;
      mostActiveTeam: {
        rosterId: string;
        teamName: string;
        transactions: number;
      } | null;
    };
    powerRankings: Array<{
      rosterId: string;
      teamName: string;
      rank: number;
      points: number;
      trend: 'up' | 'down' | 'same';
    }>;
    upcomingDeadlines: {
      transactionDeadline: Date | null;
      nextGameDay: Date | null;
    };
  }> {
    const league = await this.leagueRepository.findOne({
      where: { id: leagueId },
    });

    if (!league) {
      throw new Error('League not found');
    }

    // Calculate week dates (Monday to Sunday)
    const start = weekStart || this.getWeekStartDate(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const rosters = await this.rosterRepository.find({
      where: { leagueId },
      relations: ['players'],
    });

    // Get points for this week for each roster
    const rosterPoints = await Promise.all(
      rosters.map(async (roster) => {
        const points = await this.getRosterPointsForWeek(roster.id, start, end);
        return {
          rosterId: roster.id,
          teamName: roster.teamName,
          points,
        };
      }),
    );

    rosterPoints.sort((a, b) => b.points - a.points);

    const bestPerformers = rosterPoints.slice(0, 3).map((r, i) => ({
      ...r,
      rank: i + 1,
    }));

    const worstPerformers = rosterPoints.slice(-3).reverse().map((r, i) => ({
      ...r,
      rank: rosterPoints.length - 2 + i,
    }));

    // Player of the week
    const weekEvents = await this.scoringEventRepository.find({
      where: {
        leagueId,
        createdAt: Between(start, end),
      },
    });

    const playerPoints = new Map<number, number>();
    const playerNames = new Map<number, string>();

    for (const event of weekEvents) {
      const current = playerPoints.get(event.nhlPlayerId) || 0;
      playerPoints.set(event.nhlPlayerId, current + (event.pointsAwarded || 0));

      if (!playerNames.has(event.nhlPlayerId)) {
        const player = await this.rosterPlayerRepository.findOne({
          where: { nhlPlayerId: event.nhlPlayerId },
        });
        if (player) {
          playerNames.set(event.nhlPlayerId, player.playerName);
        }
      }
    }

    let playerOfTheWeek: {
      nhlPlayerId: number;
      playerName: string;
      points: number;
      rosterCount: number;
    } | null = null;

    if (playerPoints.size > 0) {
      const topPlayer = Array.from(playerPoints.entries())
        .sort((a, b) => b[1] - a[1])[0];

      const rosterCount = await this.rosterPlayerRepository.count({
        where: { nhlPlayerId: topPlayer[0] },
      });

      playerOfTheWeek = {
        nhlPlayerId: topPlayer[0],
        playerName: playerNames.get(topPlayer[0]) || 'Unknown',
        points: topPlayer[1],
        rosterCount,
      };
    }

    // Transaction summary
    const rosterIds = rosters.map((r) => r.id);
    const weekTransactions = rosterIds.length > 0
      ? await this.transactionRepository.find({
          where: {
            rosterId: In(rosterIds),
            createdAt: Between(start, end),
          },
        })
      : [];

    const adds = weekTransactions.filter((t) => t.type === 'add').length;
    const drops = weekTransactions.filter((t) => t.type === 'drop').length;

    const teamTransactionCounts = new Map<string, number>();
    for (const t of weekTransactions) {
      const current = teamTransactionCounts.get(t.rosterId) || 0;
      teamTransactionCounts.set(t.rosterId, current + 1);
    }

    let mostActiveTeam: { rosterId: string; teamName: string; transactions: number } | null = null;
    if (teamTransactionCounts.size > 0) {
      const topTeam = Array.from(teamTransactionCounts.entries()).sort((a, b) => b[1] - a[1])[0];
      const roster = rosters.find((r) => r.id === topTeam[0]);
      if (roster) {
        mostActiveTeam = {
          rosterId: roster.id,
          teamName: roster.teamName,
          transactions: topTeam[1],
        };
      }
    }

    // Power rankings (compare to previous week)
    const prevWeekStart = new Date(start);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(prevWeekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() + 6);

    const powerRankings = await Promise.all(
      rosters.map(async (roster) => {
        const currentPoints = await this.getRosterPointsForWeek(roster.id, start, end);
        const prevPoints = await this.getRosterPointsForWeek(roster.id, prevWeekStart, prevWeekEnd);

        let trend: 'up' | 'down' | 'same' = 'same';
        if (currentPoints > prevPoints) trend = 'up';
        else if (currentPoints < prevPoints) trend = 'down';

        return {
          rosterId: roster.id,
          teamName: roster.teamName,
          rank: 0, // Will be set after sorting
          points: currentPoints,
          trend,
        };
      }),
    );

    powerRankings.sort((a, b) => b.points - a.points);
    powerRankings.forEach((r, i) => {
      r.rank = i + 1;
    });

    // Upcoming deadlines
    const today = new Date();
    const nextSunday = this.getNextSunday(today);
    const nextGameDay = this.getNextGameDay(today);

    return {
      week: { start, end },
      leagueName: league.name,
      bestPerformers,
      worstPerformers,
      playerOfTheWeek,
      transactionSummary: {
        totalAdds: adds,
        totalDrops: drops,
        mostActiveTeam,
      },
      powerRankings,
      upcomingDeadlines: {
        transactionDeadline: league.settings?.transactionDeadline === 'sunday' ? nextSunday : null,
        nextGameDay,
      },
    };
  }

  /**
   * Helper: Get roster points for a specific week
   */
  private async getRosterPointsForWeek(
    rosterId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<number> {
    const result = await this.scoringEventRepository
      .createQueryBuilder('event')
      .select('SUM(event.pointsAwarded)', 'total')
      .where('event.rosterId = :rosterId', { rosterId })
      .andWhere('event.createdAt >= :weekStart', { weekStart })
      .andWhere('event.createdAt <= :weekEnd', { weekEnd })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  /**
   * Helper: Get week start date (Monday)
   */
  private getWeekStartDate(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /**
   * Helper: Get next Sunday
   */
  private getNextSunday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? 7 : 7 - day;
    const sunday = new Date(d.setDate(d.getDate() + diff));
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  }

  /**
   * Helper: Get next game day (simplified - returns next day for now)
   */
  private getNextGameDay(date: Date): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    next.setHours(19, 0, 0, 0); // 7 PM typical game time
    return next;
  }
}

