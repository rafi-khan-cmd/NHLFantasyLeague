import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';
import { Trade } from './trade.entity';
import { TradePlayer } from './trade-player.entity';
import { League } from '../leagues/league.entity';
import { Roster } from '../rosters/roster.entity';
import { RostersModule } from '../rosters/rosters.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trade, TradePlayer, League, Roster]),
    RostersModule,
  ],
  controllers: [TradesController],
  providers: [TradesService],
  exports: [TradesService],
})
export class TradesModule {}

