/**
 * RAG Proxy Route'ları.
 * SK Python mikroservisine proxy yapar.
 *
 * POST /v1/rag/ask    → SK /rag/ask
 * POST /v1/rag/search → SK /rag/search
 * GET  /v1/rag/health → SK /health
 */

import { Router } from 'express';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { apiRateLimiter } from '../middleware/rateLimit';
import { optionalApiKey } from '../middleware/auth';

const router = Router();
const withKey = [optionalApiKey];

const SK_URL = process.env.SK_SERVICE_URL ?? 'http://localhost:4200';

async function proxyToSK(
  skPath: string,
  method: 'GET' | 'POST',
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const url = `${SK_URL}${skPath}`;
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body && method === 'POST') {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({ error: 'Invalid response from SK service' }));
  return { status: res.status, data };
}

/** POST /v1/rag/ask — RAG sentezli yanıt */
router.post('/rag/ask', ...withKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  try {
    const { query, topK, language } = req.body ?? {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query (string) required' });
    }
    const result = await proxyToSK('/rag/ask', 'POST', { query, topK, language });
    res.status(result.status).json(result.data);
  } catch (e: any) {
    if (e?.cause?.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'SK RAG service not available',
        code: 'SK_SERVICE_DOWN',
        hint: 'Start SK service: cd sk-service && uvicorn main:app --port 4200',
      });
    }
    res.status(500).json({ error: e?.message ?? 'RAG request failed' });
  }
});

/** POST /v1/rag/search — Zenginleştirilmiş arama */
router.post('/rag/search', ...withKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  try {
    const { query, topK } = req.body ?? {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query (string) required' });
    }
    const result = await proxyToSK('/rag/search', 'POST', { query, topK });
    res.status(result.status).json(result.data);
  } catch (e: any) {
    if (e?.cause?.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'SK RAG service not available', code: 'SK_SERVICE_DOWN' });
    }
    res.status(500).json({ error: e?.message ?? 'RAG search failed' });
  }
});

/** GET /v1/rag/health — SK servis durumu */
router.get('/rag/health', ...withKey, apiRateLimiter, requireAnyAuth, async (_req, res) => {
  try {
    const result = await proxyToSK('/health', 'GET');
    res.status(result.status).json(result.data);
  } catch (e: any) {
    if (e?.cause?.code === 'ECONNREFUSED') {
      return res.json({ status: 'down', service: 'sk-rag', error: 'Connection refused' });
    }
    res.status(500).json({ error: e?.message ?? 'Health check failed' });
  }
});

export default router;
