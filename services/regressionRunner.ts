/**
 * Regression Runner — Test suite orchestrator.
 * Coordinates quality gates (Judge, Lint, Budget, Contract) and golden test cases.
 * @see types/regression.ts
 */

import type { Pool } from 'pg';
import type {
  RegressionRun,
  RegressionResult,
  RegressionRunConfig,
  RegressionRunSummary,
  PromptTestCase,
  TriggerType,
} from '../types/regression';
import { judgePrompt } from './judgeEnsemble';
import { lintPrompt } from './promptLint';
import { analyzeBudget } from './budgetOptimizer';
import { validateContract } from './contractValidator';
import { generateEmbedding } from '../server/lib/embeddings';
import { ADVERSARIAL_SCENARIOS, evaluateAdversarialScenario, toRegressionResults } from '../server/lib/adversarialTests';

interface RunContext {
  pool: Pool;
  orgId: string;
  promptId: string;       // internal UUID
  externalId: string;     // external prompt id
  version: string;
  masterPrompt: string;
  reasoning?: string;
  domainId?: string;      // actual domain for judge gate
  config: RegressionRunConfig;
  triggerType: TriggerType;
}

// ─── Lightweight LLM call for golden tests ───────────────────────────────────

function getApiKey(provider: string): string {
  const env = typeof process !== 'undefined' ? process.env : {} as Record<string, string>;
  switch (provider) {
    case 'openai': return env.OPENAI_API_KEY || '';
    case 'groq': return env.VITE_GROQ_API_KEY || env.GROQ_API_KEY || '';
    case 'gemini': return env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '';
    case 'deepseek': return env.VITE_DEEPSEEK_API_KEY || env.DEEPSEEK_API_KEY || '';
    default: return '';
  }
}

interface LlmCallResult { output: string; provider: string; model: string }

