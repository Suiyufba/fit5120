import dotenv from 'dotenv';

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const config = {
  port: toInt(process.env.PORT, 8080),
  fetchIntervalMs: toInt(process.env.FETCH_INTERVAL_MS, 60000),
  requestTimeoutMs: toInt(process.env.REQUEST_TIMEOUT_MS, 10000),
  staleThresholdMs: toInt(process.env.STALE_THRESHOLD_MS, 600000),
  defaultLayers: (process.env.DEFAULT_LAYERS || 'fire,flood,storm,heat').split(',').map((s) => s.trim()).filter(Boolean),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  databaseUrl: process.env.DATABASE_URL || '',
  databaseSsl: (process.env.DATABASE_SSL || 'true').toLowerCase() !== 'false',
  redisUrl: process.env.REDIS_URL || '',
  redisTtlSeconds: toInt(process.env.REDIS_TTL_SECONDS, 90),
  vicroadsApiUrl: process.env.VICROADS_API_URL || '',
  bomFeedUrl: process.env.BOM_FEED_URL || '',
  vicEmergencyFeedUrl: process.env.VIC_EMERGENCY_FEED_URL || '',
  vicEmergencyApiKey: process.env.VIC_EMERGENCY_API_KEY || ''
};
