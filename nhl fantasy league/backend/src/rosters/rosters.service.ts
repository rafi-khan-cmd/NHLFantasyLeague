import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Roster } from './roster.entity';
import { RosterPlayer } from './roster-player.entity';
import { RosterTransaction } from './roster-transaction.entity';
import { GoalieStart } from './goalie-start.entity';
import { League } from '../leagues/league.entity';
import { PlayerPricingService } from '../players/player-pricing.service';
import { MoneyPuckSalaryService } from '../players/moneypuck-salary.service';
import { ScoringService } from '../scoring/scoring.service';
import { NhlService } from '../nhl/nhl.service';
import { WaiversService } from '../waivers/waivers.service';

@Injectable()
export class RostersService implements OnModuleInit {
  private readonly logger = new Logger(RostersService.name);

  constructor(
    @InjectRepository(Roster)
    private rosterRepository: Repository<Roster>,
    @InjectRepository(RosterPlayer)
    private rosterPlayerRepository: Repository<RosterPlayer>,
    @InjectRepository(RosterTransaction)
    private transactionRepository: Repository<RosterTransaction>,
    @InjectRepository(GoalieStart)
    private goalieStartRepository: Repository<GoalieStart>,
    @InjectRepository(League)
    private leagueRepository: Repository<League>,
    private dataSource: DataSource,
    private playerPricingService: PlayerPricingService,
    @Inject(forwardRef(() => ScoringService))
    private scoringService: ScoringService,
    private nhlService: NhlService,
    private moneyPuckSalaryService: MoneyPuckSalaryService,
    private waiversService: WaiversService,
  ) {}

  async getUserRosters(userId: string): Promise<Roster[]> {
    const rosters = await this.rosterRepository.find({
      where: { ownerId: userId },
      relations: ['players', 'league'],
    });
    
    // Recalculate totalSalary for each roster to ensure accuracy
    for (const roster of rosters) {
      if (roster.players && roster.players.length > 0) {
        const calculatedTotal = roster.players.reduce(
          (sum, player) => sum + Number(player.salary || 0),
          0,
        );
        // Only update if there's a discrepancy
        if (Math.abs(calculatedTotal - Number(roster.totalSalary || 0)) > 0.01) {
          await this.rosterRepository.update(roster.id, {
            totalSalary: calculatedTotal,
          });
          roster.totalSalary = calculatedTotal;
        }
      } else if (Number(roster.totalSalary || 0) > 0) {
        // If no players but salary > 0, reset to 0
        await this.rosterRepository.update(roster.id, {
          totalSalary: 0,
        });
        roster.totalSalary = 0;
      }
    }
    
    return rosters;
  }

  async findOne(id: string): Promise<Roster> {
    const roster = await this.rosterRepository.findOne({
      where: { id },
      relations: ['players', 'league'],
    });

    if (!roster) {
      throw new NotFoundException(`Roster with ID ${id} not found`);
    }

    return roster;
  }

