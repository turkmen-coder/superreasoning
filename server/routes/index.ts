import { Router } from 'express';
import { generateMasterPromptServer } from '../lib/generateAdapter';
import { getPromptStore } from '../store/promptStore';
import { validateApiKey } from '../lib/keyManager';
import { Framework } from '../../types';
import { optionalApiKey } from '../middleware/auth';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { generateRateLimiter, apiRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../lib/asyncHandler';
import paymentRouter from './payment';
import runsRouter from './runs';
import qualityRouter from './quality';
import authRouter from './auth';
import builderRouter from './builder';
import agentRouter from './agent';
import vectorSearchRouter from './vectorSearch';
import ragRouter from './rag';
import regressionRouter from './regression';
import teamRouter from './team';
import packsRouter from './packs';
import scimRouter from './scim';
import collaborationRouter from './collaboration';
import chatbotRouter from './chatbot';
import aiProxyRouter from './aiProxy';
import lightfmRouter from './lightfm';
import autoeditRouter from './autoedit';
import parserRouter from './parser';
import autoCompleteRouter from './autoComplete';
import brainRouter from './brain';
import { getPool } from '../db/client';
import { writeAuditLog } from '../lib/auditLog';
import { enrichMasterPrompt } from '../lib/enrichment';
import { enrichWithAgent } from '../lib/enrichment/agentEnrichment';
import { analyzeWithLangExtract } from '../lib/langextract/client';
import { requirePermission } from '../middleware/rbac';
import { analyzeRiskDiff } from '../../services/riskDiffAnalyzer';
import { signRelease, verifyRelease, getProvenanceChain } from '../lib/signedRelease';
import type { AuthUser } from '../middleware/supabaseAuth';

const router = Router();
router.use(authRouter);
router.use(paymentRouter);
router.use(runsRouter);
router.use(qualityRouter);
router.use(builderRouter);
router.use(agentRouter);
router.use(vectorSearchRouter);
router.use(ragRouter);
router.use(regressionRouter);
router.use(teamRouter);
router.use(packsRouter);
router.use(scimRouter);
router.use(collaborationRouter);
router.use(chatbotRouter);
router.use(aiProxyRouter);
router.use(lightfmRouter);
router.use(autoeditRouter);
router.use(parserRouter);
router.use(autoCompleteRouter);
router.use(brainRouter);
const promptStore = getPromptStore();

function getValidKeys(): Set<string> {
  const fromEnv = new Set(
    (process.env.API_KEYS ?? '')
      .replace(/\r/g, '')
      .split(',')
      .map((k: string) => k.trim())
      .filter(Boolean)
  );
  return fromEnv;
}

// Auth: JWT veya API key kabul eder. DISABLE_API_KEY_AUTH=true → bypass.
const withKey = [optionalApiKey]; // Rate limit key için (apiKey veya IP)

const FRAMEWORKS = Object.values(Framework);

/** POST /v1/generate — Master prompt üretir (x-api-key + rate limit) */
router.post('/generate', ...withKey, generateRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const { intent, framework, domainId, provider, language, contextRules, openRouterModel, enrichment } = req.body ?? {};
    if (!intent || typeof intent !== 'string') {
      return res.status(400).json({ error: 'intent (string) required' });
    }
    const fw = FRAMEWORKS.includes(framework) ? framework : Framework.AUTO;
    const prov = ['groq', 'gemini', 'huggingface', 'claude', 'claude-opus', 'openrouter', 'deepseek', 'openai', 'ollama', 'auto'].includes(provider) ? provider : 'groq';
    const lang = language === 'tr' ? 'tr' : 'en';
    const result = await generateMasterPromptServer({
      intent: String(intent).slice(0, 50000),
      framework: fw,
      domainId: typeof domainId === 'string' ? domainId : 'auto',
      provider: prov,
      language: lang,
      contextRules,
      openRouterModel: typeof openRouterModel === 'string' ? openRouterModel : undefined,
    });

    // Optional post-generation enrichment
    const enrichMode = enrichment?.mode;
    if (enrichMode && enrichMode !== 'off' && result.masterPrompt) {
      try {
        let enrichResult;
        if (enrichMode === 'agent') {
          enrichResult = await enrichWithAgent(result.masterPrompt, {
            domainId: typeof domainId === 'string' ? domainId : undefined,
            framework: fw,
            language: lang,
            maxIterations: enrichment?.maxIterations ?? 3,
            targetScore: enrichment?.targetScore ?? 90,
            maxTokenBudget: enrichment?.maxTokenBudget ?? 2000,
          });
        } else {
          enrichResult = await enrichMasterPrompt(result.masterPrompt, {
            domainId: typeof domainId === 'string' ? domainId : undefined,
            framework: fw,
            language: lang,
            config: { mode: enrichMode === 'deep' ? 'deep' : 'fast' },
          });
        }
        if (enrichment?.autoApply && enrichResult.integratedPrompts.length > 0) {
          result.masterPrompt = enrichResult.enrichedPrompt;
        }
        (result as any).enrichment = enrichResult;
      } catch (enrichErr: any) {
        console.warn(`[Generate] Enrichment step failed: ${enrichErr.message}`);
      }
    }

    // Audit log
    const pool = getPool();
    await writeAuditLog(pool, {
      action: 'generate',
      resourceType: 'prompt',
      metadata: { framework: fw, domainId, provider: prov, language, enrichMode: enrichMode ?? 'off' },
      ip: req.ip ?? undefined,
    });

    res.json(result);
}));

