import dotenv from 'dotenv';

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const config = {
  port: toInt(process.env.PORT, 8080),
  fetchIntervalMs: toInt(process.env.FETCH_INTERVAL_MS, 7200000),
  requestTimeoutMs: toInt(process.env.REQUEST_TIMEOUT_MS, 10000),
  staleThresholdMs: toInt(process.env.STALE_THRESHOLD_MS, 600000),
  defaultLayers: (process.env.DEFAULT_LAYERS || 'fire,flood,storm,heat').split(',').map((s) => s.trim()).filter(Boolean),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  databaseUrl: process.env.DATABASE_URL || '',
  databaseSsl: (process.env.DATABASE_SSL || 'true').toLowerCase() !== 'false',
  authJwtSecret: process.env.AUTH_JWT_SECRET || 'dev-only-change-me',
  authJwtExpiresIn: process.env.AUTH_JWT_EXPIRES_IN || '7d',
  redisUrl: process.env.REDIS_URL || '',
  redisTtlSeconds: toInt(process.env.REDIS_TTL_SECONDS, 90),
  vicroadsApiUrl: process.env.VICROADS_API_URL || '',
  vicroadsApiKey: process.env.VICROADS_API_KEY || '',
  bomFeedUrl: process.env.BOM_FEED_URL || '',
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY || '',
  openWeatherApiUrl: process.env.OPENWEATHER_API_URL || 'https://api.openweathermap.org/data/2.5/weather',
  osrmApiBaseUrl: process.env.OSRM_API_BASE_URL || 'https://router.project-osrm.org',
  osrmRouteProfile: process.env.OSRM_ROUTE_PROFILE || 'foot',
  hikingBaseSpeedKmh: Number.parseFloat(process.env.HIKING_BASE_SPEED_KMH || '4.5') || 4.5,
  vicEmergencyFeedUrl: process.env.VIC_EMERGENCY_FEED_URL || '',
  vicEmergencyApiKey: process.env.VIC_EMERGENCY_API_KEY || '',
  adminEmails: (process.env.ADMIN_EMAILS || '1178804854@qq.com')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
  localAdminToken: process.env.LOCAL_ADMIN_TOKEN || 'local-admin-token',
};
