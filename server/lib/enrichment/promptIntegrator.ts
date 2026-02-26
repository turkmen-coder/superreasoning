/**
 * Prompt Integrator — Bulunan candidate'ları master prompt'a entegre eder.
 * Fast mod: Kural-tabanlı birleştirme (~200ms)
 * Deep mod: LLM destekli doğal entegrasyon (fallback: fast mod)
 */

import type { EnrichmentCandidate } from '../../../types/enrichment';
import { Framework } from '../../../types';
import { parseSections } from './ambiguityDetector';

// ---------- Token Budget ----------

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

// ---------- Fast Mode Integration ----------

function groupBySection(
  candidates: EnrichmentCandidate[],
): Map<string, EnrichmentCandidate[]> {
  const groups = new Map<string, EnrichmentCandidate[]>();
  for (const c of candidates) {
    const key = c.targetSection;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  return groups;
}

function buildAttributionBlock(candidate: EnrichmentCandidate): string {
  const tag = `<!-- [LIB:${candidate.promptId}] ${candidate.promptName} -->`;
  return `${tag}\n${candidate.promptContent}`;
}

function truncateToBudget(text: string, maxTokens: number): string {
  const maxWords = Math.max(1, Math.floor(maxTokens / 1.3));
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ')}\n\n[...truncated for token budget...]`;
}

function fitCandidateToBudget(
  candidate: EnrichmentCandidate,
  remainingBudget: number,
): { candidate: EnrichmentCandidate; block: string; usedTokens: number } | null {
  const fullBlock = buildAttributionBlock(candidate);
  const fullTokens = estimateTokens(fullBlock);
  if (fullTokens <= remainingBudget) {
    return { candidate, block: fullBlock, usedTokens: fullTokens };
  }

  // Keep attribution marker and trim payload when candidate is too large.
  const tag = `<!-- [LIB:${candidate.promptId}] ${candidate.promptName} -->`;
  const tagTokens = estimateTokens(tag);
  const availableForContent = remainingBudget - tagTokens - 6;
  if (availableForContent < 40) return null;

  const trimmedContent = truncateToBudget(candidate.promptContent, availableForContent);
  const trimmedCandidate: EnrichmentCandidate = { ...candidate, promptContent: trimmedContent };
  const trimmedBlock = buildAttributionBlock(trimmedCandidate);
  const usedTokens = estimateTokens(trimmedBlock);
  if (usedTokens > remainingBudget) return null;

  return { candidate: trimmedCandidate, block: trimmedBlock, usedTokens };
}

export function integrateFast(
  masterPrompt: string,
  candidates: EnrichmentCandidate[],
  maxTokenBudget: number = 500,
): { result: string; integrated: EnrichmentCandidate[] } {
  if (candidates.length === 0) {
    return { result: masterPrompt, integrated: [] };
  }

  const sections = parseSections(masterPrompt);
  const grouped = groupBySection(candidates);
  const integrated: EnrichmentCandidate[] = [];
  let remainingBudget = maxTokenBudget;

  // Build section map for modification
  const sectionMap = new Map<string, string>();
  for (const sec of sections) {
    sectionMap.set(sec.name, sec.content);
  }

  for (const [sectionName, sectionCandidates] of grouped) {
    const currentContent = sectionMap.get(sectionName);
    if (!currentContent && sectionName !== 'GLOBAL') {
      // Section doesn't exist in prompt — append as new section
      const newBlocks: string[] = [];
      for (const c of sectionCandidates) {
        const fitted = fitCandidateToBudget(c, remainingBudget);
        if (fitted) {
          newBlocks.push(fitted.block);
          remainingBudget -= fitted.usedTokens;
          integrated.push(fitted.candidate);
        }
      }
      if (newBlocks.length > 0) {
        sectionMap.set(sectionName, `## ${sectionName}\n\n${newBlocks.join('\n\n')}`);
      }
      continue;
    }

    // Append to existing section
    const targetContent = currentContent ?? '';
    const newBlocks: string[] = [];

    for (const c of sectionCandidates) {
      const fitted = fitCandidateToBudget(c, remainingBudget);
      if (fitted) {
        newBlocks.push(fitted.block);
        remainingBudget -= fitted.usedTokens;
        integrated.push(fitted.candidate);
      }
    }

    if (newBlocks.length > 0) {
      const enrichmentSection = `\n\n### Enrichment (Library)\n${newBlocks.join('\n\n')}`;
      sectionMap.set(sectionName, targetContent + enrichmentSection);
    }
  }

  // Reassemble prompt
  const result = reassembleSections(masterPrompt, sections, sectionMap);
  return { result, integrated };
}

function reassembleSections(
  originalPrompt: string,
  originalSections: ReturnType<typeof parseSections>,
  sectionMap: Map<string, string>,
): string {
  // If only GLOBAL section (no ## headings), simple replace
  if (originalSections.length === 1 && originalSections[0].name === 'GLOBAL') {
    const globalContent = sectionMap.get('GLOBAL') ?? originalPrompt;
    // Append new sections if any were created
    const newSections: string[] = [];
    for (const [name, content] of sectionMap) {
      if (name !== 'GLOBAL') newSections.push(content);
    }
    return newSections.length > 0
      ? `${globalContent}\n\n${newSections.join('\n\n')}`
      : globalContent;
  }

  // Rebuild from section map preserving order
  const parts: string[] = [];
  for (const sec of originalSections) {
    parts.push(sectionMap.get(sec.name) ?? sec.content);
  }

  // Add any new sections that didn't exist originally
  const existingNames = new Set(originalSections.map((s) => s.name));
  for (const [name, content] of sectionMap) {
    if (!existingNames.has(name as any)) {
      parts.push(content);
    }
  }

  return parts.join('\n\n');
}

// ---------- Deep Mode Integration ----------

export async function integrateDeep(
  masterPrompt: string,
  candidates: EnrichmentCandidate[],
  maxTokenBudget: number = 500,
  language: 'tr' | 'en' = 'en',
): Promise<{ result: string; integrated: EnrichmentCandidate[] }> {
  // Deep mode attempts LLM-based integration
  // Fallback to fast mode if LLM unavailable or fails
  try {
    const metaPrompt = buildMetaPrompt(masterPrompt, candidates, language);

    // Try to use existing provider infrastructure via generateMasterPromptServer
    const { generateMasterPromptServer } = await import('../../lib/generateAdapter');
    if (typeof generateMasterPromptServer !== 'function') {
      throw new Error('generateMasterPromptServer not available');
    }

    const response = await generateMasterPromptServer({
      intent: metaPrompt.user,
      framework: Framework.KERNEL,
      domainId: 'general',
      provider: 'auto',
      language,
    });
    const llmResult = response?.masterPrompt;

    if (llmResult && typeof llmResult === 'string' && llmResult.length > 100) {
      // Validate the response contains attribution markers
      const hasAttribution = candidates.some((c) =>
        llmResult.includes(`[LIB:${c.promptId}]`),
      );

      if (hasAttribution) {
        return { result: llmResult, integrated: candidates };
      }
    }

    // LLM response malformed — fallback
    console.warn('[Integrator] LLM response malformed, falling back to fast mode');
    return integrateFast(masterPrompt, candidates, maxTokenBudget);
  } catch (e: any) {
    console.warn(`[Integrator] Deep mode failed (${e.message}), falling back to fast mode`);
    return integrateFast(masterPrompt, candidates, maxTokenBudget);
  }
}

function buildMetaPrompt(
  masterPrompt: string,
  candidates: EnrichmentCandidate[],
  language: 'tr' | 'en',
): { system: string; user: string } {
  const candidateList = candidates
    .map((c, i) => `[${i + 1}] ID: ${c.promptId}\nName: ${c.promptName}\nTarget: ${c.targetSection}\nContent: ${c.promptContent}`)
    .join('\n\n');

  const system = language === 'tr'
    ? `Sen bir prompt entegrasyon uzmanısın. Master prompt'a kütüphaneden bulunan zenginleştirme parçalarını doğal biçimde entegre et.
Kurallar:
1. Her entegre parça için <!-- [LIB:id] İsim --> attribution marker koru.
2. Prompt'un mevcut yapısını ve bölüm başlıklarını koru.
3. Sadece ilgili bölüme ekle, gereksiz tekrardan kaçın.
4. Orijinal içeriği silme, sadece eksik kısımları tamamla.`
    : `You are a prompt integration specialist. Naturally integrate enrichment fragments from the library into the master prompt.
Rules:
1. Preserve <!-- [LIB:id] Name --> attribution markers for each integrated piece.
2. Maintain the existing structure and section headings.
3. Only add to relevant sections, avoid unnecessary repetition.
4. Do not remove original content, only fill gaps.`;

  const user = `Master Prompt:\n\`\`\`\n${masterPrompt}\n\`\`\`\n\nEnrichment Candidates:\n${candidateList}\n\nOutput the enriched prompt directly (no explanation).`;

  return { system, user };
}
