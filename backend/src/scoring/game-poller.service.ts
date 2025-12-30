import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NhlService } from '../nhl/nhl.service';
import { ScoringService } from './scoring.service';

@Injectable()
export class GamePollerService implements OnModuleInit {
  private readonly logger = new Logger(GamePollerService.name);
  private activeGameIds: Set<number> = new Set();
  private processedGameIds: Set<number> = new Set(); // Games that have ended

  constructor(
    private nhlService: NhlService,
    private scoringService: ScoringService,
  ) {}

  onModuleInit() {
    this.logger.log('Game poller service initialized');
    // Discover today's games on startup
    this.discoverTodaysGames();
  }

  /**
   * Discover games for today and add them to active polling
   * Runs every hour to catch new games
   */
  @Cron('0 * * * *') // Every hour
  async discoverTodaysGames() {
    try {
      this.logger.log('Discovering today\'s NHL games...');
      const today = new Date();
      const season = this.getCurrentSeason(today);
      const allTeams = await this.nhlService.getAllTeams();
      
      const todaysGameIds: number[] = [];

      // Check each team's schedule for today's games
      for (const team of allTeams) {
        try {
          const schedule = await this.nhlService.getTeamSchedule(team, season);
          
          for (const game of schedule.games || []) {
            // Handle different API response formats
            const gameId = game.gameId || game.id;
            if (!gameId) continue;

            const gameDate = new Date(game.gameDate);
            const isToday = this.isSameDay(gameDate, today);
            const gameState = game.gameState || 'UNKNOWN';
            const isActive = ['LIVE', 'IN_PROGRESS', 'PREVIEW', 'PRE_GAME'].includes(gameState);
            const isFinished = ['OFF', 'FINAL', 'FINAL_OT', 'FINAL_SO'].includes(gameState);
            
            const homeTeam = game.homeTeam?.abbrev || game.homeTeamAbbrev || 'HOME';
            const awayTeam = game.awayTeam?.abbrev || game.awayTeamAbbrev || 'AWAY';
            
            if (isToday && (isActive || (!isFinished && !this.processedGameIds.has(gameId)))) {
              if (!this.activeGameIds.has(gameId)) {
                this.activeGameIds.add(gameId);
                todaysGameIds.push(gameId);
                this.logger.log(`Added game ${gameId} (${awayTeam} @ ${homeTeam}) to active polling`);
              }
            } else if (isFinished && this.activeGameIds.has(gameId)) {
              // Game finished, remove from active polling but keep in processed set
              this.activeGameIds.delete(gameId);
              this.processedGameIds.add(gameId);
              this.logger.log(`Game ${gameId} finished, removed from active polling`);
            }
          }
        } catch (error: any) {
          this.logger.warn(`Error checking schedule for team ${team}:`, error.message);
        }
      }

      if (todaysGameIds.length > 0) {
        this.logger.log(`Discovered ${todaysGameIds.length} active games for today`);
      } else {
        this.logger.log('No active games found for today');
      }
    } catch (error: any) {
      this.logger.error('Error discovering today\'s games:', error.message);
    }
  }

  /**
   * Get current NHL season string (e.g., "20232024")
   */
  private getCurrentSeason(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
    
    // NHL season runs from October to June
    // Season format: YYYY(YYYY+1), e.g., 20232024
    if (month >= 10) {
      // October-December: current year to next year
      return `${year}${year + 1}`;
    } else {
      // January-September: previous year to current year
      return `${year - 1}${year}`;
    }
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Poll play-by-play every 5-10 seconds for active games
   */
  @Cron('*/10 * * * * *') // Every 10 seconds (reduced from 5 to be more conservative)
  async pollActiveGames() {
    if (this.activeGameIds.size === 0) {
      return; // No active games
    }

    this.logger.debug(`Polling ${this.activeGameIds.size} active games...`);

    for (const gameId of this.activeGameIds) {
      try {
        await this.scoringService.processGameEvents(gameId);
      } catch (error: any) {
        this.logger.error(`Error polling game ${gameId}:`, error.message);
      }
    }
  }

  /**
   * Process boxscore for finished games (reconciliation)
   * Runs every 5 minutes to catch finished games
   */
  @Cron('*/5 * * * *') // Every 5 minutes
  async reconcileFinishedGames() {
    for (const gameId of this.processedGameIds) {
      try {
        await this.scoringService.reconcileGameFromBoxscore(gameId);
      } catch (error: any) {
        this.logger.error(`Error reconciling game ${gameId}:`, error.message);
      }
    }
  }

  /**
   * Add a game to the active polling list
   */
  addActiveGame(gameId: number) {
    this.activeGameIds.add(gameId);
    this.logger.log(`Added game ${gameId} to active polling`);
  }

  /**
   * Remove a game from the active polling list
   */
  removeActiveGame(gameId: number) {
    this.activeGameIds.delete(gameId);
    this.logger.log(`Removed game ${gameId} from active polling`);
  }

  /**
   * Get all active game IDs
   */
  getActiveGames(): number[] {
    return Array.from(this.activeGameIds);
  }
}

