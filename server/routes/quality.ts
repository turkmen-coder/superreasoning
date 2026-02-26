/**
 * Quality API routes — Judge Ensemble, Lint, Cache, Audit, Enhance.
 * @see docs/JUDGE_ENSEMBLE.md, docs/PROMPT_FEATURES_ROADMAP.md §3
 */

import { Router } from 'express';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { judgePrompt } from '../../services/judgeEnsemble';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { lintPrompt } from '../../services/promptLint';
import { getCacheStats, cacheClear } from '../../services/semanticCache';
import { analyzeBudget } from '../../services/budgetOptimizer';
import { getPool } from '../db/client';
import { listAuditLogs, writeAuditLog } from '../lib/auditLog';
import { requireApiKey, optionalApiKey } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rateLimit';

const router = Router();

/** POST /v1/judge — Prompt'u Judge Ensemble ile değerlendir */
router.post('/judge', optionalApiKey, apiRateLimiter, async (req, res) => {
  try {
    const { masterPrompt, domainId, framework, reasoning, autoRevise } = req.body ?? {};
    if (!masterPrompt || typeof masterPrompt !== 'string') {
      return res.status(400).json({ error: 'masterPrompt (string) required' });
    }
    const result = judgePrompt(masterPrompt, { domainId, framework, reasoning, autoRevise: !!autoRevise });

    // Audit log
    const pool = getPool();
    await writeAuditLog(pool, {
      action: 'judge_evaluate',
      resourceType: 'prompt',
      metadata: { totalScore: result.totalScore, passThreshold: result.passThreshold },
      ip: req.ip ?? undefined,
    });

    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Judge failed' });
  }
});

/** POST /v1/lint — Prompt lint kontrolü */
router.post('/lint', optionalApiKey, apiRateLimiter, async (req, res) => {
  try {
    const { masterPrompt, reasoning } = req.body ?? {};
    if (!masterPrompt || typeof masterPrompt !== 'string') {
      return res.status(400).json({ error: 'masterPrompt (string) required' });
    }
    const result = lintPrompt(masterPrompt, reasoning);

    const pool = getPool();
    await writeAuditLog(pool, {
      action: 'lint_check',
      resourceType: 'prompt',
      metadata: { passed: result.passed, totalErrors: result.totalErrors },
      ip: req.ip ?? undefined,
    });

    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Lint failed' });
  }
});

/** POST /v1/budget — Token/cost budget analizi */
router.post('/budget', optionalApiKey, apiRateLimiter, async (req, res) => {
  try {
    const { inputText, outputText, provider } = req.body ?? {};
    if (!outputText || typeof outputText !== 'string') {
      return res.status(400).json({ error: 'outputText (string) required' });
    }
    const result = analyzeBudget(
      inputText || '',
      outputText,
      provider || 'groq'
    );
    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Budget analysis failed' });
  }
});

/** GET /v1/cache/stats — Semantic cache istatistikleri */
router.get('/cache/stats', optionalApiKey, apiRateLimiter, (_req, res) => {
  res.json(getCacheStats());
});

/** POST /v1/cache/clear — Cache temizle */
router.post('/cache/clear', optionalApiKey, apiRateLimiter, requireApiKey, (_req, res) => {
  cacheClear();
  res.json({ cleared: true });
});

/** GET /v1/audit — Audit log listesi (auth gerekli, DB gerekli) */
router.get('/audit', optionalApiKey, apiRateLimiter, requireApiKey, async (req, res) => {
  const pool = getPool();
  if (!pool) {
    return res.status(503).json({ error: 'Database required for audit logs' });
  }

  const orgId = req.headers['x-org-id'] as string || process.env.SR_DEFAULT_ORG_ID;
  if (!orgId) {
    return res.status(400).json({ error: 'x-org-id header or SR_DEFAULT_ORG_ID required' });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const logs = await listAuditLogs(pool, orgId, { limit });
    res.json({ logs });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Audit fetch failed' });
  }
});

/** POST /v1/enhance — Python prompt enhancer ile kaliteyi yükselt */
router.post('/enhance', optionalApiKey, apiRateLimiter, async (req, res) => {
  try {
    const { masterPrompt, domainId, framework, language, reasoning } = req.body ?? {};
    if (!masterPrompt || typeof masterPrompt !== 'string') {
      return res.status(400).json({ error: 'masterPrompt (string) required' });
    }

    const input = JSON.stringify({
      masterPrompt,
      domainId: domainId || 'auto',
      framework: framework || 'AUTO',
      language: language || 'tr',
      reasoning: reasoning || '',
    });

    const scriptPath = path.resolve(__dirname, '../../scripts/prompt_enhancer.py');

    const result = await new Promise<string>((resolve, reject) => {
      const proc = execFile('python3', [scriptPath], {
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || err.message));
        } else {
          resolve(stdout);
        }
      });
      proc.stdin?.write(input);
      proc.stdin?.end();
    });

    const parsed = JSON.parse(result);

    // Audit log
    const pool = getPool();
    await writeAuditLog(pool, {
      action: 'enhance_prompt',
      resourceType: 'prompt',
      metadata: {
        changes_count: parsed.changes?.length || 0,
        estimated_gain: parsed.estimated_score_gain || 0,
      },
      ip: req.ip ?? undefined,
    });

    res.json(parsed);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Enhance failed' });
  }
});

export default router;
