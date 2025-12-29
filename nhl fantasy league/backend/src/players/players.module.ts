import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PlayerPricingService } from './player-pricing.service';
import { MoneyPuckSalaryService } from './moneypuck-salary.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [HttpModule, RedisModule],
  providers: [PlayerPricingService, MoneyPuckSalaryService],
  exports: [PlayerPricingService, MoneyPuckSalaryService],
})
export class PlayersModule {}

