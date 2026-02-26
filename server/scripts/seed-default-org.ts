#!/usr/bin/env npx tsx
/**
 * Varsayılan org oluştur — Runs/Usage için SR_DEFAULT_ORG_ID.
 * Çalıştırma: SR_DATABASE_URL=... npx tsx server/scripts/seed-default-org.ts
 */

import { getPool } from '../db/client';

async function main() {
  const pool = getPool();
  if (!pool) {
    console.error('DATABASE_URL or SR_DATABASE_URL required');
    process.exit(1);
  }

  const result = await pool.query(
    `INSERT INTO organizations (name, slug, plan)
     VALUES ('Default', 'default', 'free')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, slug`
  );

  const row = result.rows[0];
  console.log('Default org ready.');
  console.log('Add to .env:');
  console.log(`SR_DEFAULT_ORG_ID=${row.id}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
