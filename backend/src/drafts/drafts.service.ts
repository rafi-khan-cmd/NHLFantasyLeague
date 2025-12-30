import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Draft } from './draft.entity';
import { DraftPick } from './draft-pick.entity';
import { Roster } from '../rosters/roster.entity';
import { League } from '../leagues/league.entity';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DraftsService {
  constructor(
    @InjectRepository(Draft)
    private draftRepository: Repository<Draft>,
    @InjectRepository(DraftPick)
    private draftPickRepository: Repository<DraftPick>,
    @InjectRepository(Roster)
    private rosterRepository: Repository<Roster>,
    @InjectRepository(League)
    private leagueRepository: Repository<League>,
    private redisService: RedisService,
  ) {}

  async create(leagueId: string, userId: string): Promise<Draft> {
    const league = await this.leagueRepository.findOne({
      where: { id: leagueId },
      relations: ['rosters'],
    });

    if (!league) {
      throw new NotFoundException(`League with ID ${leagueId} not found`);
    }

    // Verify user is the commissioner
    if (league.commissionerId !== userId) {
      throw new BadRequestException('Only the league commissioner can create a draft');
    }

    // Check if draft already exists
    const existingDraft = await this.draftRepository.findOne({
      where: { leagueId },
    });

    if (existingDraft) {
      return existingDraft;
    }

    const draft = this.draftRepository.create({
      leagueId,
      status: 'pending',
      currentPick: 0,
      pickTimeLimitSeconds: 60,
    });

    return this.draftRepository.save(draft);
  }

  async startDraft(draftId: string): Promise<Draft> {
    const draft = await this.draftRepository.findOne({
      where: { id: draftId },
      relations: ['league', 'league.rosters'],
    });

    if (!draft) {
      throw new NotFoundException(`Draft with ID ${draftId} not found`);
    }

    if (draft.status !== 'pending') {
      throw new BadRequestException('Draft has already started or completed');
    }

    draft.status = 'in_progress';
    draft.currentPick = 1;

    // Set first team's turn (snake draft order)
    const rosters = draft.league.rosters;
    if (rosters.length > 0) {
      draft.currentTeamId = rosters[0].id;
      draft.pickExpiresAt = new Date(
        Date.now() + draft.pickTimeLimitSeconds * 1000,
      );
    }

    await this.draftRepository.save(draft);

    // Set timer in Redis
    await this.setDraftTimer(draftId, draft.pickTimeLimitSeconds);

    return draft;
  }

  async makePick(
    draftId: string,
    userId: string,
    pickData: {
      nhlPlayerId: number;
      playerName: string;
      position: string;
      nhlTeam: string;
    },
  ): Promise<DraftPick> {
    const draft = await this.draftRepository.findOne({
      where: { id: draftId },
      relations: ['league', 'league.rosters', 'picks'],
    });

    if (!draft) {
      throw new NotFoundException(`Draft with ID ${draftId} not found`);
    }

    if (draft.status !== 'in_progress') {
      throw new BadRequestException('Draft is not in progress');
    }

    // Find user's roster
    const userRoster = draft.league.rosters.find((r) => r.ownerId === userId);
    if (!userRoster) {
      throw new BadRequestException('You do not have a roster in this league');
    }

    if (draft.currentTeamId !== userRoster.id) {
      throw new BadRequestException('It is not your turn to pick');
    }

    // Check if player already drafted
    const alreadyDrafted = draft.picks.some(
      (pick) => pick.nhlPlayerId === pickData.nhlPlayerId,
    );
    if (alreadyDrafted) {
      throw new BadRequestException('Player has already been drafted');
    }

    const pick = this.draftPickRepository.create({
      draftId,
      rosterId: userRoster.id,
      pickNumber: draft.currentPick,
      ...pickData,
    });

    await this.draftPickRepository.save(pick);

    // Update draft state
    draft.currentPick += 1;

    // Determine next team (snake draft)
    const rosters = draft.league.rosters;
    const totalPicks = draft.currentPick;
    const round = Math.floor((totalPicks - 1) / rosters.length) + 1;
    const positionInRound = ((totalPicks - 1) % rosters.length) + 1;

    let nextTeamIndex: number;
    if (round % 2 === 1) {
      // Odd round: forward order
      nextTeamIndex = positionInRound % rosters.length;
    } else {
      // Even round: reverse order
      nextTeamIndex = rosters.length - positionInRound;
    }

    draft.currentTeamId = rosters[nextTeamIndex].id;
    draft.pickExpiresAt = new Date(
      Date.now() + draft.pickTimeLimitSeconds * 1000,
    );

    // Check if draft is complete
    const totalRosterSpots =
      draft.league.settings.rosterSize.forwards +
      draft.league.settings.rosterSize.defensemen +
      draft.league.settings.rosterSize.goalies +
      draft.league.settings.rosterSize.bench;

    if (draft.currentPick > totalRosterSpots * rosters.length) {
      draft.status = 'completed';
    }

    await this.draftRepository.save(draft);

    // Reset timer for next pick
    if (draft.status === 'in_progress') {
      await this.setDraftTimer(draftId, draft.pickTimeLimitSeconds);
    }

    return pick;
  }

  async findOne(id: string): Promise<Draft> {
    const draft = await this.draftRepository.findOne({
      where: { id },
      relations: ['league', 'league.rosters', 'picks'],
    });

    if (!draft) {
      throw new NotFoundException(`Draft with ID ${id} not found`);
    }

    return draft;
  }

  private async setDraftTimer(draftId: string, seconds: number): Promise<void> {
    const key = `draft:timer:${draftId}`;
    await this.redisService.set(key, { expiresAt: Date.now() + seconds * 1000 }, seconds);
  }
}

