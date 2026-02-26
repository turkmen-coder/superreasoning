/**
 * Model Budget Optimizer — Token/cost otomatik analizi.
 * @see docs/PROMPT_LEADERSHIP_ROADMAP.md §12
 *
 * Hedef: Aynı kaliteyi daha az token ile.
 */

export interface BudgetAnalysis {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: CostEstimate;
  optimizations: Optimization[];
  savings: SavingsReport;
}

export interface CostEstimate {
  provider: string;
  model: string;
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
}

export interface Optimization {
  id: string;
  label: string;
  labelTr: string;
  description: string;
  tokenSaved: number;
  applied: boolean;
}

export interface SavingsReport {
  originalTokens: number;
  optimizedTokens: number;
  savedTokens: number;
  savedPercentage: number;
}

/** Provider bazlı fiyatlandırma (USD / 1M token) — güncel 2025 fiyatları */
const PRICING: Record<string, { input: number; output: number; model: string }> = {
  'groq': { input: 0.05, output: 0.08, model: 'llama-3.3-70b' },
  'gemini': { input: 0.075, output: 0.30, model: 'gemini-2.0-flash' },
  'huggingface': { input: 0.00, output: 0.00, model: 'Mistral-7B' }, // free tier
  'claude': { input: 3.00, output: 15.00, model: 'claude-sonnet-4-5' },
  'claude-opus': { input: 15.00, output: 75.00, model: 'claude-opus-4-6' },
  'openrouter': { input: 3.00, output: 15.00, model: 'various' },
  'deepseek': { input: 0.27, output: 1.10, model: 'deepseek-chat-v3' },
};

/** Basit token tahmini (kelime sayısı * 1.3) */
export function estimateTokenCount(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.ceil(words * 1.3);
}

/** Maliyet hesapla */
function calculateCost(inputTokens: number, outputTokens: number, provider: string): CostEstimate {
  const pricing = PRICING[provider] ?? PRICING['groq'];
  return {
    provider,
    model: pricing.model,
    inputCostUsd: (inputTokens / 1_000_000) * pricing.input,
    outputCostUsd: (outputTokens / 1_000_000) * pricing.output,
    totalCostUsd: (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output,
  };
}

/** Optimizasyon: tekrarlanan cümleler */
function findRepetitions(text: string): { count: number; tokens: number } {
  const sentences = text.split(/[.!?]\s+/).filter(s => s.length > 10);
  const seen = new Map<string, number>();
  let duplicateTokens = 0;
  let count = 0;

  for (const s of sentences) {
    const normalized = s.toLowerCase().trim();
    const prev = seen.get(normalized) ?? 0;
    seen.set(normalized, prev + 1);
    if (prev >= 1) {
      duplicateTokens += estimateTokenCount(s);
      count++;
    }
  }
  return { count, tokens: duplicateTokens };
}

/** Optimizasyon: gereksiz boşluklar/satır araları */
function findExcessWhitespace(text: string): number {
  const cleaned = text.replace(/\n{3,}/g, '\n\n').replace(/\s{2,}/g, ' ');
  const originalTokens = estimateTokenCount(text);
  const cleanedTokens = estimateTokenCount(cleaned);
  return originalTokens - cleanedTokens;
}

/** Optimizasyon: uzun örnekler varsa kısaltılabilir */
function findLongExamples(text: string): number {
  const exampleBlocks = text.match(/```[\s\S]*?```/g) || [];
  let saveable = 0;
  for (const block of exampleBlocks) {
    const tokens = estimateTokenCount(block);
    if (tokens > 200) {
      saveable += Math.floor(tokens * 0.3); // 30% kısaltılabilir
    }
  }
  return saveable;
}

/**
 * Ana budget analizi.
 */
export function analyzeBudget(
  inputText: string,
  outputText: string,
  provider: string
): BudgetAnalysis {
  const inputTokens = estimateTokenCount(inputText);
  const outputTokens = estimateTokenCount(outputText);
  const totalTokens = inputTokens + outputTokens;

  const repetitions = findRepetitions(outputText);
  const whitespace = findExcessWhitespace(outputText);
  const longExamples = findLongExamples(outputText);

  const optimizations: Optimization[] = [];

  if (repetitions.count > 0) {
    optimizations.push({
      id: 'remove-repetitions',
      label: 'Remove repetitions',
      labelTr: 'Tekrarları kaldır',
      description: `${repetitions.count} repeated sentences found`,
      tokenSaved: repetitions.tokens,
      applied: false,
    });
  }

  if (whitespace > 5) {
    optimizations.push({
      id: 'trim-whitespace',
      label: 'Trim whitespace',
      labelTr: 'Boşlukları kısalt',
      description: 'Excessive whitespace/newlines',
      tokenSaved: whitespace,
      applied: false,
    });
  }

  if (longExamples > 0) {
    optimizations.push({
      id: 'compress-examples',
      label: 'Compress examples',
      labelTr: 'Örnekleri kısalt',
      description: 'Long code examples can be trimmed',
      tokenSaved: longExamples,
      applied: false,
    });
  }

  const totalSaveable = optimizations.reduce((sum, o) => sum + o.tokenSaved, 0);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost: calculateCost(inputTokens, outputTokens, provider),
    optimizations,
    savings: {
      originalTokens: totalTokens,
      optimizedTokens: totalTokens - totalSaveable,
      savedTokens: totalSaveable,
      savedPercentage: totalTokens > 0 ? Math.round((totalSaveable / totalTokens) * 100) : 0,
    },
  };
}
