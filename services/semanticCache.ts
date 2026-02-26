/**
 * Semantic Cache + Prompt Fingerprinting
 * @see docs/PROMPT_LEADERSHIP_ROADMAP.md §7
 *
 * Intent + domain + framework + style profile + model → hash.
 * Session-based in-memory cache (MVP); ileride DB/Redis.
 */

import type { PromptResponse } from '../types';

export interface CacheEntry {
  fingerprint: string;
  response: PromptResponse;
  createdAt: number;
  hitCount: number;
  intent: string;
  domainId: string;
  framework: string;
  provider: string;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
}

/** Basit hash fonksiyonu (non-crypto, hızlı fingerprint) */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Prompt fingerprint üret.
 * Intent kelimelerini normalize et + domain + framework + provider → hash.
 */
export function generateFingerprint(
  intent: string,
  domainId: string,
  framework: string,
  provider: string,
  styleProfileId?: string
): string {
  // Normalize: lowercase, trim, remove punctuation, sort words (order-independent)
  const normalizedIntent = intent
    .toLowerCase()
    .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');

  const key = `${normalizedIntent}|${domainId}|${framework}|${provider}|${styleProfileId ?? ''}`;
  return simpleHash(key);
}

/**
 * Benzerlik skoru (Jaccard similarity, kelime bazlı).
 */
export function intentSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// --- In-memory cache ---

const MAX_CACHE_SIZE = 100;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 dakika
const SIMILARITY_THRESHOLD = 0.7; // Jaccard >= 0.7 → cache hit

let cache: Map<string, CacheEntry> = new Map();
let stats = { totalHits: 0, totalMisses: 0 };

/**
 * Cache'e bak: exact match (fingerprint) veya semantic match (similarity).
 */
export function cacheGet(
  intent: string,
  domainId: string,
  framework: string,
  provider: string,
  styleProfileId?: string
): CacheEntry | null {
  const fp = generateFingerprint(intent, domainId, framework, provider, styleProfileId);
  const now = Date.now();

  // 1) Exact match
  const exact = cache.get(fp);
  if (exact && (now - exact.createdAt) < CACHE_TTL_MS) {
    exact.hitCount++;
    stats.totalHits++;
    return exact;
  }

  // 2) Semantic match (benzer intent)
  for (const entry of cache.values()) {
    if (
      entry.domainId === domainId &&
      entry.framework === framework &&
      entry.provider === provider &&
      (now - entry.createdAt) < CACHE_TTL_MS
    ) {
      const sim = intentSimilarity(intent, entry.intent);
      if (sim >= SIMILARITY_THRESHOLD) {
        entry.hitCount++;
        stats.totalHits++;
        return entry;
      }
    }
  }

  stats.totalMisses++;
  return null;
}

/**
 * Cache'e yaz.
 */
export function cachePut(
  intent: string,
  domainId: string,
  framework: string,
  provider: string,
  response: PromptResponse,
  styleProfileId?: string
): void {
  const fp = generateFingerprint(intent, domainId, framework, provider, styleProfileId);

  // Eviction: en eski girişleri sil
  if (cache.size >= MAX_CACHE_SIZE) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
  }

  cache.set(fp, {
    fingerprint: fp,
    response,
    createdAt: Date.now(),
    hitCount: 0,
    intent,
    domainId,
    framework,
    provider,
  });
}

/**
 * Cache istatistikleri.
 */
export function getCacheStats(): CacheStats {
  const total = stats.totalHits + stats.totalMisses;
  return {
    totalEntries: cache.size,
    totalHits: stats.totalHits,
    totalMisses: stats.totalMisses,
    hitRate: total > 0 ? Math.round((stats.totalHits / total) * 100) : 0,
  };
}

/**
 * Cache temizle.
 */
export function cacheClear(): void {
  cache = new Map();
  stats = { totalHits: 0, totalMisses: 0 };
}
