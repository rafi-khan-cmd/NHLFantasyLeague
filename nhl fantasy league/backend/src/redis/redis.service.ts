import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    try {
      // Support both REDIS_URL (Railway format) and REDIS_HOST/REDIS_PORT
      const redisUrl = this.configService.get('REDIS_URL');
      const host = this.configService.get('REDIS_HOST');
      const port = this.configService.get('REDIS_PORT');
      const password = this.configService.get('REDIS_PASSWORD');

      // Prioritize REDIS_URL (if valid), then REDIS_HOST/REDIS_PORT, fallback to localhost only in dev
      let redisOptions: any;
      
      // Check if REDIS_URL is valid (not empty and contains @ or has more than just "redis://")
      const isValidRedisUrl = redisUrl && redisUrl.trim() && redisUrl.length > 10 && redisUrl.includes('@');
      
      if (isValidRedisUrl) {
        redisOptions = { url: redisUrl };
        console.log('✅ Using REDIS_URL for connection');
      } else if (host && port) {
        redisOptions = {
          host,
          port: parseInt(port),
          password: password || undefined,
        };
        console.log(`✅ Using REDIS_HOST/REDIS_PORT: ${host}:${port}`);
      } else {
        // Only use localhost in development - skip in production
        if (this.configService.get('NODE_ENV') === 'development') {
          redisOptions = {
            host: 'localhost',
            port: 6379,
          };
          console.log('⚠️  Using localhost Redis (development mode)');
        } else {
          console.warn('⚠️  Redis not configured - skipping Redis connection');
          // Don't initialize Redis clients at all
          this.client = null;
          this.subscriber = null;
          this.publisher = null;
          return; // Don't initialize Redis in production without config
        }
      }

      // Only create Redis clients if we have valid options
      if (redisOptions) {
        this.client = new Redis({
          ...redisOptions,
          retryStrategy: (times) => {
            // Stop retrying after 3 attempts
            if (times > 3) {
              return null; // Stop retrying
            }
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 1, // Only 1 retry
          lazyConnect: true, // Don't connect immediately
          enableOfflineQueue: false, // Don't queue commands when offline
          connectTimeout: 5000, // 5 second timeout
        });

        this.subscriber = new Redis({
          ...redisOptions,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          enableOfflineQueue: false,
          connectTimeout: 5000,
        });

        this.publisher = new Redis({
          ...redisOptions,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          enableOfflineQueue: false,
          connectTimeout: 5000,
        });

        // Try to connect, but don't block on errors
        this.client.connect().catch((err) => {
          console.error('⚠️  Redis connection failed (non-critical):', err.message);
          console.log('⚠️  App will continue without Redis caching');
          // Set to null so methods know Redis is unavailable
          this.client = null;
        });

        this.subscriber.connect().catch((err) => {
          console.error('⚠️  Redis subscriber connection failed:', err.message);
          this.subscriber = null;
        });

        this.publisher.connect().catch((err) => {
          console.error('⚠️  Redis publisher connection failed:', err.message);
          this.publisher = null;
        });

        this.client.on('error', (err) => {
          console.error('Redis Client Error (non-critical):', err.message);
        });

        this.client.on('connect', () => {
          console.log('✅ Redis connected successfully');
        });
      }
    } catch (error) {
      console.error('⚠️  Redis initialization error (non-critical):', error);
      console.log('⚠️  App will continue without Redis');
    }
  }

  onModuleDestroy() {
    this.client?.disconnect();
    this.subscriber?.disconnect();
    this.publisher?.disconnect();
  }

  getClient(): Redis | null {
    return this.client;
  }

  getSubscriber(): Redis | null {
    return this.subscriber;
  }

  getPublisher(): Redis | null {
    return this.publisher;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || this.client.status !== 'ready') {
      return null;
    }
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.client || this.client.status !== 'ready') {
      return;
    }
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || this.client.status !== 'ready') {
      return;
    }
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || this.client.status !== 'ready') {
      return false;
    }
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    if (!this.client || this.client.status !== 'ready') {
      return 0;
    }
    try {
      const count = await this.client.incr(key);
      if (ttlSeconds && count === 1) {
        await this.client.expire(key, ttlSeconds);
      }
      return count;
    } catch (error) {
      console.error('Redis increment error:', error);
      return 0;
    }
  }

  async publish(channel: string, message: any): Promise<void> {
    if (!this.publisher || this.publisher.status !== 'ready') {
      return;
    }
    try {
      await this.publisher.publish(channel, JSON.stringify(message));
    } catch (error) {
      console.error('Redis publish error:', error);
    }
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    if (!this.subscriber || this.subscriber.status !== 'ready') {
      return;
    }
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (ch, msg) => {
        if (ch === channel) {
          callback(JSON.parse(msg));
        }
      });
    } catch (error) {
      console.error('Redis subscribe error:', error);
    }
  }
}