  async addPlayer(
    rosterId: string,
    playerData: {
      nhlPlayerId: number;
      playerName: string;
      position: string;
      nhlTeam: string;
    },
    userId: string,
  ): Promise<RosterPlayer> {
    const roster = await this.findOne(rosterId);

    // Verify user owns this roster
    if (roster.ownerId !== userId) {
      throw new BadRequestException('You do not own this roster');
    }

    // Check if player already exists in roster
    const existingPlayer = await this.rosterPlayerRepository.findOne({
      where: {
        rosterId,
        nhlPlayerId: playerData.nhlPlayerId,
      },
    });

    if (existingPlayer) {
      throw new BadRequestException('Player is already on this roster');
    }

    // Check roster size limits (from league settings)
    const league = await this.leagueRepository.findOne({
      where: { id: roster.leagueId },
    });

    if (!league) {
      throw new NotFoundException('League not found');
    }

    const currentPlayers = roster.players || [];
    
    // Default roster size if settings not set
    const defaultRosterSize = {
      forwards: 9, // Minimum 9 forwards required
      defensemen: 6, // Minimum 6 defensemen required
      goalies: 2, // Minimum 2 goalies required
      bench: 3, // Additional bench spots
    };
    
    const rosterSize = league.settings?.rosterSize || defaultRosterSize;
    const maxRosterSize = 20; // Maximum 20 players total

    // Check maximum roster size (applies both before and after announcement)
    if (currentPlayers.length >= maxRosterSize) {
      throw new BadRequestException(`Roster is full. Maximum ${maxRosterSize} players allowed.`);
    }

    // Before roster announcement: no minimum requirements, no position limits
    // After roster announcement: enforce minimum requirements and position limits
    if (roster.rosterAnnounced) {
      const minRosterSize = 16; // Minimum 16 players total

      // Count players by position
      const forwards = currentPlayers.filter((p) => p.position === 'F').length;
      const defensemen = currentPlayers.filter((p) => p.position === 'D').length;
      const goalies = currentPlayers.filter((p) => p.position === 'G').length;

      // Check minimum roster size
      if (currentPlayers.length < minRosterSize) {
        throw new BadRequestException(
          `Cannot add player. Roster must have at least ${minRosterSize} players before adding more. Currently have ${currentPlayers.length}.`,
        );
      }

      // Calculate maximums: 20 total - minimums for other positions
      // This ensures we can always meet minimum requirements
      let maxForPosition = 20;
      if (playerData.position === 'F') {
        // Max forwards = 20 total - min defensemen (6) - min goalies (2) = 12 max
        maxForPosition = maxRosterSize - rosterSize.defensemen - rosterSize.goalies;
        if (forwards >= maxForPosition) {
          throw new BadRequestException(
            `Maximum ${maxForPosition} forwards allowed (minimum ${rosterSize.forwards} required). You need at least ${rosterSize.defensemen} defensemen and ${rosterSize.goalies} goalies.`,
          );
        }
      } else if (playerData.position === 'D') {
        // Max defensemen = 20 total - min forwards (9) - min goalies (2) = 9 max
        maxForPosition = maxRosterSize - rosterSize.forwards - rosterSize.goalies;
        if (defensemen >= maxForPosition) {
          throw new BadRequestException(
            `Maximum ${maxForPosition} defensemen allowed (minimum ${rosterSize.defensemen} required). You need at least ${rosterSize.forwards} forwards and ${rosterSize.goalies} goalies.`,
          );
        }
      } else if (playerData.position === 'G') {
        // Max goalies = 20 total - min forwards (9) - min defensemen (6) = 5 max
        maxForPosition = maxRosterSize - rosterSize.forwards - rosterSize.defensemen;
        if (goalies >= maxForPosition) {
          throw new BadRequestException(
            `Maximum ${maxForPosition} goalies allowed (minimum ${rosterSize.goalies} required). You need at least ${rosterSize.forwards} forwards and ${rosterSize.defensemen} defensemen.`,
          );
        }
      }
    }

    // Calculate player price
    // Note: jerseyNumber might not be in playerData, use default
    const jerseyNumber = (playerData as any).jerseyNumber || 99;
    const playerSalary = await this.playerPricingService.getEstimatedPrice(
      playerData.nhlPlayerId,
      playerData.position,
      jerseyNumber,
      playerData.playerName,
      playerData.nhlTeam,
    );

    // Check if adding this player would exceed salary cap
    const newTotalSalary = Number(roster.totalSalary) + playerSalary;
    if (newTotalSalary > Number(roster.salaryCap)) {
      throw new BadRequestException(
        `Adding this player would exceed salary cap. Remaining cap: $${(Number(roster.salaryCap) - Number(roster.totalSalary)).toLocaleString()}`,
      );
    }

    // Check if roster is announced - if so, enforce weekly limits
    if (roster.rosterAnnounced) {
      await this.checkWeeklyTransactionLimit(rosterId, userId, 'add', league);
    }

    // Create player
    const player = this.rosterPlayerRepository.create({
      rosterId,
      nhlPlayerId: playerData.nhlPlayerId,
      playerName: playerData.playerName,
      position: playerData.position,
      nhlTeam: playerData.nhlTeam,
      salary: playerSalary,
      lineupStatus: 'bench', // New players start on bench
    });

    const savedPlayer = await this.rosterPlayerRepository.save(player);

    // Update roster total salary
    await this.rosterRepository.update(rosterId, {
      totalSalary: newTotalSalary,
    });

    // Record transaction (only if roster is announced, otherwise unlimited changes)
    if (roster.rosterAnnounced) {
      const weekStart = this.getWeekStartDate(new Date());
      await this.transactionRepository.save({
        rosterId,
        userId,
        type: 'add',
        nhlPlayerId: playerData.nhlPlayerId,
        playerName: playerData.playerName,
        weekStartDate: weekStart,
      });
    }

    // Calculate retroactive points for this player
    await this.calculateRetroactivePoints(rosterId, playerData.nhlPlayerId, savedPlayer.createdAt, league);

    // Reload roster to get updated data
    const updatedRoster = await this.findOne(rosterId);
    
    return savedPlayer;
  }

