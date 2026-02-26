/**
 * AI Agent Routes — OpenAI Agents SDK + Multi-Agent Orchestrator.
 * POST /v1/agent/run      — Agent'ı çalıştır (prompt library tools ile)
 * GET  /v1/agent/status    — Agent durumu ve bilgisi
 *
 * NEW: Multi-Agent, Autonomous Tasks, Versioning, A/B Testing
 */

import { Router, Request, Response } from 'express';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { apiRateLimiter } from '../middleware/rateLimit';
import { optionalApiKey } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { runPromptAgent, getAgentStatus, type AgentRunContext } from '../../services/agentService';
import {
  runOrchestrator,
  getAgentStatuses,
  sendMessage,
  getMessageHistory,
  getAgentMemory,
  updateAgentMemory,
  recordSuccessfulPrompt,
} from '../../services/multiAgentOrchestrator';
import {
  getAllTasks,
  getTask,
  runTask,
  registerTask,
  unregisterTask,
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
} from '../../services/autonomousTasks';
import {
  createVersion,
  getVersion,
  getLatestVersion,
  getVersionHistory,
  rollback,
  diffVersions,
  createABVariant,
  getABVariants,
  recordABResult,
  getABTestWinner,
  enrichAndVersion,
  getVersioningStats,
  exportPromptHistory,
  importPromptHistory,
} from '../../services/promptVersioning';
import { EXTENDED_TOOLS } from '../../services/agentTools';

const router = Router();
const withKey = [optionalApiKey];

/** POST /v1/agent/run — Agent çalıştır */
router.post('/agent/run', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req: Request, res: Response) => {
    const { query, language, context } = req.body ?? {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query (string) required' });
    }

    const lang = language === 'tr' ? 'tr' : 'en';
    const safeContext: AgentRunContext | undefined = context && typeof context === 'object'
      ? {
          currentPrompt: typeof context.currentPrompt === 'string' ? context.currentPrompt : undefined,
          domainId: typeof context.domainId === 'string' ? context.domainId : undefined,
          framework: typeof context.framework === 'string' ? context.framework : undefined,
          analyticsSnapshot: context.analyticsSnapshot && typeof context.analyticsSnapshot === 'object'
            ? context.analyticsSnapshot
            : undefined,
        }
      : undefined;

    try {
      const result = await runPromptAgent(query, lang, safeContext);

      res.json({
        query,
        answer: result.answer,
        toolCalls: result.toolCalls,
        model: result.model,
        sdk: '@openai/agents',
        enrichedPrompt: result.enrichedPrompt,
      });
    } catch (e: any) {
      // Intentional inner catch: return 503 for missing OPENAI_API_KEY
      if (e?.message?.includes('OPENAI_API_KEY')) {
        return res.status(503).json({
          error: 'OpenAI API key not configured',
          code: 'OPENAI_KEY_MISSING',
          hint: 'Set OPENAI_API_KEY in .env',
        });
      }
      throw e;
    }
}));

/** GET /v1/agent/status — Agent durumu (public, sadece metadata) */
router.get('/agent/status', asyncHandler(async (_req: Request, res: Response) => {
    const status = getAgentStatus();
    res.json(status);
}));

/** POST /v1/agent/analyze — Prompt'u analiz et, domain/framework öner */
router.post('/agent/analyze', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req: Request, res: Response) => {
    const { prompt, language } = req.body ?? {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt (string) required' });
    }
    const lang = language === 'tr' ? 'tr' : 'en';
    const query = lang === 'tr'
      ? `Bu kullanıcı girdisini analiz et ve en uygun domain ile framework'ü öner. Sadece JSON döndür, başka açıklama ekleme: "${prompt.slice(0, 300)}"\n\nYanıt formatı: {"domain": "...", "framework": "...", "reasoning": "..."}`
      : `Analyze this user input and suggest the best domain and framework. Return only JSON, no extra explanation: "${prompt.slice(0, 300)}"\n\nResponse format: {"domain": "...", "framework": "...", "reasoning": "..."}`;
    try {
      const result = await runPromptAgent(query, lang, { currentPrompt: prompt });
      let parsed: { domain?: string; framework?: string; reasoning?: string } = {};
      try {
        const jsonMatch = result.answer.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch { /* fallback */ }
      res.json({
        domain: parsed.domain || 'auto',
        framework: parsed.framework || 'Universal',
        reasoning: parsed.reasoning || result.answer,
        enrichedPrompt: result.enrichedPrompt,
      });
    } catch (e: any) {
      if (e?.message?.includes('OPENAI_API_KEY')) {
        return res.status(503).json({ error: 'OpenAI API key not configured', code: 'OPENAI_KEY_MISSING' });
      }
      throw e;
    }
}));

