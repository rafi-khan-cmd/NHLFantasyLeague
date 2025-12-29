import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '../redis/redis.service';
import { MoneyPuckSalaryService } from './moneypuck-salary.service';

interface PlayerStats {
  playerId: number;
  season: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  shots: number;
  hits: number;
  blocks: number;
  pim: number;
  plusMinus: number;
}

@Injectable()
export class PlayerPricingService {
  private readonly logger = new Logger(PlayerPricingService.name);
  private readonly baseUrl = 'https://api-web.nhle.com/v1';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly moneyPuckSalaryService: MoneyPuckSalaryService,
  ) {}

  /**
   * Calculate player price based on last 3 seasons of performance
   * Uses fantasy points formula: goals*3 + assists*2 + shots*0.5 + hits*0.5 + blocks*0.5 + pim*0.25 + plusMinus*0.5
   */
  async calculatePlayerPrice(playerId: number, position: string): Promise<number> {
    const cacheKey = `player:price:${playerId}`;
    
    // Check cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached && typeof cached === 'string') {
      return parseFloat(cached);
    }

    try {
      // Get last 3 seasons of stats
      const currentYear = new Date().getFullYear();
      const seasons = [
        `${currentYear - 1}${currentYear}`,
        `${currentYear - 2}${currentYear - 1}`,
        `${currentYear - 3}${currentYear - 2}`,
      ];

      const stats: PlayerStats[] = [];
      
      for (const season of seasons) {
        try {
          // Try to get player stats for the season
          // Note: NHL API endpoint may vary, using a placeholder approach
          const seasonStats = await this.getPlayerSeasonStats(playerId, season);
          if (seasonStats && seasonStats.gamesPlayed > 0) {
            stats.push(seasonStats);
          }
        } catch (err) {
          // Season might not exist or player didn't play
          this.logger.debug(`No stats for player ${playerId} in season ${season}`);
        }
      }

      if (stats.length === 0) {
        // No historical stats, use default price based on position
        return this.getDefaultPrice(position);
      }

      // Calculate average fantasy points per game over last 3 seasons
      let totalFantasyPoints = 0;
      let totalGames = 0;

      for (const seasonStats of stats) {
        const fantasyPoints = this.calculateFantasyPoints(seasonStats);
        totalFantasyPoints += fantasyPoints;
        totalGames += seasonStats.gamesPlayed;
      }

      const avgFantasyPointsPerGame = totalGames > 0 ? totalFantasyPoints / totalGames : 0;

      // Price formula: $1M per 0.5 fantasy points per game
      // Elite players (2+ PPG) = $4M+, Good players (1-2 PPG) = $2-4M, Average (0.5-1 PPG) = $1-2M
      let price = Math.round(avgFantasyPointsPerGame * 2 * 1000000); // Convert to millions

      // Minimum and maximum prices
      price = Math.max(500000, Math.min(price, 10000000)); // $500K to $10M

      // Position adjustments
      if (position === 'G') {
        // Goalies are typically more expensive
        price = Math.round(price * 1.2);
      }

      // Cache for 24 hours
      await this.redisService.set(cacheKey, price.toString(), 86400);

      return price;
    } catch (error) {
      this.logger.error(`Error calculating price for player ${playerId}:`, error);
      return this.getDefaultPrice(position);
    }
  }

  /**
   * Get player stats for a specific season
   * Note: This is a placeholder - actual NHL API endpoint may differ
   */
  private async getPlayerSeasonStats(
    playerId: number,
    season: string,
  ): Promise<PlayerStats | null> {
    try {
      // Try to get from NHL API - this endpoint structure may need adjustment
      const cacheKey = `player:stats:${playerId}:${season}`;
      const cached = await this.redisService.get(cacheKey);
      
      if (cached && typeof cached === 'string') {
        return JSON.parse(cached);
      }

      // For now, return null - in production, you'd call the actual NHL stats API
      // The NHL API has player stats endpoints but they may require different authentication
      // This is a simplified version that uses default pricing
      
      return null;
    } catch (error) {
      this.logger.error(`Error fetching stats for player ${playerId} season ${season}:`, error);
      return null;
    }
  }

  /**
   * Calculate fantasy points from stats
   */
  private calculateFantasyPoints(stats: PlayerStats): number {
    return (
      stats.goals * 3 +
      stats.assists * 2 +
      stats.shots * 0.5 +
      stats.hits * 0.5 +
      stats.blocks * 0.5 +
      stats.pim * 0.25 +
      stats.plusMinus * 0.5
    );
  }

  /**
   * Get default price based on position when no stats available
   */
  private getDefaultPrice(position: string): number {
    switch (position) {
      case 'F':
        return 2000000; // $2M default for forwards
      case 'D':
        return 1500000; // $1.5M default for defensemen
      case 'G':
        return 3000000; // $3M default for goalies
      default:
        return 2000000;
    }
  }

  /**
   * Get estimated price for a player
   * First tries to get salary from MoneyPuck, then falls back to calculated price
   */
  async getEstimatedPrice(
    playerId: number,
    position: string,
    jerseyNumber: number,
    playerName?: string,
    teamAbbrev?: string,
  ): Promise<number> {
    // Try to get salary from MoneyPuck first
    if (playerName && teamAbbrev) {
      try {
        const salary = await this.moneyPuckSalaryService.getPlayerSalary(
          playerName,
          playerId,
          teamAbbrev,
        );
        if (salary && salary > 0) {
          return salary;
        }
      } catch (error) {
        this.logger.debug(`Could not get MoneyPuck salary for player ${playerId}, using fallback`);
      }
    }

    // Fallback to calculated price based on position and jersey number
    let basePrice = this.getDefaultPrice(position);
    
    // Adjust based on jersey number (lower = typically better/more established)
    if (jerseyNumber <= 20) {
      basePrice = Math.round(basePrice * 1.5); // Higher price for lower jersey numbers
    } else if (jerseyNumber >= 50) {
      basePrice = Math.round(basePrice * 0.8); // Lower price for higher jersey numbers
    }

    return basePrice;
  }
}

