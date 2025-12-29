import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TradesService } from './trades.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('trades')
@UseGuards(JwtAuthGuard)
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @Post('propose')
  proposeTrade(@Body() body: {
    proposingRosterId: string;
    receivingRosterId: string;
    proposingPlayers: Array<{ nhlPlayerId: number; playerName: string; position: string; nhlTeam: string }>;
    receivingPlayers: Array<{ nhlPlayerId: number; playerName: string; position: string; nhlTeam: string }>;
    message?: string;
  }, @Request() req) {
    return this.tradesService.proposeTrade(
      body.proposingRosterId,
      body.receivingRosterId,
      body.proposingPlayers,
      body.receivingPlayers,
      body.message,
      req.user.id,
    );
  }

  @Post(':tradeId/accept')
  acceptTrade(@Param('tradeId') tradeId: string, @Request() req) {
    return this.tradesService.acceptTrade(tradeId, req.user.id);
  }

  @Post(':tradeId/reject')
  rejectTrade(@Param('tradeId') tradeId: string, @Request() req) {
    return this.tradesService.rejectTrade(tradeId, req.user.id);
  }

  @Get('league/:leagueId')
  getLeagueTrades(@Param('leagueId') leagueId: string) {
    return this.tradesService.getLeagueTrades(leagueId);
  }

  @Get('roster/:rosterId')
  getRosterTrades(@Param('rosterId') rosterId: string) {
    return this.tradesService.getRosterTrades(rosterId);
  }
}

