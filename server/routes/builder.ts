/**
 * Custom Domain & Framework Builder API
 * Kullanıcıların kendi domain kuralları ve framework'lerini tanımlamasını sağlar.
 */

import { Router } from 'express';
import { optionalApiKey } from '../middleware/auth';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { apiRateLimiter } from '../middleware/rateLimit';
import { getPool } from '../db/client';
import { writeAuditLog } from '../lib/auditLog';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();
const withKey = [optionalApiKey];

// ─── Custom Domains ──────────────────────────────────────────

/** GET /v1/domains/custom — Org'un custom domain'lerini listele */
router.get('/domains/custom', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const pool = getPool();
    if (!pool) return res.json({ domains: [] });
    const orgId = req.tenantId ?? process.env.SR_DEFAULT_ORG_ID;
    if (!orgId) return res.json({ domains: [] });

    const result = await pool.query(
      `SELECT id, domain_id, name, icon, description, context_rules, is_public, created_at, updated_at
       FROM custom_domains WHERE org_id = $1::uuid ORDER BY created_at DESC`,
      [orgId]
    );
    res.json({ domains: result.rows });
}));

/** POST /v1/domains/custom — Yeni custom domain oluştur */
router.post('/domains/custom', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database not available' });
    const orgId = req.tenantId ?? process.env.SR_DEFAULT_ORG_ID;
    if (!orgId) return res.status(400).json({ error: 'org_id required' });

    const { domain_id, name, icon, description, context_rules, is_public } = req.body ?? {};
    if (!domain_id || !name || !context_rules) {
      return res.status(400).json({ error: 'domain_id, name, context_rules required' });
    }

    // Domain ID formatı: lowercase, alfanumerik + tire
    const cleanId = String(domain_id).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50);

    const result = await pool.query(
      `INSERT INTO custom_domains (org_id, domain_id, name, icon, description, context_rules, is_public)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (org_id, domain_id) DO UPDATE SET
         name = EXCLUDED.name, icon = EXCLUDED.icon, description = EXCLUDED.description,
         context_rules = EXCLUDED.context_rules, is_public = EXCLUDED.is_public, updated_at = now()
       RETURNING id, domain_id, name, icon, description, context_rules, is_public, created_at, updated_at`,
      [orgId, cleanId, name, icon || '🔧', description || null, context_rules, is_public ?? false]
    );

    await writeAuditLog(pool, {
      orgId,
      action: 'custom_domain_save',
      resourceType: 'custom_domain',
      resourceId: cleanId,
      ip: req.ip ?? undefined,
    });

    res.status(201).json(result.rows[0]);
}));

/** DELETE /v1/domains/custom/:domainId */
router.delete('/domains/custom/:domainId', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database not available' });
    const orgId = req.tenantId ?? process.env.SR_DEFAULT_ORG_ID;
    if (!orgId) return res.status(400).json({ error: 'org_id required' });

    const result = await pool.query(
      `DELETE FROM custom_domains WHERE org_id = $1::uuid AND domain_id = $2`,
      [orgId, req.params.domainId]
    );
    if ((result.rowCount ?? 0) === 0) return res.status(404).json({ error: 'Custom domain not found' });
    res.status(204).send();
}));

// ─── Custom Frameworks ───────────────────────────────────────

/** GET /v1/frameworks/custom — Org'un custom framework'lerini listele */
router.get('/frameworks/custom', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const pool = getPool();
    if (!pool) return res.json({ frameworks: [] });
    const orgId = req.tenantId ?? process.env.SR_DEFAULT_ORG_ID;
    if (!orgId) return res.json({ frameworks: [] });

    const result = await pool.query(
      `SELECT id, framework_id, name, icon, color, description, focus, template, is_public, created_at, updated_at
       FROM custom_frameworks WHERE org_id = $1::uuid ORDER BY created_at DESC`,
      [orgId]
    );
    res.json({ frameworks: result.rows });
}));