// ========== ORCHESTRATOR ROUTES ==========

/** POST /v1/agent/orchestrate — Multi-agent orchestration */
router.post('/agent/orchestrate', ...withKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req: Request, res: Response) => {
    const { query, userId, context } = req.body;
    if (!query) return res.status(400).json({ error: 'query is required' });
    const result = await runOrchestrator(query, userId || 'anonymous', context);
    res.json(result);
}));

/** GET /v1/agent/statuses — All agent statuses */
router.get('/agent/statuses', ...withKey, requireAnyAuth, (_req: Request, res: Response) => {
  res.json(getAgentStatuses());
});

// ========== AGENT MEMORY ROUTES ==========

/** GET /v1/agent/memory/:userId */
router.get('/agent/memory/:userId', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  res.json(getAgentMemory(String(req.params.userId)));
});

/** PATCH /v1/agent/memory/:userId */
router.patch('/agent/memory/:userId', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  res.json(updateAgentMemory(String(req.params.userId), req.body));
});

/** POST /v1/agent/memory/:userId/record-prompt */
router.post('/agent/memory/:userId/record-prompt', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  const { userId } = req.params;
  const { promptId, promptName, successRate, domainId, framework } = req.body;
  recordSuccessfulPrompt(String(userId), promptId, promptName, successRate, domainId, framework);
  res.json({ success: true });
});

// ========== A2A COMMUNICATION ROUTES ==========

/** POST /v1/agent/message */
router.post('/agent/message', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  const { from, to, type, payload, correlationId } = req.body;
  const msg = sendMessage(from, to, type, payload, correlationId);
  res.json(msg);
});

/** GET /v1/agent/messages/:agentType */
router.get('/agent/messages/:agentType', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  res.json(getMessageHistory(req.params.agentType as any));
});

/** GET /v1/agent/messages */
router.get('/agent/messages', ...withKey, requireAnyAuth, (_req: Request, res: Response) => {
  res.json(getMessageHistory(undefined));
});

// ========== AUTONOMOUS TASKS ROUTES ==========

/** GET /v1/agent/tasks */
router.get('/agent/tasks', ...withKey, requireAnyAuth, (_req: Request, res: Response) => {
  res.json({ tasks: getAllTasks() });
});

/** GET /v1/agent/tasks/:taskId */
router.get('/agent/tasks/:taskId', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  const task = getTask(String(req.params.taskId));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

/** POST /v1/agent/tasks */
router.post('/agent/tasks', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  registerTask(req.body);
  res.json({ success: true, task: req.body });
});

/** DELETE /v1/agent/tasks/:taskId */
router.delete('/agent/tasks/:taskId', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  unregisterTask(String(req.params.taskId));
  res.json({ success: true });
});

/** POST /v1/agent/tasks/:taskId/run */
router.post('/agent/tasks/:taskId/run', ...withKey, requireAnyAuth, asyncHandler(async (req: Request, res: Response) => {
    const result = await runTask(String(req.params.taskId));
    if (!result) return res.status(404).json({ error: 'Task not found or disabled' });
    res.json(result);
}));

/** GET /v1/agent/scheduler/status */
router.get('/agent/scheduler/status', ...withKey, requireAnyAuth, (_req: Request, res: Response) => {
  res.json(getSchedulerStatus());
});

/** POST /v1/agent/scheduler/start */
router.post('/agent/scheduler/start', ...withKey, requireAnyAuth, (_req: Request, res: Response) => {
  startScheduler();
  res.json({ success: true, message: 'Scheduler started' });
});

/** POST /v1/agent/scheduler/stop */
router.post('/agent/scheduler/stop', ...withKey, requireAnyAuth, (_req: Request, res: Response) => {
  stopScheduler();
  res.json({ success: true, message: 'Scheduler stopped' });
});

// ========== PROMPT VERSIONING ROUTES ==========

