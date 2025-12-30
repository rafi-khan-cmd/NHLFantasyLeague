import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { MatchupsService } from './matchups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('matchups')
@UseGuards(JwtAuthGuard)
export class MatchupsController {
  constructor(private readonly matchupsService: MatchupsService) {}

  @Get('league/:leagueId')
  getLeagueMatchups(@Param('leagueId') leagueId: string) {
    return this.matchupsService.getLeagueMatchups(leagueId);
  }

  @Get('league/:leagueId/week/:week')
  getWeekMatchups(@Param('leagueId') leagueId: string, @Param('week') week: string) {
    return this.matchupsService.getLeagueMatchups(leagueId, parseInt(week));
  }

  @Post('league/:leagueId/week/:week/create')
  createWeeklyMatchups(
    @Param('leagueId') leagueId: string,
    @Param('week') week: string,
    @Request() req,
  ) {
    // Only commissioner can create matchups
    // TODO: Add commissioner check
    const season = '20242025'; // TODO: Get from league settings
    return this.matchupsService.createWeeklyMatchups(leagueId, parseInt(week), season);
  }

  @Post('league/:leagueId/week/:week/update-scores')
  updateMatchupScores(
    @Param('leagueId') leagueId: string,
    @Param('week') week: string,
    @Request() req,
  ) {
    return this.matchupsService.updateMatchupScores(leagueId, parseInt(week));
  }
}

