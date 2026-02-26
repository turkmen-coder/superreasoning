/**
 * Prompt QA / Lint — Kalite kontrol kuralları.
 * @see docs/PROMPT_FEATURES_ROADMAP.md §3
 *
 * Belirsiz fiiller, ölçütsüz başarı tanımı, eksik format talebi vb. tespiti.
 */

export type LintSeverity = 'error' | 'warning' | 'info';

export interface LintIssue {
  ruleId: string;
  severity: LintSeverity;
  message: string;
  messageTr: string;
  /** Sorunlu metin parçası (varsa) */
  excerpt?: string;
}

export interface LintResult {
  issues: LintIssue[];
  totalErrors: number;
  totalWarnings: number;
  totalInfo: number;
  passed: boolean;
}

// --- Lint Kuralları ---

type LintRule = (prompt: string, reasoning?: string) => LintIssue[];

/** R1: Belirsiz fiiller (docs §3 Linting) */
const ruleVagueVerbs: LintRule = (prompt) => {
  const issues: LintIssue[] = [];
  const vaguePatterns = [
    { pattern: /\b(yap|iyileştir|düzelt|güzelleştir|optimize et)\b/gi, lang: 'tr' },
    { pattern: /\b(do it|improve|fix it|make better|optimize)\b/gi, lang: 'en' },
  ];
  for (const { pattern } of vaguePatterns) {
    const matches = prompt.match(pattern);
    if (matches) {
      issues.push({
        ruleId: 'vague-verbs',
        severity: 'warning',
        message: `Vague verb detected: "${matches[0]}". Use specific, measurable actions.`,
        messageTr: `Belirsiz fiil tespit edildi: "${matches[0]}". Ölçülebilir eylem kullanın.`,
        excerpt: matches[0],
      });
    }
  }
  return issues;
};

/** R2: Eksik başarı kriterleri */
const ruleMissingSuccessCriteria: LintRule = (prompt) => {
  const hasSuccess = /success|criteria|pass|fail|başarı|kriter|metric|metrik|measur|ölçü/i.test(prompt);
  if (!hasSuccess) {
    return [{
      ruleId: 'missing-success-criteria',
      severity: 'warning',
      message: 'No success/fail criteria found. Add measurable success criteria.',
      messageTr: 'Başarı/başarısızlık kriteri bulunamadı. Ölçülebilir kriterler ekleyin.',
    }];
  }
  return [];
};

/** R3: Eksik format talebi */
const ruleMissingFormat: LintRule = (prompt) => {
  const hasFormat = /format|output|çıktı|structure|yapı|markdown|json|table|tablo/i.test(prompt);
  if (!hasFormat) {
    return [{
      ruleId: 'missing-format',
      severity: 'info',
      message: 'No output format specification found. Consider specifying expected output format.',
      messageTr: 'Çıktı format belirtimi bulunamadı. Beklenen çıktı formatını belirtmeyi düşünün.',
    }];
  }
  return [];
};

/** R4: Çok kısa prompt */
const ruleTooShort: LintRule = (prompt) => {
  const wordCount = prompt.split(/\s+/).filter(Boolean).length;
  if (wordCount < 20) {
    return [{
      ruleId: 'too-short',
      severity: 'warning',
      message: `Prompt is very short (${wordCount} words). Consider adding more context and constraints.`,
      messageTr: `Prompt çok kısa (${wordCount} kelime). Daha fazla bağlam ve kısıt ekleyin.`,
    }];
  }
  return [];
};

/** R5: Çok uzun prompt (token budget) */
const ruleTooLong: LintRule = (prompt) => {
  const wordCount = prompt.split(/\s+/).filter(Boolean).length;
  if (wordCount > 2000) {
    return [{
      ruleId: 'too-long',
      severity: 'warning',
      message: `Prompt is very long (${wordCount} words). Consider condensing to stay within token budgets.`,
      messageTr: `Prompt çok uzun (${wordCount} kelime). Token bütçesinde kalmak için kısaltmayı düşünün.`,
    }];
  }
  return [];
};

