import Redis from 'ioredis';
import type { Cache } from './inMemoryCache.js';

export class RedisCache implements Cache {
  private ttlSeconds: number;
  private client: Redis;

  constructor(redisUrl: string, ttlSeconds = 90) {
    this.ttlSeconds = ttlSeconds;
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false,
    });
  }

  async get(key: string): Promise<unknown> {
    const value = await this.client.get(key);
    if (!value) return null;
    return JSON.parse(String(value));
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', this.ttlSeconds);
  }
}
