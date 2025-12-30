import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { League } from './league.entity';
import { Roster } from '../rosters/roster.entity';
import { ScoringService } from '../scoring/scoring.service';

@Injectable()
export class LeaguesService {
  constructor(
    @InjectRepository(League)
    private leagueRepository: Repository<League>,
    @InjectRepository(Roster)
    private rosterRepository: Repository<Roster>,
    @InjectDataSource()
    private dataSource: DataSource,
    private scoringService: ScoringService,
  ) {}

  async create(createLeagueDto: {
    name: string;
    description?: string;
    commissionerId: string;
    maxTeams?: number;
    settings?: any;
  }): Promise<League> {
    const league = this.leagueRepository.create({
      name: createLeagueDto.name,
      description: createLeagueDto.description,
      commissionerId: createLeagueDto.commissionerId,
      maxTeams: createLeagueDto.maxTeams || 12,
      currentTeams: 0,
      status: 'draft',
      settings: createLeagueDto.settings || {
        scoring: {
          goals: 3,
          assists: 2,
          shots: 0.5,
          hits: 0.5,
          blocks: 0.5,
          pim: 0.25,
          plusMinus: 0.5,
        },
        rosterSize: {
          forwards: 9, // Minimum 9 forwards required
          defensemen: 6, // Minimum 6 defensemen required
          goalies: 2, // Minimum 2 goalies required
          bench: 3, // Additional bench spots (total max 20: 9+6+2+3)
        },
        activeLineup: {
          forwards: 9, // Active lineup must have exactly 9 forwards
          defensemen: 6, // Active lineup must have exactly 6 defensemen
          goalies: 2, // Active lineup must have exactly 2 goalies
        },
        weeklyLimits: {
          maxGoalieStarts: 4, // Maximum 4 goalie starts per week
          maxAdds: 3, // Maximum 3 player adds per week
          maxDrops: 3, // Maximum 3 player drops per week
        },
        transactionDeadline: 'sunday', // Weekly transaction deadline (Sunday)
        lineupDeadline: 'game-time', // Lineup must be set before game time
        irSpots: 2, // Number of injured reserve spots
      },
    });

    return this.leagueRepository.save(league);
  }

  async findAll(): Promise<League[]> {
    return this.leagueRepository.find({
      relations: ['rosters', 'drafts'],
    });
  }

  async findOne(id: string): Promise<League> {
    const league = await this.leagueRepository.findOne({
      where: { id },
      relations: ['rosters', 'rosters.players', 'drafts'],
    });

    if (!league) {
      throw new NotFoundException(`League with ID ${id} not found`);
    }

    return league;
  }

  async joinLeague(leagueId: string, teamName: string, ownerId: string): Promise<Roster> {
    // Check if user is already in another league
    const existingRoster = await this.rosterRepository.findOne({
      where: { ownerId },
      relations: ['league'],
    });

    if (existingRoster) {
      // Check if they're trying to join the same league they're already in
      if (existingRoster.leagueId === leagueId) {
        throw new BadRequestException('You are already in this league');
      }
      // User is in a different league
      throw new BadRequestException(
        `You are already in league "${existingRoster.league?.name || 'another league'}". You can only be in one league at a time.`,
      );
    }

    // Fetch league without relations to avoid TypeORM relationship issues
    const league = await this.leagueRepository.findOne({
      where: { id: leagueId },
    });

    if (!league) {
      throw new NotFoundException(`League with ID ${leagueId} not found`);
    }

    if (league.currentTeams >= league.maxTeams) {
      throw new BadRequestException('League is full');
    }

    if (league.status !== 'draft') {
      throw new BadRequestException('Cannot join league that is not in draft status');
    }

    // Use transaction to ensure atomicity and avoid relationship issues
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Insert roster using raw query to avoid TypeORM relationship management
      const insertResult = await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(Roster)
        .values({
          leagueId: leagueId,
          teamName: teamName,
          ownerId: ownerId,
        })
        .execute();

      const rosterId = insertResult.identifiers[0].id;

      // Update league count
      await queryRunner.manager
        .createQueryBuilder()
        .update(League)
        .set({ currentTeams: league.currentTeams + 1 })
        .where('id = :id', { id: leagueId })
        .execute();

      await queryRunner.commitTransaction();

      // Fetch the created roster
      const savedRoster = await this.rosterRepository.findOne({
        where: { id: rosterId },
      });

      if (!savedRoster) {
        throw new Error('Failed to create roster');
      }

      return savedRoster;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(
    id: string,
    status: 'draft' | 'active' | 'completed',
    userId: string,
  ): Promise<League> {
    const league = await this.findOne(id);

    // Verify user is the commissioner
    if (league.commissionerId !== userId) {
      throw new Error('Only the league commissioner can update league status');
    }

    league.status = status;
    return this.leagueRepository.save(league);
  }

  /**
   * Get league standings with total points for each team
   */
  async getStandings(leagueId: string): Promise<Array<{
    rosterId: string;
    teamName: string;
    ownerId: string;
    totalPoints: number;
    players: number;
  }>> {
    const league = await this.findOne(leagueId);
    
    const rosters = await this.rosterRepository.find({
      where: { leagueId },
      relations: ['players'],
    });

    const standings = await Promise.all(
      rosters.map(async (roster) => {
        // Calculate total points for this roster using ScoringService
        const totalPoints = await this.scoringService.getRosterTotalPoints(roster.id);
        
        return {
          rosterId: roster.id,
          teamName: roster.teamName,
          ownerId: roster.ownerId,
          totalPoints,
          players: roster.players?.length || 0,
        };
      }),
    );

    // Sort by total points (descending)
    standings.sort((a, b) => b.totalPoints - a.totalPoints);

    return standings;
  }
}

