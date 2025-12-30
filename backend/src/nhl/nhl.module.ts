import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NhlService } from './nhl.service';
import { NhlController } from './nhl.controller';
import { RedisModule } from '../redis/redis.module';
import { PlayersModule } from '../players/players.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    RedisModule,
    PlayersModule,
  ],
  providers: [NhlService],
  controllers: [NhlController],
  exports: [NhlService],
})
export class NhlModule {}

