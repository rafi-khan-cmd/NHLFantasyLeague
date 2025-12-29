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
    // CRITICAL: Wrap everything in try-catch to prevent ANY crashes
    try {
      // CRITICAL: Don't initialize Redis at all in production without proper config
      // This prevents ANY connection attempts that could crash the app
      
      const redisUrl = this.configService.get('REDIS_URL');
      const host = this.configService.get('REDIS_HOST');
      const port = this.configService.get('REDIS_PORT');
      const password = this.configService.get('REDIS_PASSWORD');
      const nodeEnv = this.configService.get('NODE_ENV') || process.env.NODE_ENV || 'production';
      const isDevelopment = nodeEnv === 'development';

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
        try {
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
          
          // Suppress ALL possible events that could cause issues
          ['error', 'close', 'end', 'reconnecting', 'connect', 'ready', 'disconnect'].forEach(event => {
            this.client?.on(event as any, noop);
            this.subscriber?.on(event as any, noop);
            this.publisher?.on(event as any, noop);
          });

          // Try to connect with timeout - if it fails, just set to null
          const connectWithTimeout = (client: Redis | null, timeout = 2000) => {
            if (!client) return Promise.resolve(null);
            return Promise.race([
              client.connect(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), timeout)
              ),
            ]).catch(() => {
              // Connection failed - return null
              return null;
            });
          };

          // Connect all clients with timeout protection - don't await, just fire and forget
          Promise.allSettled([
            connectWithTimeout(this.client).then(() => {
              if (!this.client || this.client.status !== 'ready') {
                try { this.client?.disconnect(); } catch {}
                this.client = null;
              }
            }),
            connectWithTimeout(this.subscriber).then(() => {
              if (!this.subscriber || this.subscriber.status !== 'ready') {
                try { this.subscriber?.disconnect(); } catch {}
                this.subscriber = null;
              }
            }),
            connectWithTimeout(this.publisher).then(() => {
              if (!this.publisher || this.publisher.status !== 'ready') {
                try { this.publisher?.disconnect(); } catch {}
                this.publisher = null;
              }
            }),
          ]).then(() => {
            if (this.client && this.client.status === 'ready') {
              console.log('✅ Redis connected successfully');
            } else {
              console.log('⚠️  Redis not available - app will continue without caching');
              // Clean up failed clients
              try {
                this.client?.disconnect();
                this.subscriber?.disconnect();
                this.publisher?.disconnect();
              } catch {}
              this.client = null;
              this.subscriber = null;
              this.publisher = null;
            }
          }).catch(() => {
            // If anything fails, just set everything to null
            try {
              this.client?.disconnect();
              this.subscriber?.disconnect();
              this.publisher?.disconnect();
            } catch {}
            this.client = null;
            this.subscriber = null;
            this.publisher = null;
          });
        } catch (redisError) {
          // If creating Redis clients fails, just set to null
          console.warn('⚠️  Failed to create Redis clients - skipping Redis');
          try {
            this.client?.disconnect();
            this.subscriber?.disconnect();
            this.publisher?.disconnect();
          } catch {}
          this.client = null;
          this.subscriber = null;
          this.publisher = null;
        }
      }
    } catch (error: any) {
      // CRITICAL: Catch ANY error and prevent crash
      console.warn('⚠️  Redis initialization failed (non-critical):', error?.message || error);
      console.log('⚠️  App will continue without Redis');
      try {
        this.client?.disconnect();
        this.subscriber?.disconnect();
        this.publisher?.disconnect();
      } catch {}
      this.client = null;
      this.subscriber = null;
      this.publisher = null;
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