/** POST /v1/frameworks/custom — Yeni custom framework oluştur */
router.post('/frameworks/custom', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database not available' });
    const orgId = req.tenantId ?? process.env.SR_DEFAULT_ORG_ID;
    if (!orgId) return res.status(400).json({ error: 'org_id required' });

    const { framework_id, name, icon, color, description, focus, template, is_public } = req.body ?? {};
    if (!framework_id || !name || !template) {
      return res.status(400).json({ error: 'framework_id, name, template required' });
    }

    const cleanId = String(framework_id).toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 30);

    const result = await pool.query(
      `INSERT INTO custom_frameworks (org_id, framework_id, name, icon, color, description, focus, template, is_public)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (org_id, framework_id) DO UPDATE SET
         name = EXCLUDED.name, icon = EXCLUDED.icon, color = EXCLUDED.color,
         description = EXCLUDED.description, focus = EXCLUDED.focus,
         template = EXCLUDED.template, is_public = EXCLUDED.is_public, updated_at = now()
       RETURNING id, framework_id, name, icon, color, description, focus, template, is_public, created_at, updated_at`,
      [orgId, cleanId, name, icon || '🔧', color || 'text-gray-400', description || null, focus || null, template, is_public ?? false]
    );

    await writeAuditLog(pool, {
      orgId,
      action: 'custom_framework_save',
      resourceType: 'custom_framework',
      resourceId: cleanId,
      ip: req.ip ?? undefined,
    });

    res.status(201).json(result.rows[0]);
}));

/** DELETE /v1/frameworks/custom/:frameworkId */
router.delete('/frameworks/custom/:frameworkId', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database not available' });
    const orgId = req.tenantId ?? process.env.SR_DEFAULT_ORG_ID;
    if (!orgId) return res.status(400).json({ error: 'org_id required' });

    const result = await pool.query(
      `DELETE FROM custom_frameworks WHERE org_id = $1::uuid AND framework_id = $2`,
      [orgId, req.params.frameworkId]
    );
    if ((result.rowCount ?? 0) === 0) return res.status(404).json({ error: 'Custom framework not found' });
    res.status(204).send();
}));

// ─── Prompt Benchmarks ───────────────────────────────────────

/** POST /v1/benchmarks — Benchmark sonucu kaydet */
router.post('/benchmarks', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database not available' });
    const orgId = req.tenantId ?? process.env.SR_DEFAULT_ORG_ID;
    if (!orgId) return res.status(400).json({ error: 'org_id required' });

    const { prompt_id, version, provider, model, judge_score, lint_passed, lint_errors, lint_warnings,
            token_count, cost_usd, test_output, test_passed, duration_ms } = req.body ?? {};

    const result = await pool.query(
      `INSERT INTO prompt_benchmarks (org_id, prompt_id, version, provider, model, judge_score, lint_passed,
         lint_errors, lint_warnings, token_count, cost_usd, test_output, test_passed, duration_ms)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [orgId, prompt_id || null, version || '1.0.0', provider || 'unknown', model || null,
       judge_score || null, lint_passed ?? null, lint_errors || 0, lint_warnings || 0,
       token_count || null, cost_usd || null, test_output || null, test_passed ?? null, duration_ms || null]
    );

    res.status(201).json(result.rows[0]);
}));

/** GET /v1/benchmarks — Benchmark sonuçlarını listele */
router.get('/benchmarks', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const pool = getPool();
    if (!pool) return res.json({ benchmarks: [] });
    const orgId = req.tenantId ?? process.env.SR_DEFAULT_ORG_ID;
    if (!orgId) return res.json({ benchmarks: [] });

    const promptId = req.query.prompt_id as string | undefined;
    let query = `SELECT * FROM prompt_benchmarks WHERE org_id = $1::uuid`;
    const params: any[] = [orgId];

    if (promptId) {
      query += ` AND prompt_id = $2::uuid`;
      params.push(promptId);
    }
    query += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);
    res.json({ benchmarks: result.rows });
}));

export default router;
