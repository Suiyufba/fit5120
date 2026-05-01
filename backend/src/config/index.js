import dotenv from 'dotenv';

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const isTestEnv = process.env.NODE_ENV === 'test';

function requireEnv(name, { minLength = 1 } = {}) {
  const value = String(process.env[name] || '').trim();
  if (isTestEnv) return value;
  if (!value || value.length < minLength) {
    throw new Error(`Missing or invalid required environment variable: ${name}`);
  }
  return value;
}

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const corsOriginRaw = isTestEnv
  ? String(process.env.CORS_ORIGIN || 'http://localhost:5173')
  : requireEnv('CORS_ORIGIN');
const corsOrigins = parseCsv(corsOriginRaw);
if (!isTestEnv && (!corsOrigins.length || corsOrigins.includes('*'))) {
  throw new Error('CORS_ORIGIN must explicitly list trusted origin(s), wildcard is not allowed');
}

export const config = {
  port: toInt(process.env.PORT, 8080),
  fetchIntervalMs: toInt(process.env.FETCH_INTERVAL_MS, 7200000),
  requestTimeoutMs: toInt(process.env.REQUEST_TIMEOUT_MS, 10000),
  staleThresholdMs: toInt(process.env.STALE_THRESHOLD_MS, 600000),
  defaultLayers: parseCsv(process.env.DEFAULT_LAYERS || 'fire,flood,storm,heat'),
  corsOrigins,
  databaseUrl: process.env.DATABASE_URL || '',
  databaseSsl: (process.env.DATABASE_SSL || 'true').toLowerCase() !== 'false',
  authJwtSecret: isTestEnv
    ? String(process.env.AUTH_JWT_SECRET || 'test-only-jwt-secret-please-change')
    : requireEnv('AUTH_JWT_SECRET', { minLength: 32 }),
  authJwtExpiresIn: process.env.AUTH_JWT_EXPIRES_IN || '7d',
  redisUrl: process.env.REDIS_URL || '',
  redisTtlSeconds: toInt(process.env.REDIS_TTL_SECONDS, 90),
  vicroadsApiUrl: process.env.VICROADS_API_URL || '',
  vicroadsApiKey: process.env.VICROADS_API_KEY || '',
  bomFeedUrl: process.env.BOM_FEED_URL || '',
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY || '',
  openWeatherApiUrl: process.env.OPENWEATHER_API_URL || 'https://api.openweathermap.org/data/2.5/weather',
  openRouteServiceApiBaseUrl: process.env.OPENROUTESERVICE_API_BASE_URL || 'https://api.openrouteservice.org',
  openRouteServiceApiKey: isTestEnv ? String(process.env.OPENROUTESERVICE_API_KEY || '') : requireEnv('OPENROUTESERVICE_API_KEY'),
  openRouteServiceProfile: process.env.OPENROUTESERVICE_PROFILE || 'foot-hiking',
  openRouteServiceSnapRadiusM: toInt(process.env.OPENROUTESERVICE_SNAP_RADIUS_M, 1000),
  hikingBaseSpeedKmh: Number.parseFloat(process.env.HIKING_BASE_SPEED_KMH || '4.5') || 4.5,
  openTopoDataApiUrl: process.env.OPENTOPO_DATA_API_URL || 'https://api.opentopodata.org/',
  openTopoDataDataset: process.env.OPENTOPO_DATA_DATASET || 'aster30m',
  openMeteoElevationApiUrl: process.env.OPEN_METEO_ELEVATION_API_URL || 'https://api.open-meteo.com/v1/elevation',
  overpassApiUrl: process.env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter',
  vicEmergencyFeedUrl: process.env.VIC_EMERGENCY_FEED_URL || '',
  vicEmergencyApiKey: process.env.VIC_EMERGENCY_API_KEY || '',
  aiServiceUrl: process.env.AI_SERVICE_URL || `http://localhost:${toInt(process.env.AI_SERVICE_PORT, 8090)}`,
  aiServiceAuthToken: process.env.AI_SERVICE_AUTH_TOKEN || '',
  aiServiceRequestTimeoutMs: toInt(process.env.AI_SERVICE_REQUEST_TIMEOUT_MS, 5000),
};
