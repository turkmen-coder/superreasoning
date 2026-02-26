/**
 * Library Searcher — Kütüphaneden en uygun prompt'ları arar.
 * İki fazlı: 1) Geniş bağlam arama 2) Gap-hedefli arama
 * Mevcut embeddings.ts + vectorStore.ts altyapısını kullanır.
 */

import type { AmbiguityGap, EnrichmentCandidate, EnrichmentConfig } from '../../../types/enrichment';
import { generateEmbedding } from '../embeddings';
import { getVectorStore, type SearchResult } from '../vectorStore';
import { analyzeWithLangExtract } from '../langextract/client';

// Lazy-loaded prompt map (agentService pattern)
let promptsLoaded = false;
const promptMap = new Map<string, {
  id: string;
  nameEn: string;
  nameTr: string;
  promptEn: string;
  promptTr: string;
  categoryEn: string;
  tags: string[];
}>();

async function ensurePrompts(): Promise<void> {
  if (promptsLoaded) return;
  try {
    const { NOTEBOOKLM_PROMPTS } = await import('../../../data/notebookLmPrompts');
    for (const p of NOTEBOOKLM_PROMPTS) {
      promptMap.set(p.id, {
        id: p.id,
        nameEn: p.nameEn,
        nameTr: p.name,
        promptEn: p.promptEn,
        promptTr: p.prompt,
        categoryEn: p.categoryEn,
        tags: p.tags,
      });
    }
    promptsLoaded = true;
    console.log(`[LibrarySearcher] Loaded ${promptMap.size} prompts`);
  } catch (e: any) {
    console.warn(`[LibrarySearcher] Failed to load prompts: ${e.message}`);
  }
}

// ---------- Keyword Matching Fallback ----------

