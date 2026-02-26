/**
 * Embedding servisi — OpenAI + Ollama desteği.
 *
 * Env:
 *   EMBEDDING_PROVIDER = 'openai' | 'ollama'  (varsayılan: openai)
 *   OPENAI_API_KEY                             (openai için)
 *   OLLAMA_URL          = 'http://localhost:11434' (ollama sunucu adresi)
 *   OLLAMA_EMBED_MODEL  = 'nomic-embed-text'      (ollama embedding modeli)
 *
 * Cache: data/prompt-embeddings-{provider}.json (provider başına ayrı)
 */

import fs from 'fs';
import path from 'path';

// ---------- Provider Config ----------

export type EmbeddingProvider = 'openai' | 'ollama';

function getProvider(): EmbeddingProvider {
  const p = (process.env.EMBEDDING_PROVIDER ?? 'openai').toLowerCase();
  return p === 'ollama' ? 'ollama' : 'openai';
}

// OpenAI config
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_MODEL = 'text-embedding-3-small';
const OPENAI_MAX_BATCH = 2048;

function getOpenAIKey(): string {
  return process.env.OPENAI_API_KEY ?? '';
}

// Ollama config
function getOllamaUrl(): string {
  return process.env.OLLAMA_URL ?? 'http://localhost:11434';
}

function getOllamaModel(): string {
  return process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text';
}

const OLLAMA_MAX_BATCH = 100;

// ---------- Dimension Lookup ----------

const KNOWN_DIMS: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
  'nomic-embed-text': 768,
  'mxbai-embed-large': 1024,
  'all-minilm': 384,
  'snowflake-arctic-embed': 1024,
  'bge-m3': 1024,
};

let detectedDim: number | null = null;

/** Embedding boyutu. Bilinen modeller için sabit, yoksa ilk üretimde tespit edilir. */
export function getEmbeddingDim(): number {
  if (detectedDim) return detectedDim;
  const provider = getProvider();
  const model = provider === 'ollama' ? getOllamaModel() : OPENAI_MODEL;
  return KNOWN_DIMS[model] ?? 0; // 0 = henüz bilinmiyor
}

// ---------- Cache ----------

type EmbeddingCache = Record<string, number[]>;
let cache: EmbeddingCache | null = null;
let currentCacheProvider: string | null = null;

function getCachePath(): string {
  const provider = getProvider();
  const model = provider === 'ollama' ? getOllamaModel() : OPENAI_MODEL;
  const slug = `${provider}-${model}`.replace(/[^a-z0-9-]/gi, '_');
  return path.resolve(process.cwd(), 'data', `prompt-embeddings-${slug}.json`);
}

/** Eski cache path (backward compat — openai default) */
const LEGACY_CACHE = path.resolve(process.cwd(), 'data', 'prompt-embeddings.json');

function loadCache(): EmbeddingCache {
  const cp = getCachePath();
  if (cache && currentCacheProvider === cp) return cache;

  currentCacheProvider = cp;
  try {
    // Yeni format
    if (fs.existsSync(cp)) {
      cache = JSON.parse(fs.readFileSync(cp, 'utf-8'));
      return cache!;
    }
    // Legacy openai cache migration
    if (getProvider() === 'openai' && fs.existsSync(LEGACY_CACHE)) {
      cache = JSON.parse(fs.readFileSync(LEGACY_CACHE, 'utf-8'));
      // Yeni dosyaya yaz
      saveCache();
      return cache!;
    }
  } catch {
    // corrupt — start fresh
  }
  cache = {};
  return cache;
}

function saveCache(): void {
  if (!cache) return;
  const cp = getCachePath();
  const dir = path.dirname(cp);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(cp, JSON.stringify(cache), 'utf-8');
}

// ---------- OpenAI Backend ----------

async function openaiEmbed(texts: string[]): Promise<number[][]> {
  const apiKey = getOpenAIKey();
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: OPENAI_MODEL, input: texts }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI Embeddings API ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const items: Array<{ embedding: number[]; index: number }> = data?.data ?? [];
  // Sort by index (OpenAI returns sorted but just in case)
  items.sort((a, b) => a.index - b.index);
  return items.map((i) => i.embedding);
}

// ---------- Ollama Backend ----------

async function ollamaEmbed(texts: string[]): Promise<number[][]> {
  const url = `${getOllamaUrl()}/api/embed`;
  const model = getOllamaModel();

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama Embed API ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const embeddings: number[][] = data?.embeddings;
  if (!embeddings || !Array.isArray(embeddings)) {
    throw new Error('Unexpected Ollama embed response format');
  }
  return embeddings;
}

// ---------- Unified API ----------

async function embedBatch(texts: string[]): Promise<number[][]> {
  const provider = getProvider();
  if (provider === 'ollama') {
    return ollamaEmbed(texts);
  }
  return openaiEmbed(texts);
}

function getMaxBatch(): number {
  return getProvider() === 'ollama' ? OLLAMA_MAX_BATCH : OPENAI_MAX_BATCH;
}

/** Tek metin için embedding üret (cache'li) */
export async function generateEmbedding(text: string): Promise<number[]> {
  const c = loadCache();
  if (c[text]) return c[text];

  const [vector] = await embedBatch([text]);

  // Auto-detect dim
  if (!detectedDim && vector) detectedDim = vector.length;

  c[text] = vector;
  saveCache();
  return vector;
}

/** Toplu embedding üret (batch, cache'li) */
export async function generateEmbeddings(
  texts: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<number[][]> {
  const c = loadCache();
  const results: number[][] = new Array(texts.length);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    if (c[texts[i]]) {
      results[i] = c[texts[i]];
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(texts[i]);
    }
  }

  if (uncachedTexts.length === 0) {
    onProgress?.(texts.length, texts.length);
    return results;
  }

  let done = texts.length - uncachedTexts.length;
  onProgress?.(done, texts.length);

  const maxBatch = getMaxBatch();

  for (let start = 0; start < uncachedTexts.length; start += maxBatch) {
    const batch = uncachedTexts.slice(start, start + maxBatch);
    const vectors = await embedBatch(batch);

    for (let j = 0; j < vectors.length; j++) {
      const globalIdx = uncachedIndices[start + j];
      results[globalIdx] = vectors[j];
      c[uncachedTexts[start + j]] = vectors[j];
    }

    // Auto-detect dim
    if (!detectedDim && vectors[0]) detectedDim = vectors[0].length;

    done += batch.length;
    onProgress?.(done, texts.length);
  }

  saveCache();
  return results;
}

/** Cache'deki tüm embedding'leri döndür */
export function getCachedEmbeddings(): EmbeddingCache {
  return loadCache();
}

/** Cache'de kaç embedding var? */
export function getCacheSize(): number {
  return Object.keys(loadCache()).length;
}

/** Aktif provider bilgisi */
export function getProviderInfo(): { provider: EmbeddingProvider; model: string; dim: number } {
  const provider = getProvider();
  const model = provider === 'ollama' ? getOllamaModel() : OPENAI_MODEL;
  return { provider, model, dim: getEmbeddingDim() };
}

export { getCachePath as CACHE_PATH_FN };

// Backward compat — EMBEDDING_DIM ve CACHE_PATH
export const EMBEDDING_DIM = 0; // deprecated, use getEmbeddingDim()
export const CACHE_PATH = LEGACY_CACHE; // deprecated, use getCachePath()
