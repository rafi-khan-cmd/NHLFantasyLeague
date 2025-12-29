import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLeagueDto } from './dto/create-league.dto';
import { JoinLeagueDto } from './dto/join-league.dto';

@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createLeagueDto: CreateLeagueDto, @Request() req) {
    return this.leaguesService.create({
      ...createLeagueDto,
      commissionerId: req.user.id, // Use authenticated user
    });
  }

  @Get()
  findAll() {
    return this.leaguesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leaguesService.findOne(id);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  joinLeague(
    @Param('id') id: string,
    @Body() joinDto: JoinLeagueDto,
    @Request() req,
  ) {
    return this.leaguesService.joinLeague(id, joinDto.teamName, req.user.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: { status: 'draft' | 'active' | 'completed' },
    @Request() req,
  ) {
    return this.leaguesService.updateStatus(id, updateDto.status, req.user.id);
  }

  @Get(':id/standings')
  getStandings(@Param('id') id: string) {
    return this.leaguesService.getStandings(id);
  }
}

