import { Router } from 'express';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { optionalApiKey } from '../middleware/auth';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { apiRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../lib/asyncHandler';
import { runPromptAgent } from '../../services/agentService';
import { runOrchestrator } from '../../services/multiAgentOrchestrator';
import { enrichMasterPrompt } from '../lib/enrichment';
import { enrichWithAgent } from '../lib/enrichment/agentEnrichment';
import { judgePrompt } from '../../services/judgeEnsemble';
import { lintPrompt } from '../../services/promptLint';
import { analyzeBudget } from '../../services/budgetOptimizer';
import { buildAST, extractVariables, computeMetrics, astToJSON, transformPrompt } from '../../services/promptParser';
import type { TransformationType } from '../../types/promptParser';
import { analyzeWithLangExtract } from '../lib/langextract/client';
import { getPromptStore } from '../store/promptStore';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type BrainOperation =
  | 'analyze_intent'
  | 'enrich_prompt'
  | 'enhance_prompt'
  | 'prompt_analysis'
  | 'prompt_transform'
  | 'fix_text'
  | 'quality_suite'
  | 'version_history'
  | 'orchestrate';

function safeLang(language?: unknown): 'tr' | 'en' {
  return language === 'tr' ? 'tr' : 'en';
}

async function runPythonEnhancer(input: {
  masterPrompt: string;
  domainId?: string;
  framework?: string;
  language: 'tr' | 'en';
  reasoning?: string;
}): Promise<Record<string, unknown>> {
  const payload = JSON.stringify({
    masterPrompt: input.masterPrompt,
    domainId: input.domainId || 'auto',
    framework: input.framework || 'AUTO',
    language: input.language,
    reasoning: input.reasoning || '',
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
    proc.stdin?.write(payload);
    proc.stdin?.end();
  });

  return JSON.parse(result) as Record<string, unknown>;
}

async function runFtfyFix(text: string): Promise<{ original: string; fixed: string }> {
  const scriptPath = path.resolve(__dirname, '../scripts/ftfy_fix.py');
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
    proc.stdin?.write(JSON.stringify({ text }));
    proc.stdin?.end();
  });

  const parsed = JSON.parse(result) as { fixed?: string };
  return { original: text, fixed: parsed.fixed ?? text };
}

router.get('/brain/status', (_req, res) => {
  res.json({
    ready: true,
    engine: 'super-reasoning-brain-v1',
    operations: ['analyze_intent', 'enrich_prompt', 'enhance_prompt', 'prompt_analysis', 'prompt_transform', 'fix_text', 'quality_suite', 'version_history', 'orchestrate'],
  });
});