/** POST /v1/enrich — Master prompt zenginleştirme (kütüphaneden otomatik tamamlama) */
router.post('/enrich', ...withKey, generateRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const { masterPrompt, domainId, framework, language, mode, config } = req.body ?? {};
    if (!masterPrompt || typeof masterPrompt !== 'string') {
      return res.status(400).json({ error: 'masterPrompt (string) required' });
    }
    const enrichMode = ['fast', 'deep', 'agent'].includes(mode) ? mode : 'fast';

    // Agent mode: full domain/framework analysis + judge-driven iteration
    if (enrichMode === 'agent') {
      const result = await enrichWithAgent(masterPrompt, {
        domainId: typeof domainId === 'string' ? domainId : undefined,
        framework: typeof framework === 'string' ? framework : undefined,
        language: language === 'tr' ? 'tr' : 'en',
        maxIterations: config?.maxIterations ?? 3,
        targetScore: config?.targetScore ?? 90,
        maxTokenBudget: config?.maxTokenBudget ?? 2000,
      });

      const pool = getPool();
      await writeAuditLog(pool, {
        action: 'enrich',
        resourceType: 'prompt',
        metadata: {
          mode: 'agent',
          domainId,
          gapsFound: result.metrics.gapsFound,
          promptsIntegrated: result.metrics.promptsIntegrated,
          judgeScore: result.agentMetrics?.judgeScoreAfter,
          iterations: result.agentMetrics?.iterations,
        },
        ip: req.ip ?? undefined,
      });

      return res.json(result);
    }

    // Fast/Deep mode: original pipeline
    const result = await enrichMasterPrompt(masterPrompt, {
      domainId: typeof domainId === 'string' ? domainId : undefined,
      framework: typeof framework === 'string' ? framework : undefined,
      language: language === 'tr' ? 'tr' : 'en',
      config: { mode: enrichMode, ...config },
    });

    const pool = getPool();
    await writeAuditLog(pool, {
      action: 'enrich',
      resourceType: 'prompt',
      metadata: { mode: enrichMode, domainId, gapsFound: result.metrics.gapsFound, promptsIntegrated: result.metrics.promptsIntegrated },
      ip: req.ip ?? undefined,
    });

    res.json(result);
}));

/** POST /v1/langextract/analyze — langextract-main ile prompt analizi (opsiyonel) */
router.post('/langextract/analyze', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const { text, language } = req.body ?? {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text (string) required' });
    }
    const result = await analyzeWithLangExtract(text.slice(0, 20000), language === 'tr' ? 'tr' : 'en');
    res.json(result);
}));

/** GET /v1/prompts — Tüm promptları listeler (auth + rate limit). Multi-tenant: orgId ileride req.tenantId ile geçer. */
router.get('/prompts', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const orgId = req.tenantId ?? null;
    const list = await promptStore.list({ orgId });
    res.json({ prompts: list });
}));

/** GET /v1/prompts/:id?version= — Tek prompt (opsiyonel version) */
router.get('/prompts/:id', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const version = req.query.version as string | undefined;
    const orgId = req.tenantId ?? null;
    const prompt = await promptStore.get(req.params.id as string, version, orgId);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    res.json(prompt);
}));

