/**
 * Semantik Arama API Route'ları.
 * POST /v1/prompts/semantic-search — Doğal dil sorgusu ile prompt arama
 * GET  /v1/prompts/vector-stats   — Vektör koleksiyon istatistikleri
 * POST /v1/prompts/seed-vectors   — Embedding üret + vektör DB doldur (admin)
 */

import { Router } from 'express';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { apiRateLimiter } from '../middleware/rateLimit';
import { optionalApiKey } from '../middleware/auth';
import { generateEmbedding, generateEmbeddings, getCacheSize, getProviderInfo } from '../lib/embeddings';
import { getVectorStore, initVectorStore } from '../lib/vectorStore';
import { loadPromptCorpus, getPromptCorpusTarget } from '../lib/promptCorpus';
import type { VectorDoc } from '../lib/vectorStore';

const router = Router();
const withKey = [optionalApiKey];

/** POST /v1/prompts/semantic-search */
router.post('/prompts/semantic-search', ...withKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  try {
    const { query, topK = 10, language } = req.body ?? {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query (string) required' });
    }

    const store = getVectorStore();
    if (!store || !store.isReady() || store.count() === 0) {
      return res.status(503).json({
        error: 'Vector store not ready. Run POST /v1/prompts/seed-vectors first.',
        code: 'VECTOR_STORE_NOT_READY',
      });
    }

    const k = Math.min(Math.max(1, Number(topK) || 10), 50);
    const queryVector = await generateEmbedding(query);
    let results = await store.search(queryVector, k);

    // Dil filtresi
    if (language === 'tr' || language === 'en') {
      results = results.filter((r) => r.metadata.lang === language);
    }

    res.json({
      query,
      topK: k,
      results: results.map((r) => ({
        id: r.id,
        score: Math.round(r.score * 10000) / 10000,
        name: r.metadata.name,
        category: r.metadata.category,
        tags: r.metadata.tags,
        lang: r.metadata.lang,
      })),
      total: results.length,
      backend: store.name,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Semantic search failed' });
  }
});

/** GET /v1/prompts/vector-stats */
router.get('/prompts/vector-stats', ...withKey, apiRateLimiter, requireAnyAuth, async (_req, res) => {
  try {
    const store = getVectorStore();
    const embedding = getProviderInfo();
    res.json({
      ready: store?.isReady() ?? false,
      backend: store?.name ?? 'none',
      vectorCount: store?.count() ?? 0,
      embeddingCacheSize: getCacheSize(),
      embedding,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Stats failed' });
  }
});

/** POST /v1/prompts/seed-vectors */
router.post('/prompts/seed-vectors', ...withKey, apiRateLimiter, requireAnyAuth, async (_req, res) => {
  try {
    const target = getPromptCorpusTarget();
    const corpus = await loadPromptCorpus(target);

    const store = await initVectorStore();

    // Embedding text oluştur
    const texts: string[] = [];
    const promptMap = new Map<
      string,
      { id: string; text: string; metadata: VectorDoc['metadata'] }
    >();

    for (const p of corpus) {
      const text = `${p.promptEn} | ${p.nameEn} | ${p.tags.join(', ')}`;
      texts.push(text);
      promptMap.set(text, {
        id: p.id,
        text,
        metadata: {
          name: p.nameEn,
          category: p.categoryEn,
          tags: p.tags,
          lang: 'en',
        },
      });
    }

    // Toplu embedding üret
    const vectors = await generateEmbeddings(texts);

    // Store'a yükle
    const docs: VectorDoc[] = [];
    for (let i = 0; i < texts.length; i++) {
      const info = promptMap.get(texts[i]);
      if (info && vectors[i]) {
        docs.push({ id: info.id, vector: vectors[i], metadata: info.metadata });
      }
    }

    const upserted = await store.upsert(docs);

    res.json({
      success: true,
      totalPrompts: corpus.length,
      targetPrompts: target,
      vectorsUpserted: upserted,
      backend: store.name,
      embeddingCacheSize: getCacheSize(),
      embedding: getProviderInfo(),
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Seeding failed' });
  }
});

export default router;
