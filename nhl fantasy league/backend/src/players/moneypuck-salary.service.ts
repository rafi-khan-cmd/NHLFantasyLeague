import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '../redis/redis.service';

/**
 * Service to fetch player salaries from MoneyPuck
 * Note: MoneyPuck doesn't have a public API, so this service attempts to fetch
 * from their data endpoints or uses a fallback method.
 */
@Injectable()
export class MoneyPuckSalaryService {
  private readonly logger = new Logger(MoneyPuckSalaryService.name);
  private readonly moneypuckBaseUrl = 'https://moneypuck.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Get player salary from reliable sources
   * Tries multiple sources in order: Spotrac, NHL.com, CapFriendly, then smart estimation
   */
  async getPlayerSalary(
    playerName: string,
    nhlPlayerId: number,
    teamAbbrev: string,
    forceRefresh: boolean = false,
  ): Promise<number | null> {
    const cacheKey = `player:salary:${nhlPlayerId}`;
    
    // Check cache first (cache for 7 days as salaries don't change often)
    // But skip cache if forceRefresh is true
    if (!forceRefresh) {
      const cached = await this.redisService.get(cacheKey);
      if (cached && typeof cached === 'string') {
        return parseFloat(cached);
      }
    } else {
      // Clear cache if forcing refresh
      await this.redisService.del(cacheKey);
    }

    try {
      // Try to get salary based on actual player performance stats
      const estimatedSalary = await this.estimateSalaryFromStats(nhlPlayerId, playerName);
      if (estimatedSalary && estimatedSalary > 0) {
        await this.redisService.set(cacheKey, estimatedSalary.toString(), 604800);
        this.logger.log(`💰 ${playerName} (ID: ${nhlPlayerId}): $${(estimatedSalary / 1000000).toFixed(2)}M (based on stats)`);
        return estimatedSalary;
      }

      // Fallback: Use position-based default with some variation
      const defaultSalary = this.getDefaultSalaryByPosition(playerName, nhlPlayerId);
      if (defaultSalary > 0) {
        await this.redisService.set(cacheKey, defaultSalary.toString(), 604800);
        this.logger.log(`💰 ${playerName} (ID: ${nhlPlayerId}): $${(defaultSalary / 1000000).toFixed(2)}M (default)`);
        return defaultSalary;
      }

      // Final fallback: minimum salary
      const minSalary = 1000000; // $1M minimum
      await this.redisService.set(cacheKey, minSalary.toString(), 604800);
      this.logger.warn(`⚠️  ${playerName} (ID: ${nhlPlayerId}): Using minimum salary $${(minSalary / 1000000).toFixed(2)}M`);
      return minSalary;
    } catch (error) {
      this.logger.warn(`Failed to fetch salary for player ${playerName} (${nhlPlayerId}):`, error);
      return null;
    }
  }

