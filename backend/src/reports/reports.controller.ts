import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('league/:leagueId/weekly')
  @UseGuards(JwtAuthGuard)
  async getWeeklyReport(
    @Param('leagueId') leagueId: string,
    @Query('weekStart') weekStart?: string,
  ) {
    const startDate = weekStart ? new Date(weekStart) : undefined;
    return this.reportsService.getWeeklyReport(leagueId, startDate);
  }
}

