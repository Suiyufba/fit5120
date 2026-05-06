import { config } from '../../config/index.js';
import { InMemoryCache } from './inMemoryCache.js';
import { RedisCache } from './redisCache.js';
import type { Cache } from './inMemoryCache.js';

let cache: Cache | undefined;

export function getCache(): Cache {
  if (cache) return cache;

  if (config.redisUrl) {
    cache = new RedisCache(config.redisUrl, config.redisTtlSeconds);
    return cache;
  }

  cache = new InMemoryCache(config.redisTtlSeconds);
  return cache;
}
