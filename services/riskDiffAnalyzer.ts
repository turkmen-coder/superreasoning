/**
 * Risk Diff Analyzer — Prompt version diff risk scoring.
 *
 * Analyzes differences between two prompt versions and produces
 * safety, quality, and cost risk assessments for each change.
 *
 * Three risk dimensions:
 *   1. Safety  — Injection exposure, guardrail removal, constraint weakening
 *   2. Quality — Instruction clarity, section coverage, specificity
 *   3. Cost    — Token count delta, complexity increase
 *
 * @see components/VersionHistoryPanel.tsx (UI consumer)
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskSignal {
  dimension: 'safety' | 'quality' | 'cost';
  level: RiskLevel;
  message: string;
  lineRange?: { start: number; end: number };
}

export interface DiffChunkRisk {
  chunkIndex: number;
  type: 'added' | 'removed' | 'changed';
  content: string;
  signals: RiskSignal[];
  overallLevel: RiskLevel;
}

export interface RiskDiffResult {
  fromVersion: string;
  toVersion: string;
  analyzedAt: string;
  chunks: DiffChunkRisk[];
  summary: {
    safety: RiskLevel;
    quality: RiskLevel;
    cost: RiskLevel;
    overall: RiskLevel;
    totalSignals: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  tokenDelta: {
    before: number;
    after: number;
    delta: number;
    deltaPercent: number;
  };
  recommendations: string[];
}

// ── Risk Pattern Definitions ───────────────────────────────────────────────

interface RiskPattern {
  pattern: RegExp;
  dimension: RiskSignal['dimension'];
  level: RiskLevel;
  messageTemplate: string;
}

/** Patterns detected in ADDED or CHANGED content (potential new risks) */
const ADDED_RISK_PATTERNS: RiskPattern[] = [
  // Safety — injection vectors
  { pattern: /ignore\s+(previous|prior|above)\s+(instructions?|prompts?)/i, dimension: 'safety', level: 'critical', messageTemplate: 'Potential injection vector: instruction override phrase detected' },
  { pattern: /\bsystem\s*prompt\b/i, dimension: 'safety', level: 'high', messageTemplate: 'References system prompt — may enable exfiltration' },
  { pattern: /\b(eval|exec|execute|run)\s*(code|command|script)/i, dimension: 'safety', level: 'critical', messageTemplate: 'Code execution instruction detected' },
  { pattern: /\b(bypass|disable|skip|ignore)\s*(safety|filter|guardrail|restriction|limit)/i, dimension: 'safety', level: 'critical', messageTemplate: 'Attempts to bypass safety mechanisms' },
  { pattern: /\bno\s*(restriction|limit|filter|censor)/i, dimension: 'safety', level: 'high', messageTemplate: 'Removes restrictions or filtering' },
  { pattern: /\bpretend\b.*\b(you are|to be)\b/i, dimension: 'safety', level: 'high', messageTemplate: 'Role-play instruction may bypass guardrails' },
  { pattern: /\bDAN\b|developer\s*mode|jailbreak/i, dimension: 'safety', level: 'critical', messageTemplate: 'Known jailbreak pattern detected' },
  { pattern: /base64|\\u[0-9a-f]{4}/i, dimension: 'safety', level: 'medium', messageTemplate: 'Encoded content may bypass text filters' },

  // Quality — specificity concerns
  { pattern: /\bTODO\b|\bFIXME\b|\bHACK\b/i, dimension: 'quality', level: 'medium', messageTemplate: 'Incomplete marker found (TODO/FIXME/HACK)' },
  { pattern: /\betc\.?\b|\band\s+so\s+on\b|\band\s+more\b/i, dimension: 'quality', level: 'low', messageTemplate: 'Vague language ("etc.", "and so on") reduces specificity' },
  { pattern: /\bmaybe\b|\bperhaps\b|\bpossibly\b|\bmight\b/i, dimension: 'quality', level: 'low', messageTemplate: 'Hedging language reduces instruction clarity' },

  // Cost — complexity signals
  { pattern: /\b(step[- ]by[- ]step|chain[- ]of[- ]thought|think\s+carefully|reason\s+through)\b/i, dimension: 'cost', level: 'low', messageTemplate: 'Reasoning-heavy instruction may increase token usage' },
  { pattern: /\b(comprehensive|exhaustive|detailed|thorough)\b/i, dimension: 'cost', level: 'low', messageTemplate: 'Verbosity-encouraging instruction may increase cost' },
];

