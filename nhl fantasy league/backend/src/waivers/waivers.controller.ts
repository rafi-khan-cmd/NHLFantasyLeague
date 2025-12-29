import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { WaiversService } from './waivers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('waivers')
@UseGuards(JwtAuthGuard)
export class WaiversController {
  constructor(private readonly waiversService: WaiversService) {}

  @Get('league/:leagueId')
  getLeagueWaivers(@Param('leagueId') leagueId: string) {
    return this.waiversService.getLeagueWaivers(leagueId);
  }

  @Post(':waiverId/claim')
  claimFromWaivers(@Param('waiverId') waiverId: string, @Body() body: { rosterId: string }, @Request() req) {
    return this.waiversService.claimFromWaivers(waiverId, body.rosterId, req.user.id);
  }
}