/** POST /v1/agent/versioning/create */
router.post('/agent/versioning/create', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  const { promptId, content, createdBy, enrichmentMetrics, tags } = req.body;
  const version = createVersion(promptId, content, createdBy, enrichmentMetrics, tags);
  res.json(version);
});

/** GET /v1/agent/versioning/:promptId/latest */
router.get('/agent/versioning/:promptId/latest', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  const version = getLatestVersion(String(req.params.promptId));
  if (!version) return res.status(404).json({ error: 'No version found' });
  res.json(version);
});

/** GET /v1/agent/versioning/:promptId/:version */
router.get('/agent/versioning/:promptId/:version', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  const { promptId, version } = req.params;
  const v = getVersion(String(promptId), parseInt(String(version)));
  if (!v) return res.status(404).json({ error: 'Version not found' });
  res.json(v);
});

/** GET /v1/agent/versioning/:promptId/history */
router.get('/agent/versioning/:promptId/history', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  res.json(getVersionHistory(String(req.params.promptId), limit));
});

/** POST /v1/agent/versioning/:promptId/rollback */
router.post('/agent/versioning/:promptId/rollback', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  const { targetVersion } = req.body;
  const version = rollback(String(req.params.promptId), targetVersion);
  if (!version) return res.status(404).json({ error: 'Cannot rollback' });
  res.json(version);
});

/** GET /v1/agent/versioning/:promptId/diff */
router.get('/agent/versioning/:promptId/diff', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  const { versionA, versionB } = req.query;
  const diff = diffVersions(String(req.params.promptId), parseInt(versionA as string), parseInt(versionB as string));
  if (!diff) return res.status(404).json({ error: 'Cannot diff' });
  res.json(diff);
});

// ========== A/B TESTING ROUTES ==========

/** POST /v1/agent/ab-test/:promptId/variant */
router.post('/agent/ab-test/:promptId/variant', ...withKey, requireAnyAuth, asyncHandler(async (req: Request, res: Response) => {
    const { variantName, contentModifier } = req.body;
    const variant = createABVariant(String(req.params.promptId), variantName, contentModifier);
    res.json(variant);
}));

/** GET /v1/agent/ab-test/:promptId/variants */
router.get('/agent/ab-test/:promptId/variants', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  res.json(getABVariants(String(req.params.promptId)));
});

/** POST /v1/agent/ab-test/:promptId/record */
router.post('/agent/ab-test/:promptId/record', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  const { variantId, success, edited, latencyMs } = req.body;
  recordABResult(String(req.params.promptId), variantId, success, edited, latencyMs);
  res.json({ success: true });
});

/** GET /v1/agent/ab-test/:promptId/winner */
router.get('/agent/ab-test/:promptId/winner', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  res.json({ winner: getABTestWinner(String(req.params.promptId)) });
});

// ========== ENRICH & VERSION ==========

/** POST /v1/agent/enrich-version/:promptId */
router.post('/agent/enrich-version/:promptId', ...withKey, requireAnyAuth, asyncHandler(async (req: Request, res: Response) => {
    const { masterPrompt, domainId, mode, userId } = req.body;
    const result = await enrichAndVersion(String(req.params.promptId), masterPrompt, { domainId, mode, userId });
    res.json(result);
}));

// ========== EXPORT/IMPORT ==========

/** GET /v1/agent/versioning/:promptId/export */
router.get('/agent/versioning/:promptId/export', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  const data = exportPromptHistory(String(req.params.promptId));
  if (!data) return res.status(404).json({ error: 'No history found' });
  res.json(data);
});

/** POST /v1/agent/versioning/import */
router.post('/agent/versioning/import', ...withKey, requireAnyAuth, (req: Request, res: Response) => {
  importPromptHistory(req.body);
  res.json({ success: true });
});

// ========== STATS ==========

/** GET /v1/agent/versioning/stats */
router.get('/agent/versioning/stats', ...withKey, requireAnyAuth, (_req: Request, res: Response) => {
  res.json(getVersioningStats());
});

// ========== TOOLS INFO ==========

/** GET /v1/agent/tools */
router.get('/agent/tools', ...withKey, requireAnyAuth, (_req: Request, res: Response) => {
  res.json({
    tools: EXTENDED_TOOLS.map(t => ({ name: t.name, description: t.description })),
  });
});

export default router;
