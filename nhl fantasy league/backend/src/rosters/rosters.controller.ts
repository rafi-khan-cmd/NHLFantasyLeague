import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { RostersService } from './rosters.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddPlayerDto } from './dto/add-player.dto';

@Controller('rosters')
export class RostersController {
  constructor(private readonly rostersService: RostersService) {}

  @Get('force-update-all-salaries')
  @Post('force-update-all-salaries')
  async forceUpdateAllSalaries() {
    // Force immediate update - bypasses cache and updates all players
    // NO AUTH REQUIRED - for emergency updates
    return this.rostersService.updateAllPlayersSalariesGlobally();
  }

  @Get('my-rosters')
  @UseGuards(JwtAuthGuard)
  async getMyRosters(@Request() req) {
    // Return rosters with player points included
    return this.rostersService.getUserRostersWithPlayerPoints(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getOne(@Param('id') id: string) {
    // Return roster with player points included
    return this.rostersService.findOneWithPlayerPoints(id);
  }

  @Get(':id/player-points')
  @UseGuards(JwtAuthGuard)
  async getPlayerPoints(@Param('id') id: string) {
    return this.rostersService.findOneWithPlayerPoints(id);
  }

  @Post(':id/players')
  @UseGuards(JwtAuthGuard)
  addPlayer(
    @Param('id') id: string,
    @Body() playerData: AddPlayerDto,
    @Request() req,
  ) {
    return this.rostersService.addPlayer(id, playerData, req.user.id);
  }

  @Delete(':id/players/:playerId')
  @UseGuards(JwtAuthGuard)
  removePlayer(
    @Param('id') id: string,
    @Param('playerId') playerId: string,
    @Request() req,
  ) {
    return this.rostersService.removePlayer(id, playerId, req.user.id);
  }

  @Post(':id/players/:playerId/lineup')
  @UseGuards(JwtAuthGuard)
  updateLineupStatus(
    @Param('id') id: string,
    @Param('playerId') playerId: string,
    @Body() data: { lineupStatus: 'active' | 'bench' | 'ir' },
    @Request() req,
  ) {
    return this.rostersService.updateLineupStatus(id, playerId, data.lineupStatus, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  leaveLeague(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.rostersService.leaveLeague(id, req.user.id);
  }

  @Post(':id/announce')
  @UseGuards(JwtAuthGuard)
  announceRoster(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.rostersService.announceRoster(id, req.user.id);
  }

  @Delete(':id/remove')
  @UseGuards(JwtAuthGuard)
  removeTeam(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.rostersService.removeTeam(id, req.user.id);
  }

  @Post('update-salaries')
  @UseGuards(JwtAuthGuard)
  async updateAllPlayerSalaries(@Request() req) {
    return this.rostersService.updateAllPlayerSalaries(req.user.id);
  }

  @Post('update-salaries-global')
  @UseGuards(JwtAuthGuard)
  async updateAllPlayersSalariesGlobally(@Request() req) {
    // Only allow admins or the requesting user to update all salaries
    // For now, allow any authenticated user (you can add admin check later)
    return this.rostersService.updateAllPlayersSalariesGlobally();
  }
}
