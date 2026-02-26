/**
 * Hybrid Vector Store — Hot cache (in-memory LRU) + Cold store (pgvector).
 *
 * Architecture:
 *   Query → Hot Cache (top 500 most-queried, 15m TTL)
 *             ↓ miss
 *           pgvector (PostgreSQL, full index)
 *             ↓ cold start
 *           Embedding generation (lazy)
 *
 * Writes go to BOTH stores (write-through).
 * Reads check hot cache first, fall back to pgvector.
 */

import type { VectorDoc, SearchResult, VectorStoreBackend } from './vectorStore';

// ── LRU Cache Entry ────────────────────────────────────────────────────────

interface CacheEntry {
  queryKey: string;       // Hash of query vector (first 8 dims as key)
  results: SearchResult[];
  topK: number;
  createdAt: number;
  hitCount: number;
}

// ── Configuration ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  /** Max cached query results */
  maxCacheEntries: 500,
  /** Cache TTL in milliseconds (15 minutes) */
  cacheTtlMs: 15 * 60 * 1000,
  /** Max documents to keep in hot memory for upserts */
  maxHotDocs: 2000,
};

// ── Hybrid Store ───────────────────────────────────────────────────────────

export class HybridStore implements VectorStoreBackend {
  readonly name = 'hybrid';
  private primary: VectorStoreBackend;        // pgvector
  private fallback: VectorStoreBackend;       // in-memory (for when pgvector unavailable)
  private queryCache = new Map<string, CacheEntry>();
  private config: typeof DEFAULT_CONFIG;
  private ready = false;
  private usePrimary = true;

  constructor(
    primary: VectorStoreBackend,
    fallback: VectorStoreBackend,
    config?: Partial<typeof DEFAULT_CONFIG>,
  ) {
    this.primary = primary;
    this.fallback = fallback;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async init(): Promise<void> {
    // Try primary (pgvector)
    try {
      await this.primary.init();
      this.usePrimary = true;
      console.log(`[HybridStore] Primary (${this.primary.name}) initialized`);
    } catch (e: any) {
      console.warn(`[HybridStore] Primary (${this.primary.name}) unavailable: ${e.message}`);
      this.usePrimary = false;
    }

    // Always init fallback
    try {
      await this.fallback.init();
      console.log(`[HybridStore] Fallback (${this.fallback.name}) initialized`);
    } catch (e: any) {
      console.error(`[HybridStore] Fallback init failed: ${e.message}`);
    }

    this.ready = true;
  }

  async upsert(docs: VectorDoc[]): Promise<number> {
    let count = 0;

    // Write-through: write to both stores
    if (this.usePrimary && this.primary.isReady()) {
      try {
        count = await this.primary.upsert(docs);
      } catch (e: any) {
        console.warn(`[HybridStore] Primary upsert failed: ${e.message}`);
      }
    }

    // Always update fallback
    if (this.fallback.isReady()) {
      try {
        const fallbackCount = await this.fallback.upsert(docs);
        if (count === 0) count = fallbackCount;
      } catch (e: any) {
        console.warn(`[HybridStore] Fallback upsert failed: ${e.message}`);
      }
    }

    // Invalidate query cache on writes
    this.queryCache.clear();

    return count;
  }

  async search(queryVector: number[], topK: number): Promise<SearchResult[]> {
    // 1. Check query cache
    const cacheKey = this.vectorKey(queryVector, topK);
    const cached = this.queryCache.get(cacheKey);

    if (cached && (Date.now() - cached.createdAt) < this.config.cacheTtlMs) {
      cached.hitCount++;
      return cached.results;
    }

    // 2. Try primary (pgvector)
    let results: SearchResult[] = [];
    if (this.usePrimary && this.primary.isReady()) {
      try {
        results = await this.primary.search(queryVector, topK);
      } catch (e: any) {
        console.warn(`[HybridStore] Primary search failed, falling back: ${e.message}`);
      }
    }

    // 3. Fallback to in-memory
    if (results.length === 0 && this.fallback.isReady()) {
      results = await this.fallback.search(queryVector, topK);
    }

    // 4. Cache results
    if (results.length > 0) {
      this.cacheResult(cacheKey, results, topK);
    }

    return results;
  }

  count(): number {
    if (this.usePrimary && this.primary.isReady()) {
      return this.primary.count();
    }
    return this.fallback.count();
  }

  isReady(): boolean {
    return this.ready && (this.primary.isReady() || this.fallback.isReady());
  }

  // ── Cache Helpers ──────────────────────────────────────────────────────

  /** Generate a cache key from query vector + topK */
  private vectorKey(vec: number[], topK: number): string {
    // Use first 16 dimensions as a fast fingerprint
    const prefix = vec.slice(0, 16).map(v => v.toFixed(4)).join(',');
    return `${prefix}:${topK}`;
  }

  /** Store query results in cache, evicting LRU if needed */
  private cacheResult(key: string, results: SearchResult[], topK: number): void {
    // Evict if at capacity (remove least recently used)
    if (this.queryCache.size >= this.config.maxCacheEntries) {
      let lruKey = '';
      let lruHit = Infinity;
      let lruTime = Infinity;
      for (const [k, entry] of this.queryCache) {
        if (entry.hitCount < lruHit || (entry.hitCount === lruHit && entry.createdAt < lruTime)) {
          lruKey = k;
          lruHit = entry.hitCount;
          lruTime = entry.createdAt;
        }
      }
      if (lruKey) this.queryCache.delete(lruKey);
    }

    this.queryCache.set(key, {
      queryKey: key,
      results,
      topK,
      createdAt: Date.now(),
      hitCount: 0,
    });
  }

  /** Clear the query cache */
  clearCache(): void {
    this.queryCache.clear();
  }

  /** Get cache statistics */
  getCacheStats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.queryCache.size,
      maxSize: this.config.maxCacheEntries,
      ttlMs: this.config.cacheTtlMs,
    };
  }

  /** Check if primary store is active */
  isPrimaryActive(): boolean {
    return this.usePrimary && this.primary.isReady();
  }

  /** Get the active backend name */
  getActiveBackend(): string {
    if (this.usePrimary && this.primary.isReady()) return this.primary.name;
    return this.fallback.name;
  }
}
