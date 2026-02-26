/**
 * Prompt Auto-Enrichment — Orkestratör.
 * Tek giriş noktası: enrichMasterPrompt()
 *
 * Pipeline:
 *   detectAmbiguities() → searchLibraryForEnrichment() → integrateEnrichments() → EnrichmentResult
 */

import type {
  EnrichmentConfig,
  EnrichmentResult,
  EnrichmentMode,
  EnrichmentMetrics,
} from '../../../types/enrichment';
import { detectAmbiguities } from './ambiguityDetector';
import { searchLibraryForEnrichment } from './librarySearcher';
import { integrateFast, integrateDeep } from './promptIntegrator';

const DEFAULT_CONFIG: Required<EnrichmentConfig> = {
  mode: 'fast',
  maxCandidatesPerGap: 3,
  maxTotalCandidates: 8,
  maxTokenBudget: 500,
  minRelevanceScore: 0.65,
  language: 'en',
};

function mergeConfig(partial?: Partial<EnrichmentConfig>): Required<EnrichmentConfig> {
  return { ...DEFAULT_CONFIG, ...partial };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

export interface EnrichMasterPromptOptions {
  domainId?: string;
  framework?: string;
  language?: 'tr' | 'en';
  config?: Partial<EnrichmentConfig>;
}

export async function enrichMasterPrompt(
  masterPrompt: string,
  options: EnrichMasterPromptOptions = {},
): Promise<EnrichmentResult> {
  const startTime = Date.now();
  const config = mergeConfig({
    ...options.config,
    language: options.language ?? options.config?.language,
  });

  const mode: EnrichmentMode = config.mode;

  // Step 1: Detect ambiguities
  const beforeReport = detectAmbiguities(masterPrompt, options.domainId);

  // Early return: no gaps found
  if (beforeReport.totalGaps === 0) {
    return {
      enrichedPrompt: masterPrompt,
      originalPrompt: masterPrompt,
      ambiguityReport: beforeReport,
      candidatesFound: [],
      integratedPrompts: [],
      metrics: {
        ambiguityScoreBefore: beforeReport.ambiguityScore,
        ambiguityScoreAfter: beforeReport.ambiguityScore,
        gapsFound: 0,
        candidatesFound: 0,
        promptsIntegrated: 0,
        sectionsEnhanced: [],
        tokensAdded: 0,
        durationMs: Date.now() - startTime,
      },
      mode,
    };
  }

  // Step 2: Search library for candidates
  const candidates = await searchLibraryForEnrichment(
    masterPrompt,
    beforeReport.gaps,
    config,
    options.domainId,
  );

  // No candidates found
  if (candidates.length === 0) {
    return {
      enrichedPrompt: masterPrompt,
      originalPrompt: masterPrompt,
      ambiguityReport: beforeReport,
      candidatesFound: [],
      integratedPrompts: [],
      metrics: {
        ambiguityScoreBefore: beforeReport.ambiguityScore,
        ambiguityScoreAfter: beforeReport.ambiguityScore,
        gapsFound: beforeReport.totalGaps,
        candidatesFound: 0,
        promptsIntegrated: 0,
        sectionsEnhanced: [],
        tokensAdded: 0,
        durationMs: Date.now() - startTime,
      },
      mode,
    };
  }

  // Step 3: Integrate enrichments
  let enrichedPrompt: string;
  let integratedPrompts: typeof candidates;

  if (mode === 'deep') {
    const deepResult = await integrateDeep(
      masterPrompt,
      candidates,
      config.maxTokenBudget,
      config.language,
    );
    enrichedPrompt = deepResult.result;
    integratedPrompts = deepResult.integrated;
  } else {
    const fastResult = integrateFast(
      masterPrompt,
      candidates,
      config.maxTokenBudget,
    );
    enrichedPrompt = fastResult.result;
    integratedPrompts = fastResult.integrated;
  }

  // Step 4: Re-detect ambiguities on enriched prompt
  const afterReport = detectAmbiguities(enrichedPrompt, options.domainId);

  // Calculate metrics
  const originalTokens = estimateTokens(masterPrompt);
  const enrichedTokens = estimateTokens(enrichedPrompt);
  const sectionsEnhanced = [...new Set(integratedPrompts.map((p) => p.targetSection))];

  const metrics: EnrichmentMetrics = {
    ambiguityScoreBefore: beforeReport.ambiguityScore,
    ambiguityScoreAfter: afterReport.ambiguityScore,
    gapsFound: beforeReport.totalGaps,
    candidatesFound: candidates.length,
    promptsIntegrated: integratedPrompts.length,
    sectionsEnhanced,
    tokensAdded: enrichedTokens - originalTokens,
    durationMs: Date.now() - startTime,
  };

  return {
    enrichedPrompt,
    originalPrompt: masterPrompt,
    ambiguityReport: beforeReport,
    candidatesFound: candidates,
    integratedPrompts,
    metrics,
    mode,
  };
}