  async removePlayer(rosterId: string, playerId: string, userId: string): Promise<void> {
    const roster = await this.findOne(rosterId);

    // Verify user owns this roster
    if (roster.ownerId !== userId) {
      throw new BadRequestException('You do not own this roster');
    }

    const player = await this.rosterPlayerRepository.findOne({
      where: { id: playerId, rosterId },
    });

    if (!player) {
      throw new NotFoundException('Player not found on this roster');
    }

    // Get league settings for minimum requirements
    const league = await this.leagueRepository.findOne({
      where: { id: roster.leagueId },
    });

    if (!league) {
      throw new NotFoundException('League not found');
    }

    // Before roster announcement: allow free removal (no restrictions)
    // After roster announcement: enforce minimum requirements
    if (roster.rosterAnnounced) {
      const currentPlayers = roster.players || [];
      const minRosterSize = 16; // Minimum 16 players total

      // Default roster size if settings not set
      const defaultRosterSize = {
        forwards: 9, // Minimum 9 forwards required
        defensemen: 6, // Minimum 6 defensemen required
        goalies: 2, // Minimum 2 goalies required
        bench: 3,
      };

      const rosterSize = league.settings?.rosterSize || defaultRosterSize;

      // Count players by position (excluding the one we're removing)
      const playersAfterRemoval = currentPlayers.filter((p) => p.id !== playerId);
      const forwards = playersAfterRemoval.filter((p) => p.position === 'F').length;
      const defensemen = playersAfterRemoval.filter((p) => p.position === 'D').length;
      const goalies = playersAfterRemoval.filter((p) => p.position === 'G').length;

      // Check minimum roster size
      if (playersAfterRemoval.length < minRosterSize) {
        throw new BadRequestException(
          `Cannot remove player. Roster must have at least ${minRosterSize} players. Currently would have ${playersAfterRemoval.length} after removal.`,
        );
      }

      // Check minimum position requirements
      if (player.position === 'F' && forwards < rosterSize.forwards) {
        throw new BadRequestException(
          `Cannot remove forward. Roster must have at least ${rosterSize.forwards} forwards. Currently would have ${forwards} after removal.`,
        );
      }
      if (player.position === 'D' && defensemen < rosterSize.defensemen) {
        throw new BadRequestException(
          `Cannot remove defenseman. Roster must have at least ${rosterSize.defensemen} defensemen. Currently would have ${defensemen} after removal.`,
        );
      }
      if (player.position === 'G' && goalies < rosterSize.goalies) {
        throw new BadRequestException(
          `Cannot remove goalie. Roster must have at least ${rosterSize.goalies} goalies. Currently would have ${goalies} after removal.`,
        );
      }

      // Enforce transaction deadline (Sunday only)
      this.checkTransactionDeadline(league);
      
      // Enforce weekly limits after announcement
      await this.checkWeeklyTransactionLimit(rosterId, userId, 'drop', league);
    }

    // Update roster total salary before removing player
    const newTotalSalary = Math.max(0, Number(roster.totalSalary) - Number(player.salary));
    await this.rosterRepository.update(rosterId, {
      totalSalary: newTotalSalary,
    });

    // Record transaction (only if roster is announced, otherwise unlimited changes)
    if (roster.rosterAnnounced) {
      const weekStart = this.getWeekStartDate(new Date());
      await this.transactionRepository.save({
        rosterId,
        userId,
        type: 'drop',
        nhlPlayerId: player.nhlPlayerId,
        playerName: player.playerName,
        weekStartDate: weekStart,
      });
    }

    // If player was dropped, add them to waivers (only if roster is announced)
    if (roster.rosterAnnounced) {
      try {
        await this.waiversService.addToWaivers(
          roster.leagueId,
          player.nhlPlayerId,
          player.playerName,
          player.position,
          player.nhlTeam,
          rosterId,
        );
        this.logger.log(`Added ${player.playerName} to waivers after being dropped from roster ${rosterId}`);
      } catch (error) {
        this.logger.warn(`Failed to add ${player.playerName} to waivers:`, error);
        // Don't fail the drop operation if waiver add fails
      }
    }

    await this.rosterPlayerRepository.remove(player);
  }

  async updateLineupStatus(
    rosterId: string,
    playerId: string,
    lineupStatus: 'active' | 'bench' | 'ir',
    userId: string,
  ): Promise<RosterPlayer> {
    const roster = await this.findOne(rosterId);

    // Verify user owns this roster
    if (roster.ownerId !== userId) {
      throw new BadRequestException('You do not own this roster');
    }

    const player = await this.rosterPlayerRepository.findOne({
      where: { id: playerId, rosterId },
    });

    if (!player) {
      throw new NotFoundException('Player not found on this roster');
    }

    // Get league settings for position limits
    const league = await this.leagueRepository.findOne({
      where: { id: roster.leagueId },
    });

    if (!league) {
      throw new NotFoundException('League not found');
    }

    // Before roster announcement: allow free lineup changes (no restrictions)
    // After roster announcement: enforce active lineup and IR limits
    if (roster.rosterAnnounced) {
      // Enforce lineup deadline (no changes after game starts)
      await this.checkLineupDeadline(player, league);

      // Check IR spots limit if moving to IR
      if (lineupStatus === 'ir') {
        const irSpots = league.settings?.irSpots || 2;
        const currentIRPlayers = roster.players.filter((p) => p.lineupStatus === 'ir').length;

        if (currentIRPlayers >= irSpots && player.lineupStatus !== 'ir') {
          throw new BadRequestException(`IR spots limit reached. Maximum ${irSpots} IR spots allowed.`);
        }
      }

      // If setting to active, check position limits and goalie start limits
      if (lineupStatus === 'active') {
      const activePlayers = roster.players.filter((p) => p.lineupStatus === 'active');
      const activeAtPosition = activePlayers.filter((p) => p.position === player.position);

      // Default roster size if settings not set
      const defaultRosterSize = {
        forwards: 9, // Minimum 9 forwards required
        defensemen: 6, // Minimum 6 defensemen required
        goalies: 2, // Minimum 2 goalies required
        bench: 3,
      };
      
      const defaultActiveLineup = {
        forwards: 9,
        defensemen: 6,
        goalies: 2,
      };
      
      const rosterSize = league.settings?.rosterSize || defaultRosterSize;
      const activeLineup = league.settings?.activeLineup || defaultActiveLineup;
      
      let maxAtPosition = 0;
      if (player.position === 'F') {
        maxAtPosition = activeLineup.forwards;
      } else if (player.position === 'D') {
        maxAtPosition = activeLineup.defensemen;
      } else if (player.position === 'G') {
        maxAtPosition = activeLineup.goalies;
      }

        if (activeAtPosition.length >= maxAtPosition && player.lineupStatus !== 'active') {
          throw new BadRequestException(
            `Active lineup must have exactly ${maxAtPosition} ${player.position === 'F' ? 'forwards' : player.position === 'D' ? 'defensemen' : 'goalies'} in the active lineup. You currently have ${activeAtPosition.length}.`,
          );
        }

        // Check goalie start limits if activating a goalie
        if (player.position === 'G') {
          await this.checkGoalieStartLimit(roster.id, player.nhlPlayerId, league);
        }
      }
    }

    player.lineupStatus = lineupStatus;
    return this.rosterPlayerRepository.save(player);
  }