/** POST /v1/prompts — Prompt kaydeder (version ile) */
router.post('/prompts', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const { id, version, name, masterPrompt, reasoning, meta } = req.body ?? {};
    if (!id || !version || !masterPrompt) {
      return res.status(400).json({ error: 'id, version, masterPrompt required' });
    }
    const orgId = req.tenantId ?? null;
    const source = (req.body?.source as string) || 'dashboard';
    const saved = await promptStore.save({
      id: String(id),
      version: String(version),
      name,
      masterPrompt: String(masterPrompt),
      reasoning,
      meta,
      source: source as 'dashboard' | 'imported' | 'api',
    }, orgId);
    res.status(201).json(saved);
}));

/** GET /v1/prompts/:id/versions — Prompt'un tüm versiyonlarını listeler */
router.get('/prompts/:id/versions', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const orgId = req.tenantId ?? null;
    const versions = await promptStore.listVersions(req.params.id as string, orgId);
    if (versions.length === 0) return res.status(404).json({ error: 'Prompt not found' });
    res.json({ id: req.params.id, versions });
}));

/** GET /v1/prompts/:id/diff?v1=x&v2=y — İki versiyon arasında diff */
router.get('/prompts/:id/diff', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const orgId = req.tenantId ?? null;
    const v1 = req.query.v1 as string;
    const v2 = req.query.v2 as string;
    if (!v1 || !v2) return res.status(400).json({ error: 'v1 and v2 query params required' });

    const [prompt1, prompt2] = await Promise.all([
      promptStore.get(req.params.id as string, v1, orgId),
      promptStore.get(req.params.id as string, v2, orgId),
    ]);
    if (!prompt1 || !prompt2) return res.status(404).json({ error: 'One or both versions not found' });

    // Line-by-line diff
    const lines1 = prompt1.masterPrompt.split('\n');
    const lines2 = prompt2.masterPrompt.split('\n');
    const maxLen = Math.max(lines1.length, lines2.length);
    const changes: Array<{ line: number; type: 'added' | 'removed' | 'changed' | 'unchanged'; old?: string; new?: string; content?: string }> = [];

    for (let i = 0; i < maxLen; i++) {
      const l1 = lines1[i];
      const l2 = lines2[i];
      if (l1 === undefined) {
        changes.push({ line: i + 1, type: 'added', new: l2 });
      } else if (l2 === undefined) {
        changes.push({ line: i + 1, type: 'removed', old: l1 });
      } else if (l1 !== l2) {
        changes.push({ line: i + 1, type: 'changed', old: l1, new: l2 });
      } else {
        changes.push({ line: i + 1, type: 'unchanged', content: l1 });
      }
    }

    const stats = {
      added: changes.filter(c => c.type === 'added').length,
      removed: changes.filter(c => c.type === 'removed').length,
      changed: changes.filter(c => c.type === 'changed').length,
      unchanged: changes.filter(c => c.type === 'unchanged').length,
    };

    res.json({
      id: req.params.id,
      from: { version: v1, createdAt: prompt1.createdAt, meta: prompt1.meta },
      to: { version: v2, createdAt: prompt2.createdAt, meta: prompt2.meta },
      changes,
      stats,
    });
}));

