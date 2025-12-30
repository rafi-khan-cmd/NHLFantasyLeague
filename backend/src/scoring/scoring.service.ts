import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoringEvent } from './scoring-event.entity';
import { Roster } from '../rosters/roster.entity';
import { RosterPlayer } from '../rosters/roster-player.entity';
import { NhlService, PlayByPlayEvent } from '../nhl/nhl.service';
import { RedisService } from '../redis/redis.service';
import { RostersService } from '../rosters/rosters.service';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    @InjectRepository(ScoringEvent)
    private scoringEventRepository: Repository<ScoringEvent>,
    @InjectRepository(Roster)
    private rosterRepository: Repository<Roster>,
    @InjectRepository(RosterPlayer)
    private rosterPlayerRepository: Repository<RosterPlayer>,
    private nhlService: NhlService,
    private redisService: RedisService,
    @Inject(forwardRef(() => RostersService))
    private rostersService: RostersService,
  ) {}

  /**
   * Process play-by-play events for a game and calculate fantasy points
   * Uses idempotency to prevent double-scoring
   */
  async processGameEvents(gameId: number): Promise<void> {
    try {
      const playByPlay = await this.nhlService.getPlayByPlay(gameId);

      // Get all rosters with players in this game (only announced rosters count for scoring)
      const rosters = await this.rosterRepository.find({
        relations: ['players', 'league'],
        where: {
          rosterAnnounced: true, // Only score for announced rosters
        },
      });

      for (const event of playByPlay.events) {
        // Check if we've already processed this event (idempotency)
        const existingEvent = await this.scoringEventRepository.findOne({
          where: {
            nhlEventId: event.eventId,
            nhlPlayerId: event.players?.[0]?.playerId || 0,
          },
        });

        if (existingEvent) {
          continue; // Already processed
        }

        // Process event for each player involved
        if (event.players && event.players.length > 0) {
          for (const player of event.players) {
            await this.processEventForPlayer(
              gameId,
              event,
              player.playerId,
              rosters,
            );
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Error processing game events for game ${gameId}:`, error.message);
      throw error;
    }
  }

  /**
   * Process a single event for a player and award fantasy points
   */
  private async processEventForPlayer(
    gameId: number,
    event: PlayByPlayEvent,
    playerId: number,
    rosters: Roster[],
  ): Promise<void> {
    // Find all rosters that have this player AND have announced their roster (scoring only counts after announcement)
    const rostersWithPlayer = rosters.filter((roster) =>
      roster.rosterAnnounced && // Only score for announced rosters
      roster.players.some((p) => p.nhlPlayerId === playerId && p.lineupStatus === 'active'),
    );

    if (rostersWithPlayer.length === 0) {
      return; // No active rosters have this player
    }

    // Get league settings for scoring
    const league = rostersWithPlayer[0]?.league;
    
    // Calculate points based on event type (using league-specific scoring if available)
    const points = this.calculatePoints(event.type, event, league?.settings);

    if (points === 0) {
      return; // No points for this event type
    }

    // Create scoring events for each roster
    for (const roster of rostersWithPlayer) {
      const scoringEvent = this.scoringEventRepository.create({
        nhlEventId: `${event.eventId}-${playerId}`,
        nhlGameId: gameId,
        nhlPlayerId: playerId,
        rosterId: roster.id,
        leagueId: roster.leagueId,
        eventType: event.type,
        pointsAwarded: points,
        eventData: {
          period: event.period,
          timeRemaining: event.timeRemaining,
          description: event.description,
        },
      });

      await this.scoringEventRepository.save(scoringEvent);

      // Publish scoring update via Redis pub/sub
      await this.redisService.publish('scoring:update', {
        leagueId: roster.leagueId,
        rosterId: roster.id,
        playerId,
        eventType: event.type,
        points,
        totalPoints: await this.getRosterTotalPoints(roster.id),
      });
    }
  }

  /**
   * Calculate fantasy points based on event type
   * Uses league-specific scoring settings if available
   */
  private calculatePoints(eventType: string, event: PlayByPlayEvent, leagueSettings?: any): number {
    // Default scoring (can be customized per league)
    const defaultScoring = {
      goals: 3,
      assists: 2,
      shots: 0.5,
      hits: 0.5,
      blocks: 0.5,
      pim: 0.25, // Penalty minutes
      plusMinus: 0.5,
    };

    // Use league-specific scoring if available
    const scoring = leagueSettings?.scoring || defaultScoring;

    const type = eventType.toLowerCase();

    if (type.includes('goal') || type === 'goal') {
      return scoring.goals || defaultScoring.goals;
    } else if (type.includes('assist') || type === 'assist') {
      return scoring.assists || defaultScoring.assists;
    } else if (type.includes('shot') && !type.includes('block')) {
      return scoring.shots || defaultScoring.shots;
    } else if (type.includes('hit')) {
      return scoring.hits || defaultScoring.hits;
    } else if (type.includes('block')) {
      return scoring.blocks || defaultScoring.blocks;
    } else if (type.includes('penalty') || type.includes('pim')) {
      return scoring.pim || defaultScoring.pim;
    }

    return 0;
  }

  /**
   * Reconcile game scoring from boxscore (end-of-game check)
   * Ensures all stats are captured even if play-by-play missed something
   */
  async reconcileGameFromBoxscore(gameId: number): Promise<void> {
    try {
      const boxscore = await this.nhlService.getBoxscore(gameId);
      
      // Get all rosters (only announced rosters count for scoring)
      const rosters = await this.rosterRepository.find({
        relations: ['players', 'league'],
        where: {
          rosterAnnounced: true, // Only score for announced rosters
        },
      });

      // Process both home and away teams
      const allPlayers = [
        ...(boxscore.homeTeam?.players || []),
        ...(boxscore.awayTeam?.players || []),
      ];

      for (const boxscorePlayer of allPlayers) {
        // Find rosters with this player active
        const rostersWithPlayer = rosters.filter((roster) =>
          roster.players.some(
            (p) => p.nhlPlayerId === boxscorePlayer.playerId && p.lineupStatus === 'active',
          ),
        );

        if (rostersWithPlayer.length === 0) {
          continue;
        }

        // Calculate points from boxscore stats
        for (const roster of rostersWithPlayer) {
          const league = roster.league;
          const scoring = league?.settings?.scoring || {
            goals: 3,
            assists: 2,
            shots: 0.5,
            hits: 0.5,
            blocks: 0.5,
            pim: 0.25,
            plusMinus: 0.5,
          };

          // If this is a goalie who played (has saves or shots against), record the start
          if (boxscorePlayer.position === 'G' && (boxscorePlayer.shotsAgainst || boxscorePlayer.saves)) {
            try {
              await this.rostersService.recordGoalieStart(roster.id, boxscorePlayer.playerId, gameId);
            } catch (error) {
              this.logger.warn(`Failed to record goalie start for player ${boxscorePlayer.playerId}:`, error);
            }
          }

          // Calculate total points from boxscore
          const totalPoints =
            (boxscorePlayer.goals || 0) * scoring.goals +
            (boxscorePlayer.assists || 0) * scoring.assists +
            (boxscorePlayer.shots || 0) * scoring.shots +
            (boxscorePlayer.hits || 0) * scoring.hits +
            (boxscorePlayer.blocks || 0) * scoring.blocks +
            (boxscorePlayer.pim || 0) * scoring.pim +
            (boxscorePlayer.plusMinus || 0) * scoring.plusMinus;

          // Check if we already have a reconciliation event for this game/player/roster
          const existingReconciliation = await this.scoringEventRepository.findOne({
            where: {
              nhlGameId: gameId,
              nhlPlayerId: boxscorePlayer.playerId,
              rosterId: roster.id,
              eventType: 'boxscore_reconciliation',
            },
          });

          if (!existingReconciliation) {
            // Create reconciliation event
            const reconciliationEvent = this.scoringEventRepository.create({
              nhlEventId: `boxscore_${gameId}_${boxscorePlayer.playerId}_${roster.id}`,
              nhlGameId: gameId,
              nhlPlayerId: boxscorePlayer.playerId,
              rosterId: roster.id,
              leagueId: roster.leagueId,
              eventType: 'boxscore_reconciliation',
              pointsAwarded: totalPoints,
              eventData: {
                goals: boxscorePlayer.goals,
                assists: boxscorePlayer.assists,
                shots: boxscorePlayer.shots,
                hits: boxscorePlayer.hits,
                blocks: boxscorePlayer.blocks,
                pim: boxscorePlayer.pim,
                plusMinus: boxscorePlayer.plusMinus,
              },
            });

            await this.scoringEventRepository.save(reconciliationEvent);

            // Publish update
            await this.redisService.publish('scoring:update', {
              leagueId: roster.leagueId,
              rosterId: roster.id,
              playerId: boxscorePlayer.playerId,
              eventType: 'boxscore_reconciliation',
              points: totalPoints,
              totalPoints: await this.getRosterTotalPoints(roster.id),
            });
          }
        }
      }

      this.logger.log(`Reconciled boxscore for game ${gameId}`);
    } catch (error: any) {
      this.logger.error(`Error reconciling game ${gameId} from boxscore:`, error.message);
    }
  }

  /**
   * Get total fantasy points for a roster
   */
  async getRosterTotalPoints(rosterId: string): Promise<number> {
    const result = await this.scoringEventRepository
      .createQueryBuilder('event')
      .select('SUM(event.pointsAwarded)', 'total')
      .where('event.rosterId = :rosterId', { rosterId })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  /**
   * Get total fantasy points for a specific player in a roster
   */
  async getPlayerPointsInRoster(rosterId: string, nhlPlayerId: number): Promise<number> {
    const result = await this.scoringEventRepository
      .createQueryBuilder('event')
      .select('SUM(event.pointsAwarded)', 'total')
      .where('event.rosterId = :rosterId', { rosterId })
      .andWhere('event.nhlPlayerId = :nhlPlayerId', { nhlPlayerId })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  /**
   * Get total fantasy points for a player across all rosters
   */
  async getPlayerTotalPoints(nhlPlayerId: number): Promise<number> {
    const result = await this.scoringEventRepository
      .createQueryBuilder('event')
      .select('SUM(event.pointsAwarded)', 'total')
      .where('event.nhlPlayerId = :nhlPlayerId', { nhlPlayerId })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  /**
   * Get player stats breakdown (goals, assists, shots, etc.)
   */
  async getPlayerStats(rosterId: string, nhlPlayerId: number): Promise<{
    totalPoints: number;
    goals: number;
    assists: number;
    shots: number;
    hits: number;
    blocks: number;
    pim: number;
    plusMinus: number;
  }> {
    // Get all scoring events for this player in this roster
    const events = await this.scoringEventRepository.find({
      where: {
        rosterId,
        nhlPlayerId,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    // Group events by game to check for boxscore reconciliation
    const eventsByGame = new Map<number, typeof events>();
    for (const event of events) {
      if (!eventsByGame.has(event.nhlGameId)) {
        eventsByGame.set(event.nhlGameId, []);
      }
      eventsByGame.get(event.nhlGameId)!.push(event);
    }

    // Calculate totals from events
    // If a game has boxscore_reconciliation, only count that (not individual play-by-play events)
    let totalPoints = 0;
    let goals = 0;
    let assists = 0;
    let shots = 0;
    let hits = 0;
    let blocks = 0;
    let pim = 0;
    let plusMinus = 0;

    for (const [gameId, gameEvents] of eventsByGame.entries()) {
      const boxscoreEvent = gameEvents.find((e) => e.eventType === 'boxscore_reconciliation');
      
      if (boxscoreEvent) {
        // Use boxscore reconciliation (it replaces all play-by-play events for this game)
        totalPoints += boxscoreEvent.pointsAwarded;
        
        // Extract stats from boxscore event data
        if (boxscoreEvent.eventData) {
          goals += boxscoreEvent.eventData.goals || 0;
          assists += boxscoreEvent.eventData.assists || 0;
          shots += boxscoreEvent.eventData.shots || 0;
          hits += boxscoreEvent.eventData.hits || 0;
          blocks += boxscoreEvent.eventData.blocks || 0;
          pim += boxscoreEvent.eventData.pim || 0;
          plusMinus += boxscoreEvent.eventData.plusMinus || 0;
        }
      } else {
        // No boxscore reconciliation, count individual play-by-play events
        for (const event of gameEvents) {
          totalPoints += event.pointsAwarded;

          // Count event types
          const eventType = event.eventType.toLowerCase();
          if (eventType.includes('goal') || eventType === 'goal') {
            goals++;
          } else if (eventType.includes('assist') || eventType === 'assist') {
            assists++;
          } else if (eventType.includes('shot') && !eventType.includes('block')) {
            shots++;
          } else if (eventType.includes('hit')) {
            hits++;
          } else if (eventType.includes('block')) {
            blocks++;
          } else if (eventType.includes('penalty') || eventType.includes('pim')) {
            // PIM is usually in minutes, but we count events
            pim++;
          }

          // Plus/minus from event data if available
          if (event.eventData?.plusMinus !== undefined) {
            plusMinus += event.eventData.plusMinus;
          }
        }
      }
    }

    return {
      totalPoints,
      goals,
      assists,
      shots,
      hits,
      blocks,
      pim,
      plusMinus,
    };
  }

  /**
   * Create a retroactive scoring event
   */
  async createRetroactiveScoringEvent(data: {
    nhlGameId: number;
    nhlPlayerId: number;
    rosterId: string;
    leagueId: string;
    pointsAwarded: number;
    eventData: any;
  }): Promise<void> {
    // Check if we already have a retroactive event for this game/player/roster
    const existingEvent = await this.scoringEventRepository.findOne({
      where: {
        nhlGameId: data.nhlGameId,
        nhlPlayerId: data.nhlPlayerId,
        rosterId: data.rosterId,
        eventType: 'retroactive_scoring',
      },
    });

    if (!existingEvent) {
      const scoringEvent = this.scoringEventRepository.create({
        nhlEventId: `retroactive_${data.nhlGameId}_${data.nhlPlayerId}_${data.rosterId}`,
        nhlGameId: data.nhlGameId,
        nhlPlayerId: data.nhlPlayerId,
        rosterId: data.rosterId,
        leagueId: data.leagueId,
        eventType: 'retroactive_scoring',
        pointsAwarded: data.pointsAwarded,
        eventData: data.eventData,
      });

      await this.scoringEventRepository.save(scoringEvent);
    }
  }

  /**
   * Get all player points for a roster (all players with their totals)
   */
  async getRosterPlayerPoints(rosterId: string): Promise<Array<{
    nhlPlayerId: number;
    playerName: string;
    position: string;
    totalPoints: number;
    goals: number;
    assists: number;
    shots: number;
    hits: number;
    blocks: number;
    pim: number;
    plusMinus: number;
  }>> {
    const roster = await this.rosterRepository.findOne({
      where: { id: rosterId },
      relations: ['players'],
    });

    if (!roster) {
      return [];
    }

    const playerPoints = await Promise.all(
      roster.players.map(async (player) => {
        const stats = await this.getPlayerStats(rosterId, player.nhlPlayerId);
        return {
          nhlPlayerId: player.nhlPlayerId,
          playerName: player.playerName,
          position: player.position,
          ...stats,
        };
      }),
    );

    return playerPoints.sort((a, b) => b.totalPoints - a.totalPoints);
  }

  /**
   * Get scoring summary for a league
   */
  async getLeagueScoringSummary(leagueId: string): Promise<any[]> {
    const rosters = await this.rosterRepository.find({
      where: { leagueId },
      relations: ['players'],
    });

    const summary = await Promise.all(
      rosters.map(async (roster) => ({
        rosterId: roster.id,
        teamName: roster.teamName,
        totalPoints: await this.getRosterTotalPoints(roster.id),
      })),
    );

    return summary.sort((a, b) => b.totalPoints - a.totalPoints);
  }
}