/** Patterns detected in REMOVED content (guardrail removal risks) */
const REMOVED_RISK_PATTERNS: RiskPattern[] = [
  // Safety — guardrail removal
  { pattern: /\b(never|do\s*not|must\s*not|should\s*not|cannot)\b.*\b(reveal|share|disclose|expose|leak)\b/i, dimension: 'safety', level: 'critical', messageTemplate: 'Removed: Anti-disclosure guardrail' },
  { pattern: /\b(never|do\s*not|must\s*not)\b.*\b(harmful|dangerous|illegal|malicious)\b/i, dimension: 'safety', level: 'critical', messageTemplate: 'Removed: Harm prevention guardrail' },
  { pattern: /\b(safety|security|privacy|confidential)\b/i, dimension: 'safety', level: 'high', messageTemplate: 'Removed: Safety/security-related instruction' },
  { pattern: /\b(restriction|limit|constraint|boundary|guardrail)\b/i, dimension: 'safety', level: 'high', messageTemplate: 'Removed: Behavioral constraint' },
  { pattern: /\b(validate|verify|check|sanitize|escape)\b/i, dimension: 'safety', level: 'medium', messageTemplate: 'Removed: Validation/sanitization instruction' },

  // Quality — structure removal
  { pattern: /^#{1,3}\s+/m, dimension: 'quality', level: 'medium', messageTemplate: 'Removed: Section heading — may reduce structure' },
  { pattern: /^\d+\.\s+/m, dimension: 'quality', level: 'low', messageTemplate: 'Removed: Numbered step — may reduce clarity' },
  { pattern: /\b(format|output|response)\s*(format|structure|template)\b/i, dimension: 'quality', level: 'medium', messageTemplate: 'Removed: Output format specification' },

  // Cost — efficiency removal
  { pattern: /\b(concise|brief|short|succinct|minimal)\b/i, dimension: 'cost', level: 'medium', messageTemplate: 'Removed: Brevity instruction — output may grow' },
  { pattern: /\b(limit|maximum|at most|no more than)\s*\d+/i, dimension: 'cost', level: 'medium', messageTemplate: 'Removed: Length/count limit — output may grow' },
];

// ── Analysis Functions ─────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  // Rough token estimate: ~4 chars per token for English, ~2 for mixed
  return Math.ceil(text.length / 3.5);
}

function detectRiskSignals(
  content: string,
  patterns: RiskPattern[],
  lineOffset: number = 0,
): RiskSignal[] {
  const signals: RiskSignal[] = [];

  for (const rp of patterns) {
    const match = rp.pattern.exec(content);
    if (match) {
      // Calculate line number of match
      const beforeMatch = content.slice(0, match.index);
      const lineNumber = lineOffset + beforeMatch.split('\n').length;

      signals.push({
        dimension: rp.dimension,
        level: rp.level,
        message: rp.messageTemplate,
        lineRange: { start: lineNumber, end: lineNumber },
      });
    }
  }

  return signals;
}

function highestLevel(levels: RiskLevel[]): RiskLevel {
  const order: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
  let max = 0;
  for (const l of levels) {
    const idx = order.indexOf(l);
    if (idx > max) max = idx;
  }
  return order[max];
}

function aggregateDimension(signals: RiskSignal[], dim: RiskSignal['dimension']): RiskLevel {
  const dimSignals = signals.filter(s => s.dimension === dim);
  if (dimSignals.length === 0) return 'low';
  return highestLevel(dimSignals.map(s => s.level));
}

// ── Diff Change interface (matches VersionHistoryPanel) ────────────────────

interface DiffChange {
  line: number;
  type: 'added' | 'removed' | 'changed' | 'unchanged';
  old?: string;
  new?: string;
  content?: string;
}

// ── Main Analysis ──────────────────────────────────────────────────────────

/**
 * Analyze risk implications of a prompt diff.
 *
 * @param fromVersion - Source version identifier
 * @param toVersion - Target version identifier
 * @param changes - Diff changes array from diff endpoint
 * @param fullTextBefore - Complete prompt text of source version
 * @param fullTextAfter - Complete prompt text of target version
 */
