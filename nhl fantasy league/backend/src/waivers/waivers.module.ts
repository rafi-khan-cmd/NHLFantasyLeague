import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaiversController } from './waivers.controller';
import { WaiversService } from './waivers.service';
import { Waiver } from '../rosters/waiver.entity';
import { League } from '../leagues/league.entity';
import { Roster } from '../rosters/roster.entity';
import { RostersModule } from '../rosters/rosters.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Waiver, League, Roster]),
    forwardRef(() => RostersModule),
  ],
  controllers: [WaiversController],
  providers: [WaiversService],
  exports: [WaiversService],
})
export class WaiversModule {}