function keywordMatch(query: string, maxResults: number, domainId?: string): EnrichmentCandidate[] {
  const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (keywords.length === 0) return [];

  const scored: Array<{ entry: typeof promptMap extends Map<string, infer V> ? V : never; score: number }> = [];

  for (const entry of promptMap.values()) {
    const text = `${entry.promptEn} ${entry.nameEn} ${entry.categoryEn} ${entry.tags.join(' ')}`.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score += 1;
    }
    // Domain boost
    if (domainId && text.includes(domainId.toLowerCase())) score += 0.5;

    if (score > 0) {
      scored.push({ entry, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults).map((s) => ({
    promptId: s.entry.id,
    promptName: s.entry.nameEn,
    promptContent: s.entry.promptEn,
    category: s.entry.categoryEn,
    tags: s.entry.tags,
    relevanceScore: Math.min(1, s.score / keywords.length),
    targetSection: 'GLOBAL' as const,
    targetGapId: '',
  }));
}

// ---------- Vector Search ----------

async function vectorSearch(query: string, topK: number): Promise<SearchResult[]> {
  const store = getVectorStore();
  if (!store || !store.isReady()) return [];

  try {
    const queryVector = await generateEmbedding(query);
    return await store.search(queryVector, topK);
  } catch (e: any) {
    console.warn(`[LibrarySearcher] Vector search failed: ${e.message}`);
    return [];
  }
}

function enrichFromResults(
  results: SearchResult[],
  targetSection: EnrichmentCandidate['targetSection'],
  targetGapId: string,
  language: 'tr' | 'en',
): EnrichmentCandidate[] {
  return results.map((r) => {
    const full = promptMap.get(r.id);
    return {
      promptId: r.id,
      promptName: full ? (language === 'tr' ? full.nameTr : full.nameEn) : r.id,
      promptContent: full ? (language === 'tr' ? full.promptTr : full.promptEn) : '',
      category: full?.categoryEn ?? r.metadata?.category ?? '',
      tags: full?.tags ?? r.metadata?.tags ?? [],
      relevanceScore: r.score,
      targetSection,
      targetGapId,
    };
  });
}

// ---------- De-duplicate + Rank ----------

function deduplicateAndRank(
  candidates: EnrichmentCandidate[],
  domainId: string | undefined,
  config: EnrichmentConfig,
): EnrichmentCandidate[] {
  const minScore = config.minRelevanceScore ?? 0.65;
  const maxTotal = config.maxTotalCandidates ?? 8;

  // De-duplicate by promptId (keep highest score)
  const best = new Map<string, EnrichmentCandidate>();
  for (const c of candidates) {
    const existing = best.get(c.promptId);
    if (!existing || c.relevanceScore > existing.relevanceScore) {
      best.set(c.promptId, c);
    }
  }

  const unique = Array.from(best.values());

  // Domain boost
  if (domainId) {
    const domainLower = domainId.toLowerCase();
    for (const c of unique) {
      const catLower = c.category.toLowerCase();
      const tagStr = c.tags.join(' ').toLowerCase();
      if (catLower.includes(domainLower) || tagStr.includes(domainLower)) {
        c.relevanceScore = Math.min(1, c.relevanceScore + 0.1);
      }
    }
  }

  // Filter by minimum score
  const strict = unique.filter((c) => c.relevanceScore >= minScore);
  if (strict.length > 0) {
    strict.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return strict.slice(0, maxTotal);
  }

  // Recovery mode: avoid empty enrichment when vector store is cold or keyword overlap is weak.
  const relaxedFloor = Math.max(0.2, minScore - 0.35);
  const relaxed = unique.filter((c) => c.relevanceScore >= relaxedFloor);
  if (relaxed.length > 0) {
    relaxed.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return relaxed.slice(0, Math.min(maxTotal, 5));
  }

  // Final fallback: return best few candidates instead of none.
  unique.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return unique.slice(0, Math.min(maxTotal, 3));
}

// ---------- Main API ----------

export async function searchLibraryForEnrichment(
  masterPrompt: string,
  gaps: AmbiguityGap[],
  config: EnrichmentConfig,
  domainId?: string,
): Promise<EnrichmentCandidate[]> {
  await ensurePrompts();

  const language = config.language ?? 'en';
  const maxPerGap = config.maxCandidatesPerGap ?? 3;
  const allCandidates: EnrichmentCandidate[] = [];

  const store = getVectorStore();
  const useVector = store && store.isReady();

  // Phase 1: Broad context search (first 500 chars of master prompt)
  const broadQuery = masterPrompt.slice(0, 500);
  if (useVector) {
    const broadResults = await vectorSearch(broadQuery, 5);
    allCandidates.push(...enrichFromResults(broadResults, 'GLOBAL', '', language));
  } else {
    allCandidates.push(...keywordMatch(broadQuery, 5, domainId));
  }

  // Phase 1.5: Optional LangExtract signal expansion (best-effort)
  try {
    const lx = await analyzeWithLangExtract(masterPrompt.slice(0, 4000), language);
    if (lx.enabled && lx.keywords.length > 0) {
      const lxQuery = lx.keywords.slice(0, 20).join(' ');
      if (useVector) {
        const lxResults = await vectorSearch(lxQuery, 4);
        allCandidates.push(...enrichFromResults(lxResults, 'GLOBAL', '', language));
      } else {
        allCandidates.push(...keywordMatch(lxQuery, 4, domainId));
      }
    }
  } catch {
    // LangExtract is optional; ignore failures.
  }

  // Phase 2: Gap-targeted search
  for (const gap of gaps) {
    if (useVector) {
      const gapResults = await vectorSearch(gap.searchQuery, maxPerGap);
      const enriched = enrichFromResults(gapResults, gap.section, gap.id, language);
      allCandidates.push(...enriched);
    } else {
      const fallback = keywordMatch(gap.searchQuery, maxPerGap, domainId);
      for (const c of fallback) {
        c.targetSection = gap.section;
        c.targetGapId = gap.id;
      }
      allCandidates.push(...fallback);
    }
  }

  return deduplicateAndRank(allCandidates, domainId, config);
}
