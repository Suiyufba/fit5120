import { Pool, type PoolConfig } from 'pg';
import { config } from '../../config/index.js';

let pool: Pool | null | undefined;

function createPool(): Pool | null {
  if (!config.databaseUrl) return null;

  const poolConfig: PoolConfig = {
    connectionString: config.databaseUrl,
    max: 5,
    idleTimeoutMillis: 30000,
  };

  if (config.databaseSsl) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  return new Pool(poolConfig);
}

export function getPgPool(): Pool | null {
  if (pool !== undefined) return pool;
  pool = createPool();
  return pool;
}
