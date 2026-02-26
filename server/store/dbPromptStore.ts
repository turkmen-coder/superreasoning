/**
 * DB tabanlı prompt store — PostgreSQL prompts + prompt_versions.
 * @see docs/MULTI_TENANCY_AND_KEYS.md, server/db/schema.sql
 */

import type { Pool } from 'pg';
import type { StoredPrompt, ListOptions, SavePromptPayload, IPromptStore } from './promptStore';

function resolveOrgId(orgId: string | null | undefined): string | null {
  const id = orgId ?? process.env.SR_DEFAULT_ORG_ID ?? null;
  return id || null;
}

function rowToStoredPrompt(row: {
  external_id: string;
  version: string;
  name: string | null;
  master_prompt: string;
  reasoning: string | null;
  meta: Record<string, unknown> | null;
  created_at: Date;
}): StoredPrompt {
  return {
    id: row.external_id,
    version: row.version,
    name: row.name ?? undefined,
    masterPrompt: row.master_prompt,
    reasoning: row.reasoning ?? undefined,
    meta: (row.meta as StoredPrompt['meta']) ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export class DbPromptStore implements IPromptStore {
  constructor(private pool: Pool) {}

  async list(options?: ListOptions): Promise<StoredPrompt[]> {
    const orgId = resolveOrgId(options?.orgId ?? null);
    if (!orgId) return [];

    const result = await this.pool.query(
      `SELECT p.external_id, pv.version, p.name, pv.master_prompt, pv.reasoning, pv.meta, pv.created_at
       FROM prompt_versions pv
       JOIN prompts p ON p.id = pv.prompt_id
       WHERE p.org_id = $1::uuid
       ORDER BY pv.created_at DESC`,
      [orgId]
    );
    return result.rows.map(rowToStoredPrompt);
  }

  async get(id: string, version?: string, orgId?: string | null): Promise<StoredPrompt | null> {
    const oid = resolveOrgId(orgId);
    if (!oid) return null;

    if (version) {
      const result = await this.pool.query(
        `SELECT p.external_id, pv.version, p.name, pv.master_prompt, pv.reasoning, pv.meta, pv.created_at
         FROM prompts p
         JOIN prompt_versions pv ON pv.prompt_id = p.id
         WHERE p.org_id = $1::uuid AND p.external_id = $2 AND pv.version = $3`,
        [oid, id, version]
      );
      if (result.rows.length === 0) return null;
      return rowToStoredPrompt(result.rows[0]);
    }

    const result = await this.pool.query(
      `SELECT p.external_id, pv.version, p.name, pv.master_prompt, pv.reasoning, pv.meta, pv.created_at
       FROM prompts p
       JOIN prompt_versions pv ON pv.prompt_id = p.id
       WHERE p.org_id = $1::uuid AND p.external_id = $2
       ORDER BY pv.created_at DESC
       LIMIT 1`,
      [oid, id]
    );
    if (result.rows.length === 0) return null;
    return rowToStoredPrompt(result.rows[0]);
  }

  async save(payload: SavePromptPayload, orgId?: string | null): Promise<StoredPrompt> {
    const oid = resolveOrgId(orgId);
    if (!oid) throw new Error('DB store requires org_id or SR_DEFAULT_ORG_ID');

    const createdAt = payload.createdAt ?? new Date().toISOString();

    const promptResult = await this.pool.query(
      `INSERT INTO prompts (org_id, external_id, name, updated_at)
       VALUES ($1::uuid, $2, $3, now())
       ON CONFLICT (org_id, external_id) DO UPDATE SET name = COALESCE(EXCLUDED.name, prompts.name), updated_at = now()
       RETURNING id`,
      [oid, payload.id, payload.name ?? null]
    );
    const promptRowId = promptResult.rows[0].id;

    await this.pool.query(
      `INSERT INTO prompt_versions (prompt_id, version, master_prompt, reasoning, meta, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::timestamptz)
       ON CONFLICT (prompt_id, version) DO UPDATE SET
         master_prompt = EXCLUDED.master_prompt,
         reasoning = EXCLUDED.reasoning,
         meta = EXCLUDED.meta`,
      [
        promptRowId,
        payload.version,
        payload.masterPrompt,
        payload.reasoning ?? null,
        payload.meta ? JSON.stringify(payload.meta) : null,
        createdAt,
      ]
    );

    return {
      id: payload.id,
      version: payload.version,
      name: payload.name,
      masterPrompt: payload.masterPrompt,
      reasoning: payload.reasoning,
      meta: payload.meta,
      createdAt,
    };
  }

  async listVersions(id: string, orgId?: string | null): Promise<StoredPrompt[]> {
    const oid = resolveOrgId(orgId);
    if (!oid) return [];

    const result = await this.pool.query(
      `SELECT p.external_id, pv.version, p.name, pv.master_prompt, pv.reasoning, pv.meta, pv.created_at
       FROM prompts p
       JOIN prompt_versions pv ON pv.prompt_id = p.id
       WHERE p.org_id = $1::uuid AND p.external_id = $2
       ORDER BY pv.created_at DESC`,
      [oid, id]
    );
    return result.rows.map(rowToStoredPrompt);
  }

  async delete(id: string, version?: string, orgId?: string | null): Promise<boolean> {
    const oid = resolveOrgId(orgId);
    if (!oid) return false;

    if (version) {
      const result = await this.pool.query(
        `DELETE FROM prompt_versions
         WHERE prompt_id = (SELECT id FROM prompts WHERE org_id = $1::uuid AND external_id = $2)
         AND version = $3`,
        [oid, id, version]
      );
      return (result.rowCount ?? 0) > 0;
    }

    const result = await this.pool.query(
      `DELETE FROM prompts WHERE org_id = $1::uuid AND external_id = $2`,
      [oid, id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
