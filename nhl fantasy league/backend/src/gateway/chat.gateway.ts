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
import { ChatService } from '../chat/chat.service';
import { GatewayService } from './gateway.service';
import { RedisService } from '../redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private gatewayService: GatewayService,
    private redisService: RedisService,
  ) {}

  onModuleInit() {
    // Subscribe to Redis pub/sub for chat messages
    this.redisService.subscribe('chat:message', (data) => {
      this.server.to(`league:${data.leagueId}`).emit('chat:new-message', data.message);
    });

    this.redisService.subscribe('chat:delete', (data) => {
      this.server.to(`league:${data.leagueId}`).emit('chat:message-deleted', {
        messageId: data.messageId,
      });
    });
  }

  handleConnection(client: Socket) {
    console.log(`Chat client connected: ${client.id}`);
    this.gatewayService.setServer(this.server);
  }

  handleDisconnect(client: Socket) {
    console.log(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:join')
  async handleJoin(@MessageBody() data: { leagueId: string }, @ConnectedSocket() client: Socket) {
    const { leagueId } = data;
    client.join(`league:${leagueId}`);
    client.emit('chat:joined', { leagueId });
  }

  @SubscribeMessage('chat:leave')
  async handleLeave(@MessageBody() data: { leagueId: string }, @ConnectedSocket() client: Socket) {
    const { leagueId } = data;
    client.leave(`league:${leagueId}`);
    client.emit('chat:left', { leagueId });
  }
}

