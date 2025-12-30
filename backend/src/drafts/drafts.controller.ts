import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { DraftsService } from './drafts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('drafts')
@UseGuards(JwtAuthGuard)
export class DraftsController {
  constructor(private readonly draftsService: DraftsService) {}

  @Post()
  create(@Body() createDraftDto: { leagueId: string }, @Request() req) {
    // Verify user is commissioner of the league
    return this.draftsService.create(createDraftDto.leagueId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.draftsService.findOne(id);
  }

  @Post(':id/start')
  startDraft(@Param('id') id: string) {
    return this.draftsService.startDraft(id);
  }

  @Post(':id/pick')
  makePick(
    @Param('id') id: string,
    @Body() pickDto: {
      nhlPlayerId: number;
      playerName: string;
      position: string;
      nhlTeam: string;
    },
    @Request() req,
  ) {
    return this.draftsService.makePick(id, req.user.id, {
      nhlPlayerId: pickDto.nhlPlayerId,
      playerName: pickDto.playerName,
      position: pickDto.position,
      nhlTeam: pickDto.nhlTeam,
    });
  }
}