/** GET /v1/prompts/:id/diff/export?format=mermaid|html&v1=x&v2=y — Diff Mermaid veya HTML önizleme */
router.get('/prompts/:id/diff/export', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const orgId = req.tenantId ?? null;
    const v1 = req.query.v1 as string;
    const v2 = req.query.v2 as string;
    const format = ((req.query.format as string) || 'mermaid').toLowerCase();
    if (!v1 || !v2) return res.status(400).json({ error: 'v1 and v2 query params required' });
    if (format !== 'mermaid' && format !== 'html') return res.status(400).json({ error: 'format must be mermaid or html' });

    const [prompt1, prompt2] = await Promise.all([
      promptStore.get(req.params.id as string, v1, orgId),
      promptStore.get(req.params.id as string, v2, orgId),
    ]);
    if (!prompt1 || !prompt2) return res.status(404).json({ error: 'One or both versions not found' });

    const lines1 = prompt1.masterPrompt.split('\n');
    const lines2 = prompt2.masterPrompt.split('\n');
    const maxLen = Math.max(lines1.length, lines2.length);
    const changes: Array<{ line: number; type: 'added' | 'removed' | 'changed' | 'unchanged'; old?: string; new?: string; content?: string }> = [];
    for (let i = 0; i < maxLen; i++) {
      const l1 = lines1[i];
      const l2 = lines2[i];
      if (l1 === undefined) changes.push({ line: i + 1, type: 'added', new: l2 });
      else if (l2 === undefined) changes.push({ line: i + 1, type: 'removed', old: l1 });
      else if (l1 !== l2) changes.push({ line: i + 1, type: 'changed', old: l1, new: l2 });
      else changes.push({ line: i + 1, type: 'unchanged', content: l1 });
    }

    const escape = (s: string) => s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');

    if (format === 'mermaid') {
      const lines: string[] = ['graph LR', '  subgraph v' + v1, '    A[Version ' + v1 + ']', '  end', '  subgraph v' + v2, '    B[Version ' + v2 + ']', '  end', '  A -->|diff| B'];
      const added = changes.filter(c => c.type === 'added').length;
      const removed = changes.filter(c => c.type === 'removed').length;
      const changed = changes.filter(c => c.type === 'changed').length;
      lines.push('  subgraph Değişiklikler');
      lines.push('    C["+ ' + added + ' satır"]');
      lines.push('    D["- ' + removed + ' satır"]');
      lines.push('    E["~ ' + changed + ' satır"]');
      lines.push('  end');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(lines.join('\n'));
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Diff v${v1} → v${v2}</title>
<style>body{font-family:monospace;background:#0a0a0f;color:#e2e8f0;padding:1rem;}.add{color:#22c55e;}.rem{color:#ef4444;}.chg{color:#eab308;}.unch{color:#64748b;}
pre{margin:0.25em 0;white-space:pre-wrap;word-break:break-all;}</style></head><body>
<h2>Diff: ${escape(req.params.id as string)} v${v1} → v${v2}</h2>
<div class="diff">${changes.map(c => {
  if (c.type === 'added') return `<pre class="add">+ ${escape(c.new ?? '')}</pre>`;
  if (c.type === 'removed') return `<pre class="rem">- ${escape(c.old ?? '')}</pre>`;
  if (c.type === 'changed') return `<pre class="chg">~ ${escape(c.old ?? '')}\n→ ${escape(c.new ?? '')}</pre>`;
  return `<pre class="unch">  ${escape(c.content ?? '')}</pre>`;
}).join('')}</div></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
}));

/** DELETE /v1/prompts/:id?version= — Prompt siler (admin+ only) */
router.delete('/prompts/:id', ...withKey, apiRateLimiter, requireAnyAuth, requirePermission('prompt:delete'), asyncHandler(async (req, res) => {
    const version = req.query.version as string | undefined;
    const orgId = req.tenantId ?? null;
    const ok = await promptStore.delete(req.params.id as string, version, orgId);
    if (!ok) return res.status(404).json({ error: 'Prompt not found' });
    res.status(204).send();
}));

/** POST /v1/auth/validate — API key doğrula (BYOK/Managed); OpenAPI auth/validate */
router.post('/auth/validate', (req, res) => {
  const key = (req.header('x-api-key') ?? req.body?.['x-api-key']) ?? '';
  const result = validateApiKey(key, req, {
    byok: { validKeys: getValidKeys() },
  });
  if (!result.valid) {
    if (result.rateLimitExceeded) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: result.code,
        rateLimitExceeded: true,
      });
    }
    return res.status(401).json({
      error: result.code === 'MISSING_API_KEY' ? 'Missing x-api-key' : 'Invalid API key',
      code: result.code ?? 'INVALID_API_KEY',
    });
  }
  res.json({
    valid: true,
    mode: result.mode,
    orgId: result.orgId ?? undefined,
    plan: result.plan ?? 'free',
  });
});

/** GET /v1/orgs/:orgId/prompts — Tenant (org) promptlarını listele; tenant izolasyonu */
router.get('/orgs/:orgId/prompts', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const orgId = req.params.orgId as string;
    const list = await promptStore.list({ orgId });
    res.json({ prompts: list });
}));

