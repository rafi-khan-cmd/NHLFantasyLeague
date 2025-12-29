import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DraftsService } from '../drafts/drafts.service';
import { GatewayService } from './gateway.service';
import { RedisService } from '../redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class DraftGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private draftsService: DraftsService,
    private gatewayService: GatewayService,
    private redisService: RedisService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    this.gatewayService.setServer(this.server);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('draft:join')
  handleJoinDraft(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { leagueId: string },
  ) {
    client.join(`league:${data.leagueId}`);
    client.emit('draft:joined', { leagueId: data.leagueId });
  }

  @SubscribeMessage('draft:leave')
  handleLeaveDraft(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { leagueId: string },
  ) {
    client.leave(`league:${data.leagueId}`);
  }

  @SubscribeMessage('draft:make-pick')
  async handleMakePick(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      draftId: string;
      rosterId: string;
      nhlPlayerId: number;
      playerName: string;
      position: string;
      nhlTeam: string;
    },
  ) {
    try {
      const pick = await this.draftsService.makePick(
        data.draftId,
        data.rosterId,
        {
          nhlPlayerId: data.nhlPlayerId,
          playerName: data.playerName,
          position: data.position,
          nhlTeam: data.nhlTeam,
        },
      );

      const draft = await this.draftsService.findOne(data.draftId);

      // Broadcast to all clients in the league
      this.server.to(`league:${draft.leagueId}`).emit('draft:pick-made', {
        pick,
        draft,
      });

      return { success: true, pick };
    } catch (error: any) {
      client.emit('draft:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('draft:get-state')
  async handleGetDraftState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { draftId: string },
  ) {
    try {
      const draft = await this.draftsService.findOne(data.draftId);
      client.emit('draft:state', draft);
    } catch (error: any) {
      client.emit('draft:error', { message: error.message });
    }
  }
}

