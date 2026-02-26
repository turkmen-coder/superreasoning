/**
 * Prompt Auto-Enrichment System — Tip tanımları.
 * Master prompt'taki belirsizlikleri tespit edip 1040+ promptluk kütüphaneden zenginleştirme.
 */

export type AmbiguityType =
  | 'vague_instruction'
  | 'missing_context'
  | 'undefined_variable'
  | 'thin_section'
  | 'missing_best_practice'
  | 'missing_guardrails'
  | 'generic_role';

export type AmbiguitySeverity = 'high' | 'medium' | 'low';

export interface AmbiguityGap {
  id: string;
  type: AmbiguityType;
  section: 'SYSTEM' | 'DEVELOPER' | 'USER' | 'GLOBAL';
  severity: AmbiguitySeverity;
  description: string;
  descriptionTr: string;
  excerpt?: string;
  searchQuery: string;
}

export interface SectionScore {
  section: string;
  wordCount: number;
  gapCount: number;
  score: number;
}

export interface AmbiguityReport {
  gaps: AmbiguityGap[];
  ambiguityScore: number; // 0-100 (0 = en iyi, 100 = en kötü)
  sectionScores: SectionScore[];
  totalGaps: number;
}

export interface EnrichmentCandidate {
  promptId: string;
  promptName: string;
  promptContent: string;
  category: string;
  tags: string[];
  relevanceScore: number;
  targetSection: 'SYSTEM' | 'DEVELOPER' | 'USER' | 'GLOBAL';
  targetGapId: string;
}

export type EnrichmentMode = 'off' | 'fast' | 'deep' | 'agent';

export interface EnrichmentConfig {
  mode: EnrichmentMode;
  maxCandidatesPerGap?: number;  // default: 3
  maxTotalCandidates?: number;   // default: 8
  maxTokenBudget?: number;       // default: 500
  minRelevanceScore?: number;    // default: 0.65
  language?: 'tr' | 'en';
}

export interface EnrichmentMetrics {
  ambiguityScoreBefore: number;
  ambiguityScoreAfter: number;
  gapsFound: number;
  candidatesFound: number;
  promptsIntegrated: number;
  sectionsEnhanced: string[];
  tokensAdded: number;
  durationMs: number;
}

export interface AgentEnrichMetrics {
  deepGapsFound: number;
  autoFixesApplied: number;
  libraryPromptsScanned: number;
  judgeScoreBefore: number;
  judgeScoreAfter: number;
  iterations: number;
  domainKnowledgeInjected: boolean;
  frameworkEnhanced: boolean;
  targetScoreReached: boolean;
}

export interface EnrichmentResult {
  enrichedPrompt: string;
  originalPrompt: string;
  ambiguityReport: AmbiguityReport;
  candidatesFound: EnrichmentCandidate[];
  integratedPrompts: EnrichmentCandidate[];
  metrics: EnrichmentMetrics;
  mode: EnrichmentMode;
  agentMetrics?: AgentEnrichMetrics;
}
