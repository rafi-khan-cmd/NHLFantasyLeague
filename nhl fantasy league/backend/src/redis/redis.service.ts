import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    // Support both REDIS_URL (Railway format) and REDIS_HOST/REDIS_PORT
    const redisUrl = this.configService.get('REDIS_URL');
    const host = this.configService.get('REDIS_HOST');
    const port = this.configService.get('REDIS_PORT');
    const password = this.configService.get('REDIS_PASSWORD');

    // Prioritize REDIS_URL, then REDIS_HOST/REDIS_PORT, fallback to localhost only in dev
    let redisOptions: any;
    
    if (redisUrl && redisUrl.trim() && redisUrl !== 'redis://') {
      redisOptions = { url: redisUrl };
    } else if (host && port) {
      redisOptions = {
        host,
        port: parseInt(port),
        password: password || undefined,
      };
    } else {
      // Only use localhost in development
      redisOptions = {
        host: 'localhost',
        port: 6379,
      };
    }

    this.client = new Redis({
      ...redisOptions,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.subscriber = new Redis(redisOptions);
    this.publisher = new Redis(redisOptions);

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
  }

  onModuleDestroy() {
    this.client?.disconnect();
    this.subscriber?.disconnect();
    this.publisher?.disconnect();
  }

  getClient(): Redis {
    return this.client;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  getPublisher(): Redis {
    return this.publisher;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const count = await this.client.incr(key);
    if (ttlSeconds && count === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return count;
  }

  async publish(channel: string, message: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        callback(JSON.parse(msg));
      }
    });
  }
}