/** R6: Eksik SYSTEM/USER ayrımı (güvenlik) */
const ruleMissingSeparation: LintRule = (prompt) => {
  const hasSystem = /## SYSTEM/i.test(prompt);
  const hasUser = /## USER/i.test(prompt);
  if (!hasSystem && !hasUser) {
    return [{
      ruleId: 'missing-system-user-separation',
      severity: 'info',
      message: 'No SYSTEM/USER separation found. Structural separation improves safety.',
      messageTr: 'SYSTEM/USER ayrımı bulunamadı. Yapısal ayrım güvenliği artırır.',
    }];
  }
  return [];
};

/** R7: Eksik güvenlik talimatları */
const ruleMissingSecurity: LintRule = (prompt) => {
  const hasSecurity = /guardrail|safety|security|güvenlik|unauthorized|yetkisiz|ignore|yok say/i.test(prompt);
  if (!hasSecurity) {
    return [{
      ruleId: 'missing-security',
      severity: 'info',
      message: 'No security guardrails detected. Consider adding prompt injection defenses.',
      messageTr: 'Güvenlik talimatları tespit edilmedi. Prompt injection savunmaları eklemeyi düşünün.',
    }];
  }
  return [];
};

/** R8: Çelişki tespiti */
const ruleContradiction: LintRule = (prompt) => {
  const issues: LintIssue[] = [];
  // JSON yok derken JSON istemek
  if (/no json|json yok/i.test(prompt) && /json schema|json format|json çıktı/i.test(prompt)) {
    issues.push({
      ruleId: 'contradiction',
      severity: 'error',
      message: 'Contradiction detected: "No JSON" but also requests JSON output.',
      messageTr: 'Çelişki tespit edildi: "JSON yok" ama JSON çıktı isteniyor.',
    });
  }
  return issues;
};

/** R9: PII/risk uyarısı */
const ruleRiskFlags: LintRule = (prompt) => {
  const issues: LintIssue[] = [];
  const piiPatterns = /\b(password|şifre|secret|api.key|credit.card|kredi.kart|ssn|tc.kimlik)\b/i;
  const match = prompt.match(piiPatterns);
  if (match) {
    issues.push({
      ruleId: 'pii-risk',
      severity: 'warning',
      message: `Potential PII/sensitive data reference detected: "${match[0]}". Ensure data masking.`,
      messageTr: `Olası PII/hassas veri referansı: "${match[0]}". Veri maskeleme sağlayın.`,
    });
  }
  return issues;
};

// --- Parser-Powered Rules (R10-R14) — PyParsing AST tabanlı ---

import { buildAST, extractVariables } from './promptParser';

/** R10: Bölüm tamlığı (AST tabanlı) */
const ruleSectionCompleteness: LintRule = (prompt) => {
  try {
    const ast = buildAST(prompt);
    const { hasRole, hasOutputFormat, hasExamples, hasGuardrails, constraintCount } = ast.statistics;
    const items = [hasRole, constraintCount > 0, hasOutputFormat, hasExamples, hasGuardrails];
    const present = items.filter(Boolean).length;
    if (present < 3 && prompt.split(/\s+/).filter(Boolean).length > 50) {
      const missing = [
        !hasRole && 'role definition',
        constraintCount === 0 && 'constraints',
        !hasOutputFormat && 'output format',
        !hasExamples && 'examples',
        !hasGuardrails && 'guardrails',
      ].filter(Boolean);
      const missingTr = [
        !hasRole && 'rol tanımı',
        constraintCount === 0 && 'kısıtlar',
        !hasOutputFormat && 'çıktı formatı',
        !hasExamples && 'örnekler',
        !hasGuardrails && 'güvenlik talimatları',
      ].filter(Boolean);
      return [{
        ruleId: 'section-completeness',
        severity: 'info',
        message: `Prompt covers ${present}/5 recommended sections. Missing: ${missing.join(', ')}.`,
        messageTr: `Prompt ${present}/5 önerilen bölümü kapsıyor. Eksik: ${missingTr.join(', ')}.`,
      }];
    }
  } catch { /* parser hata verirse sessizce devam et */ }
  return [];
};

