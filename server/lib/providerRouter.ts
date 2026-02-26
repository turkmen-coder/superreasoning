/**
 * Provider Router v1 — Benchmark-fed dinamik LLM provider seçimi.
 * Sabit SERVER_AUTO_ORDER yerine: benchmark skoru, maliyet, latency,
 * kalite ve domain uyumu sinyallerine göre ağırlıklı skor hesaplar.
 *
 * Entegrasyon: generateAdapter.ts → auto mode'da routeProvider() çağrılır.
 */

import { memoryCache, createCacheKey } from '../../utils/cache';
import type { Pool } from 'pg';

// ── Types ────────────────────────────────────────────────────────────────────

export type ProviderName =
  | 'groq' | 'huggingface' | 'gemini' | 'openai'
  | 'deepseek' | 'openrouter' | 'claude' | 'claude-opus' | 'ollama';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RoutingContext {
  domain: string;
  framework: string;
  intentLength: number;
  riskLevel: RiskLevel;
  budgetCeiling: number;      // USD — 0 = unlimited
  availableProviders: ProviderName[];
}

export interface RoutingDecision {
  selected_provider: ProviderName;
  why: string;
  fallback_chain: ProviderName[];
  estimated_cost: number;
  expected_latency_ms: number;
  confidence: number;
}

interface ProviderScore {
  provider: ProviderName;
  score: number;
  cost: number;
  latency: number;
}

interface BenchmarkAggregate {
  provider: string;
  avg_judge_score: number;
  avg_latency_ms: number;
  run_count: number;
}

// ── Provider Cost Estimates (per 1K tokens, approximate) ─────────────────────

const COST_PER_1K_TOKENS: Record<ProviderName, number> = {
  groq:        0.0002,   // Llama 3.3 70B on Groq
  huggingface: 0.0001,   // Mistral 7B
  gemini:      0.0003,   // Gemini 2.0 Flash
  openai:      0.0015,   // GPT-4o-mini
  deepseek:    0.0003,   // DeepSeek Chat
  openrouter:  0.003,    // Varies (Claude 3.5 default)
  claude:      0.003,    // Claude 3.5 Sonnet
  'claude-opus': 0.015,  // Claude Opus
  ollama:      0.0,      // Local
};

const DEFAULT_LATENCY_MS: Record<ProviderName, number> = {
  groq:        800,
  huggingface: 3000,
  gemini:      1200,
  openai:      1500,
  deepseek:    2000,
  openrouter:  2500,
  claude:      2000,
  'claude-opus': 4000,
  ollama:      5000,
};

const DEFAULT_QUALITY: Record<ProviderName, number> = {
  groq:        65,
  huggingface: 45,
  gemini:      72,
  openai:      75,
  deepseek:    68,
  openrouter:  74,
  claude:      80,
  'claude-opus': 88,
  ollama:      50,
};

// ── Weights ──────────────────────────────────────────────────────────────────

const WEIGHTS = {
  benchmark:  0.25,
  cost:       0.20,
  latency:    0.15,
  quality:    0.25,
  domain:     0.15,
};

const MAX_ACCEPTABLE_LATENCY_MS = 10000;
const BENCHMARK_CACHE_TTL_MS = 5 * 60 * 1000;   // 5 minutes
const BENCHMARK_LIMIT = 100;

// ── Domain Affinity ──────────────────────────────────────────────────────────
// Some providers perform better in specific domains based on model strengths.

const DOMAIN_AFFINITY: Partial<Record<ProviderName, string[]>> = {
  claude:       ['legal', 'medical', 'compliance', 'academic', 'education'],
  'claude-opus': ['research', 'architecture', 'strategy', 'complex-analysis'],
  openai:       ['coding', 'data-science', 'devops', 'api-design'],
  gemini:       ['multimodal', 'creative', 'marketing', 'content'],
  deepseek:     ['coding', 'math', 'algorithms', 'backend'],
  groq:         ['quick-tasks', 'summarization', 'translation', 'chat'],
};

function getDomainAffinity(provider: ProviderName, domain: string): number {
  const affinities = DOMAIN_AFFINITY[provider];
  if (!affinities) return 0.5;
  const domainLower = domain.toLowerCase();
  const match = affinities.some(d => domainLower.includes(d));
  return match ? 0.85 : 0.5;
}

// ── Benchmark Data Fetching ──────────────────────────────────────────────────