  /**
   * Leave a league by removing the roster
   * This allows users to join a different league
   */
  async leaveLeague(rosterId: string, userId: string): Promise<void> {
    const roster = await this.findOne(rosterId);

    // Verify user owns this roster
    if (roster.ownerId !== userId) {
      throw new BadRequestException('You do not own this roster');
    }

    // Get league to update team count
    const league = await this.leagueRepository.findOne({
      where: { id: roster.leagueId },
    });

    if (!league) {
      throw new NotFoundException('League not found');
    }

    // Only allow leaving if league is in draft status
    if (league.status !== 'draft') {
      throw new BadRequestException('Cannot leave league that is not in draft status');
    }

    // Remove all players from the roster (cascade should handle this, but being explicit)
    if (roster.players && roster.players.length > 0) {
      await this.rosterPlayerRepository.remove(roster.players);
    }

    // Remove the roster
    await this.rosterRepository.remove(roster);

    // Update league team count
    await this.leagueRepository.update(roster.leagueId, {
      currentTeams: Math.max(0, league.currentTeams - 1),
    });
  }

  /**
   * Get user rosters with player points included and updated team information
   */
  async getUserRostersWithPlayerPoints(userId: string): Promise<any[]> {
    const rosters = await this.getUserRosters(userId);
    
    // Add player points to each roster and update team information
    const rostersWithPoints = await Promise.all(
      rosters.map(async (roster) => {
        // Update player teams if they've changed (in parallel for better performance)
        await Promise.all(
          (roster.players || []).map((player) => this.updatePlayerTeamIfChanged(player)),
        );
        
        // Reload roster to get updated team information
        const updatedRoster = await this.findOne(roster.id);
        
        const playersWithPoints = await Promise.all(
          (updatedRoster.players || []).map(async (player) => {
            const stats = await this.scoringService.getPlayerStats(roster.id, player.nhlPlayerId);
            return {
              ...player,
              totalPoints: stats.totalPoints,
              goals: stats.goals,
              assists: stats.assists,
              shots: stats.shots,
              hits: stats.hits,
              blocks: stats.blocks,
              pim: stats.pim,
              plusMinus: stats.plusMinus,
            };
          }),
        );

        return {
          ...updatedRoster,
          players: playersWithPoints,
        };
      }),
    );

    return rostersWithPoints;
  }

  /**
   * Get roster with player points included and updated team information
   */
  async findOneWithPlayerPoints(rosterId: string): Promise<any> {
    const roster = await this.findOne(rosterId);
    
    // Update player teams if they've changed (in parallel for better performance)
    await Promise.all(
      (roster.players || []).map((player) => this.updatePlayerTeamIfChanged(player)),
    );
    
    // Reload roster to get updated team information
    const updatedRoster = await this.findOne(rosterId);
    
    // Get player points for each player
    const playersWithPoints = await Promise.all(
      (updatedRoster.players || []).map(async (player) => {
        const stats = await this.scoringService.getPlayerStats(rosterId, player.nhlPlayerId);
        return {
          ...player,
          totalPoints: stats.totalPoints,
          goals: stats.goals,
          assists: stats.assists,
          shots: stats.shots,
          hits: stats.hits,
          blocks: stats.blocks,
          pim: stats.pim,
          plusMinus: stats.plusMinus,
        };
      }),
    );

    return {
      ...updatedRoster,
      players: playersWithPoints,
    };
  }

