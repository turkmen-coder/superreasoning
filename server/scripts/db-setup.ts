#!/usr/bin/env npx tsx
/**
 * DB kurulumu: schema + seed
 * Çalıştırma: DATABASE_URL=... npx tsx server/scripts/db-setup.ts
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL || process.env.SR_DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL or SR_DATABASE_URL required');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: url });
  try {
    const schemaPath = join(__dirname, '../db/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    await pool.query(schema);
    console.log('Schema applied.');

    const seedResult = await pool.query(
      `INSERT INTO organizations (name, slug, plan)
       VALUES ('Default', 'default', 'free')
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, slug`
    );
    const row = seedResult.rows[0];
    console.log('Default org ready.');
    console.log('Add to .env:');
    console.log(`SR_DEFAULT_ORG_ID=${row.id}`);
  } finally {
    await pool.end();
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