async function fetchBenchmarkAggregates(
  pool: Pool | null,
  domain?: string,
  framework?: string,
): Promise<BenchmarkAggregate[]> {
  if (!pool) return [];

  const cacheKey = createCacheKey('router:bench', domain ?? 'all', framework ?? 'all');
  const cached = memoryCache.get<BenchmarkAggregate[]>(cacheKey);
  if (cached) return cached;

  try {
    // Try to query benchmark data from runs table
    const result = await pool.query(
      `SELECT provider,
              AVG(CASE WHEN timings IS NOT NULL THEN (timings->>'total_ms')::numeric ELSE NULL END) as avg_latency_ms,
              COUNT(*) as run_count
       FROM runs
       WHERE status = 'completed'
         AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY provider
       HAVING COUNT(*) >= 3
       ORDER BY COUNT(*) DESC
       LIMIT 20`,
    );

    const aggregates: BenchmarkAggregate[] = result.rows.map(row => ({
      provider: row.provider,
      avg_judge_score: DEFAULT_QUALITY[row.provider as ProviderName] ?? 60,
      avg_latency_ms: parseFloat(row.avg_latency_ms) || DEFAULT_LATENCY_MS[row.provider as ProviderName] || 2000,
      run_count: parseInt(String(row.run_count), 10),
    }));

    memoryCache.set(cacheKey, aggregates, BENCHMARK_CACHE_TTL_MS);
    return aggregates;
  } catch {
    // DB unavailable or table doesn't have timings column — return empty
    return [];
  }
}

// ── Token Estimation ─────────────────────────────────────────────────────────

function estimateTokens(intentLength: number): number {
  // Rough estimate: ~4 chars per token for input, ~2K output tokens average
  return Math.ceil(intentLength / 4) + 2000;
}

function estimateCost(provider: ProviderName, tokenEstimate: number): number {
  return (tokenEstimate / 1000) * COST_PER_1K_TOKENS[provider];
}

// ── Main Router ──────────────────────────────────────────────────────────────

export async function routeProvider(
  ctx: RoutingContext,
  pool: Pool | null = null,
): Promise<RoutingDecision> {
  const benchmarks = await fetchBenchmarkAggregates(pool, ctx.domain, ctx.framework);
  const tokenEstimate = estimateTokens(ctx.intentLength);

  const riskMultiplier = ctx.riskLevel === 'high' ? 1.5 : ctx.riskLevel === 'medium' ? 1.2 : 1.0;

  const scored: ProviderScore[] = ctx.availableProviders.map(provider => {
    // Find benchmark data for this provider, if available
    const bench = benchmarks.find(b => b.provider === provider);

    const benchScore = bench
      ? Math.min(bench.run_count / BENCHMARK_LIMIT, 1.0) * 0.5 + 0.5  // More runs = more reliable
      : 0.5;

    const providerCost = estimateCost(provider, tokenEstimate);
    const costScore = ctx.budgetCeiling > 0
      ? Math.max(0, 1 - (providerCost / ctx.budgetCeiling))
      : 1 - Math.min(providerCost / 0.10, 1);  // Normalize against $0.10

    const providerLatency = bench?.avg_latency_ms ?? DEFAULT_LATENCY_MS[provider];
    const latencyScore = Math.max(0, 1 - (providerLatency / MAX_ACCEPTABLE_LATENCY_MS));

    const qualityScore = (bench?.avg_judge_score ?? DEFAULT_QUALITY[provider]) / 100;

    const domainScore = getDomainAffinity(provider, ctx.domain);

    const totalScore =
      (benchScore * WEIGHTS.benchmark) +
      (costScore * WEIGHTS.cost) +
      (latencyScore * WEIGHTS.latency) +
      (qualityScore * WEIGHTS.quality * riskMultiplier) +
      (domainScore * WEIGHTS.domain);

    // Normalize by total weight (which increases with riskMultiplier)
    const totalWeight = WEIGHTS.benchmark + WEIGHTS.cost + WEIGHTS.latency +
      (WEIGHTS.quality * riskMultiplier) + WEIGHTS.domain;

    return {
      provider,
      score: totalScore / totalWeight,
      cost: providerCost,
      latency: providerLatency,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    throw new Error('No available providers for routing');
  }

  const best = scored[0];
  const fallbacks = scored.slice(1, 4).map(s => s.provider);

  return {
    selected_provider: best.provider,
    why: `${best.provider}: score=${best.score.toFixed(3)}, cost=$${best.cost.toFixed(4)}, latency=${best.latency}ms`,
    fallback_chain: fallbacks,
    estimated_cost: best.cost,
    expected_latency_ms: best.latency,
    confidence: best.score,
  };
}

// ── Risk Level Detection ─────────────────────────────────────────────────────

const HIGH_RISK_DOMAINS = ['medical', 'legal', 'compliance', 'financial', 'healthcare', 'pharma'];
const MEDIUM_RISK_DOMAINS = ['education', 'academic', 'government', 'insurance'];

export function detectRiskLevel(domain: string): RiskLevel {
  const d = domain.toLowerCase();
  if (HIGH_RISK_DOMAINS.some(r => d.includes(r))) return 'high';
  if (MEDIUM_RISK_DOMAINS.some(r => d.includes(r))) return 'medium';
  return 'low';
}
