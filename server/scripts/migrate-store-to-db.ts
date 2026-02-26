/**
 * Store → DB migrasyon script'i.
 * .prompts/index.json dosyasını okur, prompts + prompt_versions tablolarına yazar.
 * Veri bütünlüğü: tek transaction; hata durumunda rollback.
 * @see docs/SAAS_TRANSFORMATION.md
 *
 * Kullanım:
 *   SR_DEFAULT_ORG_ID=<uuid> DATABASE_URL=postgresql://... npx tsx server/scripts/migrate-store-to-db.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getPool } from '../db/client';

const PROMPTS_DIR = process.env.SR_PROMPTS_DIR || join(process.cwd(), '.prompts');
const INDEX_FILE = join(PROMPTS_DIR, 'index.json');

interface StoredPrompt {
  id: string;
  version: string;
  name?: string;
  masterPrompt: string;
  reasoning?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

function loadPromptsFromStore(): StoredPrompt[] {
  if (!existsSync(INDEX_FILE)) {
    console.warn('No .prompts/index.json found. Nothing to migrate.');
    return [];
  }
  const raw = readFileSync(INDEX_FILE, 'utf-8');
  const data = JSON.parse(raw);
  return Array.isArray(data.prompts) ? data.prompts : [];
}

async function migrate(): Promise<{ migrated: number; errors: string[] }> {
  const orgId = process.env.SR_DEFAULT_ORG_ID;
  if (!orgId) {
    throw new Error('SR_DEFAULT_ORG_ID is required for migration');
  }
  const pool = getPool();
  if (!pool) {
    throw new Error('Database pool not available. Set DATABASE_URL or SR_DATABASE_URL');
  }

  const prompts = loadPromptsFromStore();
  if (prompts.length === 0) {
    return { migrated: 0, errors: [] };
  }

  const client = await pool.connect();
  const errors: string[] = [];
  let migrated = 0;

  try {
    await client.query('BEGIN');
    // RLS kullanılıyorsa uygulama org'u set eder
    await client.query(`SET LOCAL app.current_org_id = '${orgId.replace(/'/g, "''")}'`);

    const seenPrompts = new Set<string>();
    for (const p of prompts) {
      try {
        if (!seenPrompts.has(p.id)) {
          await client.query(
            `INSERT INTO prompts (org_id, external_id, name, updated_at)
             VALUES ($1::uuid, $2, $3, now())
             ON CONFLICT (org_id, external_id) DO UPDATE SET name = COALESCE(EXCLUDED.name, prompts.name), updated_at = now()`,
            [orgId, p.id, p.name ?? null]
          );
          seenPrompts.add(p.id);
        }
        const promptRow = await client.query(
          'SELECT id FROM prompts WHERE org_id = $1::uuid AND external_id = $2',
          [orgId, p.id]
        );
        const promptId = promptRow.rows[0]?.id;
        if (!promptId) {
          errors.push(`Prompt not found after insert: ${p.id}`);
          continue;
        }
        await client.query(
          `INSERT INTO prompt_versions (prompt_id, version, master_prompt, reasoning, meta, created_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::timestamptz)
           ON CONFLICT (prompt_id, version) DO UPDATE SET
             master_prompt = EXCLUDED.master_prompt,
             reasoning = EXCLUDED.reasoning,
             meta = EXCLUDED.meta`,
          [
            promptId,
            p.version,
            p.masterPrompt,
            p.reasoning ?? null,
            p.meta ? JSON.stringify(p.meta) : null,
            p.createdAt ?? new Date().toISOString(),
          ]
        );
        migrated++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${p.id}@${p.version}: ${msg}`);
      }
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  return { migrated, errors };
}

migrate()
  .then(({ migrated, errors }) => {
    console.log(`Migrated ${migrated} prompt version(s).`);
    if (errors.length > 0) {
      console.error('Errors:', errors);
    }
    process.exit(errors.length > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
