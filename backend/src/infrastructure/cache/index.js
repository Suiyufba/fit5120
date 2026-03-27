import { config } from '../../config/index.js';
import { InMemoryCache } from './inMemoryCache.js';
import { RedisCache } from './redisCache.js';

let cache;

export function getCache() {
  if (cache) return cache;

  if (config.redisUrl) {
    cache = new RedisCache(config.redisUrl, config.redisTtlSeconds);
    return cache;
  }

  cache = new InMemoryCache(config.redisTtlSeconds);
  return cache;
}
