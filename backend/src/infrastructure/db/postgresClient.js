import { Pool } from 'pg';
import { config } from '../../config/index.js';

let pool;

function createPool() {
  if (!config.databaseUrl) return null;

  return new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
  });
}

export function getPgPool() {
  if (pool !== undefined) return pool;
  pool = createPool();
  return pool;
}
