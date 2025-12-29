import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ScoringService } from '../scoring/scoring.service';
import { GatewayService } from './gateway.service';
import { RedisService } from '../redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ScoringGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private scoringService: ScoringService,
    private gatewayService: GatewayService,
    private redisService: RedisService,
  ) {}

  onModuleInit() {
    // Subscribe to Redis pub/sub for scoring updates after module initialization
    setTimeout(() => {
      const client = this.redisService.getClient();
      if (client) {
        this.redisService.subscribe('scoring:update', (message) => {
          this.handleScoringUpdate(message);
        });
      } else {
        console.log('⚠️  Redis not available - scoring pub/sub disabled');
      }
    }, 1000);
  }

  handleConnection(client: Socket) {
    console.log(`Scoring client connected: ${client.id}`);
    this.gatewayService.setServer(this.server);
  }

  handleDisconnect(client: Socket) {
    console.log(`Scoring client disconnected: ${client.id}`);
  }

  @SubscribeMessage('scoring:join')
  handleJoinScoring(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { leagueId: string },
  ) {
    client.join(`league:${data.leagueId}`);
    client.emit('scoring:joined', { leagueId: data.leagueId });
  }

  @SubscribeMessage('scoring:leave')
  handleLeaveScoring(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { leagueId: string },
  ) {
    client.leave(`league:${data.leagueId}`);
  }

  @SubscribeMessage('scoring:get-summary')
  async handleGetSummary(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { leagueId: string },
  ) {
    try {
      const summary = await this.scoringService.getLeagueScoringSummary(data.leagueId);
      client.emit('scoring:summary', summary);
    } catch (error: any) {
      client.emit('scoring:error', { message: error.message });
    }
  }

  private handleScoringUpdate(message: any) {
    // Broadcast scoring update to all clients in the league
    this.server.to(`league:${message.leagueId}`).emit('scoring:update', message);
  }
}

