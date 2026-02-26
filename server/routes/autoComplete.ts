/**
 * Auto-Complete endpoint — Tüm analiz araçlarını orkestre ederek
 * SYSTEM / DEVELOPER / USER sentezli tek prompt üretir.
 *
 * Pipeline: Parse → Variables → LangExtract → Metrics → Enrich → Enhance → Synthesize
 */

import { Router } from 'express';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { optionalApiKey } from '../middleware/auth';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { apiRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../lib/asyncHandler';
import { buildAST, extractVariables, computeMetrics } from '../../services/promptParser';
import { analyzeWithLangExtract } from '../lib/langextract/client';
import { enrichMasterPrompt } from '../lib/enrichment';
import { enrichWithAgent } from '../lib/enrichment/agentEnrichment';
import { lintPrompt } from '../../services/promptLint';
import type { PromptQualityMetrics } from '../../types/promptParser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

interface SynthesisInput {
  original: string;
  language: string;
  domainId?: string;
  framework?: string;
  // Analysis results
  stats: ReturnType<typeof buildAST>['statistics'];
  metrics: PromptQualityMetrics;
  variables: Array<{ name: string; style: string; inferredType?: string; required?: boolean }>;
  elements: Array<{ extractionClass: string; extractionText: string }>;
  enrichedPrompt?: string;
  enhancedPrompt?: string;
  lintIssues: Array<{ ruleId: string; severity: string; message: string }>;
}

/**
 * Tüm analiz sonuçlarını birleştirip tek ## PROMPT bloğu üret.
 */
function synthesizePrompt(input: SynthesisInput): string {
  const { stats, metrics, variables, elements, enrichedPrompt, enhancedPrompt, lintIssues, language, domainId, framework } = input;
  const tr = language === 'tr';

  // Temel prompt: enhance > enrich > original
  const basePrompt = (enhancedPrompt || enrichedPrompt || input.original).trim();

  // Eğer zaten ## PROMPT formatındaysa doğrudan döndür
  if (/^##\s*PROMPT\b/im.test(basePrompt)) {
    return basePrompt;
  }

  // Eski SYSTEM/DEVELOPER/USER yapısını temizle, düz içeriği al
  const cleanedBase = basePrompt
    .replace(/^##?\s*(SYSTEM|DEVELOPER|USER|SİSTEM|GELİŞTİRİCİ|KULLANICI)\b.*$/gim, '')
    .trim();

  // --- Extract elements from analysis ---
  const constraints = elements.filter(e => e.extractionClass === 'constraint').map(e => e.extractionText);
  const guardrails = elements.filter(e => e.extractionClass === 'guardrail').map(e => e.extractionText);
  const outputFormats = elements.filter(e => e.extractionClass === 'output_format').map(e => e.extractionText);

  // --- Build single unified ## PROMPT block ---
  const parts: string[] = [];
  parts.push('## PROMPT');
  parts.push('');

  // Core content
  parts.push(cleanedBase || input.original.trim());

  // Constraints
  if (constraints.length > 0 || stats.constraintCount > 0) {
    parts.push('');
    parts.push(tr ? '### Kısıtlar' : '### Constraints');
    if (constraints.length > 0) {
      constraints.forEach(c => parts.push(`- ${c}`));
    } else {
      basePrompt.split('\n')
        .filter(l => /^[-*]\s*(never|always|do not|don't|must not|asla|her zaman|yapma)/i.test(l.trim()))
        .forEach(l => parts.push(l.trim()));
    }
  }

  // Guardrails
  if (guardrails.length > 0 || stats.hasGuardrails) {
    parts.push('');
    parts.push(tr ? '### Güvenlik' : '### Safety');
    guardrails.forEach(g => parts.push(`- ${g}`));
  }

  // Output format
  if (outputFormats.length > 0 || stats.hasOutputFormat) {
    parts.push('');
    parts.push(tr ? '### Çıktı Formatı' : '### Output Format');
    outputFormats.forEach(f => parts.push(f));
  }

  // Variables
  const requiredVars = variables.filter(v => v.required !== false);
  if (requiredVars.length > 0) {
    parts.push('');
    parts.push(tr ? '### Girdi Değişkenleri' : '### Input Variables');
    requiredVars.forEach(v => {
      const typeHint = v.inferredType ? ` (${v.inferredType})` : '';
      parts.push(`- \`${v.name}\`${typeHint}`);
    });
  }

  // Quality metadata (inline, minimal)
  parts.push('');
  parts.push(`> Score: ${Math.round(metrics.quality.overallScore)}/100` +
    (domainId ? ` | Domain: ${domainId}` : '') +
    (framework ? ` | Framework: ${framework}` : '') +
    (lintIssues.length > 0 ? ` | Lint: ${lintIssues.length} issue(s)` : ''));

  return parts.join('\n');
}

/**
 * Python prompt_enhancer.py çağırır.
 */
async function runPythonEnhancer(prompt: string, domainId: string, framework: string, language: string): Promise<string | null> {
  try {
    const scriptPath = path.resolve(__dirname, '../../scripts/prompt_enhancer.py');
    const input = JSON.stringify({
      masterPrompt: prompt,
      domainId: domainId || 'auto',
      framework: framework || 'AUTO',
      language: language || 'en',
      reasoning: '',
    });

    const result = await new Promise<string>((resolve, reject) => {
      const proc = execFile('python3', [scriptPath], {
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve(stdout);
      });
      proc.stdin?.write(input);
      proc.stdin?.end();
    });

    const parsed = JSON.parse(result);
    return parsed.enhanced || null;
  } catch {
    return null;
  }
}

/** POST /v1/auto-complete — Full pipeline: Analyze → Enrich → Enhance → Synthesize */
router.post('/auto-complete', optionalApiKey, apiRateLimiter, requireAnyAuth, asyncHandler(async (req, res) => {
  const { masterPrompt, domainId, framework, language = 'en', mode } = req.body ?? {};
  if (!masterPrompt || typeof masterPrompt !== 'string') {
    return res.status(400).json({ error: 'masterPrompt (string) required' });
  }

  const prompt = masterPrompt.slice(0, 50000);
  const startTime = Date.now();
  const steps: Array<{ step: string; durationMs: number; status: 'ok' | 'skip' | 'error' }> = [];

  // Step 1: Parse AST + Metrics
  let t0 = Date.now();
  const ast = buildAST(prompt);
  const metrics = computeMetrics(ast, prompt);
  steps.push({ step: 'parse', durationMs: Date.now() - t0, status: 'ok' });

  // Step 2: Extract variables
  t0 = Date.now();
  const varResult = extractVariables(prompt, { style: 'all', inferTypes: true });
  steps.push({ step: 'variables', durationMs: Date.now() - t0, status: 'ok' });

  // Step 3: LangExtract analysis
  t0 = Date.now();
  let langExtractItems: Array<{ extractionClass: string; extractionText: string }> = [];
  try {
    const leResult = await analyzeWithLangExtract(prompt, language === 'tr' ? 'tr' : 'en');
    if (leResult.items && leResult.items.length > 0) {
      langExtractItems = leResult.items.map((item: any) => ({
        extractionClass: item.extractionClass || item.class || '',
        extractionText: item.extractionText || item.text || '',
      }));
    }
    steps.push({ step: 'langextract', durationMs: Date.now() - t0, status: 'ok' });
  } catch {
    steps.push({ step: 'langextract', durationMs: Date.now() - t0, status: 'skip' });
  }

  // Step 4: Lint
  t0 = Date.now();
  const lintResult = lintPrompt(prompt);
  steps.push({ step: 'lint', durationMs: Date.now() - t0, status: 'ok' });

  // Step 5: Enrich (library integration)
  t0 = Date.now();
  let enrichedPrompt: string | undefined;
  try {
    if (mode === 'agent') {
      const agentResult = await enrichWithAgent(prompt, {
        domainId: typeof domainId === 'string' ? domainId : undefined,
        framework: typeof framework === 'string' ? framework : undefined,
        language: language === 'tr' ? 'tr' : 'en',
        maxIterations: 3,
        targetScore: 90,
        maxTokenBudget: 2000,
      });
      if (agentResult.enrichedPrompt.trim()) {
        enrichedPrompt = agentResult.enrichedPrompt;
      }
    } else {
      const enrichResult = await enrichMasterPrompt(prompt, {
        domainId: typeof domainId === 'string' ? domainId : undefined,
        framework: typeof framework === 'string' ? framework : undefined,
        language: language === 'tr' ? 'tr' : 'en',
        config: { mode: 'fast' },
      });
      if (enrichResult.integratedPrompts.length > 0 && enrichResult.enrichedPrompt.trim()) {
        enrichedPrompt = enrichResult.enrichedPrompt;
      }
    }
    steps.push({ step: 'enrich', durationMs: Date.now() - t0, status: enrichedPrompt ? 'ok' : 'skip' });
  } catch {
    steps.push({ step: 'enrich', durationMs: Date.now() - t0, status: 'skip' });
  }

  // Step 6: Enhance (Python prompt_enhancer.py)
  t0 = Date.now();
  const enhancedPrompt = await runPythonEnhancer(
    enrichedPrompt || prompt,
    domainId || 'auto',
    framework || 'AUTO',
    language,
  );
  steps.push({ step: 'enhance', durationMs: Date.now() - t0, status: enhancedPrompt ? 'ok' : 'skip' });

  // Step 7: Synthesize into SYSTEM / DEVELOPER / USER
  t0 = Date.now();
  const synthesized = synthesizePrompt({
    original: prompt,
    language,
    domainId,
    framework,
    stats: ast.statistics,
    metrics,
    variables: varResult.variables.map(v => ({
      name: v.name,
      style: v.style,
      inferredType: v.inferredType,
      required: v.required,
    })),
    elements: langExtractItems,
    enrichedPrompt,
    enhancedPrompt: enhancedPrompt ?? undefined,
    lintIssues: lintResult.issues.map(i => ({
      ruleId: i.ruleId,
      severity: i.severity,
      message: i.message,
    })),
  });
  steps.push({ step: 'synthesize', durationMs: Date.now() - t0, status: 'ok' });

  const totalMs = Date.now() - startTime;

  res.json({
    synthesized,
    pipeline: {
      steps,
      totalMs,
      stepsCompleted: steps.filter(s => s.status === 'ok').length,
      stepsTotal: steps.length,
    },
    analysis: {
      statistics: ast.statistics,
      metrics,
      variableCount: varResult.summary.unique,
      elementCount: langExtractItems.length,
      lintErrors: lintResult.totalErrors,
      lintWarnings: lintResult.totalWarnings,
      qualityScore: Math.round(metrics.quality.overallScore),
    },
  });
}));

export default router;
