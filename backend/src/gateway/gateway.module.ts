import { Module } from '@nestjs/common';
import { DraftsModule } from '../drafts/drafts.module';
import { ScoringModule } from '../scoring/scoring.module';
import { ChatModule } from '../chat/chat.module';
import { RedisModule } from '../redis/redis.module';
import { GatewayService } from './gateway.service';
import { DraftGateway } from './draft.gateway';
import { ScoringGateway } from './scoring.gateway';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [DraftsModule, ScoringModule, ChatModule, RedisModule],
  providers: [GatewayService, DraftGateway, ScoringGateway, ChatGateway],
  exports: [DraftGateway, ScoringGateway, ChatGateway, GatewayService],
})
export class GatewayModule {}

