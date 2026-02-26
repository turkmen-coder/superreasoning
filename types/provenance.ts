/**
 * Prompt Provenance — İzlenebilirlik.
 * @see docs/PROMPT_LEADERSHIP_ROADMAP.md §9
 *
 * Her prompt için: hangi kurallar, şablonlar, netleştirmeler uygulandı.
 */

export interface ProvenanceRecord {
  /** Uygulanan framework */
  framework: string;
  /** Uygulanan domain kuralları */
  domainId: string;
  domainRules: string;
  /** IR pipeline kullanıldı mı */
  irPipelineUsed: boolean;
  /** Guardrail blokları eklendi mi */
  guardrailsApplied: string[];
  /** Style profili kullanıldı mı */
  styleProfileId?: string;
  styleProfileName?: string;
  /** Uygulanan kısıtlar */
  constraintsApplied: string[];
  /** Güvenlik politikaları */
  securityPolicies: string[];
  /** Stop conditions */
  stopConditions: string[];
  /** Cache hit mi? */
  cacheHit: boolean;
  /** Provider ve model */
  provider: string;
  model?: string;
  /** İşlem zamanı (ms) */
  durationMs: number;
  /** Oluşturulma zamanı */
  createdAt: string;
}

/**
 * PromptResponse'a provenance eklemek için genişletilmiş tip.
 */
export interface ProvenanceEnrichedResponse {
  masterPrompt: string;
  reasoning: string;
  provenance: ProvenanceRecord;
  /** Judge Ensemble sonuçları */
  judgeResult?: {
    totalScore: number;
    scores: Array<{ criterionId: string; score: number }>;
    passThreshold: boolean;
    suggestions: string[];
  };
  /** Lint sonuçları */
  lintResult?: {
    passed: boolean;
    totalErrors: number;
    totalWarnings: number;
    issues: Array<{ ruleId: string; severity: string; message: string }>;
  };
  /** Budget analizi */
  budgetAnalysis?: {
    totalTokens: number;
    estimatedCostUsd: number;
    savedPercentage: number;
  };
}
