import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NhlModule } from './nhl/nhl.module';
import { LeaguesModule } from './leagues/leagues.module';
import { DraftsModule } from './drafts/drafts.module';
import { ScoringModule } from './scoring/scoring.module';
import { GatewayModule } from './gateway/gateway.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { RostersModule } from './rosters/rosters.module';
import { PlayersModule } from './players/players.module';
import { MatchupsModule } from './matchups/matchups.module';
import { WaiversModule } from './waivers/waivers.module';
import { TradesModule } from './trades/trades.module';
import { StatsModule } from './stats/stats.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ChatModule } from './chat/chat.module';
import { ReportsModule } from './reports/reports.module';
import { dataSourceOptions } from './data-source';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    // Conditionally load RedisModule - only if not on Railway without config
    ...(process.env.RAILWAY_ENVIRONMENT && !process.env.REDIS_URL && !process.env.REDIS_HOST
      ? [] // Skip RedisModule entirely on Railway without Redis config
      : [RedisModule]),
    AuthModule,
    PlayersModule,
    RostersModule,
    NhlModule,
    LeaguesModule,
    DraftsModule,
    ScoringModule,
    GatewayModule,
    MatchupsModule,
    WaiversModule,
    TradesModule,
    StatsModule,
    AnalyticsModule,
    ChatModule,
    ReportsModule,
  ],
})
export class AppModule {}

