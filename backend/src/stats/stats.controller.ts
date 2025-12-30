import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  async getDashboard() {
    return this.statsService.getPlayerDashboard();
  }

  @Get('player/:nhlPlayerId/trends')
  @UseGuards(JwtAuthGuard)
  async getPlayerTrends(
    @Param('nhlPlayerId') nhlPlayerId: string,
    @Query('days') days?: string,
  ) {
    return this.statsService.getPlayerTrends(parseInt(nhlPlayerId), days ? parseInt(days) : 7);
  }

  @Get('rankings/:position')
  @UseGuards(JwtAuthGuard)
  async getPositionRankings(
    @Param('position') position: 'F' | 'D' | 'G',
    @Query('limit') limit?: string,
  ) {
    return this.statsService.getPositionRankings(position, limit ? parseInt(limit) : 20);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getTransactionTrends(@Query('days') days?: string) {
    return this.statsService.getTransactionTrends(days ? parseInt(days) : 7);
  }

  @Get('streaks')
  @UseGuards(JwtAuthGuard)
  async getStreaks(@Query('days') days?: string) {
    return this.statsService.getPlayerStreaks(days ? parseInt(days) : 7);
  }
}

