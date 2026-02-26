/**
 * Vektör Store — zvec wrapper + in-memory cosine similarity fallback.
 * ~1000 prompt embedding'i için semantik arama.
 */

import fs from 'fs';
import path from 'path';
import { getEmbeddingDim, getCachedEmbeddings } from './embeddings';

// ---------- Interfaces ----------

export interface VectorDoc {
  id: string;
  vector: number[];
  metadata: {
    name: string;
    category: string;
    tags: string[];
    lang: 'tr' | 'en';
  };
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: VectorDoc['metadata'];
}

interface VectorStoreBackend {
  init(): Promise<void>;
  upsert(docs: VectorDoc[]): Promise<number>;
  search(queryVector: number[], topK: number): Promise<SearchResult[]>;
  count(): number;
  isReady(): boolean;
  name: string;
}

// ---------- In-Memory Cosine Similarity ----------

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

class InMemoryStore implements VectorStoreBackend {
  name = 'in-memory';
  private docs: VectorDoc[] = [];
  private ready = false;

  async init(): Promise<void> {
    this.ready = true;
  }

  async upsert(docs: VectorDoc[]): Promise<number> {
    for (const doc of docs) {
      const idx = this.docs.findIndex((d) => d.id === doc.id);
      if (idx >= 0) {
        this.docs[idx] = doc;
      } else {
        this.docs.push(doc);
      }
    }
    return docs.length;
  }

  async search(queryVector: number[], topK: number): Promise<SearchResult[]> {
    const scored = this.docs.map((doc) => ({
      id: doc.id,
      score: cosineSimilarity(queryVector, doc.vector),
      metadata: doc.metadata,
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  count(): number {
    return this.docs.length;
  }

  isReady(): boolean {
    return this.ready;
  }
}

// ---------- Zvec Backend ----------

class ZvecStore implements VectorStoreBackend {
  name = 'zvec';
  private collection: any = null;
  private metadataMap = new Map<string, VectorDoc['metadata']>();
  private dataDir: string;

  constructor() {
    this.dataDir = path.resolve(process.cwd(), 'data', 'zvec-prompts');
  }

  async init(): Promise<void> {
    const zvec = await import('@zvec/zvec');
    const dim = getEmbeddingDim() || 1536; // fallback if unknown

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const schema = new zvec.ZVecCollectionSchema({
      name: 'prompts',
      vectors: {
        name: 'embedding',
        dataType: zvec.ZVecDataType.VECTOR_FP32,
        dimension: dim,
        indexParams: {
          indexType: zvec.ZVecIndexType.HNSW,
          metricType: zvec.ZVecMetricType.COSINE,
        },
      },
    });

    // Try opening existing, else create new
    try {
      this.collection = zvec.ZVecOpen(this.dataDir);
    } catch {
      this.collection = zvec.ZVecCreateAndOpen(this.dataDir, schema);
    }
  }

  async upsert(docs: VectorDoc[]): Promise<number> {
    if (!this.collection) throw new Error('zvec not initialized');

    const zvecDocs = docs.map((d) => ({
      id: d.id,
      vectors: { embedding: d.vector },
    }));

    this.collection.upsertSync(zvecDocs);

    for (const d of docs) {
      this.metadataMap.set(d.id, d.metadata);
    }
    return docs.length;
  }

  async search(queryVector: number[], topK: number): Promise<SearchResult[]> {
    if (!this.collection) throw new Error('zvec not initialized');

    const results = this.collection.querySync({
      fieldName: 'embedding',
      vector: queryVector,
      topk: topK,
    });

    return (results ?? []).map((r: any) => ({
      id: r.id,
      score: r.score ?? 0,
      metadata: this.metadataMap.get(r.id) ?? { name: '', category: '', tags: [], lang: 'en' as const },
    }));
  }

  count(): number {
    return this.metadataMap.size;
  }

  isReady(): boolean {
    return this.collection !== null;
  }
}

// ---------- Singleton Manager ----------

let store: VectorStoreBackend | null = null;

/**
 * Initialize the vector store with priority:
 *   1. Hybrid (pgvector + in-memory hot cache)  — if SR_VECTOR_STORE=pgvector
 *   2. Zvec (local HNSW index)                  — if @zvec/zvec available
 *   3. In-memory cosine similarity              — fallback
 */
export async function initVectorStore(): Promise<VectorStoreBackend> {
  if (store?.isReady()) return store;

  const preferPgvector = process.env.SR_VECTOR_STORE === 'pgvector';

  // 1. Try pgvector hybrid mode
  if (preferPgvector) {
    try {
      const { getPool } = await import('../db/client');
      const pool = getPool();
      if (pool) {
        const { PgVectorStore } = await import('./pgvectorStore');
        const { HybridStore } = await import('./hybridStore');

        const dim = getEmbeddingDim() || 1536;
        const pgStore = new PgVectorStore(pool, dim);
        const memFallback = new InMemoryStore();
        await memFallback.init();

        const hybrid = new HybridStore(pgStore, memFallback);
        await hybrid.init();
        store = hybrid;
        console.log('[VectorStore] Hybrid (pgvector + in-memory cache) initialized');
        return store;
      }
    } catch (e: any) {
      console.warn(`[VectorStore] pgvector unavailable (${e.message}), trying fallback...`);
    }
  }

  // 2. Try zvec
  try {
    const zvecStore = new ZvecStore();
    await zvecStore.init();
    store = zvecStore;
    console.log('[VectorStore] zvec backend initialized');
  } catch (e: any) {
    console.warn(`[VectorStore] zvec unavailable (${e.message}), using in-memory fallback`);
    const memStore = new InMemoryStore();
    await memStore.init();
    store = memStore;
    console.log('[VectorStore] in-memory backend initialized');
  }

  return store;
}

export function getVectorStore(): VectorStoreBackend | null {
  return store;
}

/** Persist edilmiş embedding cache'den vektör store'u doldur */
export async function loadFromEmbeddingCache(
  promptMap: Map<string, { id: string; text: string; metadata: VectorDoc['metadata'] }>,
): Promise<number> {
  const s = store ?? (await initVectorStore());

  // getCachedEmbeddings provider'a göre doğru cache dosyasını yükler
  const embeddings = getCachedEmbeddings();
  if (!embeddings || Object.keys(embeddings).length === 0) return 0;

  const docs: VectorDoc[] = [];
  for (const [_text, info] of promptMap) {
    const vector = embeddings[_text];
    if (vector && Array.isArray(vector) && vector.length > 0) {
      docs.push({ id: info.id, vector, metadata: info.metadata });
    }
  }

  if (docs.length > 0) {
    await s.upsert(docs);
  }

  return docs.length;
}

export type { VectorStoreBackend };