/** R11: Kısıt oranı — çok talimat az kısıt */
const ruleConstraintRatio: LintRule = (prompt) => {
  try {
    const ast = buildAST(prompt);
    const totalInstructions = ast.statistics.sectionCount + (ast.statistics.nodesByType['instruction'] || 0);
    if (totalInstructions > 3 && ast.statistics.constraintCount === 0) {
      return [{
        ruleId: 'constraint-ratio',
        severity: 'warning',
        message: `Found ${totalInstructions} sections but no constraints. Add guardrails like "Do not...", "Always..." to improve safety.`,
        messageTr: `${totalInstructions} bölüm bulundu ama kısıt yok. Güvenlik için "Yapma...", "Her zaman..." gibi kısıtlar ekleyin.`,
      }];
    }
  } catch { /* silent */ }
  return [];
};

/** R12: Değişken stili tutarlılığı */
const ruleVariableConsistency: LintRule = (prompt) => {
  try {
    const result = extractVariables(prompt);
    if (result.summary.mixedStyles && result.summary.unique > 1) {
      return [{
        ruleId: 'variable-consistency',
        severity: 'warning',
        message: `Mixed variable styles detected: ${result.summary.styles.join(', ')}. Use a single style for consistency.`,
        messageTr: `Karışık değişken stilleri tespit edildi: ${result.summary.styles.join(', ')}. Tutarlılık için tek stil kullanın.`,
      }];
    }
  } catch { /* silent */ }
  return [];
};

/** R13: Uzun prompt'ta örnek eksikliği */
const ruleExampleQuality: LintRule = (prompt) => {
  try {
    const wordCount = prompt.split(/\s+/).filter(Boolean).length;
    if (wordCount > 200) {
      const ast = buildAST(prompt);
      if (!ast.statistics.hasExamples) {
        return [{
          ruleId: 'example-quality',
          severity: 'info',
          message: `Long prompt (${wordCount} words) without examples. Adding few-shot examples can improve output quality.`,
          messageTr: `Uzun prompt (${wordCount} kelime) örneksiz. Few-shot örnekler eklemek çıktı kalitesini artırır.`,
        }];
      }
    }
  } catch { /* silent */ }
  return [];
};

/** R14: Aşırı iç içe yapı */
const ruleNestingDepth: LintRule = (prompt) => {
  try {
    const ast = buildAST(prompt);
    if (ast.statistics.maxDepth > 4) {
      return [{
        ruleId: 'nesting-depth',
        severity: 'warning',
        message: `Deep nesting detected (depth: ${ast.statistics.maxDepth}). Simplify structure for clarity.`,
        messageTr: `Derin iç içe yapı tespit edildi (derinlik: ${ast.statistics.maxDepth}). Netlik için yapıyı sadeleştirin.`,
      }];
    }
  } catch { /* silent */ }
  return [];
};

const ALL_RULES: LintRule[] = [
  ruleVagueVerbs,
  ruleMissingSuccessCriteria,
  ruleMissingFormat,
  ruleTooShort,
  ruleTooLong,
  ruleMissingSeparation,
  ruleMissingSecurity,
  ruleContradiction,
  ruleRiskFlags,
  // Parser-powered rules (R10-R14)
  ruleSectionCompleteness,
  ruleConstraintRatio,
  ruleVariableConsistency,
  ruleExampleQuality,
  ruleNestingDepth,
];

/**
 * Ana lint fonksiyonu.
 */
export function lintPrompt(masterPrompt: string, reasoning?: string): LintResult {
  const issues: LintIssue[] = [];

  for (const rule of ALL_RULES) {
    issues.push(...rule(masterPrompt, reasoning));
  }

  const totalErrors = issues.filter(i => i.severity === 'error').length;
  const totalWarnings = issues.filter(i => i.severity === 'warning').length;
  const totalInfo = issues.filter(i => i.severity === 'info').length;

  return {
    issues,
    totalErrors,
    totalWarnings,
    totalInfo,
    passed: totalErrors === 0,
  };
}
