import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      // Support both REDIS_URL (Railway format) and REDIS_HOST/REDIS_PORT
      const redisUrl = this.configService.get('REDIS_URL');
      const host = this.configService.get('REDIS_HOST');
      const port = this.configService.get('REDIS_PORT');
      const password = this.configService.get('REDIS_PASSWORD');
      const nodeEnv = this.configService.get('NODE_ENV') || 'production';

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
        if (nodeEnv === 'development') {
          redisOptions = {
            host: 'localhost',
            port: 6379,
          };
          console.log('⚠️  Using localhost Redis (development mode)');
        } else {
          // Production without Redis config - skip entirely
          console.warn('⚠️  Redis not configured - skipping Redis connection (production mode)');
          this.client = null;
          this.subscriber = null;
          this.publisher = null;
          return; // Don't initialize Redis in production without config
        }
      }

      // Only create Redis clients if we have valid options
      if (redisOptions) {
        // Create Redis clients with aggressive error handling
        const redisConfig = {
          ...redisOptions,
          retryStrategy: (times: number) => {
            // Stop retrying after 2 attempts
            if (times > 2) {
              console.warn('⚠️  Redis connection failed after 2 attempts - giving up');
              return null; // Stop retrying
            }
            const delay = Math.min(times * 100, 1000);
            return delay;
          },
          maxRetriesPerRequest: null, // Disable automatic retries
          lazyConnect: true, // Don't connect immediately
          enableOfflineQueue: false, // Don't queue commands when offline
          connectTimeout: 3000, // 3 second timeout
          enableReadyCheck: false, // Skip ready check
          showFriendlyErrorStack: false,
        };

        this.client = new Redis(redisConfig);
        this.subscriber = new Redis(redisConfig);
        this.publisher = new Redis(redisConfig);

        // Suppress all error events to prevent crashes
        this.client.on('error', () => {
          // Silently ignore - we'll handle in methods
        });

        this.subscriber.on('error', () => {
          // Silently ignore
        });

        this.publisher.on('error', () => {
          // Silently ignore
        });

        // Try to connect, but don't block or crash on errors
        Promise.allSettled([
          this.client.connect().catch(() => {
            this.client = null;
          }),
          this.subscriber.connect().catch(() => {
            this.subscriber = null;
          }),
          this.publisher.connect().catch(() => {
            this.publisher = null;
          }),
        ]).then(() => {
          if (this.client && this.client.status === 'ready') {
            console.log('✅ Redis connected successfully');
          } else {
            console.log('⚠️  Redis not available - app will continue without caching');
          }
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
      // Silently fail - Redis is optional
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

