import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ScoringService } from './scoring.service';
import { GamePollerService } from './game-poller.service';
import { ScoringEvent } from './scoring-event.entity';
import { Roster } from '../rosters/roster.entity';
import { RosterPlayer } from '../rosters/roster-player.entity';
import { NhlModule } from '../nhl/nhl.module';
import { RedisModule } from '../redis/redis.module';
import { RostersModule } from '../rosters/rosters.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([ScoringEvent, Roster, RosterPlayer]),
    NhlModule,
    RedisModule,
    forwardRef(() => RostersModule),
  ],
  providers: [ScoringService, GamePollerService],
  exports: [ScoringService, GamePollerService],
})
export class ScoringModule {}