/** POST /v1/prompts/:id/diff/risk — Risk diff analysis for two versions */
router.post('/prompts/:id/diff/risk', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
    const orgId = req.tenantId ?? null;
    const { v1, v2 } = req.body ?? {};
    if (!v1 || !v2) return res.status(400).json({ error: 'v1 and v2 required in body' });

    const [prompt1, prompt2] = await Promise.all([
      promptStore.get(req.params.id as string, v1, orgId),
      promptStore.get(req.params.id as string, v2, orgId),
    ]);
    if (!prompt1 || !prompt2) return res.status(404).json({ error: 'One or both versions not found' });

    // Generate diff changes
    const lines1 = prompt1.masterPrompt.split('\n');
    const lines2 = prompt2.masterPrompt.split('\n');
    const maxLen = Math.max(lines1.length, lines2.length);
    const changes: Array<{ line: number; type: 'added' | 'removed' | 'changed' | 'unchanged'; old?: string; new?: string; content?: string }> = [];
    for (let i = 0; i < maxLen; i++) {
      const l1 = lines1[i];
      const l2 = lines2[i];
      if (l1 === undefined) changes.push({ line: i + 1, type: 'added', new: l2 });
      else if (l2 === undefined) changes.push({ line: i + 1, type: 'removed', old: l1 });
      else if (l1 !== l2) changes.push({ line: i + 1, type: 'changed', old: l1, new: l2 });
      else changes.push({ line: i + 1, type: 'unchanged', content: l1 });
    }

    const riskResult = analyzeRiskDiff(v1, v2, changes, prompt1.masterPrompt, prompt2.masterPrompt);
    res.json(riskResult);
}));

/** POST /v1/prompts/:id/versions/:ver/sign — Sign a version for release */
router.post('/prompts/:id/versions/:ver/sign', ...withKey, apiRateLimiter, requireAnyAuth, requirePermission('version:promote'), asyncHandler(async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

  const user = req.authUser as AuthUser | undefined;
  if (!user?.userId) return res.status(401).json({ error: 'Authentication required' });

    const orgId = req.tenantId ?? null;
    const promptId = req.params.id as string;
    const version = req.params.ver as string;
    const prompt = await promptStore.get(promptId, version, orgId);
    if (!prompt) return res.status(404).json({ error: 'Prompt version not found' });

    const metadata = req.body?.metadata ?? {};
    const result = await signRelease(pool, promptId, version, prompt.masterPrompt, user.userId, user.email ?? undefined, metadata);

    if (!result.success) return res.status(500).json({ error: result.error });
    res.status(201).json(result.signature);
}));

/** GET /v1/prompts/:id/versions/:ver/verify — Verify release signature */
router.get('/prompts/:id/versions/:ver/verify', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

    const orgId = req.tenantId ?? null;
    const promptId = req.params.id as string;
    const version = req.params.ver as string;
    const prompt = await promptStore.get(promptId, version, orgId);
    if (!prompt) return res.status(404).json({ error: 'Prompt version not found' });

    const result = await verifyRelease(pool, promptId, version, prompt.masterPrompt);
    res.json(result);
}));

/** GET /v1/prompts/:id/provenance — Get provenance chain */
router.get('/prompts/:id/provenance', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

    const promptId = req.params.id as string;
    const chain = await getProvenanceChain(pool, promptId);
    res.json(chain);
}));

/** GET /v1/health */
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'super-reasoning-api' });
});

/** POST /v1/ftfy — Fix text encoding using python-ftfy */
router.post('/ftfy', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
  const { text } = req.body ?? {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text (string) required' });
  }

  const { spawn } = await import('child_process');

  return new Promise((resolve) => {
    const input = JSON.stringify({ text });
    const python = spawn('python3', ['server/scripts/ftfy_fix.py']);

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => { output += data.toString(); });
    python.stderr.on('data', (data) => { errorOutput += data.toString(); });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error('[ftfy] Error:', errorOutput);
        return resolve(res.status(500).json({ error: 'ftfy processing failed' }));
      }

      try {
        const result = JSON.parse(output.trim());
        if (result.error) {
          return resolve(res.status(500).json({ error: result.error }));
        }
        resolve(res.json({ original: text, fixed: result.fixed }));
      } catch {
        console.error('[ftfy] Parse error:', output);
        resolve(res.status(500).json({ error: 'Invalid response from ftfy' }));
      }
    });

    python.stdin.write(input);
    python.stdin.end();
  });
}));

export default router;
