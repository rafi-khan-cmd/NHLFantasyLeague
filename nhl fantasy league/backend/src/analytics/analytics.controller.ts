import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('team/:rosterId/efficiency')
  @UseGuards(JwtAuthGuard)
  async getTeamEfficiency(@Param('rosterId') rosterId: string) {
    return this.analyticsService.getTeamEfficiency(rosterId);
  }

  @Get('team/:rosterId/transactions')
  @UseGuards(JwtAuthGuard)
  async getTransactionAnalysis(
    @Param('rosterId') rosterId: string,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getTransactionAnalysis(rosterId, days ? parseInt(days) : 30);
  }

  @Get('league/:leagueId/projections')
  @UseGuards(JwtAuthGuard)
  async getProjectedStandings(@Param('leagueId') leagueId: string) {
    return this.analyticsService.getProjectedStandings(leagueId);
  }

  @Get('player/:nhlPlayerId/vorp')
  @UseGuards(JwtAuthGuard)
  async getPlayerVORP(
    @Param('nhlPlayerId') nhlPlayerId: string,
    @Query('position') position: 'F' | 'D' | 'G',
  ) {
    return this.analyticsService.getPlayerVORP(parseInt(nhlPlayerId), position);
  }
}

