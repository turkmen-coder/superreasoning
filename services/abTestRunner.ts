/**
 * A/B Test Runner — Execute and analyze prompt variant experiments.
 *
 * Runs two prompt variants side-by-side, collects metrics,
 * and produces statistical comparison using Welch's t-test.
 *
 * @see types/abTest.ts
 */

import type { Pool } from 'pg';
import type {
  ABTest,
  ABTestVariantResult,
  ABTestMetrics,
  MetricComparison,
  ABTestResult,
  Variant,
} from '../types/abTest';
import { judgePrompt } from './judgeEnsemble';
import { lintPrompt } from './promptLint';
import { analyzeBudget } from './budgetOptimizer';

// ── Metric collection ──────────────────────────────────────────────────────

/**
 * Collect metrics for a single variant sample.
 */
function collectMetrics(
  masterPrompt: string,
  reasoning: string | undefined,
  domainId: string,
  durationMs: number,
): ABTestMetrics {
  const metrics: ABTestMetrics = {};

  // Judge score
  try {
    const judgeResult = judgePrompt(masterPrompt, { domainId, reasoning });
    metrics.judgeScore = judgeResult.totalScore;
  } catch {
    metrics.judgeScore = 0;
  }

  // Lint errors
  try {
    const lintResult = lintPrompt(masterPrompt, reasoning);
    metrics.lintErrors = lintResult.totalErrors;
  } catch {
    metrics.lintErrors = 0;
  }

  // Budget / token analysis
  try {
    const combined = masterPrompt + (reasoning ? '\n' + reasoning : '');
    const budgetResult = analyzeBudget('', combined, 'auto');
    metrics.tokenCount = budgetResult.totalTokens;
    metrics.costUsd = budgetResult.estimatedCost.totalCostUsd;
  } catch {
    metrics.tokenCount = 0;
    metrics.costUsd = 0;
  }

  metrics.latencyMs = durationMs;

  return metrics;
}

// ── Statistical Analysis ───────────────────────────────────────────────────

/** Compute mean of an array */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Compute standard deviation */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Welch's t-test for two independent samples with unequal variances.
 * Returns the two-tailed p-value.
 */
function welchTTest(
  samplesA: number[],
  samplesB: number[],
): { tStat: number; pValue: number; df: number } {
  const nA = samplesA.length;
  const nB = samplesB.length;

  if (nA < 2 || nB < 2) {
    return { tStat: 0, pValue: 1, df: 0 };
  }

  const meanA = mean(samplesA);
  const meanB = mean(samplesB);
  const varA = stdDev(samplesA) ** 2;
  const varB = stdDev(samplesB) ** 2;

  const seA = varA / nA;
  const seB = varB / nB;
  const seDiff = Math.sqrt(seA + seB);

  if (seDiff === 0) {
    return { tStat: 0, pValue: 1, df: nA + nB - 2 };
  }

  const tStat = (meanA - meanB) / seDiff;

  // Welch-Satterthwaite degrees of freedom
  const df = ((seA + seB) ** 2) /
    ((seA ** 2) / (nA - 1) + (seB ** 2) / (nB - 1));

  // Approximate p-value using the normal distribution for large df
  // For small df, this is an approximation
  const pValue = approximatePValue(Math.abs(tStat), df);

  return { tStat, pValue, df };
}

/**
 * Approximate two-tailed p-value from t-statistic.
 * Uses a simplified approximation suitable for df > 5.
 */
function approximatePValue(absT: number, df: number): number {
  if (df <= 0) return 1;

  // For large df, use normal approximation
  if (df > 30) {
    // Standard normal CDF approximation
    const x = absT;
    const t = 1 / (1 + 0.2316419 * x);
    const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    const phi = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
    const oneTail = phi * poly;
    return Math.min(1, Math.max(0, 2 * oneTail));
  }

  // For smaller df, use a rough lookup-based approximation
  // Critical values for two-tailed test at common significance levels
  const criticalValues: Record<number, number[]> = {
    // [0.10, 0.05, 0.025, 0.01, 0.005]
    5: [2.015, 2.571, 3.163, 4.032, 4.773],
    10: [1.812, 2.228, 2.634, 3.169, 3.581],
    15: [1.753, 2.131, 2.490, 2.947, 3.286],
    20: [1.725, 2.086, 2.423, 2.845, 3.153],
    25: [1.708, 2.060, 2.385, 2.787, 3.078],
    30: [1.697, 2.042, 2.360, 2.750, 3.030],
  };

  // Find closest df
  const dfKeys = Object.keys(criticalValues).map(Number).sort((a, b) => a - b);
  const closestDf = dfKeys.reduce((prev, curr) =>
    Math.abs(curr - df) < Math.abs(prev - df) ? curr : prev
  );

  const pLevels = [0.10, 0.05, 0.025, 0.01, 0.005];
  const cv = criticalValues[closestDf];

  for (let i = cv.length - 1; i >= 0; i--) {
    if (absT >= cv[i]) {
      return pLevels[i];
    }
  }

  return 0.5; // Not significant
}

