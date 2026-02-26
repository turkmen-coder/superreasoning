/**
 * Prompt Versioning Service
 * 
 * Prompt versiyonlama, rollback ve A/B test varyant üretimi.
 */

import type { PromptVersion } from '../types/agent';

// ---------- Version Storage ----------

const versionStore = new Map<string, PromptVersion[]>();
const promptVersionMap = new Map<string, number>(); // promptId -> latest version

function generateId(): string {
  return `ver-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

// ---------- Core Functions ----------

export function createVersion(
  promptId: string,
  content: string,
  createdBy: 'user' | 'agent',
  enrichmentMetrics?: PromptVersion['enrichmentMetrics'],
  tags: string[] = []
): PromptVersion {
  const currentVersion = promptVersionMap.get(promptId) || 0;
  const newVersion = currentVersion + 1;
  
  const version: PromptVersion = {
    id: generateId(),
    promptId,
    version: newVersion,
    content,
    enrichmentMetrics,
    createdAt: new Date().toISOString(),
    createdBy,
    tags,
  };
  
  // Store version
  const versions = versionStore.get(promptId) || [];
  versions.unshift(version); // Latest first
  versionStore.set(promptId, versions);
  promptVersionMap.set(promptId, newVersion);
  
  return version;
}

export function getVersion(promptId: string, version: number): PromptVersion | undefined {
  const versions = versionStore.get(promptId);
  if (!versions) return undefined;
  return versions.find(v => v.version === version);
}

export function getLatestVersion(promptId: string): PromptVersion | undefined {
  const versions = versionStore.get(promptId);
  return versions?.[0];
}

export function getVersionHistory(promptId: string, limit = 10): PromptVersion[] {
  const versions = versionStore.get(promptId) || [];
  return versions.slice(0, limit);
}

export function getAllPromptIds(): string[] {
  return Array.from(versionStore.keys());
}

// ---------- Rollback ----------

export function rollback(promptId: string, targetVersion: number): PromptVersion | null {
  const target = getVersion(promptId, targetVersion);
  if (!target) return null;
  
  // Create a new version with the old content
  const rollbackVersion = createVersion(
    promptId,
    target.content,
    'user',
    target.enrichmentMetrics,
    [...target.tags, 'rollback']
  );
  
  return rollbackVersion;
}

// ---------- Diff ----------

export interface VersionDiff {
  promptId: string;
  versionA: number;
  versionB: number;
  additions: string[];
  deletions: string[];
  changes: Array<{ line: number; old: string; new: string }>;
  summary: string;
}

export function diffVersions(promptId: string, versionA: number, versionB: number): VersionDiff | null {
  const vA = getVersion(promptId, versionA);
  const vB = getVersion(promptId, versionB);
  
  if (!vA || !vB) return null;
  
  const linesA = vA.content.split('\n');
  const linesB = vB.content.split('\n');
  
  const additions: string[] = [];
  const deletions: string[] = [];
  const changes: Array<{ line: number; old: string; new: string }> = [];
  
  // Simple line-by-line diff
  const maxLen = Math.max(linesA.length, linesB.length);
  for (let i = 0; i < maxLen; i++) {
    const lineA = linesA[i];
    const lineB = linesB[i];
    
    if (lineA === undefined) {
      additions.push(lineB);
    } else if (lineB === undefined) {
      deletions.push(lineA);
    } else if (lineA !== lineB) {
      changes.push({ line: i + 1, old: lineA, new: lineB });
    }
  }
  
  const summary = `+${additions.length} -${deletions.length} ~${changes.length} lines`;
  
  return {
    promptId,
    versionA,
    versionB,
    additions,
    deletions,
    changes,
    summary,
  };
}

// ---------- A/B Test Variants ----------

export interface ABTestVariant {
  id: string;
  promptId: string;
  variantName: string;
  content: string;
  createdAt: string;
  metrics: {
    impressions: number;
    successes: number;
    edits: number;
    avgLatencyMs: number;
  };
}

const abTestStore = new Map<string, ABTestVariant[]>();

export function createABVariant(
  promptId: string,
  variantName: string,
  contentModifier: (content: string) => string
): ABTestVariant {
  const latest = getLatestVersion(promptId);
  if (!latest) throw new Error('No version found for prompt');
  
  const variant: ABTestVariant = {
    id: `ab-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    promptId,
    variantName,
    content: contentModifier(latest.content),
    createdAt: new Date().toISOString(),
    metrics: {
      impressions: 0,
      successes: 0,
      edits: 0,
      avgLatencyMs: 0,
    },
  };
  
  const variants = abTestStore.get(promptId) || [];
  variants.push(variant);
  abTestStore.set(promptId, variants);
  
  return variant;
}

