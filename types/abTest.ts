/**
 * A/B Test types — Prompt variant experimentation.
 *
 * Run two prompt versions (or two provider configs) side-by-side
 * and compare metrics with statistical significance testing.
 */

export type ABTestStatus = 'draft' | 'running' | 'completed' | 'cancelled';
export type Variant = 'A' | 'B';

export interface ABTestVariantConfig {
  /** Prompt version to test */
  version: string;
  /** Optional: specific provider override */
  provider?: string;
  /** Optional: specific model override */
  model?: string;
  /** Optional: generation config overrides */
  config?: Record<string, unknown>;
}

export interface ABTestMetrics {
  judgeScore?: number;
  latencyMs?: number;
  tokenCount?: number;
  costUsd?: number;
  lintErrors?: number;
  contractScore?: number;
  [key: string]: number | undefined;
}

export interface ABTestVariantResult {
  id: string;
  testId: string;
  variant: Variant;
  sampleIndex: number;
  output?: string;
  metrics: ABTestMetrics;
  provider?: string;
  model?: string;
  durationMs?: number;
  error?: string;
  createdAt: string;
}

export interface ABTestConfig {
  /** Metrics to compare */
  metrics: string[];
  /** Number of samples per variant */
  sampleSize: number;
  /** Significance level for statistical test (default: 0.05) */
  significanceLevel?: number;
}

export interface ABTest {
  id: string;
  orgId: string;
  promptId: string;
  name: string;
  description?: string;
  status: ABTestStatus;
  variantA: ABTestVariantConfig;
  variantB: ABTestVariantConfig;
  config: ABTestConfig;
  createdBy?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MetricComparison {
  metric: string;
  variantA: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    samples: number;
  };
  variantB: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    samples: number;
  };
  /** Absolute difference (B - A) */
  difference: number;
  /** Percentage difference ((B - A) / A * 100) */
  differencePercent: number;
  /** Winner for this metric (higher is better for scores, lower for cost/latency) */
  winner: Variant | 'tie';
  /** p-value from Welch's t-test */
  pValue: number;
  /** Is the difference statistically significant? */
  significant: boolean;
}

export interface ABTestResult {
  testId: string;
  promptId: string;
  status: ABTestStatus;
  comparisons: MetricComparison[];
  overallWinner: Variant | 'tie' | 'inconclusive';
  /** Confidence in the result (0-1) */
  confidence: number;
  variantAResults: ABTestVariantResult[];
  variantBResults: ABTestVariantResult[];
  summary: string;
}

export interface CreateABTestPayload {
  promptId: string;
  name: string;
  description?: string;
  variantA: ABTestVariantConfig;
  variantB: ABTestVariantConfig;
  metrics?: string[];
  sampleSize?: number;
}
