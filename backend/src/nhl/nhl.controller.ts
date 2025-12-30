import { Controller, Get, Param, Query } from '@nestjs/common';
import { NhlService } from './nhl.service';
import { PlayerPricingService } from '../players/player-pricing.service';

@Controller('nhl')
export class NhlController {
  constructor(
    private readonly nhlService: NhlService,
    private readonly playerPricingService: PlayerPricingService,
  ) {}

  @Get('play-by-play/:gameId')
  async getPlayByPlay(@Param('gameId') gameId: string) {
    return this.nhlService.getPlayByPlay(parseInt(gameId));
  }

  @Get('boxscore/:gameId')
  async getBoxscore(@Param('gameId') gameId: string) {
    return this.nhlService.getBoxscore(parseInt(gameId));
  }

  @Get('schedule/:team/:season')
  async getSchedule(
    @Param('team') team: string,
    @Param('season') season: string,
  ) {
    return this.nhlService.getTeamSchedule(team, season);
  }

  @Get('roster/:team/:season')
  async getRoster(
    @Param('team') team: string,
    @Param('season') season: string,
  ) {
    try {
      const roster = await this.nhlService.getTeamRoster(team, season);
      
      // Add estimated prices to each player with timeout to prevent blocking
      const playersWithPrices = await Promise.all(
        roster.players.map(async (player) => {
          try {
            const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim();
            const defaultPrice = player.position === 'G' ? 3000000 : player.position === 'D' ? 1500000 : 2000000;
            
            // Set a timeout for pricing to prevent blocking
            const pricePromise = this.playerPricingService.getEstimatedPrice(
              player.playerId,
              player.position,
              player.jerseyNumber,
              playerName,
              team,
            );
            
            // Timeout after 1 second - if pricing takes too long, use default
            const timeoutPromise = new Promise<number>((resolve) => {
              setTimeout(() => resolve(defaultPrice), 1000);
            });
            
            const price = await Promise.race([pricePromise, timeoutPromise]);
            
            return {
              ...player,
              price: price || defaultPrice,
            };
          } catch (error) {
            // If pricing fails, use default based on position
            const defaultPrice = player.position === 'G' ? 3000000 : player.position === 'D' ? 1500000 : 2000000;
            return {
              ...player,
              price: defaultPrice,
            };
          }
        }),
      );

      // Extract results
      const players = playersWithPrices;

      return {
        ...roster,
        players: players,
      };
    } catch (error) {
      console.error('Error in getRoster:', error);
      throw error;
    }
  }

  @Get('teams')
  async getAllTeams() {
    return this.nhlService.getAllTeams();
  }

  // IMPORTANT: Specific routes must come BEFORE parameterized routes
  @Get('games/recent')
  async getRecentGames() {
    try {
      return await this.nhlService.getRecentCompletedGames(2); // Last 2 days
    } catch (error: any) {
      console.error('Error getting recent games:', error);
      return { error: error.message, games: [] };
    }
  }

  @Get('games/:gameId/details')
  async getGameDetails(@Param('gameId') gameId: string) {
    try {
      const boxscore = await this.nhlService.getBoxscore(parseInt(gameId));
      return boxscore;
    } catch (error: any) {
      console.error(`Error getting game details for ${gameId}:`, error);
      return { error: error.message };
    }
  }

  @Get('games/upcoming')
  async getUpcomingGames() {
    try {
      return await this.nhlService.getUpcomingGames(2);
    } catch (error: any) {
      console.error('Error getting upcoming games:', error);
      return { error: error.message, games: [] };
    }
  }

  // Parameterized route must come AFTER specific routes
  @Get('games/date/:date')
  async getGamesByDate(@Param('date') date: string) {
    try {
      return await this.nhlService.getGamesByDate(date);
    } catch (error: any) {
      console.error(`Error getting games for date ${date}:`, error);
      return { error: error.message, games: [] };
    }
  }
}
