import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '../redis/redis.service';

export interface PlayByPlayEvent {
  eventId: string;
  period: number;
  timeRemaining: string;
  type: string;
  description: string;
  players?: Array<{
    playerId: number;
    name: string;
    role?: string;
  }>;
}

export interface PlayByPlayResponse {
  gameId: number;
  events: PlayByPlayEvent[];
}

export interface BoxscorePlayer {
  playerId: number;
  name: string;
  position: string;
  goals: number;
  assists: number;
  points: number;
  shots: number;
  hits: number;
  blocks: number;
  pim: number;
  plusMinus: number;
  toi: string; // time on ice
  // Goalie-specific stats
  shotsAgainst?: number;
  saves?: number;
  goalsAgainst?: number;
  savePercentage?: number;
}

export interface BoxscoreResponse {
  gameId: number;
  homeTeam: {
    teamAbbrev: string;
    players: BoxscorePlayer[];
  };
  awayTeam: {
    teamAbbrev: string;
    players: BoxscorePlayer[];
  };
}

export interface ScheduleGame {
  id?: number; // Some APIs use 'id' instead of 'gameId'
  gameId?: number;
  gameDate: string;
  gameState?: string;
  homeTeam?: {
    id?: number;
    abbrev?: string;
    name?: string;
    score?: number;
  };
  awayTeam?: {
    id?: number;
    abbrev?: string;
    name?: string;
    score?: number;
  };
  // Fallback for string format
  homeTeamAbbrev?: string;
  awayTeamAbbrev?: string;
  homeScore?: number;
  awayScore?: number;
  startTimeUTC?: string;
}

export interface ScheduleResponse {
  games?: ScheduleGame[];
  // Some APIs return games in different structure
  [key: string]: any;
}

export interface RosterPlayer {
  playerId: number;
  firstName: string;
  lastName: string;
  position: string;
  jerseyNumber: number;
}

export interface RosterResponse {
  teamAbbrev: string;
  season: string;
  players: RosterPlayer[];
}