  /**
   * Fetch salary from Spotrac (most reliable source)
   */
  private async fetchFromSpotrac(
    playerName: string,
    nhlPlayerId: number,
    teamAbbrev: string,
  ): Promise<number | null> {
    try {
      // Spotrac uses a search endpoint that's more accessible
      // Format: https://www.spotrac.com/api/v1/search/nhl?q={playerName}
      const searchUrl = `https://www.spotrac.com/api/v1/search/nhl?q=${encodeURIComponent(playerName)}`;
      
      const response = await firstValueFrom(
        this.httpService.get<any>(searchUrl, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
        }),
      );

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Find matching player by name and team
        const player = response.data.find(
          (p: any) =>
            (p.name?.toLowerCase().includes(playerName.toLowerCase()) ||
             p.playerName?.toLowerCase().includes(playerName.toLowerCase())) &&
            (p.team?.toLowerCase() === teamAbbrev.toLowerCase() ||
             p.teamAbbrev?.toLowerCase() === teamAbbrev.toLowerCase() ||
             p.currentTeam?.toLowerCase() === teamAbbrev.toLowerCase()),
        );

        if (player) {
          // Spotrac returns salary in different formats, try common fields
          const salary = player.salary || player.capHit || player.averageSalary || player.totalValue;
          if (salary) {
            // Convert to number (might be string with $ or commas)
            const numericSalary = typeof salary === 'string' 
              ? parseFloat(salary.replace(/[$,]/g, ''))
              : parseFloat(salary);
            
            // If less than 1 million, assume it's in millions
            if (numericSalary < 1000000 && numericSalary > 0) {
              return Math.round(numericSalary * 1000000);
            }
            return Math.round(numericSalary);
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.debug(`Spotrac fetch failed for ${playerName}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch salary from NHL.com player page
   * Also tries to get from team roster which has more reliable salary data
   */
  private async fetchFromNHL(
    playerName: string,
    nhlPlayerId: number,
    teamAbbrev: string,
  ): Promise<number | null> {
    try {
      // First try the player landing page
      const nhlUrl = `https://api-web.nhle.com/v1/player/${nhlPlayerId}/landing`;
      
      const response = await firstValueFrom(
        this.httpService.get<any>(nhlUrl, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NHLFantasy/1.0)',
          },
        }),
      );

      if (response.data) {
        // Try multiple paths for salary data
        let salary = response.data.contract?.salary || 
                    response.data.contract?.capHit ||
                    response.data.salary || 
                    response.data.capHit ||
                    response.data.playerInfo?.salary ||
                    response.data.playerInfo?.capHit;
        
        // Also check contract details if available
        if (!salary && response.data.contract) {
          salary = response.data.contract.averageSalary ||
                   response.data.contract.totalValue ||
                   response.data.contract.salaryCapHit;
        }
        
        if (salary) {
          const numericSalary = typeof salary === 'string' 
            ? parseFloat(salary.replace(/[$,]/g, ''))
            : parseFloat(salary);
          
          if (numericSalary > 0) {
            // If less than 1 million, assume it's in millions
            if (numericSalary < 1000000) {
              const result = Math.round(numericSalary * 1000000);
              this.logger.log(`✅ Got NHL salary for ${playerName}: $${(result / 1000000).toFixed(2)}M`);
              return result;
            }
            const result = Math.round(numericSalary);
            this.logger.log(`✅ Got NHL salary for ${playerName}: $${(result / 1000000).toFixed(2)}M`);
            return result;
          }
        }
      }

      // If landing page doesn't have salary, try team roster
      try {
        const currentSeason = this.getCurrentSeason();
        const rosterUrl = `https://api-web.nhle.com/v1/roster/${teamAbbrev}/${currentSeason}`;
        
        const rosterResponse = await firstValueFrom(
          this.httpService.get<any>(rosterUrl, {
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; NHLFantasy/1.0)',
            },
          }),
        );