// ── Metric direction (higher or lower is better) ──────────────────────────

const LOWER_IS_BETTER = new Set(['latencyMs', 'tokenCount', 'costUsd', 'lintErrors']);

function determineWinner(
  metric: string,
  meanA: number,
  meanB: number,
  significant: boolean,
): Variant | 'tie' {
  if (!significant) return 'tie';

  const diff = Math.abs(meanA - meanB);
  if (diff < 0.001) return 'tie';

  if (LOWER_IS_BETTER.has(metric)) {
    return meanA < meanB ? 'A' : 'B';
  }
  return meanA > meanB ? 'A' : 'B';
}

// ── Compare Metrics ────────────────────────────────────────────────────────

function compareMetric(
  metric: string,
  resultsA: ABTestVariantResult[],
  resultsB: ABTestVariantResult[],
  significanceLevel: number,
): MetricComparison {
  const samplesA = resultsA
    .map(r => r.metrics[metric])
    .filter((v): v is number => v != null);
  const samplesB = resultsB
    .map(r => r.metrics[metric])
    .filter((v): v is number => v != null);

  const meanA = mean(samplesA);
  const meanB = mean(samplesB);
  const sdA = stdDev(samplesA);
  const sdB = stdDev(samplesB);
  const minA = samplesA.length > 0 ? Math.min(...samplesA) : 0;
  const maxA = samplesA.length > 0 ? Math.max(...samplesA) : 0;
  const minB = samplesB.length > 0 ? Math.min(...samplesB) : 0;
  const maxB = samplesB.length > 0 ? Math.max(...samplesB) : 0;

  const { pValue } = welchTTest(samplesA, samplesB);
  const significant = pValue <= significanceLevel;
  const difference = meanB - meanA;
  const differencePercent = meanA !== 0
    ? Math.round(((meanB - meanA) / Math.abs(meanA)) * 10000) / 100
    : 0;

  return {
    metric,
    variantA: { mean: round4(meanA), stdDev: round4(sdA), min: round4(minA), max: round4(maxA), samples: samplesA.length },
    variantB: { mean: round4(meanB), stdDev: round4(sdB), min: round4(minB), max: round4(maxB), samples: samplesB.length },
    difference: round4(difference),
    differencePercent: round4(differencePercent),
    winner: determineWinner(metric, meanA, meanB, significant),
    pValue: round4(pValue),
    significant,
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ── Main Runner ────────────────────────────────────────────────────────────

interface ABTestRunContext {
  pool: Pool;
  orgId: string;
  test: ABTest;
  /** Function to load prompt content by version */
  loadPromptContent: (version: string) => Promise<{ masterPrompt: string; reasoning?: string }>;
  /** Domain ID for judge evaluation */
  domainId?: string;
}

/**
 * Execute an A/B test: run both variants, collect metrics, compare.
 */
export async function executeABTest(ctx: ABTestRunContext): Promise<ABTestResult> {
  const { pool, test, loadPromptContent, domainId } = ctx;

  // Mark test as running
  await pool.query(
    `UPDATE ab_tests SET status = 'running', started_at = now(), updated_at = now() WHERE id = $1::uuid`,
    [test.id]
  );

  const variantAResults: ABTestVariantResult[] = [];
  const variantBResults: ABTestVariantResult[] = [];

  try {
    // Load prompt content for each variant
    const contentA = await loadPromptContent(test.variantA.version);
    const contentB = await loadPromptContent(test.variantB.version);

    // Run samples for both variants
    const sampleSize = test.config.sampleSize;

    for (let i = 0; i < sampleSize; i++) {
      // Run variant A
      const startA = Date.now();
      const metricsA = collectMetrics(
        contentA.masterPrompt,
        contentA.reasoning,
        domainId ?? 'auto',
        0,
      );
      metricsA.latencyMs = Date.now() - startA;

      const resultA: ABTestVariantResult = {
        id: `${test.id}-A-${i}`,
        testId: test.id,
        variant: 'A',
        sampleIndex: i,
        output: contentA.masterPrompt.slice(0, 500),
        metrics: metricsA,
        provider: test.variantA.provider,
        model: test.variantA.model,
        durationMs: metricsA.latencyMs,
        createdAt: new Date().toISOString(),
      };
      variantAResults.push(resultA);

      // Store in DB
      await pool.query(
        `INSERT INTO ab_test_variants (test_id, variant, sample_index, output, metrics, provider, model, duration_ms)
         VALUES ($1::uuid, 'A', $2, $3, $4::jsonb, $5, $6, $7)`,
        [test.id, i, resultA.output, JSON.stringify(metricsA), test.variantA.provider, test.variantA.model, resultA.durationMs]
      );

      // Run variant B
      const startB = Date.now();
      const metricsB = collectMetrics(
        contentB.masterPrompt,
        contentB.reasoning,
        domainId ?? 'auto',
        0,
      );
      metricsB.latencyMs = Date.now() - startB;

      const resultB: ABTestVariantResult = {
        id: `${test.id}-B-${i}`,
        testId: test.id,
        variant: 'B',
        sampleIndex: i,
        output: contentB.masterPrompt.slice(0, 500),
        metrics: metricsB,
        provider: test.variantB.provider,
        model: test.variantB.model,
        durationMs: metricsB.latencyMs,
        createdAt: new Date().toISOString(),
      };
      variantBResults.push(resultB);

      await pool.query(
        `INSERT INTO ab_test_variants (test_id, variant, sample_index, output, metrics, provider, model, duration_ms)
         VALUES ($1::uuid, 'B', $2, $3, $4::jsonb, $5, $6, $7)`,
        [test.id, i, resultB.output, JSON.stringify(metricsB), test.variantB.provider, test.variantB.model, resultB.durationMs]
      );
    }

    // Compare metrics
    const significanceLevel = test.config.significanceLevel ?? 0.05;
    const comparisons = test.config.metrics.map(metric =>
      compareMetric(metric, variantAResults, variantBResults, significanceLevel)
    );

    // Determine overall winner
    const { winner: overallWinner, confidence } = determineOverallWinner(comparisons);

    // Generate summary
    const summary = generateSummary(comparisons, overallWinner, confidence);

    // Mark test as completed
    await pool.query(
      `UPDATE ab_tests SET status = 'completed', completed_at = now(), updated_at = now() WHERE id = $1::uuid`,
      [test.id]
    );

    return {
      testId: test.id,
      promptId: test.promptId,
      status: 'completed',
      comparisons,
      overallWinner,
      confidence,
      variantAResults,
      variantBResults,
      summary,
    };
  } catch (err) {
    // Mark as cancelled on error
    await pool.query(
      `UPDATE ab_tests SET status = 'cancelled', updated_at = now() WHERE id = $1::uuid`,
      [test.id]
    );

    return {
      testId: test.id,
      promptId: test.promptId,
      status: 'cancelled',
      comparisons: [],
      overallWinner: 'inconclusive',
      confidence: 0,
      variantAResults,
      variantBResults,
      summary: `Test cancelled: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── Winner Determination ───────────────────────────────────────────────────

function determineOverallWinner(
  comparisons: MetricComparison[],
): { winner: ABTestResult['overallWinner']; confidence: number } {
  const significantComparisons = comparisons.filter(c => c.significant);

  if (significantComparisons.length === 0) {
    return { winner: 'inconclusive', confidence: 0 };
  }

  let aWins = 0;
  let bWins = 0;

  for (const c of significantComparisons) {
    if (c.winner === 'A') aWins++;
    else if (c.winner === 'B') bWins++;
  }

  const total = significantComparisons.length;
  const maxWins = Math.max(aWins, bWins);
  const confidence = total > 0 ? maxWins / total : 0;

  if (aWins === bWins) {
    return { winner: 'tie', confidence: 0.5 };
  }

  return {
    winner: aWins > bWins ? 'A' : 'B',
    confidence: Math.round(confidence * 100) / 100,
  };
}

function generateSummary(
  comparisons: MetricComparison[],
  winner: ABTestResult['overallWinner'],
  confidence: number,
): string {
  const lines: string[] = [];

  if (winner === 'inconclusive') {
    lines.push('No statistically significant differences found between variants.');
  } else if (winner === 'tie') {
    lines.push('Variants are statistically tied across measured metrics.');
  } else {
    lines.push(`Variant ${winner} is the winner with ${(confidence * 100).toFixed(0)}% metric advantage.`);
  }

  for (const c of comparisons) {
    const sigLabel = c.significant ? '*' : '';
    lines.push(
      `  ${c.metric}: A=${c.variantA.mean.toFixed(2)} vs B=${c.variantB.mean.toFixed(2)} ` +
      `(diff=${c.differencePercent.toFixed(1)}%, p=${c.pValue.toFixed(3)})${sigLabel}`
    );
  }

  return lines.join('\n');
}
