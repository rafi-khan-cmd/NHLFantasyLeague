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
    // CRITICAL: Don't initialize Redis at all in production without proper config
    // This prevents ANY connection attempts that could crash the app
    
    const redisUrl = this.configService.get('REDIS_URL');
    const host = this.configService.get('REDIS_HOST');
    const port = this.configService.get('REDIS_PORT');
    const password = this.configService.get('REDIS_PASSWORD');
    const nodeEnv = this.configService.get('NODE_ENV') || 'production';
    const isDevelopment = nodeEnv === 'development' || process.env.NODE_ENV === 'development';

    // Check if REDIS_URL is valid (must contain @ to be a real connection string)
    const isValidRedisUrl = redisUrl && 
                            typeof redisUrl === 'string' && 
                            redisUrl.trim().length > 10 && 
                            redisUrl.includes('@');

    // Check if we have valid Redis config
    const hasValidConfig = isValidRedisUrl || (host && port);

    // In production, ONLY initialize if we have valid config
    if (!isDevelopment && !hasValidConfig) {
      console.warn('⚠️  Redis not configured in production - skipping Redis entirely');
      this.client = null;
      this.subscriber = null;
      this.publisher = null;
      return; // Exit early - no Redis initialization
    }

    // In development, allow localhost fallback
    if (isDevelopment && !hasValidConfig) {
      console.log('⚠️  Using localhost Redis (development mode)');
    }

    try {
      let redisOptions: any;
      
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
      } else if (isDevelopment) {
        redisOptions = {
          host: 'localhost',
          port: 6379,
        };
      } else {
        // Should not reach here, but just in case
        console.warn('⚠️  No Redis config - skipping');
        this.client = null;
        this.subscriber = null;
        this.publisher = null;
        return;
      }

      // Only create Redis clients if we have valid options
      if (redisOptions) {
        // Create Redis clients with MAXIMUM error suppression
        const redisConfig: any = {
          ...redisOptions,
          retryStrategy: () => null, // Never retry
          maxRetriesPerRequest: null, // Disable ALL retries
          lazyConnect: true, // Don't connect immediately
          enableOfflineQueue: false, // Don't queue commands
          connectTimeout: 2000, // 2 second timeout
          enableReadyCheck: false,
          showFriendlyErrorStack: false,
          // Prevent any automatic reconnection
          autoResubscribe: false,
          autoResendUnfulfilledCommands: false,
        };

        // Create clients but DON'T connect yet
        this.client = new Redis(redisConfig);
        this.subscriber = new Redis(redisConfig);
        this.publisher = new Redis(redisConfig);

        // CRITICAL: Suppress ALL error events BEFORE any connection attempt
        const noop = () => {}; // Empty function
        
        this.client.on('error', noop);
        this.client.on('close', noop);
        this.client.on('end', noop);
        this.client.on('reconnecting', noop);
        
        this.subscriber.on('error', noop);
        this.subscriber.on('close', noop);
        this.subscriber.on('end', noop);
        this.subscriber.on('reconnecting', noop);
        
        this.publisher.on('error', noop);
        this.publisher.on('close', noop);
        this.publisher.on('end', noop);
        this.publisher.on('reconnecting', noop);

        // Try to connect with timeout - if it fails, just set to null
        const connectWithTimeout = (client: Redis, timeout = 2000) => {
          return Promise.race([
            client.connect(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), timeout)
            ),
          ]).catch(() => {
            // Connection failed - set to null
            return null;
          });
        };

        // Connect all clients with timeout protection
        Promise.allSettled([
          connectWithTimeout(this.client).then(() => {
            if (!this.client || this.client.status !== 'ready') {
              this.client = null;
            }
          }),
          connectWithTimeout(this.subscriber).then(() => {
            if (!this.subscriber || this.subscriber.status !== 'ready') {
              this.subscriber = null;
            }
          }),
          connectWithTimeout(this.publisher).then(() => {
            if (!this.publisher || this.publisher.status !== 'ready') {
              this.publisher = null;
            }
          }),
        ]).then(() => {
          if (this.client && this.client.status === 'ready') {
            console.log('✅ Redis connected successfully');
          } else {
            console.log('⚠️  Redis not available - app will continue without caching');
            // Clean up failed clients
            this.client = null;
            this.subscriber = null;
            this.publisher = null;
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

