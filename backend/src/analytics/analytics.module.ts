import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Roster } from '../rosters/roster.entity';
import { RosterPlayer } from '../rosters/roster-player.entity';
import { ScoringEvent } from '../scoring/scoring-event.entity';
import { RosterTransaction } from '../rosters/roster-transaction.entity';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Roster, RosterPlayer, ScoringEvent, RosterTransaction]),
    forwardRef(() => ScoringModule),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

