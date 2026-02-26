/**
 * PostgreSQL pool — SR_USE_DB_STORE ile kullanılır.
 * DATABASE_URL veya SR_DATABASE_URL ile yapılandırın.
 */

import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool | null {
  if (pool !== null) return pool;
  const url = process.env.DATABASE_URL || process.env.SR_DATABASE_URL;
  if (!url) return null;
  try {
    pool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    return pool;
  } catch {
    return null;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
