import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { RosterPlayer } from '../rosters/roster-player.entity';
import { ScoringEvent } from '../scoring/scoring-event.entity';
import { RosterTransaction } from '../rosters/roster-transaction.entity';
import { Roster } from '../rosters/roster.entity';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RosterPlayer, ScoringEvent, RosterTransaction, Roster]),
    forwardRef(() => ScoringModule),
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}

