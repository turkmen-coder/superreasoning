/**
 * Genetic Algorithm Prompt Optimizer — Type Definitions
 *
 * Evrimsel prompt optimizasyonu için tüm tip tanımları.
 * Populasyon tabanlı yaklaşım: seçilim, çaprazlama, mutasyon.
 */

import type { Framework } from '../types';
import type { JudgeResult } from '../services/judgeEnsemble';
import type { LintResult } from '../services/promptLint';
import type { BudgetAnalysis } from '../services/budgetOptimizer';
import type { ClientProvider } from '../services/unifiedProviderService';

// ─── Individual ──────────────────────────────────────────────────────────────

/** A single prompt individual in the population */
export interface GeneticIndividual {
  id: string;
  generation: number;
  promptText: string;
  reasoning: string;
  framework: Framework;
  domainId: string;
  parentIds: string[];
  fitness: FitnessScore | null;
}

// ─── Fitness ─────────────────────────────────────────────────────────────────

/** Multi-objective fitness score */
export interface FitnessScore {
  judgeResult: JudgeResult;
  lintResult: LintResult;
  budgetAnalysis: BudgetAnalysis;
  judgeTotal: number;        // 0-100
  lintPenalty: number;        // 0-30
  tokenCostPenalty: number;   // 0-20
  compositeFitness: number;   // 0-100 final
}

// ─── Config ──────────────────────────────────────────────────────────────────

/** Configuration for a GA run */
export interface GeneticConfig {
  seedIntent: string;
  populationSize: number;     // default 6, range 4-12
  generations: number;        // default 5, range 2-10
  tournamentSize: number;     // default 3
  crossoverRate: number;      // default 0.7
  mutationRate: number;       // default 0.3
  elitismCount: number;       // default 1
  domainId: string;
  framework: Framework;
  language: 'tr' | 'en';
  provider: ClientProvider;
}

export const DEFAULT_GENETIC_CONFIG: Omit<GeneticConfig, 'seedIntent' | 'domainId' | 'framework' | 'language' | 'provider'> = {
  populationSize: 6,
  generations: 5,
  tournamentSize: 3,
  crossoverRate: 0.7,
  mutationRate: 0.3,
  elitismCount: 1,
};

// ─── Snapshots ───────────────────────────────────────────────────────────────

/** Snapshot of one generation */
export interface GenerationSnapshot {
  generation: number;
  population: GeneticIndividual[];
  bestFitness: number;
  avgFitness: number;
  worstFitness: number;
  diversity: number;          // 0-1
  bestIndividualId: string;
  timestamp: number;
}

/** Complete result of a GA run */
export interface GeneticRunResult {
  config: GeneticConfig;
  generations: GenerationSnapshot[];
  bestIndividual: GeneticIndividual;
  convergenceGeneration: number | null;
  totalDurationMs: number;
  totalLLMCalls: number;
}

// ─── Operators ───────────────────────────────────────────────────────────────

/** Mutation operator types */
export type MutationType =
  | 'rephrase'
  | 'add_detail'
  | 'remove_redundancy'
  | 'swap_framework'
  | 'inject_guardrail'
  | 'restructure'
  | 'strengthen_criteria';

/** Crossover operator types */
export type CrossoverType =
  | 'section_swap'
  | 'paragraph_blend'
  | 'strength_merge';

// ─── Progress & Status ───────────────────────────────────────────────────────

/** Real-time progress event for UI updates */
export interface GeneticProgressEvent {
  type: 'init' | 'evaluate' | 'select' | 'crossover' | 'mutate' | 'generation_complete' | 'done' | 'error';
  generation: number;
  detail: string;
  snapshot?: GenerationSnapshot;
  progress: number;           // 0-100
}

/** GA run status for UI */
export type GeneticRunStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';
