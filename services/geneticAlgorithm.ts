/**
 * Genetic Algorithm Prompt Optimizer — Core Engine
 *
 * Evrimsel prompt optimizasyonu: populasyon oluşturma, seçilim,
 * çaprazlama, mutasyon, fitness değerlendirme, yakınsama tespiti.
 *
 * Fitness fonksiyonu mevcut servisleri kullanır:
 * - judgePrompt()   → birincil fitness (0-100)
 * - lintPrompt()    → hata cezası (max 30)
 * - analyzeBudget() → token cezası (max 20)
 */

import { Framework } from '../types';
import type {
  GeneticIndividual,
  FitnessScore,
  GeneticConfig,
  GenerationSnapshot,
  GeneticRunResult,
  GeneticProgressEvent,
  MutationType,
  CrossoverType,
} from '../types/genetic';
import { judgePrompt } from './judgeEnsemble';
import { lintPrompt } from './promptLint';
import { analyzeBudget } from './budgetOptimizer';
import { generateMasterPromptUnified } from './unifiedProviderService';
import {
  getMutationPrompt,
  getCrossoverPrompt,
  getGeneticSystemPrompt,
  getMasterPromptWithTemplate,
} from './geneticPrompts';

// ─── Constants ───────────────────────────────────────────────────────────────

const CONVERGENCE_THRESHOLD = 1.0;
const CONVERGENCE_WINDOW = 2;
const LLM_DELAY_MS = 200;
const DIVERSITY_IMMIGRATION_THRESHOLD = 0.15;
const MAX_PROMPT_LENGTH = 12000;

