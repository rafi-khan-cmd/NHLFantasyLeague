import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchupsController } from './matchups.controller';
import { MatchupsService } from './matchups.service';
import { Matchup } from './matchup.entity';
import { League } from '../leagues/league.entity';
import { Roster } from '../rosters/roster.entity';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Matchup, League, Roster]),
    ScoringModule,
  ],
  controllers: [MatchupsController],
  providers: [MatchupsService],
  exports: [MatchupsService],
})
export class MatchupsModule {}

