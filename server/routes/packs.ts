/**
 * Prompt Pack routes — CRUD for prompt collections.
 *
 * GET    /v1/packs              — List packs (viewer+)
 * POST   /v1/packs              — Create pack (editor+)
 * GET    /v1/packs/:id          — Get single pack
 * PATCH  /v1/packs/:id          — Update pack (editor+)
 * DELETE /v1/packs/:id          — Delete pack (admin+)
 * POST   /v1/packs/:id/prompts  — Add prompts to pack
 * DELETE /v1/packs/:id/prompts  — Remove prompts from pack
 */

import { Router } from 'express';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { requirePermission } from '../middleware/rbac';
import { getPool } from '../db/client';
import { writeAuditLog } from '../lib/auditLog';
import { apiRateLimiter } from '../middleware/rateLimit';
import { optionalApiKey } from '../middleware/auth';
import type { AuthUser } from '../middleware/supabaseAuth';
import type { PromptPack, CreatePackPayload, UpdatePackPayload } from '../../types/promptPack';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();
const withKey = [optionalApiKey];

/** GET /v1/packs — List packs visible to user */
router.get('/packs', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
  const user = req.authUser as AuthUser | undefined;
  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

    const orgId = user?.orgId;
    let query: string;
    let params: any[];

    if (orgId) {
      // Show org packs + public packs
      query = `SELECT * FROM prompt_packs
               WHERE org_id = $1::uuid OR visibility = 'public'
               ORDER BY updated_at DESC`;
      params = [orgId];
    } else {
      // Only public packs
      query = `SELECT * FROM prompt_packs WHERE visibility = 'public' ORDER BY updated_at DESC`;
      params = [];
    }

    const result = await pool.query(query, params);
    const packs = result.rows.map(mapRowToPack);

    res.json({ packs, total: packs.length });
}));

/** POST /v1/packs — Create a new pack */
router.post('/packs', ...withKey, apiRateLimiter, requireAnyAuth, requirePermission('pack:create'), asyncHandler(async (req, res) => {
  const user = req.authUser as AuthUser;
  if (!user.orgId) return res.status(400).json({ error: 'No organization context' });

  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

  const body = req.body as CreatePackPayload | undefined;
  if (!body?.name || typeof body.name !== 'string') {
    return res.status(400).json({ error: 'name (string) required' });
  }
  if (!body.promptIds || !Array.isArray(body.promptIds) || body.promptIds.length === 0) {
    return res.status(400).json({ error: 'promptIds (string[]) required (at least 1)' });
  }

  const visibility = ['private', 'org', 'public'].includes(body.visibility ?? '')
    ? body.visibility! : 'private';

    const result = await pool.query(
      `INSERT INTO prompt_packs (org_id, name, description, prompt_ids, visibility, tags, created_by)
       VALUES ($1::uuid, $2, $3, $4::text[], $5, $6::text[], $7::uuid)
       RETURNING *`,
      [
        user.orgId,
        body.name.slice(0, 200),
        (body.description ?? '').slice(0, 1000),
        body.promptIds.slice(0, 100),
        visibility,
        (body.tags ?? []).slice(0, 20),
        user.userId,
      ]
    );

    const pack = mapRowToPack(result.rows[0]);

    writeAuditLog(pool, {
      orgId: user.orgId,
      userId: user.userId,
      action: 'prompt_save',
      resourceType: 'pack',
      resourceId: pack.id,
      metadata: { name: pack.name, promptCount: pack.promptIds.length },
      ip: req.ip ?? undefined,
    }).catch(() => {});

    res.status(201).json(pack);
}));

/** GET /v1/packs/:id — Get a single pack */
router.get('/packs/:id', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
  const user = req.authUser as AuthUser | undefined;
  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

    const packId = req.params.id as string;
    const result = await pool.query('SELECT * FROM prompt_packs WHERE id = $1::uuid', [packId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pack not found' });
    }

    const pack = mapRowToPack(result.rows[0]);

    // Visibility check
    if (pack.visibility === 'private' && pack.orgId !== user?.orgId) {
      return res.status(404).json({ error: 'Pack not found' });
    }
    if (pack.visibility === 'org' && pack.orgId !== user?.orgId) {
      return res.status(404).json({ error: 'Pack not found' });
    }

    res.json(pack);
}));

