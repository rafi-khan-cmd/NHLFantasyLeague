import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Matchup } from './matchup.entity';
import { League } from '../leagues/league.entity';
import { Roster } from '../rosters/roster.entity';
import { ScoringService } from '../scoring/scoring.service';

@Injectable()
export class MatchupsService {
  private readonly logger = new Logger(MatchupsService.name);

  constructor(
    @InjectRepository(Matchup)
    private matchupRepository: Repository<Matchup>,
    @InjectRepository(League)
    private leagueRepository: Repository<League>,
    @InjectRepository(Roster)
    private rosterRepository: Repository<Roster>,
    private scoringService: ScoringService,
  ) {}

  /**
   * Create weekly matchups for a league
   * Uses round-robin scheduling
   */
  async createWeeklyMatchups(leagueId: string, week: number, season: string): Promise<Matchup[]> {
    const league = await this.leagueRepository.findOne({
      where: { id: leagueId },
      relations: ['rosters'],
    });

    if (!league) {
      throw new NotFoundException('League not found');
    }

    if (!league.rosters || league.rosters.length < 2) {
      throw new BadRequestException('League needs at least 2 teams for matchups');
    }

    // Check if matchups already exist for this week
    const existing = await this.matchupRepository.find({
      where: { leagueId, week, season },
    });

    if (existing.length > 0) {
      return existing; // Matchups already created
    }

    // Get week dates (Monday to Sunday)
    const weekStart = this.getWeekStartDate(week, season);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Round-robin scheduling
    const rosters = league.rosters;
    const matchups: Matchup[] = [];

    // Simple round-robin: pair teams up
    for (let i = 0; i < rosters.length; i += 2) {
      if (i + 1 < rosters.length) {
        const matchup = this.matchupRepository.create({
          leagueId,
          week,
          season,
          homeRosterId: rosters[i].id,
          awayRosterId: rosters[i + 1].id,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          status: 'scheduled',
        });
        matchups.push(await this.matchupRepository.save(matchup));
      }
    }

    // If odd number of teams, one team gets a bye
    if (rosters.length % 2 === 1) {
      this.logger.log(`Odd number of teams (${rosters.length}), one team will have a bye week`);
    }

    return matchups;
  }

  /**
   * Get matchups for a league
   */
  async getLeagueMatchups(leagueId: string, week?: number): Promise<Matchup[]> {
    const where: any = { leagueId };
    if (week !== undefined) {
      where.week = week;
    }

    return this.matchupRepository.find({
      where,
      relations: ['homeRoster', 'awayRoster'],
      order: { week: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * Update matchup scores for a week
   */
  async updateMatchupScores(leagueId: string, week: number): Promise<void> {
    const matchups = await this.matchupRepository.find({
      where: { leagueId, week },
      relations: ['homeRoster', 'awayRoster'],
    });

    for (const matchup of matchups) {
      const homeScore = await this.scoringService.getRosterTotalPoints(matchup.homeRosterId);
      const awayScore = await this.scoringService.getRosterTotalPoints(matchup.awayRosterId);

      // Only count points from the matchup week
      const weekStart = matchup.weekStartDate;
      const weekEnd = matchup.weekEndDate;
      
      // Get points for the week (we'll need to filter scoring events by date)
      const homeWeekScore = await this.getRosterPointsForWeek(matchup.homeRosterId, weekStart, weekEnd);
      const awayWeekScore = await this.getRosterPointsForWeek(matchup.awayRosterId, weekStart, weekEnd);

      await this.matchupRepository.update(matchup.id, {
        homeScore: homeWeekScore,
        awayScore: awayWeekScore,
        status: this.isWeekComplete(weekEnd) ? 'completed' : 'in_progress',
      });
    }
  }

  /**
   * Get roster points for a specific week
   */
  private async getRosterPointsForWeek(rosterId: string, weekStart: Date, weekEnd: Date): Promise<number> {
    // This would ideally filter scoring events by date, but for now use total points
    // In a full implementation, we'd filter ScoringEvent by createdAt between weekStart and weekEnd
    return this.scoringService.getRosterTotalPoints(rosterId);
  }

  /**
   * Check if a week is complete (past Sunday)
   */
  private isWeekComplete(weekEnd: Date): boolean {
    const now = new Date();
    return now > weekEnd;
  }

  /**
   * Get week start date (Monday) for a given week number
   */
  private getWeekStartDate(week: number, season: string): Date {
    // For simplicity, calculate from season start (October 1st)
    const seasonYear = parseInt(season.substring(0, 4));
    const seasonStart = new Date(seasonYear, 9, 1); // October 1st (month 9 = October)
    
    // Find the first Monday of October
    while (seasonStart.getDay() !== 1) {
      seasonStart.setDate(seasonStart.getDate() + 1);
    }

    // Add weeks
    seasonStart.setDate(seasonStart.getDate() + (week - 1) * 7);
    return seasonStart;
  }

  /**
   * Get current week number
   */
  getCurrentWeek(season: string): number {
    const seasonYear = parseInt(season.substring(0, 4));
    const seasonStart = new Date(seasonYear, 9, 1); // October 1st
    
    // Find the first Monday
    while (seasonStart.getDay() !== 1) {
      seasonStart.setDate(seasonStart.getDate() + 1);
    }

    const now = new Date();
    const diffTime = now.getTime() - seasonStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7) + 1;

    return Math.max(1, week);
  }
}