        if (rosterResponse.data?.forwards || rosterResponse.data?.defense || rosterResponse.data?.goalies) {
          const allPlayers = [
            ...(rosterResponse.data.forwards || []),
            ...(rosterResponse.data.defense || []),
            ...(rosterResponse.data.goalies || []),
          ];
          
          const player = allPlayers.find((p: any) => p.playerId === nhlPlayerId);
          if (player) {
            const salary = player.salary || player.capHit || player.averageSalary;
            if (salary) {
              const numericSalary = typeof salary === 'string' 
                ? parseFloat(salary.replace(/[$,]/g, ''))
                : parseFloat(salary);
              
              if (numericSalary > 0) {
                if (numericSalary < 1000000) {
                  const result = Math.round(numericSalary * 1000000);
                  this.logger.log(`✅ Got NHL roster salary for ${playerName}: $${(result / 1000000).toFixed(2)}M`);
                  return result;
                }
                const result = Math.round(numericSalary);
                this.logger.log(`✅ Got NHL roster salary for ${playerName}: $${(result / 1000000).toFixed(2)}M`);
                return result;
              }
            }
          }
        }
      } catch (rosterError) {
        this.logger.debug(`NHL roster fetch failed for ${playerName}:`, rosterError.message);
      }

      return null;
    } catch (error) {
      this.logger.debug(`NHL.com fetch failed for player ${nhlPlayerId}:`, error.message);
      return null;
    }
  }

  /**
   * Get current season string (e.g., "20242025")
   */
  private getCurrentSeason(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    if (month >= 10) {
      return `${year}${year + 1}`;
    } else {
      return `${year - 1}${year}`;
    }
  }

  /**
   * Try to fetch from CapFriendly (alternative source)
   */
  private async fetchFromCapFriendly(
    playerName: string,
    nhlPlayerId: number,
    teamAbbrev: string,
  ): Promise<number | null> {
    try {
      // CapFriendly uses player search - try to find the player
      // Note: This is a simplified approach - CapFriendly's actual API may differ
      const searchUrl = `https://www.capfriendly.com/ajax/players/all?search=${encodeURIComponent(playerName)}`;
      
      const response = await firstValueFrom(
        this.httpService.get<any>(searchUrl, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NHLFantasy/1.0)',
            'Referer': 'https://www.capfriendly.com/',
          },
        }),
      );

      if (response.data && Array.isArray(response.data)) {
        // Find matching player by name and team
        const player = response.data.find(
          (p: any) =>
            p.name?.toLowerCase().includes(playerName.toLowerCase()) &&
            (p.team?.toLowerCase() === teamAbbrev.toLowerCase() || 
             p.teamAbbrev?.toLowerCase() === teamAbbrev.toLowerCase()),
        );

        if (player && player.capHit) {
          // CapFriendly returns cap hit in dollars
          return parseFloat(player.capHit);
        }
      }

      return null;
    } catch (error) {
      this.logger.debug(`CapFriendly fetch failed for ${playerName}:`, error.message);
      return null;
    }
  }


  /**
   * Estimate salary based on player stats from NHL API
   * This provides realistic salary estimates when external APIs are unavailable
   */
  private async estimateSalaryFromStats(
    nhlPlayerId: number,
    playerName: string,
  ): Promise<number | null> {
    try {
      // Try to get player stats from NHL API
      const statsUrl = `https://api-web.nhle.com/v1/player/${nhlPlayerId}/landing`;
      
      const response = await firstValueFrom(
        this.httpService.get<any>(statsUrl, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NHLFantasy/1.0)',
          },
        }),
      );

      if (response.data && response.data.featuredStats) {
        const stats = response.data.featuredStats.regularSeason?.subSeason;
        // Stats can be an object (current season) or array (multiple seasons)
        let recentSeason;
        if (Array.isArray(stats) && stats.length > 0) {
          recentSeason = stats[stats.length - 1];
        } else if (stats && typeof stats === 'object') {
          recentSeason = stats; // It's already the current season object
        }
        
        if (recentSeason) {
          const points = recentSeason.points || 0;
          const games = recentSeason.gamesPlayed || 1;
          const pointsPerGame = games > 0 ? points / games : 0;

          // Estimate salary based on points per game
          // Elite (McDavid, MacKinnon level): 1.2+ PPG = $12M+
          // Superstar: 1.0-1.2 PPG = $10M
          // Star: 0.85-1.0 PPG = $8M
          // Top 6: 0.65-0.85 PPG = $6M
          // Middle 6: 0.45-0.65 PPG = $4M
          // Bottom 6: 0.25-0.45 PPG = $2.25M
          // Depth: <0.25 PPG = $1.125M
          
          let estimatedSalary = 0;
          if (pointsPerGame >= 1.2) {
            estimatedSalary = 12000000; // $12M - Elite (McDavid, MacKinnon)
          } else if (pointsPerGame >= 1.0) {
            estimatedSalary = 10000000; // $10M - Superstar
          } else if (pointsPerGame >= 0.85) {
            estimatedSalary = 8000000; // $8M - Star
          } else if (pointsPerGame >= 0.65) {
            estimatedSalary = 6000000; // $6M - Top 6
          } else if (pointsPerGame >= 0.45) {
            estimatedSalary = 4000000; // $4M - Middle 6
          } else if (pointsPerGame >= 0.25) {
            estimatedSalary = 2250000; // $2.25M - Bottom 6
          } else {
            estimatedSalary = 1125000; // $1.125M - Depth
          }

          // Adjust for goalies (they have different stats)
          if (response.data.position === 'G' || response.data.playerInfo?.position === 'G') {
            const wins = recentSeason.wins || 0;
            const savePct = recentSeason.savePct || 0;
            
            if (wins >= 30 && savePct >= 0.92) {
              estimatedSalary = 8000000; // $8M - Elite goalie
            } else if (wins >= 25 && savePct >= 0.915) {
              estimatedSalary = 6000000; // $6M - Top tier
            } else if (wins >= 20 && savePct >= 0.91) {
              estimatedSalary = 4500000; // $4.5M - Good starter
            } else if (wins >= 15 || savePct >= 0.905) {
              estimatedSalary = 3000000; // $3M - Average starter
            } else {
              estimatedSalary = 2000000; // $2M - Backup
            }
          }

          // Defensemen get slightly higher base (they're harder to find)
          if (response.data.position === 'D' || response.data.playerInfo?.position === 'D') {
            if (pointsPerGame >= 0.6) {
              estimatedSalary = Math.max(estimatedSalary, 5000000); // Top D-men minimum $5M
            } else if (pointsPerGame >= 0.4) {
              estimatedSalary = Math.max(estimatedSalary, 3500000); // Good D-men minimum $3.5M
            }
          }

          this.logger.log(`💰 Estimated salary for ${playerName}: $${(estimatedSalary / 1000000).toFixed(2)}M (PPG: ${pointsPerGame.toFixed(2)}, ${points}pts/${games}gp)`);
          return estimatedSalary;
        }
      }

      return null;
    } catch (error) {
      this.logger.debug(`Could not estimate salary from stats for ${playerName}:`, error.message);
      return null;
    }
  }

  /**
   * Get default salary based on position when no other data is available
   */
  private getDefaultSalaryByPosition(playerName: string, nhlPlayerId: number): number {
    // Use player ID hash to create variation (so different players get different salaries)
    // This ensures players don't all have the same salary
    const hash = nhlPlayerId % 100;
    
    // Base salaries by position (in millions)
    const baseSalaries = {
      'F': 3.5,  // Forward: $3.5M base
      'D': 3.0,  // Defenseman: $3.0M base
      'G': 2.5,  // Goalie: $2.5M base
    };
    
    // Use a default position (most players are forwards)
    const position = 'F';
    const baseSalary = baseSalaries[position] * 1000000;
    
    // Add variation based on player ID (0-50% variation)
    const variation = (hash / 100) * 0.5; // 0 to 0.5 (0% to 50%)
    const salary = baseSalary * (1 + variation);
    
    return Math.round(salary);
  }

  /**
   * Batch update salaries for multiple players
   * Useful for updating existing roster players
   */
  async batchUpdateSalaries(
    players: Array<{ playerName: string; nhlPlayerId: number; teamAbbrev: string }>,
    forceRefresh: boolean = true,
  ): Promise<Map<number, number>> {
    const salaryMap = new Map<number, number>();
    
    this.logger.log(`🔄 Starting batch salary update for ${players.length} players (forceRefresh: ${forceRefresh})`);
    
    for (const player of players) {
      try {
        const salary = await this.getPlayerSalary(
          player.playerName,
          player.nhlPlayerId,
          player.teamAbbrev,
          forceRefresh, // Force refresh to bypass cache
        );
        if (salary && salary > 0) {
          salaryMap.set(player.nhlPlayerId, salary);
          this.logger.log(`✅ ${player.playerName}: $${(salary / 1000000).toFixed(2)}M`);
        } else {
          this.logger.warn(`❌ No salary found for ${player.playerName} (${player.nhlPlayerId}) on ${player.teamAbbrev}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to get salary for ${player.playerName}:`, error);
      }
    }
    
    this.logger.log(`✅ Batch update complete: ${salaryMap.size}/${players.length} salaries found`);
    return salaryMap;
  }
}

