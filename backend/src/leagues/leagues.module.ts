import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaguesController } from './leagues.controller';
import { LeaguesService } from './leagues.service';
import { League } from './league.entity';
import { Roster } from '../rosters/roster.entity';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([League, Roster]),
    forwardRef(() => ScoringModule),
  ],
  controllers: [LeaguesController],
  providers: [LeaguesService],
  exports: [LeaguesService],
})
export class LeaguesModule {}