/** PATCH /v1/packs/:id — Update pack metadata */
router.patch('/packs/:id', ...withKey, apiRateLimiter, requireAnyAuth, requirePermission('pack:create'), asyncHandler(async (req, res) => {
  const user = req.authUser as AuthUser;
  if (!user.orgId) return res.status(400).json({ error: 'No organization context' });

  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

  const packId = req.params.id as string;
  const body = req.body as UpdatePackPayload | undefined;

    // Verify ownership
    const existing = await pool.query(
      'SELECT * FROM prompt_packs WHERE id = $1::uuid AND org_id = $2::uuid',
      [packId, user.orgId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Pack not found' });
    }

    // Build update SET clause dynamically
    const sets: string[] = ['updated_at = now()'];
    const params: any[] = [];
    let idx = 1;

    if (body?.name) {
      sets.push(`name = $${idx}`);
      params.push(body.name.slice(0, 200));
      idx++;
    }
    if (body?.description !== undefined) {
      sets.push(`description = $${idx}`);
      params.push((body.description ?? '').slice(0, 1000));
      idx++;
    }
    if (body?.promptIds) {
      sets.push(`prompt_ids = $${idx}::text[]`);
      params.push(body.promptIds.slice(0, 100));
      idx++;
    }
    if (body?.visibility) {
      sets.push(`visibility = $${idx}`);
      params.push(body.visibility);
      idx++;
    }
    if (body?.tags) {
      sets.push(`tags = $${idx}::text[]`);
      params.push(body.tags.slice(0, 20));
      idx++;
    }

    params.push(packId);
    const result = await pool.query(
      `UPDATE prompt_packs SET ${sets.join(', ')} WHERE id = $${idx}::uuid RETURNING *`,
      params
    );

    res.json(mapRowToPack(result.rows[0]));
}));

/** DELETE /v1/packs/:id — Delete a pack */
router.delete('/packs/:id', ...withKey, apiRateLimiter, requireAnyAuth, requirePermission('pack:delete'), asyncHandler(async (req, res) => {
  const user = req.authUser as AuthUser;
  if (!user.orgId) return res.status(400).json({ error: 'No organization context' });

  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

  const packId = req.params.id as string;

    const result = await pool.query(
      'DELETE FROM prompt_packs WHERE id = $1::uuid AND org_id = $2::uuid',
      [packId, user.orgId]
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ error: 'Pack not found' });
    }

    writeAuditLog(pool, {
      orgId: user.orgId,
      userId: user.userId,
      action: 'prompt_delete',
      resourceType: 'pack',
      resourceId: packId,
      ip: req.ip ?? undefined,
    }).catch(() => {});

    res.status(204).send();
}));

/** POST /v1/packs/:id/prompts — Add prompts to pack */
router.post('/packs/:id/prompts', ...withKey, apiRateLimiter, requireAnyAuth, requirePermission('pack:create'), asyncHandler(async (req, res) => {
  const user = req.authUser as AuthUser;
  if (!user.orgId) return res.status(400).json({ error: 'No organization context' });

  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

  const packId = req.params.id as string;
  const { promptIds } = req.body ?? {};

  if (!promptIds || !Array.isArray(promptIds)) {
    return res.status(400).json({ error: 'promptIds (string[]) required' });
  }

    const result = await pool.query(
      `UPDATE prompt_packs
       SET prompt_ids = (
         SELECT ARRAY(SELECT DISTINCT unnest(prompt_ids || $1::text[]))
       ), updated_at = now()
       WHERE id = $2::uuid AND org_id = $3::uuid
       RETURNING *`,
      [promptIds, packId, user.orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pack not found' });
    }

    res.json(mapRowToPack(result.rows[0]));
}));

/** DELETE /v1/packs/:id/prompts — Remove prompts from pack */
router.delete('/packs/:id/prompts', ...withKey, apiRateLimiter, requireAnyAuth, requirePermission('pack:create'), asyncHandler(async (req, res) => {
  const user = req.authUser as AuthUser;
  if (!user.orgId) return res.status(400).json({ error: 'No organization context' });

  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

  const packId = req.params.id as string;
  const { promptIds } = req.body ?? {};

  if (!promptIds || !Array.isArray(promptIds)) {
    return res.status(400).json({ error: 'promptIds (string[]) required' });
  }

    const result = await pool.query(
      `UPDATE prompt_packs
       SET prompt_ids = (
         SELECT ARRAY(SELECT unnest(prompt_ids) EXCEPT SELECT unnest($1::text[]))
       ), updated_at = now()
       WHERE id = $2::uuid AND org_id = $3::uuid
       RETURNING *`,
      [promptIds, packId, user.orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pack not found' });
    }

    res.json(mapRowToPack(result.rows[0]));
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function mapRowToPack(row: any): PromptPack {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    description: row.description ?? '',
    promptIds: row.prompt_ids ?? [],
    visibility: row.visibility ?? 'private',
    tags: row.tags ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

export default router;
