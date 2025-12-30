import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RostersController } from './rosters.controller';
import { RostersService } from './rosters.service';
import { Roster } from './roster.entity';
import { RosterPlayer } from './roster-player.entity';
import { RosterTransaction } from './roster-transaction.entity';
import { GoalieStart } from './goalie-start.entity';
import { League } from '../leagues/league.entity';
import { PlayersModule } from '../players/players.module';
import { ScoringModule } from '../scoring/scoring.module';
import { NhlModule } from '../nhl/nhl.module';
import { WaiversModule } from '../waivers/waivers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Roster, RosterPlayer, RosterTransaction, GoalieStart, League]),
    PlayersModule,
    forwardRef(() => ScoringModule),
    NhlModule,
    forwardRef(() => WaiversModule),
  ],
  controllers: [RostersController],
  providers: [RostersService],
  exports: [RostersService],
})
export class RostersModule {}

