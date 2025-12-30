import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class GatewayService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  getServer(): Server {
    return this.server;
  }

  /**
   * Emit draft update to all clients in a league
   */
  async emitDraftUpdate(leagueId: string, data: any) {
    if (this.server) {
      this.server.to(`league:${leagueId}`).emit('draft:update', data);
    }
  }

  /**
   * Emit scoring update to all clients in a league
   */
  async emitScoringUpdate(leagueId: string, data: any) {
    if (this.server) {
      this.server.to(`league:${leagueId}`).emit('scoring:update', data);
    }
  }
}