export function getABVariants(promptId: string): ABTestVariant[] {
  return abTestStore.get(promptId) || [];
}

export function recordABResult(
  promptId: string,
  variantId: string,
  success: boolean,
  edited: boolean,
  latencyMs: number
): void {
  const variants = abTestStore.get(promptId);
  if (!variants) return;
  
  const variant = variants.find(v => v.id === variantId);
  if (!variant) return;
  
  variant.metrics.impressions++;
  if (success) variant.metrics.successes++;
  if (edited) variant.metrics.edits++;
  variant.metrics.avgLatencyMs = 
    (variant.metrics.avgLatencyMs * (variant.metrics.impressions - 1) + latencyMs) / variant.metrics.impressions;
}

export function getABTestWinner(promptId: string): ABTestVariant | null {
  const variants = abTestStore.get(promptId);
  if (!variants || variants.length === 0) return null;
  
  // Calculate success rate
  const scored = variants
    .filter(v => v.metrics.impressions >= 10) // Minimum sample size
    .map(v => ({
      variant: v,
      successRate: v.metrics.successes / v.metrics.impressions,
      editRate: v.metrics.edits / v.metrics.impressions,
    }))
    .sort((a, b) => {
      // Higher success rate, lower edit rate wins
      const scoreA = a.successRate - a.editRate * 0.5;
      const scoreB = b.successRate - b.editRate * 0.5;
      return scoreB - scoreA;
    });
  
  return scored[0]?.variant || null;
}

// ---------- Automatic Versioning on Enrich ----------

export async function enrichAndVersion(
  promptId: string,
  masterPrompt: string,
  options: {
    domainId?: string;
    mode?: 'fast' | 'deep';
    userId?: string;
  } = {}
): Promise<{ version: PromptVersion; enrichedPrompt: string }> {
  const { enrichMasterPrompt } = await import('../server/lib/enrichment');
  
  const result = await enrichMasterPrompt(masterPrompt, {
    domainId: options.domainId,
    config: { mode: options.mode || 'fast' },
  });
  
  const version = createVersion(
    promptId,
    result.enrichedPrompt,
    'agent',
    {
      ambiguityScore: result.metrics.ambiguityScoreAfter,
      promptsIntegrated: result.metrics.promptsIntegrated,
      tokensAdded: result.metrics.tokensAdded,
    },
    [`mode:${options.mode || 'fast'}`, options.domainId ? `domain:${options.domainId}` : '']
  );
  
  return {
    version,
    enrichedPrompt: result.enrichedPrompt,
  };
}

// ---------- Export/Import ----------

export function exportPromptHistory(promptId: string): {
  promptId: string;
  exportedAt: string;
  versions: PromptVersion[];
  abVariants: ABTestVariant[];
} | null {
  const versions = versionStore.get(promptId);
  if (!versions || versions.length === 0) return null;
  
  return {
    promptId,
    exportedAt: new Date().toISOString(),
    versions,
    abVariants: abTestStore.get(promptId) || [],
  };
}

export function importPromptHistory(data: {
  promptId: string;
  versions: PromptVersion[];
  abVariants?: ABTestVariant[];
}): void {
  // Import versions
  const existing = versionStore.get(data.promptId) || [];
  const merged = [...data.versions, ...existing].sort((a, b) => b.version - a.version);
  versionStore.set(data.promptId, merged);
  
  // Update latest version number
  if (merged.length > 0) {
    promptVersionMap.set(data.promptId, Math.max(...merged.map(v => v.version)));
  }
  
  // Import A/B variants
  if (data.abVariants && data.abVariants.length > 0) {
    abTestStore.set(data.promptId, data.abVariants);
  }
}

// ---------- Stats ----------

export function getVersioningStats(): {
  totalPrompts: number;
  totalVersions: number;
  avgVersionsPerPrompt: number;
  abTestsActive: number;
} {
  let totalVersions = 0;
  for (const versions of versionStore.values()) {
    totalVersions += versions.length;
  }
  
  const totalPrompts = versionStore.size;
  const abTestsActive = Array.from(abTestStore.values()).filter(v => v.length > 0).length;
  
  return {
    totalPrompts,
    totalVersions,
    avgVersionsPerPrompt: totalPrompts > 0 ? Math.round(totalVersions / totalPrompts * 10) / 10 : 0,
    abTestsActive,
  };
}