router.post('/brain/execute', optionalApiKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
  const { operation, payload, language, context } = req.body ?? {} as {
    operation?: BrainOperation;
    payload?: Record<string, unknown>;
    language?: string;
    context?: Record<string, unknown>;
  };

  if (!operation) {
    return res.status(400).json({ error: 'operation required' });
  }

  const lang = safeLang(language);

  if (operation === 'analyze_intent') {
    const prompt = typeof payload?.prompt === 'string' ? payload.prompt : '';
    if (!prompt) return res.status(400).json({ error: 'payload.prompt required' });

    const query = lang === 'tr'
      ? `Bu kullanıcı girdisini analiz et ve en uygun domain ile framework'ü öner. Sadece JSON döndür, başka açıklama ekleme: "${prompt.slice(0, 300)}"\n\nYanıt formatı: {"domain": "...", "framework": "...", "reasoning": "..."}`
      : `Analyze this user input and suggest the best domain and framework. Return only JSON, no extra explanation: "${prompt.slice(0, 300)}"\n\nResponse format: {"domain": "...", "framework": "...", "reasoning": "..."}`;

    const result = await runPromptAgent(query, lang, {
      currentPrompt: prompt,
      domainId: typeof payload?.domainId === 'string' ? payload.domainId : undefined,
      framework: typeof payload?.framework === 'string' ? payload.framework : undefined,
      analyticsSnapshot: context,
    });

    let parsed: { domain?: string; framework?: string; reasoning?: string } = {};
    try {
      const jsonMatch = result.answer.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      // fallback to raw answer
    }

    return res.json({
      operation,
      ok: true,
      result: {
        domain: parsed.domain || 'auto',
        framework: parsed.framework || 'Universal',
        reasoning: parsed.reasoning || result.answer,
        enrichedPrompt: result.enrichedPrompt,
      },
    });
  }

  if (operation === 'enrich_prompt') {
    const masterPrompt = typeof payload?.masterPrompt === 'string' ? payload.masterPrompt : '';
    if (!masterPrompt) return res.status(400).json({ error: 'payload.masterPrompt required' });

    const mode = payload?.mode === 'agent' ? 'agent' : payload?.mode === 'deep' ? 'deep' : 'fast';

    if (mode === 'agent') {
      const result = await enrichWithAgent(masterPrompt, {
        domainId: typeof payload?.domainId === 'string' ? payload.domainId : undefined,
        framework: typeof payload?.framework === 'string' ? payload.framework : undefined,
        language: lang,
        maxIterations: typeof payload?.maxIterations === 'number' ? payload.maxIterations : 3,
        targetScore: typeof payload?.targetScore === 'number' ? payload.targetScore : 90,
        maxTokenBudget: typeof payload?.maxTokenBudget === 'number' ? payload.maxTokenBudget : 2000,
      });

      return res.json({ operation, ok: true, result });
    }

    const result = await enrichMasterPrompt(masterPrompt, {
      domainId: typeof payload?.domainId === 'string' ? payload.domainId : undefined,
      framework: typeof payload?.framework === 'string' ? payload.framework : undefined,
      language: lang,
      config: { mode },
    });

    return res.json({ operation, ok: true, result });
  }

  if (operation === 'enhance_prompt') {
    const masterPrompt = typeof payload?.masterPrompt === 'string' ? payload.masterPrompt : '';
    if (!masterPrompt) return res.status(400).json({ error: 'payload.masterPrompt required' });

    const result = await runPythonEnhancer({
      masterPrompt,
      domainId: typeof payload?.domainId === 'string' ? payload.domainId : undefined,
      framework: typeof payload?.framework === 'string' ? payload.framework : undefined,
      language: lang,
      reasoning: typeof payload?.reasoning === 'string' ? payload.reasoning : '',
    });

    return res.json({ operation, ok: true, result });
  }

  if (operation === 'prompt_analysis') {
    const prompt = typeof payload?.prompt === 'string' ? payload.prompt : '';
    const analysisType = typeof payload?.analysisType === 'string' ? payload.analysisType : 'structure';
    if (!prompt) return res.status(400).json({ error: 'payload.prompt required' });

    if (analysisType === 'variables') {
      const result = extractVariables(prompt.slice(0, 50000), {
        style: 'all',
        inferTypes: true,
      });
      return res.json({ operation, ok: true, result });
    }

    if (analysisType === 'elements') {
      const result = await analyzeWithLangExtract(prompt.slice(0, 50000), lang);
      return res.json({ operation, ok: true, result });
    }

    const ast = buildAST(prompt.slice(0, 50000));
    const metrics = computeMetrics(ast, prompt);
    const summary = lang === 'tr'
      ? `${ast.statistics.sectionCount} bölüm, ${ast.statistics.constraintCount} kısıt, ${ast.statistics.variableCount} değişken bulundu.`
      : `Found ${ast.statistics.sectionCount} sections, ${ast.statistics.constraintCount} constraints, ${ast.statistics.variableCount} variables.`;

    return res.json({
      operation,
      ok: true,
      result: {
        ast: astToJSON(ast),
        statistics: ast.statistics,
        metrics,
        summary,
      },
    });
  }

  if (operation === 'prompt_transform') {
    const prompt = typeof payload?.prompt === 'string' ? payload.prompt : '';
    const transformation = typeof payload?.transformation === 'string' ? payload.transformation : '';
    if (!prompt) return res.status(400).json({ error: 'payload.prompt required' });

    const validTransforms: TransformationType[] = [
      'markdown_to_json',
      'flat_to_structured',
      'single_to_multiturn',
      'normalize_variables',
    ];

    if (!validTransforms.includes(transformation as TransformationType)) {
      return res.status(400).json({ error: `invalid transformation: ${transformation}` });
    }

    const result = transformPrompt(prompt.slice(0, 50000), transformation as TransformationType, {});
    return res.json({ operation, ok: true, result });
  }

  if (operation === 'fix_text') {
    const text = typeof payload?.text === 'string' ? payload.text : '';
    if (!text) return res.status(400).json({ error: 'payload.text required' });

    const result = await runFtfyFix(text);
    return res.json({ operation, ok: true, result });
  }

  if (operation === 'quality_suite') {
    const masterPrompt = typeof payload?.masterPrompt === 'string' ? payload.masterPrompt : '';
    const reasoning = typeof payload?.reasoning === 'string' ? payload.reasoning : '';
    if (!masterPrompt) return res.status(400).json({ error: 'payload.masterPrompt required' });

    const judge = judgePrompt(masterPrompt, {
      domainId: typeof payload?.domainId === 'string' ? payload.domainId : undefined,
      framework: typeof payload?.framework === 'string' ? payload.framework : undefined,
      reasoning,
    });
    const lint = lintPrompt(masterPrompt, reasoning);
    const budget = analyzeBudget(
      typeof payload?.inputText === 'string' ? payload.inputText : '',
      masterPrompt + (reasoning ? `\n${reasoning}` : ''),
      typeof payload?.provider === 'string' ? payload.provider : 'groq',
    );

    return res.json({ operation, ok: true, result: { judge, lint, budget } });
  }

  if (operation === 'version_history') {
    const promptId = typeof payload?.promptId === 'string' ? payload.promptId : '';
    if (!promptId) return res.status(400).json({ error: 'payload.promptId required' });

    const promptStore = getPromptStore();
    const orgId = req.tenantId ?? null;
    const versions = await promptStore.listVersions(promptId, orgId);
    return res.json({ operation, ok: true, result: { promptId, versions } });
  }

  if (operation === 'orchestrate') {
    const query = typeof payload?.query === 'string' ? payload.query : '';
    if (!query) return res.status(400).json({ error: 'payload.query required' });

    const userId = typeof payload?.userId === 'string' ? payload.userId : 'anonymous';
    const result = await runOrchestrator(query, userId, context);
    return res.json({ operation, ok: true, result });
  }

  return res.status(400).json({ error: `unsupported operation: ${operation}` });
}));

export default router;