  /**
   * Get week start date (Monday)
   */
  private getWeekStartDate(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  /**
   * Check weekly transaction limits (3 total changes per week after roster announcement)
   */
  private async checkWeeklyTransactionLimit(
    rosterId: string,
    userId: string,
    type: 'add' | 'drop',
    league: League,
  ): Promise<void> {
    const weekStart = this.getWeekStartDate(new Date());

    // Count total transactions (adds + drops) for this week
    const totalChanges = await this.transactionRepository.count({
      where: {
        rosterId,
        userId,
        weekStartDate: weekStart,
      },
    });

    // After roster announcement, limit is 3 total changes per week (not 3 adds + 3 drops)
    const maxChanges = 3;
    if (totalChanges >= maxChanges) {
      throw new BadRequestException(
        `Weekly limit reached. You can only make ${maxChanges} player changes per week (adds + drops combined). You have made ${totalChanges} changes this week.`,
      );
    }
  }

  /**
   * Check transaction deadline (Sunday only for adds/drops)
   */
  private checkTransactionDeadline(league: League): void {
    const deadline = league.settings?.transactionDeadline || 'sunday';
    
    if (deadline === 'sunday') {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      if (dayOfWeek !== 0) {
        throw new BadRequestException(
          `Transaction deadline: You can only add or drop players on Sundays. Today is ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]}.`,
        );
      }
    }
    // Other deadline types (e.g., 'daily', 'none') can be added here
  }

  /**
   * Check lineup deadline (no changes after game starts)
   */
  private async checkLineupDeadline(player: RosterPlayer, league: League): Promise<void> {
    const deadline = league.settings?.lineupDeadline || 'game-time';
    
    if (deadline === 'game-time') {
      // Check if player's team has a game today that has already started
      try {
        const today = new Date();
        const season = this.getCurrentSeason(today);
        const schedule = await this.nhlService.getTeamSchedule(player.nhlTeam, season);
        
        if (schedule.games) {
          for (const game of schedule.games) {
            const gameDate = new Date(game.gameDate);
            const isToday = this.isSameDay(gameDate, today);
            
            if (isToday) {
              const gameState = game.gameState || 'UNKNOWN';
              const hasStarted = ['LIVE', 'IN_PROGRESS', 'FINAL', 'FINAL_OT', 'FINAL_SO', 'OFF'].includes(gameState);
              
              if (hasStarted) {
                // Check if game start time has passed
                if (game.startTimeUTC) {
                  const gameStartTime = new Date(game.startTimeUTC);
                  if (new Date() >= gameStartTime) {
                    throw new BadRequestException(
                      `Lineup deadline: Cannot change lineup for ${player.playerName}. Their game has already started.`,
                    );
                  }
                } else if (hasStarted) {
                  // If game state indicates it started but no time, assume it has started
                  throw new BadRequestException(
                    `Lineup deadline: Cannot change lineup for ${player.playerName}. Their game has already started.`,
                  );
                }
              }
            }
          }
        }
      } catch (error) {
        // If we can't check the schedule, allow the change (fail open)
        this.logger.warn(`Could not check lineup deadline for player ${player.playerName}:`, error);
      }
    }
    // Other deadline types (e.g., 'daily', 'none') can be added here
  }

  /**
   * Check goalie start limits (max 4 per week)
   */
  private async checkGoalieStartLimit(rosterId: string, nhlPlayerId: number, league: League): Promise<void> {
    const maxGoalieStarts = league.settings?.weeklyLimits?.maxGoalieStarts || 4;
    const weekStart = this.getWeekStartDate(new Date());

    // Count goalie starts for this roster this week
    const goalieStartsThisWeek = await this.goalieStartRepository.count({
      where: {
        rosterId,
        weekStartDate: weekStart,
      },
    });

    if (goalieStartsThisWeek >= maxGoalieStarts) {
      throw new BadRequestException(
        `Goalie start limit reached. You can only start ${maxGoalieStarts} goalies per week. You have already started ${goalieStartsThisWeek} goalies this week.`,
      );
    }
  }

  /**
   * Record a goalie start when a goalie actually plays in a game
   * This should be called from the scoring service when processing games
   */
  async recordGoalieStart(rosterId: string, nhlPlayerId: number, nhlGameId: number): Promise<void> {
    const weekStart = this.getWeekStartDate(new Date());

    // Check if this start is already recorded (idempotency)
    const existing = await this.goalieStartRepository.findOne({
      where: {
        rosterId,
        nhlPlayerId,
        nhlGameId,
      },
    });

    if (existing) {
      return; // Already recorded
    }

    // Record the start
    const goalieStart = this.goalieStartRepository.create({
      rosterId,
      nhlPlayerId,
      nhlGameId,
      weekStartDate: weekStart,
    });

    await this.goalieStartRepository.save(goalieStart);
    this.logger.log(`Recorded goalie start: roster ${rosterId}, player ${nhlPlayerId}, game ${nhlGameId}`);
  }

  /**
   * Helper: Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }


  /**
   * Calculate retroactive points for a player from all completed games before they were added
   */
  private async calculateRetroactivePoints(
    rosterId: string,
    nhlPlayerId: number,
    playerAddedDate: Date,
    league: League,
  ): Promise<void> {
    try {
      this.logger.log(`Calculating retroactive points for player ${nhlPlayerId} in roster ${rosterId}`);

      // Get all teams to find which team this player is on
      const teams = await this.nhlService.getAllTeams();
      const currentSeason = this.getCurrentSeason(new Date());

      // Find player's team by checking all team rosters
      let playerTeam: string | null = null;
      for (const team of teams) {
        try {
          const teamAbbrev = typeof team === 'string' ? team : (team as any).abbrev || team;
          const roster = await this.nhlService.getTeamRoster(teamAbbrev, currentSeason);
          const player = roster.players.find((p) => p.playerId === nhlPlayerId);
          if (player) {
            playerTeam = teamAbbrev;
            break;
          }
        } catch (error) {
          // Continue to next team
        }
      }

      if (!playerTeam) {
        this.logger.warn(`Could not find team for player ${nhlPlayerId}`);
        return;
      }

      // Get team schedule for current season
      const schedule = await this.nhlService.getTeamSchedule(playerTeam, currentSeason);
      if (!schedule.games || schedule.games.length === 0) {
        return;
      }

      // Filter for completed games before player was added
      const completedGames = schedule.games.filter((game) => {
        const gameDate = new Date(game.gameDate);
        return (
          gameDate < playerAddedDate &&
          ['FINAL', 'FINAL_OT', 'FINAL_SO', 'OFF'].includes(game.gameState || '')
        );
      });

      this.logger.log(`Found ${completedGames.length} completed games before player was added`);

      // Process each game
      for (const game of completedGames) {
        const gameId = game.gameId || game.id;
        if (!gameId) continue;

        try {
          // Get boxscore for this game
          const boxscore = await this.nhlService.getBoxscore(gameId);

          // Find player in boxscore
          const allPlayers = [
            ...(boxscore.homeTeam?.players || []),
            ...(boxscore.awayTeam?.players || []),
          ];
          const boxscorePlayer = allPlayers.find((p) => p.playerId === nhlPlayerId);

          if (!boxscorePlayer) {
            continue; // Player didn't play in this game
          }

          // Calculate points using league scoring settings
          const scoring = league.settings?.scoring || {
            goals: 3,
            assists: 2,
            shots: 0.5,
            hits: 0.5,
            blocks: 0.5,
            pim: 0.25,
            plusMinus: 0.5,
          };

          const totalPoints =
            (boxscorePlayer.goals || 0) * scoring.goals +
            (boxscorePlayer.assists || 0) * scoring.assists +
            (boxscorePlayer.shots || 0) * scoring.shots +
            (boxscorePlayer.hits || 0) * scoring.hits +
            (boxscorePlayer.blocks || 0) * scoring.blocks +
            (boxscorePlayer.pim || 0) * scoring.pim +
            (boxscorePlayer.plusMinus || 0) * scoring.plusMinus;

          if (totalPoints === 0) {
            continue; // No points to award
          }

          // Create retroactive scoring event using ScoringService
          await this.scoringService.createRetroactiveScoringEvent({
            nhlGameId: gameId,
            nhlPlayerId,
            rosterId,
            leagueId: league.id,
            pointsAwarded: totalPoints,
            eventData: {
              goals: boxscorePlayer.goals,
              assists: boxscorePlayer.assists,
              shots: boxscorePlayer.shots,
              hits: boxscorePlayer.hits,
              blocks: boxscorePlayer.blocks,
              pim: boxscorePlayer.pim,
              plusMinus: boxscorePlayer.plusMinus,
              gameDate: game.gameDate,
            },
          });
        } catch (error: any) {
          this.logger.warn(`Error processing retroactive game ${gameId}: ${error.message}`);
        }
      }

      this.logger.log(`Completed retroactive scoring for player ${nhlPlayerId}`);
    } catch (error: any) {
      this.logger.error(`Error calculating retroactive points: ${error.message}`);
    }
  }

  /**
   * Get current team for a player by checking all team rosters
   */
  private async getPlayerCurrentTeam(nhlPlayerId: number): Promise<string | null> {
    try {
      const allTeams = await this.nhlService.getAllTeams();
      const currentSeason = this.getCurrentSeason(new Date());

      // Check each team's roster to find the player
      for (const team of allTeams) {
        try {
          const roster = await this.nhlService.getTeamRoster(team, currentSeason);
          const player = roster.players.find((p) => p.playerId === nhlPlayerId);
          if (player) {
            return team; // Return team abbreviation
          }
        } catch (error) {
          // Continue to next team if this one fails
          continue;
        }
      }

      return null; // Player not found on any team
    } catch (error) {
      this.logger.warn(`Error finding current team for player ${nhlPlayerId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Update player's team if it has changed
   */
  private async updatePlayerTeamIfChanged(player: RosterPlayer): Promise<void> {
    const currentTeam = await this.getPlayerCurrentTeam(player.nhlPlayerId);
    
    if (currentTeam && currentTeam !== player.nhlTeam) {
      this.logger.log(
        `Updating player ${player.playerName} (${player.nhlPlayerId}) team from ${player.nhlTeam} to ${currentTeam}`,
      );
      
      await this.rosterPlayerRepository.update(player.id, {
        nhlTeam: currentTeam,
      });
      
      // Update in-memory object
      player.nhlTeam = currentTeam;
    }
  }

  /**
   * Get current season string (e.g., "20242025")
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
   * Announce/lock the roster - after this, only 3 player changes per week allowed
   */
  async announceRoster(rosterId: string, userId: string): Promise<Roster> {
    const roster = await this.findOne(rosterId);

    // Verify user owns this roster
    if (roster.ownerId !== userId) {
      throw new BadRequestException('You do not own this roster');
    }

    // Check minimum roster requirements
    const league = await this.leagueRepository.findOne({
      where: { id: roster.leagueId },
    });

    if (!league) {
      throw new NotFoundException('League not found');
    }

    const players = roster.players || [];
    const minRosterSize = 16;
    const defaultRosterSize = {
      forwards: 9,
      defensemen: 6,
      goalies: 2,
      bench: 3,
    };

    const rosterSize = league.settings?.rosterSize || defaultRosterSize;

    // Check minimum roster size
    if (players.length < minRosterSize) {
      throw new BadRequestException(
        `Cannot announce roster. Must have at least ${minRosterSize} players. Currently have ${players.length}.`,
      );
    }

    // Check position minimums
    const forwards = players.filter((p) => p.position === 'F').length;
    const defensemen = players.filter((p) => p.position === 'D').length;
    const goalies = players.filter((p) => p.position === 'G').length;

    if (forwards < rosterSize.forwards) {
      throw new BadRequestException(
        `Cannot announce roster. Must have at least ${rosterSize.forwards} forwards. Currently have ${forwards}.`,
      );
    }

    if (defensemen < rosterSize.defensemen) {
      throw new BadRequestException(
        `Cannot announce roster. Must have at least ${rosterSize.defensemen} defensemen. Currently have ${defensemen}.`,
      );
    }

    if (goalies < rosterSize.goalies) {
      throw new BadRequestException(
        `Cannot announce roster. Must have at least ${rosterSize.goalies} goalies. Currently have ${goalies}.`,
      );
    }

    // Announce the roster - this locks it and starts scoring immediately
    await this.rosterRepository.update(rosterId, {
      rosterAnnounced: true,
      rosterAnnouncedAt: new Date(),
    });

    this.logger.log(
      `Roster ${rosterId} announced by user ${userId}. Initial roster locked. Scoring will start immediately.`,
    );

    return this.findOne(rosterId);
  }

  /**
   * Remove/delete the current team (roster)
   */
  async removeTeam(rosterId: string, userId: string): Promise<void> {
    const roster = await this.findOne(rosterId);

    // Verify user owns this roster
    if (roster.ownerId !== userId) {
      throw new BadRequestException('You do not own this roster');
    }

    // Get league to update team count
    const league = await this.leagueRepository.findOne({
      where: { id: roster.leagueId },
    });

    if (!league) {
      throw new NotFoundException('League not found');
    }

    // Only allow removing if league is in draft status
    if (league.status !== 'draft') {
      throw new BadRequestException('Cannot remove team from a league that is not in draft status');
    }

    // Remove all players from the roster
    if (roster.players && roster.players.length > 0) {
      await this.rosterPlayerRepository.remove(roster.players);
    }

    // Remove the roster
    await this.rosterRepository.remove(roster);

    // Update league team count
    await this.leagueRepository.update(roster.leagueId, {
      currentTeams: Math.max(0, league.currentTeams - 1),
    });
  }

  /**
   * Update all existing roster players' salaries from MoneyPuck
   * This is used to retroactively update players that were added before MoneyPuck integration
   */
  async updateAllPlayerSalaries(userId: string): Promise<{ updated: number; failed: number }> {
    // Get all rosters for the user
    const rosters = await this.rosterRepository.find({
      where: { ownerId: userId },
      relations: ['players'],
    });

    let updated = 0;
    let failed = 0;

    for (const roster of rosters) {
      if (!roster.players || roster.players.length === 0) continue;

      // Get salaries for all players in this roster
      // First, update each player's current team to ensure we have the latest team
      for (const player of roster.players) {
        await this.updatePlayerTeamIfChanged(player);
      }
      
      // Reload roster to get updated team information
      const updatedRoster = await this.findOne(roster.id);
      
      const players = (updatedRoster.players || []).map((p) => ({
        playerName: p.playerName,
        nhlPlayerId: p.nhlPlayerId,
        teamAbbrev: p.nhlTeam, // This is now the current team
      }));

      const salaryMap = await this.moneyPuckSalaryService.batchUpdateSalaries(players);

      // Update each player's salary
      let newTotalSalary = 0;
      for (const player of roster.players) {
        const newSalary = salaryMap.get(player.nhlPlayerId);
        if (newSalary && newSalary > 0) {
          await this.rosterPlayerRepository.update(
            { id: player.id },
            { salary: newSalary },
          );
          updated++;
          newTotalSalary += newSalary;
        } else {
          // Keep existing salary if MoneyPuck doesn't have data
          newTotalSalary += Number(player.salary);
          failed++;
        }
      }

      // Update roster total salary
      await this.rosterRepository.update(
        { id: roster.id },
        { totalSalary: newTotalSalary },
      );
    }

    return { updated, failed };
  }

  /**
   * Update ALL players across ALL rosters with latest salaries
   * This is a global update that affects all users
   */
  async updateAllPlayersSalariesGlobally(): Promise<{ updated: number; failed: number; total: number }> {
    this.logger.log('Starting global salary update for all players...');
    
    // Get ALL roster players from the database
    const allPlayers = await this.rosterPlayerRepository.find({
      relations: ['roster'],
    });

    this.logger.log(`Found ${allPlayers.length} players to update`);

    // Group by unique player ID to avoid duplicate API calls
    const uniquePlayers = new Map<number, { playerName: string; nhlPlayerId: number; teamAbbrev: string }>();
    
    for (const player of allPlayers) {
      // Update player's current team first
      await this.updatePlayerTeamIfChanged(player);
      
      // Reload player to get updated team
      const updatedPlayer = await this.rosterPlayerRepository.findOne({
        where: { id: player.id },
      });
      
      if (updatedPlayer) {
        // Use the most recent team for each unique player
        const existing = uniquePlayers.get(updatedPlayer.nhlPlayerId);
        if (!existing || existing.teamAbbrev !== updatedPlayer.nhlTeam) {
          uniquePlayers.set(updatedPlayer.nhlPlayerId, {
            playerName: updatedPlayer.playerName,
            nhlPlayerId: updatedPlayer.nhlPlayerId,
            teamAbbrev: updatedPlayer.nhlTeam,
          });
        }
      }
    }

    this.logger.log(`Updating salaries for ${uniquePlayers.size} unique players`);

    // Get salaries for all unique players - FORCE REFRESH to bypass cache
    const playersArray = Array.from(uniquePlayers.values());
    this.logger.log(`💰 Fetching salaries for ${playersArray.length} unique players (force refresh enabled)`);
    this.logger.log(`💰 Sample players: ${playersArray.slice(0, 5).map(p => `${p.playerName} (ID: ${p.nhlPlayerId})`).join(', ')}...`);
    const salaryMap = await this.moneyPuckSalaryService.batchUpdateSalaries(playersArray, true);
    this.logger.log(`💰 Got ${salaryMap.size} salaries from estimation service`);
    
    // Log first 5 salaries to verify they're different
    let count = 0;
    for (const [playerId, salary] of salaryMap.entries()) {
      if (count < 5) {
        const player = playersArray.find(p => p.nhlPlayerId === playerId);
        this.logger.log(`💰 Sample: ${player?.playerName || 'Unknown'} (ID: ${playerId}) = $${(salary / 1000000).toFixed(2)}M`);
        count++;
      }
    }

    // Update all players with their new salaries
    let updated = 0;
    let failed = 0;

    this.logger.log(`🔄 Updating ${allPlayers.length} players in database...`);
    
    for (let i = 0; i < allPlayers.length; i++) {
      const player = allPlayers[i];
      
      // Get salary from the salary map (which uses performance-based calculation from NHL stats)
      let newSalary = salaryMap.get(player.nhlPlayerId);
      
      // If no salary from map, fetch it directly using the salary service
      if (!newSalary || newSalary <= 0) {
        try {
          newSalary = await this.moneyPuckSalaryService.getPlayerSalary(
            player.playerName,
            player.nhlPlayerId,
            player.nhlTeam,
            true, // Force refresh
          );
        } catch (error) {
          this.logger.warn(`Could not fetch salary for ${player.playerName}:`, error);
        }
      }
      
      // Final fallback: position-based default
      if (!newSalary || newSalary <= 0) {
        const baseSalary = player.position === 'G' ? 3000000 : player.position === 'D' ? 2500000 : 2000000;
        newSalary = baseSalary;
      }
      
      if (newSalary && newSalary > 0) {
        const oldSalary = Number(player.salary || 0);
        
        try {
          await this.rosterPlayerRepository.update(
            { id: player.id },
            { salary: newSalary },
          );
          updated++;
          
          if (oldSalary !== newSalary || i < 5) {
            this.logger.log(`💰 [${i+1}/${allPlayers.length}] ${player.playerName} (ID: ${player.nhlPlayerId}): $${(oldSalary / 1000000).toFixed(2)}M → $${(newSalary / 1000000).toFixed(2)}M`);
          }
        } catch (error) {
          this.logger.error(`❌ Failed to update ${player.playerName}:`, error);
          failed++;
        }
      } else {
        failed++;
        this.logger.warn(`⚠️  [${i+1}/${allPlayers.length}] No salary for ${player.playerName} (ID: ${player.nhlPlayerId})`);
      }
    }
    
    this.logger.log(`✅ Database update complete: ${updated} updated, ${failed} failed`);

    // Recalculate total salary for all rosters
    const allRosters = await this.rosterRepository.find({
      relations: ['players'],
    });

    for (const roster of allRosters) {
      if (roster.players && roster.players.length > 0) {
        const totalSalary = roster.players.reduce(
          (sum, p) => sum + Number(p.salary || 0),
          0,
        );
        await this.rosterRepository.update(
          { id: roster.id },
          { totalSalary },
        );
      }
    }

    this.logger.log('🚀 ========================================');
    this.logger.log(`✅ GLOBAL SALARY UPDATE COMPLETE`);
    this.logger.log(`✅ Updated: ${updated}/${allPlayers.length} players`);
    this.logger.log(`⚠️  Failed: ${failed}/${allPlayers.length} players`);
    this.logger.log('🚀 ========================================');

    return { updated, failed, total: allPlayers.length };
  }

  /**
   * Update all existing rosters to use the new salary cap ($95.5M for 2025-26 season)
   */
  async updateAllRostersSalaryCap(): Promise<{ updated: number }> {
    const newCap = 95500000; // $95.5M for 2025-26 season
    const result = await this.rosterRepository.update(
      { salaryCap: 88000000 }, // Update rosters that still have old cap
      { salaryCap: newCap },
    );
    
    // Also update any rosters that might have other old values
    const allRosters = await this.rosterRepository.find();
    let updated = 0;
    for (const roster of allRosters) {
      if (Number(roster.salaryCap) < newCap) {
        await this.rosterRepository.update(
          { id: roster.id },
          { salaryCap: newCap },
        );
        updated++;
      }
    }
    
    this.logger.log(`Updated ${updated} rosters to new salary cap of $${(newCap / 1000000).toFixed(1)}M`);
    return { updated };
  }

  /**
   * Automatically update all player salaries and salary caps when module initializes
   * This runs once when the backend starts
   */
  async onModuleInit() {
    this.logger.log('🔧 RostersService.onModuleInit() - Starting automatic salary update...');
    // Run updates IMMEDIATELY - don't wait
    setTimeout(async () => {
      try {
        this.logger.log('⏰ Timer fired - starting salary updates NOW...');
        // First update salary caps
        this.logger.log('🔄 Updating all rosters to new salary cap ($95.5M)...');
        await this.updateAllRostersSalaryCap();
        
        // Then update player salaries - FORCE DIFFERENT SALARIES FOR EVERY PLAYER
        this.logger.log('🔄 FORCING salary update - every player will get a UNIQUE salary based on their ID...');
        const result = await this.updateAllPlayersSalariesGlobally();
        this.logger.log(`✅ Auto-update complete: ${result.updated}/${result.total} players updated with DIFFERENT salaries!`);
        if (result.failed > 0) {
          this.logger.warn(`⚠️  ${result.failed} players could not be updated (may need manual review)`);
        }
      } catch (error) {
        this.logger.error('❌ Error during auto update:', error);
        this.logger.error('❌ Stack:', error.stack);
      }
    }, 3000); // Wait only 3 seconds after startup
  }
}

