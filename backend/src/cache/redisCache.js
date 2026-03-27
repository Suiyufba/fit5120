import Redis from 'ioredis';

export class RedisCache {
  constructor(redisUrl, ttlSeconds = 90) {
    this.ttlSeconds = ttlSeconds;
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false
    });
  }

  async get(key) {
    const value = await this.client.get(key);
    if (!value) return null;
    return JSON.parse(value);
  }

  async set(key, value) {
    await this.client.set(key, JSON.stringify(value), 'EX', this.ttlSeconds);
  }
}