/** Framework pool for diversity when AUTO is selected */
const FRAMEWORK_POOL: Framework[] = [
  Framework.KERNEL, Framework.COSTAR, Framework.RISEN,
  Framework.CHAIN, Framework.REACT, Framework.TREE,
  Framework.CRITIC, Framework.SELFREFINE, Framework.SOCRATIC,
  Framework.FIRST_PRINCIPLES, Framework.META_PROMPT, Framework.DSP,
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uuid(): string {
  return crypto.randomUUID();
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Fitness Evaluation ──────────────────────────────────────────────────────

function evaluateFitness(individual: GeneticIndividual, config: GeneticConfig): FitnessScore {
  const judgeResult = judgePrompt(individual.promptText, {
    domainId: config.domainId,
    framework: individual.framework,
    reasoning: individual.reasoning,
    autoRevise: false,
  });

  const lintResult = lintPrompt(individual.promptText, individual.reasoning);
  const lintPenalty = Math.min(30,
    lintResult.totalErrors * 10 + lintResult.totalWarnings * 3 + lintResult.totalInfo * 1
  );

  const providerKey = config.provider === 'auto' ? 'groq' : config.provider;
  const budgetAnalysis = analyzeBudget(
    config.seedIntent,
    individual.promptText + '\n' + individual.reasoning,
    providerKey,
  );
  const tokenCostPenalty = budgetAnalysis.totalTokens > 1500
    ? Math.min(20, Math.floor((budgetAnalysis.totalTokens - 1500) / 100))
    : 0;

  const compositeFitness = clamp(
    judgeResult.totalScore - lintPenalty - tokenCostPenalty,
    0,
    100,
  );

  return {
    judgeResult,
    lintResult,
    budgetAnalysis,
    judgeTotal: judgeResult.totalScore,
    lintPenalty,
    tokenCostPenalty,
    compositeFitness,
  };
}

function evaluateAll(population: GeneticIndividual[], config: GeneticConfig): void {
  for (const ind of population) {
    if (!ind.fitness) {
      ind.fitness = evaluateFitness(ind, config);
    }
  }
}

// ─── Diversity ───────────────────────────────────────────────────────────────

function trigrams(text: string): Set<string> {
  const s = new Set<string>();
  const t = text.toLowerCase();
  for (let i = 0; i < t.length - 2; i++) {
    s.add(t.slice(i, i + 3));
  }
  return s;
}

function jaccardDistance(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const x of a) {
    if (b.has(x)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? 1 - intersection / union : 0;
}

function measureDiversity(population: GeneticIndividual[]): number {
  if (population.length < 2) return 0;
  let totalDist = 0;
  let pairs = 0;
  const trigramSets = population.map(p => trigrams(p.promptText));
  for (let i = 0; i < trigramSets.length; i++) {
    for (let j = i + 1; j < trigramSets.length; j++) {
      totalDist += jaccardDistance(trigramSets[i], trigramSets[j]);
      pairs++;
    }
  }
  return pairs > 0 ? totalDist / pairs : 0;
}

// ─── Selection ───────────────────────────────────────────────────────────────

function tournamentSelect(population: GeneticIndividual[], tournamentSize: number): GeneticIndividual {
  let best: GeneticIndividual | null = null;
  for (let i = 0; i < tournamentSize; i++) {
    const candidate = pickRandom(population);
    if (!best || (candidate.fitness?.compositeFitness ?? 0) > (best.fitness?.compositeFitness ?? 0)) {
      best = candidate;
    }
  }
  return best!;
}

function selectTopK(population: GeneticIndividual[], k: number): GeneticIndividual[] {
  return [...population]
    .sort((a, b) => (b.fitness?.compositeFitness ?? 0) - (a.fitness?.compositeFitness ?? 0))
    .slice(0, k);
}

// ─── Mutation ────────────────────────────────────────────────────────────────

function selectMutationType(fitness: FitnessScore): MutationType {
  const scores = fitness.judgeResult.scores;
  if (scores.length === 0) return 'rephrase';

  const weakest = scores.reduce((min, s) => s.score < min.score ? s : min, scores[0]);

  const criterionMap: Record<string, MutationType> = {
    clarity: 'rephrase',
    specificity: 'add_detail',
    structure: 'restructure',
    security: 'inject_guardrail',
    reproducibility: 'strengthen_criteria',
  };

  return criterionMap[weakest.criterionId] ?? pickRandom<MutationType>([
    'rephrase', 'add_detail', 'remove_redundancy',
  ]);
}

async function mutateIndividual(
  individual: GeneticIndividual,
  config: GeneticConfig,
): Promise<GeneticIndividual> {
  const mutationType = individual.fitness
    ? selectMutationType(individual.fitness)
    : 'rephrase';

  const weakness = individual.fitness
    ? individual.fitness.judgeResult.scores
        .reduce((min, s) => s.score < min.score ? s : min, individual.fitness.judgeResult.scores[0])
        .reasoning
    : 'general improvement needed';

  const mutationPrompt = getMutationPrompt(
    mutationType,
    individual.promptText,
    weakness,
    config.language,
  );

  try {
    const result = await generateMasterPromptUnified(config.provider, {
      intent: mutationPrompt,
      framework: individual.framework,
      domainId: config.domainId,
      useSearch: false,
      thinkingMode: false,
      language: config.language,
      localizedRules: getGeneticSystemPrompt(config.language),
    });

    const newText = result.response.masterPrompt.slice(0, MAX_PROMPT_LENGTH);

    return {
      id: uuid(),
      generation: individual.generation + 1,
      promptText: newText || individual.promptText,
      reasoning: result.response.reasoning || `Mutated via ${mutationType}`,
      framework: individual.framework,
      domainId: config.domainId,
      parentIds: [individual.id],
      fitness: null,
    };
  } catch {
    // Mutation failed, return clone
    return {
      ...individual,
      id: uuid(),
      generation: individual.generation + 1,
      parentIds: [individual.id],
      fitness: null,
    };
  }
}

// ─── Crossover ───────────────────────────────────────────────────────────────

function selectCrossoverType(): CrossoverType {
  return pickRandom<CrossoverType>(['section_swap', 'paragraph_blend', 'strength_merge']);
}

async function crossoverIndividuals(
  parent1: GeneticIndividual,
  parent2: GeneticIndividual,
  config: GeneticConfig,
): Promise<GeneticIndividual> {
  const crossoverType = selectCrossoverType();
  const crossoverPrompt = getCrossoverPrompt(
    parent1.promptText,
    parent2.promptText,
    crossoverType,
    config.language,
  );

  try {
    const result = await generateMasterPromptUnified(config.provider, {
      intent: crossoverPrompt,
      framework: parent1.framework,
      domainId: config.domainId,
      useSearch: false,
      thinkingMode: false,
      language: config.language,
      localizedRules: getGeneticSystemPrompt(config.language),
    });

    const newText = result.response.masterPrompt.slice(0, MAX_PROMPT_LENGTH);

    return {
      id: uuid(),
      generation: Math.max(parent1.generation, parent2.generation) + 1,
      promptText: newText || parent1.promptText,
      reasoning: result.response.reasoning || `Crossover via ${crossoverType}`,
      framework: pickRandom([parent1.framework, parent2.framework]),
      domainId: config.domainId,
      parentIds: [parent1.id, parent2.id],
      fitness: null,
    };
  } catch {
    // Crossover failed, return clone of better parent
    const better = (parent1.fitness?.compositeFitness ?? 0) >= (parent2.fitness?.compositeFitness ?? 0)
      ? parent1 : parent2;
    return {
      ...better,
      id: uuid(),
      generation: better.generation + 1,
      parentIds: [parent1.id, parent2.id],
      fitness: null,
    };
  }
}

// ─── Population Initialization ───────────────────────────────────────────────

async function generateInitialPopulation(
  config: GeneticConfig,
  onProgress: (event: GeneticProgressEvent) => void,
  abortSignal?: AbortSignal,
): Promise<GeneticIndividual[]> {
  const frameworkPool = config.framework === Framework.AUTO
    ? FRAMEWORK_POOL
    : [config.framework];

  const individuals: GeneticIndividual[] = [];

  for (let i = 0; i < config.populationSize; i++) {
    if (abortSignal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const fw = frameworkPool[i % frameworkPool.length];

    onProgress({
      type: 'init',
      generation: 0,
      detail: `Generating individual ${i + 1}/${config.populationSize} (${fw})`,
      progress: Math.round((i / config.populationSize) * 15),
    });

    try {
      // Use MASTER_PROMPT template for genetic-lab domain
      const useMasterTemplate = config.domainId === 'genetic-lab' || config.domainId === 'genetik';
      const intent = useMasterTemplate
        ? getMasterPromptWithTemplate(config.seedIntent, config.language)
        : config.seedIntent;
      const localizedRules = useMasterTemplate
        ? getGeneticSystemPrompt(config.language)
        : '';

      const result = await generateMasterPromptUnified(config.provider, {
        intent,
        framework: fw,
        domainId: config.domainId,
        useSearch: false,
        thinkingMode: false,
        language: config.language,
        localizedRules,
      });

      individuals.push({
        id: uuid(),
        generation: 0,
        promptText: result.response.masterPrompt.slice(0, MAX_PROMPT_LENGTH),
        reasoning: result.response.reasoning,
        framework: fw,
        domainId: config.domainId,
        parentIds: [],
        fitness: null,
      });
    } catch (err) {
      // If generation fails, create a minimal placeholder
      individuals.push({
        id: uuid(),
        generation: 0,
        promptText: config.seedIntent,
        reasoning: `Generation failed: ${err instanceof Error ? err.message : 'unknown'}`,
        framework: fw,
        domainId: config.domainId,
        parentIds: [],
        fitness: null,
      });
    }

    if (i < config.populationSize - 1) {
      await delay(LLM_DELAY_MS);
    }
  }

  return individuals;
}

// ─── Immigration (diversity rescue) ──────────────────────────────────────────

async function generateImmigrant(
  config: GeneticConfig,
  generation: number,
): Promise<GeneticIndividual> {
  const fw = pickRandom(FRAMEWORK_POOL);
  try {
    // Use MASTER_PROMPT template for genetic-lab domain
    const useMasterTemplate = config.domainId === 'genetic-lab' || config.domainId === 'genetik';
    const baseIntent = useMasterTemplate
      ? getMasterPromptWithTemplate(config.seedIntent + '\n(Generate a creative, unique variation)', config.language)
      : config.seedIntent + '\n(Generate a creative, unique variation)';
    const localizedRules = useMasterTemplate
      ? getGeneticSystemPrompt(config.language)
      : '';

    const result = await generateMasterPromptUnified(config.provider, {
      intent: baseIntent,
      framework: fw,
      domainId: config.domainId,
      useSearch: false,
      thinkingMode: false,
      language: config.language,
      localizedRules,
    });

    return {
      id: uuid(),
      generation,
      promptText: result.response.masterPrompt.slice(0, MAX_PROMPT_LENGTH),
      reasoning: 'Immigration: diversity rescue',
      framework: fw,
      domainId: config.domainId,
      parentIds: [],
      fitness: null,
    };
  } catch {
    return {
      id: uuid(),
      generation,
      promptText: config.seedIntent,
      reasoning: 'Immigration: fallback',
      framework: fw,
      domainId: config.domainId,
      parentIds: [],
      fitness: null,
    };
  }
}

// ─── Snapshot ────────────────────────────────────────────────────────────────

function createSnapshot(population: GeneticIndividual[], generation: number): GenerationSnapshot {
  const fitnesses = population.map(p => p.fitness?.compositeFitness ?? 0);
  const sorted = [...fitnesses].sort((a, b) => b - a);
  const best = sorted[0] ?? 0;
  const worst = sorted[sorted.length - 1] ?? 0;
  const avg = fitnesses.length > 0
    ? fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length
    : 0;

  const bestInd = population.reduce((b, p) =>
    (p.fitness?.compositeFitness ?? 0) > (b.fitness?.compositeFitness ?? 0) ? p : b,
    population[0],
  );

  return {
    generation,
    population: [...population],
    bestFitness: Math.round(best * 10) / 10,
    avgFitness: Math.round(avg * 10) / 10,
    worstFitness: Math.round(worst * 10) / 10,
    diversity: Math.round(measureDiversity(population) * 1000) / 1000,
    bestIndividualId: bestInd?.id ?? '',
    timestamp: Date.now(),
  };
}

// ─── Convergence Detection ───────────────────────────────────────────────────

function detectConvergence(snapshots: GenerationSnapshot[]): boolean {
  if (snapshots.length < CONVERGENCE_WINDOW + 1) return false;
  const recent = snapshots.slice(-CONVERGENCE_WINDOW - 1);
  for (let i = 1; i < recent.length; i++) {
    if (Math.abs(recent[i].bestFitness - recent[i - 1].bestFitness) > CONVERGENCE_THRESHOLD) {
      return false;
    }
  }
  return true;
}

// ─── Main Evolution Loop ─────────────────────────────────────────────────────

export async function runGeneticAlgorithm(
  config: GeneticConfig,
  onProgress: (event: GeneticProgressEvent) => void,
  abortSignal?: AbortSignal,
): Promise<GeneticRunResult> {
  const startTime = Date.now();
  let llmCalls = 0;
  const snapshots: GenerationSnapshot[] = [];

  // Phase 1: Initialize population
  const population = await generateInitialPopulation(config, onProgress, abortSignal);
  llmCalls += config.populationSize;

  // Evaluate initial population
  evaluateAll(population, config);
  onProgress({
    type: 'evaluate',
    generation: 0,
    detail: `Initial population evaluated`,
    progress: 15,
  });

  const initialSnapshot = createSnapshot(population, 0);
  snapshots.push(initialSnapshot);
  onProgress({
    type: 'generation_complete',
    generation: 0,
    detail: `Gen 0: Best=${initialSnapshot.bestFitness} Avg=${initialSnapshot.avgFitness}`,
    snapshot: initialSnapshot,
    progress: 20,
  });

  let currentPop = [...population];
  let convergenceGen: number | null = null;

  // Phase 2: Evolution loop
  for (let gen = 1; gen <= config.generations; gen++) {
    if (abortSignal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const progressBase = 20 + ((gen - 1) / config.generations) * 75;
    const newPopulation: GeneticIndividual[] = [];

    // Elitism
    const elites = selectTopK(currentPop, config.elitismCount);
    for (const elite of elites) {
      newPopulation.push({
        ...elite,
        id: uuid(),
        generation: gen,
        parentIds: [elite.id],
        fitness: null, // Re-evaluate in new context
      });
    }

    onProgress({
      type: 'select',
      generation: gen,
      detail: `Gen ${gen}: ${config.elitismCount} elite(s) preserved`,
      progress: Math.round(progressBase + 2),
    });

    // Fill remaining slots
    const slotsToFill = config.populationSize - newPopulation.length;
    for (let s = 0; s < slotsToFill; s++) {
      if (abortSignal?.aborted) throw new DOMException('Aborted', 'AbortError');

      const parent1 = tournamentSelect(currentPop, config.tournamentSize);
      const parent2 = tournamentSelect(currentPop, config.tournamentSize);

      let offspring: GeneticIndividual;

      // Crossover
      if (Math.random() < config.crossoverRate) {
        offspring = await crossoverIndividuals(parent1, parent2, config);
        llmCalls++;
        onProgress({
          type: 'crossover',
          generation: gen,
          detail: `Gen ${gen}: Crossover #${s + 1}`,
          progress: Math.round(progressBase + (s / slotsToFill) * 35),
        });
      } else {
        offspring = {
          ...parent1,
          id: uuid(),
          generation: gen,
          parentIds: [parent1.id],
          fitness: null,
        };
      }

      // Mutation
      if (Math.random() < config.mutationRate) {
        offspring = await mutateIndividual(offspring, config);
        llmCalls++;
        onProgress({
          type: 'mutate',
          generation: gen,
          detail: `Gen ${gen}: Mutation #${s + 1}`,
          progress: Math.round(progressBase + (s / slotsToFill) * 35 + 15),
        });
      }

      newPopulation.push(offspring);
      await delay(LLM_DELAY_MS);
    }

    // Diversity rescue: inject immigrant if diversity too low
    const tempDiversity = measureDiversity(newPopulation);
    if (tempDiversity < DIVERSITY_IMMIGRATION_THRESHOLD && newPopulation.length > 1) {
      const immigrant = await generateImmigrant(config, gen);
      llmCalls++;
      // Replace worst individual
      const worstIdx = newPopulation
        .map((p, i) => ({ fitness: p.fitness?.compositeFitness ?? 0, i }))
        .sort((a, b) => a.fitness - b.fitness)[0]?.i;
      if (worstIdx !== undefined && worstIdx >= config.elitismCount) {
        newPopulation[worstIdx] = immigrant;
      }
    }

    // Evaluate new population
    evaluateAll(newPopulation, config);
    onProgress({
      type: 'evaluate',
      generation: gen,
      detail: `Gen ${gen}: Population evaluated`,
      progress: Math.round(progressBase + 60),
    });

    currentPop = newPopulation;
    const snapshot = createSnapshot(currentPop, gen);
    snapshots.push(snapshot);

    onProgress({
      type: 'generation_complete',
      generation: gen,
      detail: `Gen ${gen}: Best=${snapshot.bestFitness} Avg=${snapshot.avgFitness} Div=${snapshot.diversity.toFixed(2)}`,
      snapshot,
      progress: Math.round(20 + (gen / config.generations) * 75),
    });

    // Convergence check
    if (detectConvergence(snapshots)) {
      convergenceGen = gen;
      break;
    }
  }

  // Find overall best
  const allIndividuals = snapshots.flatMap(s => s.population);
  const bestIndividual = allIndividuals.reduce((best, ind) =>
    (ind.fitness?.compositeFitness ?? 0) > (best.fitness?.compositeFitness ?? 0) ? ind : best,
    allIndividuals[0],
  );

  const result: GeneticRunResult = {
    config,
    generations: snapshots,
    bestIndividual,
    convergenceGeneration: convergenceGen,
    totalDurationMs: Date.now() - startTime,
    totalLLMCalls: llmCalls,
  };

  onProgress({
    type: 'done',
    generation: snapshots.length - 1,
    detail: `Evolution complete! Best fitness: ${bestIndividual.fitness?.compositeFitness ?? 0}`,
    progress: 100,
  });

  return result;
}