export function analyzeRiskDiff(
  fromVersion: string,
  toVersion: string,
  changes: DiffChange[],
  fullTextBefore: string,
  fullTextAfter: string,
): RiskDiffResult {
  const chunks: DiffChunkRisk[] = [];
  const allSignals: RiskSignal[] = [];

  // Analyze each non-unchanged diff chunk
  const relevantChanges = changes.filter(c => c.type !== 'unchanged');

  for (let i = 0; i < relevantChanges.length; i++) {
    const change = relevantChanges[i];
    const chunkSignals: RiskSignal[] = [];

    if (change.type === 'added' && change.new) {
      const signals = detectRiskSignals(change.new, ADDED_RISK_PATTERNS, change.line);
      chunkSignals.push(...signals);
    } else if (change.type === 'removed' && change.old) {
      const signals = detectRiskSignals(change.old, REMOVED_RISK_PATTERNS, change.line);
      chunkSignals.push(...signals);
    } else if (change.type === 'changed') {
      // For changed lines, check both added content risks and removed content risks
      if (change.new) {
        const addedSignals = detectRiskSignals(change.new, ADDED_RISK_PATTERNS, change.line);
        chunkSignals.push(...addedSignals);
      }
      if (change.old) {
        const removedSignals = detectRiskSignals(change.old, REMOVED_RISK_PATTERNS, change.line);
        chunkSignals.push(...removedSignals);
      }
    }

    allSignals.push(...chunkSignals);

    const content = change.type === 'removed'
      ? (change.old ?? '')
      : (change.new ?? change.content ?? '');

    chunks.push({
      chunkIndex: i,
      type: change.type === 'unchanged' ? 'added' : change.type,
      content: content.slice(0, 500),
      signals: chunkSignals,
      overallLevel: chunkSignals.length > 0
        ? highestLevel(chunkSignals.map(s => s.level))
        : 'low',
    });
  }

  // Token analysis
  const tokensBefore = estimateTokens(fullTextBefore);
  const tokensAfter = estimateTokens(fullTextAfter);
  const tokenDelta = tokensAfter - tokensBefore;
  const deltaPercent = tokensBefore > 0
    ? Math.round((tokenDelta / tokensBefore) * 10000) / 100
    : 0;

  // Additional cost signal for large token increases
  if (deltaPercent > 50) {
    allSignals.push({
      dimension: 'cost',
      level: 'high',
      message: `Token count increased by ${deltaPercent}% (${tokensBefore} -> ${tokensAfter})`,
    });
  } else if (deltaPercent > 20) {
    allSignals.push({
      dimension: 'cost',
      level: 'medium',
      message: `Token count increased by ${deltaPercent}% (${tokensBefore} -> ${tokensAfter})`,
    });
  }

  // Count by level
  const criticalCount = allSignals.filter(s => s.level === 'critical').length;
  const highCount = allSignals.filter(s => s.level === 'high').length;
  const mediumCount = allSignals.filter(s => s.level === 'medium').length;
  const lowCount = allSignals.filter(s => s.level === 'low').length;

  // Dimension summaries
  const safetyLevel = aggregateDimension(allSignals, 'safety');
  const qualityLevel = aggregateDimension(allSignals, 'quality');
  const costLevel = aggregateDimension(allSignals, 'cost');
  const overallLevel = highestLevel([safetyLevel, qualityLevel, costLevel]);

  // Generate recommendations
  const recommendations = generateRecommendations(allSignals, {
    safetyLevel, qualityLevel, costLevel, deltaPercent,
  });

  return {
    fromVersion,
    toVersion,
    analyzedAt: new Date().toISOString(),
    chunks,
    summary: {
      safety: safetyLevel,
      quality: qualityLevel,
      cost: costLevel,
      overall: overallLevel,
      totalSignals: allSignals.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
    },
    tokenDelta: {
      before: tokensBefore,
      after: tokensAfter,
      delta: tokenDelta,
      deltaPercent,
    },
    recommendations,
  };
}

// ── Recommendation Generator ───────────────────────────────────────────────

function generateRecommendations(
  signals: RiskSignal[],
  ctx: { safetyLevel: RiskLevel; qualityLevel: RiskLevel; costLevel: RiskLevel; deltaPercent: number },
): string[] {
  const recs: string[] = [];

  // Safety recommendations
  const safetySignals = signals.filter(s => s.dimension === 'safety');
  if (safetySignals.some(s => s.level === 'critical')) {
    recs.push('CRITICAL: Review safety-critical changes before promoting. Run adversarial test suite.');
  }
  if (safetySignals.some(s => s.message.includes('guardrail'))) {
    recs.push('Guardrail removal detected. Verify that safety constraints are maintained elsewhere.');
  }
  if (safetySignals.some(s => s.message.includes('injection'))) {
    recs.push('Potential injection vector added. Run prompt injection tests before deployment.');
  }

  // Quality recommendations
  if (ctx.qualityLevel === 'high' || ctx.qualityLevel === 'critical') {
    recs.push('Significant quality impact detected. Review removed sections and structure changes.');
  }
  if (signals.some(s => s.message.includes('TODO'))) {
    recs.push('Incomplete markers (TODO/FIXME) found. Resolve before promoting to production.');
  }

  // Cost recommendations
  if (ctx.deltaPercent > 50) {
    recs.push(`Token usage increased by ${ctx.deltaPercent}%. Consider optimizing for cost efficiency.`);
  } else if (ctx.deltaPercent > 20) {
    recs.push(`Token usage increased by ${ctx.deltaPercent}%. Monitor cost impact after deployment.`);
  }
  if (ctx.deltaPercent < -30) {
    recs.push(`Token count decreased significantly (${ctx.deltaPercent}%). Verify no important content was lost.`);
  }

  // General
  if (recs.length === 0) {
    recs.push('No significant risk signals detected. Changes appear safe for promotion.');
  }

  return recs;
}