async function callLlmForTest(systemPrompt: string, userMessage: string, config: RegressionRunConfig): Promise<LlmCallResult> {
  // Try providers in priority order
  const providers = [
    { name: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' },
    { name: 'openai', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
    { name: 'deepseek', url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
  ];

  // If config specifies a provider, try that first
  if (config.provider) {
    const preferred = providers.find(p => p.name === config.provider);
    if (preferred) {
      const others = providers.filter(p => p.name !== config.provider);
      providers.length = 0;
      providers.push(preferred, ...others);
    }
  }

  for (const p of providers) {
    const key = getApiKey(p.name);
    if (!key) continue;
    try {
      const res = await fetch(p.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: config.model || p.model,
          temperature: 0,     // Deterministic: reproducible evals
          seed: 42,           // OpenAI seed for reproducibility
          max_tokens: 2048,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? '';
      if (text) return { output: text, provider: p.name, model: config.model || p.model };
    } catch { /* try next */ }
  }

  // Fallback: return masterPrompt for non-LLM matching
  return { output: systemPrompt, provider: 'fallback', model: 'none' };
}

// ─── Adversarial test (synchronous, pattern-based) ────────────────────────────

function runAdversarialScenariosSync(masterPrompt: string) {
  return ADVERSARIAL_SCENARIOS.map(scenario =>
    evaluateAdversarialScenario(scenario, masterPrompt)
  );
}

// ─── Cosine similarity for semantic matching ─────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Execute a full regression suite for a prompt version.
 */
export async function executeRegressionRun(ctx: RunContext): Promise<{ run: RegressionRun; results: RegressionResult[] }> {
  const { pool, orgId, promptId, version, masterPrompt, reasoning, config, triggerType } = ctx;

  // 1. Create regression run record
  const runRow = await pool.query(
    `INSERT INTO regression_runs (org_id, prompt_id, version, trigger_type, status, config, started_at)
     VALUES ($1::uuid, $2::uuid, $3, $4, 'running', $5::jsonb, now())
     RETURNING id, created_at`,
    [orgId, promptId, version, triggerType, JSON.stringify(config)]
  );
  const runId = runRow.rows[0].id;
  const createdAt = runRow.rows[0].created_at;

  const results: RegressionResult[] = [];
  const judgeThreshold = config.judgeThreshold ?? 60;

  try {
    // 2. Quality gates — run in parallel
    const domainId = ctx.domainId || ctx.config.domainId || 'auto';
    const [judgeGate, lintGate, budgetGate, contractGate] = await Promise.all([
      runJudgeGate(pool, runId, masterPrompt, reasoning, domainId, judgeThreshold),
      runLintGate(pool, runId, masterPrompt, reasoning, config.lintMustPass !== false),
      runBudgetGate(pool, runId, masterPrompt, reasoning, config.budgetMaxCost),
      runContractGate(pool, runId, orgId, promptId, masterPrompt),
    ]);
    results.push(judgeGate, lintGate, budgetGate, contractGate);

    // 3. Golden test cases (LLM-powered)
    const testCases = await loadTestCases(pool, orgId, promptId);
    for (const tc of testCases) {
      const tcResult = await runGoldenTest(pool, runId, tc, masterPrompt, config);
      results.push(tcResult);
    }

    // 3b. Adversarial tests — run prompt injection/jailbreak/exfiltration scenarios
    const adversarialResults = runAdversarialScenariosSync(masterPrompt);
    for (const ar of toRegressionResults(runId, adversarialResults)) {
      const row = await insertResult(pool, {
        runId: ar.runId,
        testType: ar.testType,
        status: ar.status,
        score: ar.score,
        actualOutput: ar.actualOutput?.slice(0, 2000),
        details: ar.details as Record<string, unknown>,
      });
      results.push(row);
    }

    // 4. Calculate summary
    const summary = calculateSummary(results, judgeGate, lintGate, budgetGate, contractGate);
    const overallStatus = summary.failed > 0 || summary.errors > 0 ? 'failed' : 'passed';

    // 5. Update run record
    await pool.query(
      `UPDATE regression_runs SET status = $1, summary = $2::jsonb, completed_at = now() WHERE id = $3::uuid`,
      [overallStatus, JSON.stringify(summary), runId]
    );

    const run: RegressionRun = {
      id: runId,
      orgId,
      promptId,
      version,
      triggerType,
      status: overallStatus,
      config,
      summary,
      startedAt: createdAt,
      completedAt: new Date().toISOString(),
      createdAt,
    };

    return { run, results };
  } catch (err) {
    await pool.query(
      `UPDATE regression_runs SET status = 'error', completed_at = now() WHERE id = $1::uuid`,
      [runId]
    );
    throw err;
  }
}

// ─── Gate Runners ─────────────────────────────────────────────────────────────

async function runJudgeGate(
  pool: Pool, runId: string, prompt: string, reasoning: string | undefined,
  domainId: string, threshold: number
): Promise<RegressionResult> {
  const start = Date.now();
  try {
    const result = judgePrompt(prompt, { domainId, reasoning });
    const passed = result.totalScore >= threshold;
    const row = await insertResult(pool, {
      runId,
      testType: 'judge_gate',
      status: passed ? 'passed' : 'failed',
      score: result.totalScore,
      details: { threshold, scores: result.scores.map(s => ({ id: s.criterionId, score: s.score })) },
      durationMs: Date.now() - start,
    });
    return row;
  } catch (err) {
    return await insertResult(pool, {
      runId, testType: 'judge_gate', status: 'error',
      details: { error: err instanceof Error ? err.message : String(err) },
      durationMs: Date.now() - start,
    });
  }
}

async function runLintGate(
  pool: Pool, runId: string, prompt: string, reasoning: string | undefined,
  mustPass: boolean
): Promise<RegressionResult> {
  const start = Date.now();
  try {
    const result = lintPrompt(prompt, reasoning);
    const passed = mustPass ? result.passed : true;
    return await insertResult(pool, {
      runId, testType: 'lint_gate',
      status: passed ? 'passed' : 'failed',
      score: result.passed ? 100 : Math.max(0, 100 - result.totalErrors * 20 - result.totalWarnings * 5),
      details: { errors: result.totalErrors, warnings: result.totalWarnings, issues: result.issues.length },
      durationMs: Date.now() - start,
    });
  } catch (err) {
    return await insertResult(pool, {
      runId, testType: 'lint_gate', status: 'error',
      details: { error: err instanceof Error ? err.message : String(err) },
      durationMs: Date.now() - start,
    });
  }
}

async function runBudgetGate(
  pool: Pool, runId: string, prompt: string, reasoning: string | undefined,
  maxCost?: number
): Promise<RegressionResult> {
  const start = Date.now();
  try {
    const combined = prompt + (reasoning ? '\n' + reasoning : '');
    const result = analyzeBudget('', combined, 'auto');
    const passed = maxCost != null ? result.estimatedCost.totalCostUsd <= maxCost : true;
    return await insertResult(pool, {
      runId, testType: 'budget_gate',
      status: passed ? 'passed' : 'failed',
      score: passed ? 100 : 50,
      details: { totalTokens: result.totalTokens, costUsd: result.estimatedCost.totalCostUsd, maxCost },
      durationMs: Date.now() - start,
    });
  } catch (err) {
    return await insertResult(pool, {
      runId, testType: 'budget_gate', status: 'error',
      details: { error: err instanceof Error ? err.message : String(err) },
      durationMs: Date.now() - start,
    });
  }
}

async function runContractGate(
  pool: Pool, runId: string, _orgId: string, promptId: string, output: string
): Promise<RegressionResult> {
  const start = Date.now();
  try {
    // Load active contracts for this prompt
    const contractRows = await pool.query(
      `SELECT rules FROM prompt_contracts WHERE prompt_id = $1::uuid AND is_active = true`,
      [promptId]
    );
    if (contractRows.rows.length === 0) {
      return await insertResult(pool, {
        runId, testType: 'contract', status: 'skipped',
        score: 100,
        details: { reason: 'No active contracts' },
        durationMs: Date.now() - start,
      });
    }

    // Validate against all active contracts
    let totalScore = 0;
    let allPassed = true;
    const contractDetails: Record<string, unknown>[] = [];
    for (const row of contractRows.rows) {
      const result = validateContract(output, row.rules);
      totalScore += result.score;
      if (!result.passed) allPassed = false;
      contractDetails.push({ score: result.score, passed: result.passed, violations: result.violations.filter(v => !v.passed).length });
    }
    const avgScore = Math.round(totalScore / contractRows.rows.length);

    return await insertResult(pool, {
      runId, testType: 'contract',
      status: allPassed ? 'passed' : 'failed',
      score: avgScore,
      details: { contractCount: contractRows.rows.length, contracts: contractDetails },
      durationMs: Date.now() - start,
    });
  } catch (err) {
    return await insertResult(pool, {
      runId, testType: 'contract', status: 'error',
      details: { error: err instanceof Error ? err.message : String(err) },
      durationMs: Date.now() - start,
    });
  }
}

// ─── Golden Test Runner (LLM-powered) ────────────────────────────────────────

function buildUserMessage(masterPrompt: string, inputVars: Record<string, unknown>): string {
  // Inject input_vars into the prompt via template replacement
  let prompt = masterPrompt;
  for (const [key, value] of Object.entries(inputVars)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    prompt = prompt.replace(pattern, String(value));
  }

  // If there's a specific user message in input_vars, use it
  if (inputVars.userMessage || inputVars.user_message || inputVars.input || inputVars.query) {
    const userMsg = String(inputVars.userMessage || inputVars.user_message || inputVars.input || inputVars.query);
    return userMsg;
  }

  // Default: use the prompt itself as a test message
  return 'Execute your instructions and produce the expected output.';
}

async function runGoldenTest(
  pool: Pool, runId: string, tc: PromptTestCase, masterPrompt: string, config: RegressionRunConfig
): Promise<RegressionResult> {
  const start = Date.now();
  try {
    if (!tc.expectedOutput) {
      return await insertResult(pool, {
        runId, testType: 'golden_test', testCaseId: tc.id, status: 'skipped',
        input: JSON.stringify(tc.inputVars), expected: tc.expectedOutput,
        details: { reason: 'No expected output defined', matchMode: tc.matchMode },
        durationMs: Date.now() - start,
      });
    }

    // Call LLM with the master prompt as system + input_vars as user message
    const userMessage = buildUserMessage(masterPrompt, tc.inputVars ?? {});
    const llmResult = await callLlmForTest(masterPrompt, userMessage, config);
    const output = llmResult.output;

    let passed = false;
    let score = 0;

    switch (tc.matchMode) {
      case 'exact':
        passed = output.trim() === tc.expectedOutput.trim();
        score = passed ? 100 : 0;
        break;
      case 'contains':
        passed = output.toLowerCase().includes(tc.expectedOutput.toLowerCase());
        score = passed ? 100 : 0;
        break;
      case 'regex':
        try {
          passed = new RegExp(tc.expectedOutput, 'i').test(output);
          score = passed ? 100 : 0;
        } catch {
          passed = false;
          score = 0;
        }
        break;
      case 'semantic': {
        // Embedding-based cosine similarity
        const semanticThreshold = config.semanticThreshold ?? 0.7;
        try {
          const [embA, embB] = await Promise.all([
            generateEmbedding(output),
            generateEmbedding(tc.expectedOutput),
          ]);
          const similarity = cosineSimilarity(embA, embB);
          score = Math.round(similarity * 100);
          passed = similarity >= semanticThreshold;
        } catch {
          // Fallback to word overlap if embeddings unavailable
          const words = tc.expectedOutput.toLowerCase().split(/\s+/).filter(Boolean);
          const matchedWords = words.filter(w => output.toLowerCase().includes(w));
          score = Math.round((matchedWords.length / Math.max(words.length, 1)) * 100);
          passed = score >= semanticThreshold * 100;
        }
        break;
      }
      case 'contract':
        try {
          const rules = JSON.parse(tc.expectedOutput);
          const result = validateContract(output, rules);
          passed = result.passed;
          score = result.score;
        } catch {
          passed = false;
          score = 0;
        }
        break;
    }

    return await insertResult(pool, {
      runId, testType: 'golden_test', testCaseId: tc.id,
      status: passed ? 'passed' : 'failed',
      provider: llmResult.provider,
      model: llmResult.model,
      input: JSON.stringify(tc.inputVars),
      actualOutput: output.slice(0, 2000),
      expected: tc.expectedOutput.slice(0, 1000),
      score,
      details: { matchMode: tc.matchMode, testName: tc.name, provider: llmResult.provider },
      durationMs: Date.now() - start,
    });
  } catch (err) {
    return await insertResult(pool, {
      runId, testType: 'golden_test', testCaseId: tc.id, status: 'error',
      details: { error: err instanceof Error ? err.message : String(err) },
      durationMs: Date.now() - start,
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadTestCases(pool: Pool, orgId: string, promptId: string): Promise<PromptTestCase[]> {
  const result = await pool.query(
    `SELECT id, org_id, prompt_id, name, description, input_vars, expected_output,
            match_mode, tags, is_active, priority, created_at, updated_at
     FROM prompt_test_cases
     WHERE org_id = $1::uuid AND prompt_id = $2::uuid AND is_active = true
     ORDER BY priority DESC, created_at ASC`,
    [orgId, promptId]
  );
  return result.rows.map(r => ({
    id: r.id,
    orgId: r.org_id,
    promptId: r.prompt_id,
    name: r.name,
    description: r.description ?? undefined,
    inputVars: r.input_vars ?? {},
    expectedOutput: r.expected_output ?? undefined,
    matchMode: r.match_mode,
    tags: r.tags ?? [],
    isActive: r.is_active,
    priority: r.priority,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  }));
}

interface InsertResultParams {
  runId: string;
  testType: string;
  testCaseId?: string;
  provider?: string;
  model?: string;
  status: string;
  input?: string;
  actualOutput?: string;
  expected?: string;
  score?: number;
  details?: Record<string, unknown>;
  durationMs?: number;
}

async function insertResult(pool: Pool, params: InsertResultParams): Promise<RegressionResult> {
  const row = await pool.query(
    `INSERT INTO regression_results
       (run_id, test_type, test_case_id, provider, model, status, input, actual_output, expected, score, details, duration_ms)
     VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)
     RETURNING id, created_at`,
    [
      params.runId, params.testType, params.testCaseId || null,
      params.provider || null, params.model || null, params.status,
      params.input || null, params.actualOutput || null, params.expected || null,
      params.score ?? null, JSON.stringify(params.details ?? {}), params.durationMs ?? null,
    ]
  );
  return {
    id: row.rows[0].id,
    runId: params.runId,
    testType: params.testType as RegressionResult['testType'],
    testCaseId: params.testCaseId,
    provider: params.provider,
    model: params.model,
    status: params.status as RegressionResult['status'],
    input: params.input,
    actualOutput: params.actualOutput,
    expected: params.expected,
    score: params.score,
    details: params.details ?? {},
    durationMs: params.durationMs,
    createdAt: new Date(row.rows[0].created_at).toISOString(),
  };
}

function calculateSummary(
  results: RegressionResult[],
  judgeGate: RegressionResult,
  lintGate: RegressionResult,
  budgetGate: RegressionResult,
  contractGate: RegressionResult,
): RegressionRunSummary {
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const errors = results.filter(r => r.status === 'error').length;

  const lintDetails = (lintGate.details ?? {}) as { errors?: number; warnings?: number };

  const summary: RegressionRunSummary = {
    totalTests: results.length,
    passed,
    failed,
    skipped,
    errors,
    gateResults: {
      judge: { passed: judgeGate.status === 'passed', score: judgeGate.score ?? 0 },
      lint: { passed: lintGate.status === 'passed', errors: lintDetails.errors ?? 0, warnings: lintDetails.warnings ?? 0 },
      contract: { passed: contractGate.status === 'passed' || contractGate.status === 'skipped', score: contractGate.score ?? 100 },
      budget: { passed: budgetGate.status === 'passed' || budgetGate.status === 'skipped', costUsd: ((budgetGate.details ?? {}) as { costUsd?: number }).costUsd ?? 0 },
    },
    overallScore: results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + (r.score ?? 0), 0) / results.length)
      : 0,
  };

  return summary;
}