@Injectable()
export class NhlService {
  private readonly logger = new Logger(NhlService.name);
  private readonly baseUrl: string;
  private readonly rateLimitRequests: number;
  private readonly rateLimitWindowMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.baseUrl = this.configService.get('NHL_API_BASE_URL', 'https://api-web.nhle.com/v1');
    this.rateLimitRequests = parseInt(
      this.configService.get('NHL_API_RATE_LIMIT_REQUESTS', '100'),
    );
    this.rateLimitWindowMs = parseInt(
      this.configService.get('NHL_API_RATE_LIMIT_WINDOW_MS', '60000'),
    );
  }

  /**
   * Check rate limit before making request
   */
  private async checkRateLimit(): Promise<boolean> {
    const key = 'nhl_api:rate_limit';
    const count = await this.redisService.increment(key, Math.ceil(this.rateLimitWindowMs / 1000));
    return count <= this.rateLimitRequests;
  }

  /**
   * Make HTTP request with error handling and caching
   */
  private async makeRequest<T>(
    endpoint: string,
    cacheKey: string,
    ttlSeconds: number,
  ): Promise<T> {
    // Check cache first
    const cached = await this.redisService.get<T>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached;
    }

    // Check rate limit
    const withinLimit = await this.checkRateLimit();
    if (!withinLimit) {
      this.logger.warn('Rate limit exceeded, returning cached data if available');
      throw new Error('Rate limit exceeded');
    }

    try {
      const url = `${this.baseUrl}${endpoint}`;
      this.logger.debug(`Fetching from NHL API: ${url}`);
      
      const response = await firstValueFrom(this.httpService.get<T>(url));
      const data = response.data;

      // Cache the response
      await this.redisService.set(cacheKey, data, ttlSeconds);

      return data;
    } catch (error: any) {
      this.logger.error(`NHL API error for ${endpoint}:`, error.message);
      
      // Try to return stale cache if available
      const staleCache = await this.redisService.get<T>(cacheKey);
      if (staleCache) {
        this.logger.warn('Returning stale cache due to API error');
        return staleCache;
      }

      throw new Error(`NHL API request failed: ${error.message}`);
    }
  }

  /**
   * Get live play-by-play events for a game
   * Most important endpoint for real-time scoring
   */
  async getPlayByPlay(gameId: number): Promise<PlayByPlayResponse> {
    const cacheKey = `nhl:play_by_play:${gameId}`;
    const ttl = parseInt(this.configService.get('CACHE_TTL_PLAY_BY_PLAY', '10'));
    
    return this.makeRequest<PlayByPlayResponse>(
      `/gamecenter/${gameId}/play-by-play`,
      cacheKey,
      ttl,
    );
  }

  /**
   * Get boxscore with player totals for a game
   * Great for end-of-game reconciliation
   */
  async getBoxscore(gameId: number): Promise<BoxscoreResponse> {
    const cacheKey = `nhl:boxscore:${gameId}`;
    const ttl = parseInt(this.configService.get('CACHE_TTL_BOXSCORE', '60'));
    
    const response = await this.makeRequest<any>(
      `/gamecenter/${gameId}/boxscore`,
      cacheKey,
      ttl,
    );

    // Transform NHL API response to our format
    const transformPlayers = (players: any[]): BoxscorePlayer[] => {
      if (!Array.isArray(players)) return [];
      
      return players.map((player: any) => {
        // Handle name field - can be string or object with .default
        const playerName = typeof player.name === 'string' 
          ? player.name 
          : player.name?.default || `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Unknown';
        
        const basePlayer: BoxscorePlayer = {
          playerId: player.playerId || player.id || 0,
          name: playerName,
          position: player.position || player.positionCode || 'F',
          goals: player.goals || 0,
          assists: player.assists || 0,
          points: player.points || (player.goals || 0) + (player.assists || 0),
          shots: player.shots || player.sog || player.shotsOnGoal || 0,
          hits: player.hits || 0,
          blocks: player.blocks || player.blockedShots || 0,
          pim: player.pim || player.penaltyMinutes || 0,
          plusMinus: player.plusMinus || 0,
          toi: player.toi || player.timeOnIce || '0:00',
        };

        // Add goalie-specific stats
        if (player.position === 'G' || player.positionCode === 'G' || basePlayer.position === 'G') {
          basePlayer.shotsAgainst = player.shotsAgainst || 0;
          basePlayer.saves = player.saves || 0;
          basePlayer.goalsAgainst = player.goalsAgainst || 0;
          
          // Calculate save percentage (API returns as decimal like 0.96)
          if (player.savePctg !== undefined) {
            basePlayer.savePercentage = player.savePctg;
          } else if (basePlayer.shotsAgainst && basePlayer.shotsAgainst > 0) {
            basePlayer.savePercentage = basePlayer.saves / basePlayer.shotsAgainst;
          } else {
            basePlayer.savePercentage = 0;
          }
        }

        return basePlayer;
      });
    };

    // Handle NHL API response structure: playerByGameStats.awayTeam/homeTeam with forwards/defense/goalies
    const getHomePlayers = () => {
      const playerStats = response.playerByGameStats?.homeTeam;
      if (!playerStats) return [];
      
      const forwards = Array.isArray(playerStats.forwards) ? playerStats.forwards : [];
      const defense = Array.isArray(playerStats.defense) ? playerStats.defense : [];
      const goalies = Array.isArray(playerStats.goalies) ? playerStats.goalies : [];
      
      return [...forwards, ...defense, ...goalies];
    };

    const getAwayPlayers = () => {
      const playerStats = response.playerByGameStats?.awayTeam;
      if (!playerStats) return [];
      
      const forwards = Array.isArray(playerStats.forwards) ? playerStats.forwards : [];
      const defense = Array.isArray(playerStats.defense) ? playerStats.defense : [];
      const goalies = Array.isArray(playerStats.goalies) ? playerStats.goalies : [];
      
      return [...forwards, ...defense, ...goalies];
    };

    return {
      gameId: response.id || response.gameId || gameId,
      homeTeam: {
        teamAbbrev: response.homeTeam?.abbrev || response.homeTeam?.teamAbbrev || 'HOME',
        players: transformPlayers(getHomePlayers()),
      },
      awayTeam: {
        teamAbbrev: response.awayTeam?.abbrev || response.awayTeam?.teamAbbrev || 'AWAY',
        players: transformPlayers(getAwayPlayers()),
      },
    };
  }

  /**
   * Get team schedule for a season
   * Returns all games (and their IDs) for a team/season
   */
  async getTeamSchedule(teamAbbrev: string, season: string): Promise<ScheduleResponse> {
    const cacheKey = `nhl:schedule:${teamAbbrev}:${season}`;
    const ttl = parseInt(this.configService.get('CACHE_TTL_SCHEDULE', '3600'));
    
    return this.makeRequest<ScheduleResponse>(
      `/club-schedule-season/${teamAbbrev}/${season}`,
      cacheKey,
      ttl,
    );
  }

  /**
   * Get all games for a specific date
   * Format: YYYY-MM-DD
   */
  async getGamesByDate(date: string): Promise<ScheduleGame[]> {
    const cacheKey = `nhl:games:date:${date}`;
    const ttl = parseInt(this.configService.get('CACHE_TTL_SCHEDULE', '3600'));
    
    try {
      // NHL API endpoint for games by date
      const response = await this.makeRequest<any>(
        `/score/${date}`,
        cacheKey,
        ttl,
      );
      
      // Transform response to our format
      if (response.games && Array.isArray(response.games)) {
        return response.games.map((game: any) => ({
          gameId: game.id || game.gameId,
          gameDate: date,
          homeTeam: game.homeTeam?.abbrev || game.homeTeamAbbrev || '',
          awayTeam: game.awayTeam?.abbrev || game.awayTeamAbbrev || '',
          gameState: game.gameState || game.state || 'UNKNOWN',
          homeScore: game.homeTeam?.score || game.homeScore || 0,
          awayScore: game.awayTeam?.score || game.awayScore || 0,
          startTimeUTC: game.startTimeUTC || game.startTime || null,
        }));
      }
      
      return [];
    } catch (error: any) {
      this.logger.error(`Error fetching games for date ${date}:`, error.message);
      // Fallback: try to get from team schedules
      return this.getGamesByDateFallback(date);
    }
  }

  /**
   * Fallback method to get games by checking all team schedules
   */
  private async getGamesByDateFallback(date: string): Promise<ScheduleGame[]> {
    const allTeams = await this.getAllTeams();
    const season = this.getCurrentSeason(new Date(date));
    const games: ScheduleGame[] = [];
    const seenGameIds = new Set<number>();

    // Limit to first 10 teams to avoid too many API calls (can be optimized later)
    const teamsToCheck = allTeams.slice(0, 10);

    for (const team of teamsToCheck) {
      try {
        const schedule = await this.getTeamSchedule(team, season);
        if (schedule.games && Array.isArray(schedule.games)) {
          for (const game of schedule.games) {
            const gameId = game.gameId || game.id;
            if (!gameId) continue;

            const gameDate = new Date(game.gameDate);
            const targetDate = new Date(date);
            
            if (
              this.isSameDay(gameDate, targetDate) &&
              !seenGameIds.has(gameId)
            ) {
              seenGameIds.add(gameId);
              
              // Extract team abbreviations
              const homeTeam = typeof game.homeTeam === 'string' 
                ? game.homeTeam 
                : game.homeTeam?.abbrev || game.homeTeamAbbrev || '';
              const awayTeam = typeof game.awayTeam === 'string' 
                ? game.awayTeam 
                : game.awayTeam?.abbrev || game.awayTeamAbbrev || '';

              games.push({
                gameId: gameId,
                gameDate: game.gameDate || date,
                homeTeam: typeof homeTeam === 'string' ? { abbrev: homeTeam } : homeTeam,
                awayTeam: typeof awayTeam === 'string' ? { abbrev: awayTeam } : awayTeam,
                homeTeamAbbrev: typeof homeTeam === 'string' ? homeTeam : undefined,
                awayTeamAbbrev: typeof awayTeam === 'string' ? awayTeam : undefined,
                gameState: game.gameState || 'UNKNOWN',
                homeScore: typeof game.homeTeam === 'object' ? game.homeTeam?.score : undefined,
                awayScore: typeof game.awayTeam === 'object' ? game.awayTeam?.score : undefined,
                startTimeUTC: game.startTimeUTC || null,
              });
            }
          }
        }
      } catch (error: any) {
        this.logger.warn(`Error checking schedule for team ${team}:`, error.message);
        // Continue with other teams
      }
    }

    this.logger.log(`Found ${games.length} games for date ${date}`);
    return games;
  }

  /**
   * Get current season string
   */
  private getCurrentSeason(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    if (month >= 10) {
      return `${year}${year + 1}`;
    } else {
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
   * Get recent completed games (last 7 days)
   */
  async getRecentCompletedGames(days: number = 7): Promise<Array<{
    date: string;
    games: ScheduleGame[];
  }>> {
    const results: Array<{ date: string; games: ScheduleGame[] }> = [];
    const today = new Date();

    for (let i = days; i >= 1; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const games = await this.getGamesByDate(dateStr);
      const completedGames = games.filter(
        (game) => ['FINAL', 'FINAL_OT', 'FINAL_SO', 'OFF'].includes(game.gameState || ''),
      );

      if (completedGames.length > 0) {
        results.push({
          date: dateStr,
          games: completedGames,
        });
      }
    }

    return results;
  }

  /**
   * Get upcoming games (next N days)
   */
  async getUpcomingGames(days: number = 2): Promise<Array<{
    date: string;
    games: ScheduleGame[];
  }>> {
    const results: Array<{ date: string; games: ScheduleGame[] }> = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const games = await this.getGamesByDate(dateStr);
      const upcomingGames = games.filter(
        (game) => !['FINAL', 'FINAL_OT', 'FINAL_SO', 'OFF'].includes(game.gameState || ''),
      );

      if (games.length > 0) {
        results.push({
          date: dateStr,
          games: games, // Include all games (upcoming and in-progress)
        });
      }
    }

    return results;
  }

  /**
   * Get team roster for a season
   * Used to populate player pool for drafts
   */
  async getTeamRoster(teamAbbrev: string, season: string): Promise<RosterResponse> {
    const cacheKey = `nhl:roster:${teamAbbrev}:${season}`;
    const ttl = parseInt(this.configService.get('CACHE_TTL_ROSTER', '3600'));
    
    const response = await this.makeRequest<any>(
      `/roster/${teamAbbrev}/${season}`,
      cacheKey,
      ttl,
    );

    // Transform NHL API response to our expected format
    // NHL API returns: { forwards: [...], defensemen: [...], goalies: [...] }
    // We need: { players: [{ playerId, firstName, lastName, position, jerseyNumber }] }
    const allPlayers: RosterPlayer[] = [];

    // Process forwards
    if (response.forwards && Array.isArray(response.forwards)) {
      response.forwards.forEach((player: any) => {
        allPlayers.push({
          playerId: player.id,
          firstName: player.firstName?.default || player.firstName || '',
          lastName: player.lastName?.default || player.lastName || '',
          position: this.mapPositionCode(player.positionCode || 'F'),
          jerseyNumber: player.sweaterNumber || 0,
        });
      });
    }

    // Process defensemen
    if (response.defensemen && Array.isArray(response.defensemen)) {
      response.defensemen.forEach((player: any) => {
        allPlayers.push({
          playerId: player.id,
          firstName: player.firstName?.default || player.firstName || '',
          lastName: player.lastName?.default || player.lastName || '',
          position: this.mapPositionCode(player.positionCode || 'D'),
          jerseyNumber: player.sweaterNumber || 0,
        });
      });
    }

    // Process goalies
    if (response.goalies && Array.isArray(response.goalies)) {
      response.goalies.forEach((player: any) => {
        allPlayers.push({
          playerId: player.id,
          firstName: player.firstName?.default || player.firstName || '',
          lastName: player.lastName?.default || player.lastName || '',
          position: this.mapPositionCode(player.positionCode || 'G'),
          jerseyNumber: player.sweaterNumber || 0,
        });
      });
    }

    return {
      teamAbbrev,
      season,
      players: allPlayers,
    };
  }

  /**
   * Map NHL position codes to our format
   * C, L, R, W -> F (Forward)
   * D -> D (Defenseman)
   * G -> G (Goalie)
   */
  private mapPositionCode(positionCode: string): string {
    if (['C', 'L', 'R', 'W'].includes(positionCode)) {
      return 'F';
    }
    if (positionCode === 'D') {
      return 'D';
    }
    if (positionCode === 'G') {
      return 'G';
    }
    return 'F'; // Default to forward
  }

  /**
   * Get the current team for a player by checking all team rosters
   * This ensures we always have the player's current team, even after trades
   */
  async getPlayerCurrentTeam(playerId: number, season?: string): Promise<string | null> {
    const currentSeason = season || this.getCurrentSeason(new Date());
    const allTeams = await this.getAllTeams();

    // Check each team's roster to find where this player currently is
    for (const team of allTeams) {
      try {
        const roster = await this.getTeamRoster(team, currentSeason);
        const player = roster.players.find((p) => p.playerId === playerId);
        if (player) {
          return team; // Found the player on this team
        }
      } catch (error) {
        // Continue checking other teams
        continue;
      }
    }

    return null; // Player not found on any team (might be injured, retired, or in minors)
  }

  /**
   * Get all NHL teams (helper method)
   */
  async getAllTeams(): Promise<string[]> {
    // Common NHL team abbreviations
    return [
      'ana', 'ari', 'bos', 'buf', 'car', 'cbj', 'cgy', 'chi', 'col', 'dal',
      'det', 'edm', 'fla', 'lak', 'min', 'mtl', 'nsh', 'nj', 'nyi', 'nyr',
      'ott', 'phi', 'pit', 'sea', 'sj', 'stl', 'tb', 'tor', 'van', 'vgk', 'wsh', 'wpg',
    ];
  }
}

