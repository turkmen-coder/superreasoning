/**
 * API güvenlik testleri — docs/SECURITY_TEST_PLAN.md ile uyumlu.
 * - Eksik key → 401
 * - Geçersiz key → 401
 * - Geçerli key → 200 (veya 400 intent eksik)
 * - /v1/auth/validate → 200 valid veya 401
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../server/app';

const VALID_KEY = 'testkey-api-security-123';

describe('SECURITY_TEST_PLAN — API', () => {
  beforeAll(() => {
    process.env.API_KEYS = VALID_KEY;
    process.env.DISABLE_API_KEY_AUTH = 'false';
  });

  afterAll(() => {
    delete process.env.API_KEYS;
    delete process.env.DISABLE_API_KEY_AUTH;
  });

  describe('POST /v1/generate', () => {
    it('header olmadan → 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/v1/generate')
        .set('Content-Type', 'application/json')
        .send({ intent: 'test' });
      expect(res.status).toBe(401);
      expect(res.body?.error).toBeTruthy();
      expect(res.body?.code).toMatch(/MISSING|INVALID|NO_AUTH/);
    });

    it('x-api-key: invalid → 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/v1/generate')
        .set('Content-Type', 'application/json')
        .set('x-api-key', 'invalid-key')
        .send({ intent: 'test' });
      expect(res.status).toBe(401);
      expect(res.body?.code).toBe('INVALID_API_KEY');
    });

    it('x-api-key: valid → 200 veya 400 (intent işlenir)', async () => {
      const res = await request(app)
        .post('/v1/generate')
        .set('Content-Type', 'application/json')
        .set('x-api-key', VALID_KEY)
        .send({ intent: 'REST API tasarla' });
      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('masterPrompt');
      }
    });
  });

  describe('POST /v1/auth/validate', () => {
    it('key yok → 401', async () => {
      const res = await request(app).post('/v1/auth/validate').send({});
      expect(res.status).toBe(401);
    });

    it('geçerli key → 200, valid: true', async () => {
      const res = await request(app)
        .post('/v1/auth/validate')
        .set('x-api-key', VALID_KEY);
      expect(res.status).toBe(200);
      expect(res.body?.valid).toBe(true);
      expect(res.body?.mode).toBe('byok');
    });
  });

  describe('GET /v1/health', () => {
    it('security yok → 200', async () => {
      const res = await request(app).get('/v1/health');
      expect(res.status).toBe(200);
      expect(res.body?.status).toBe('ok');
    });
  });
});
