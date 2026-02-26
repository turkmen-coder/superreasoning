/**
 * KeyManager güvenlik testleri — OWASP uyumluluk.
 * - Geçersiz key → 401 (INVALID_API_KEY)
 * - Eksik key → MISSING_API_KEY
 * - Limit aşımı → 429 (RATE_LIMIT_EXCEEDED)
 * - Timing-safe compare, key maskeleme
 */

import { describe, it, expect } from 'vitest';
import {
  secureCompare,
  maskKey,
  validateByokKey,
  validateManagedKey,
  validateApiKey,
} from '../../server/lib/keyManager';

describe('KeyManager — OWASP', () => {
  describe('secureCompare', () => {
    it('returns true for identical strings', () => {
      expect(secureCompare('secret-key', 'secret-key')).toBe(true);
    });
    it('returns false for different strings (same length)', () => {
      expect(secureCompare('secret-key', 'secret-key-x')).toBe(false);
      expect(secureCompare('aaa', 'aab')).toBe(false);
    });
    it('returns false for different length', () => {
      expect(secureCompare('ab', 'abc')).toBe(false);
    });
    it('returns false for non-strings', () => {
      expect(secureCompare('' as any, null as any)).toBe(false);
    });
  });

  describe('maskKey', () => {
    it('masks key for logging (first 4 + last 4)', () => {
      expect(maskKey('sk-1234567890abcdef')).toBe('sk-1…cdef');
    });
    it('returns *** for short key', () => {
      expect(maskKey('short')).toBe('***');
    });
    it('returns *** for empty', () => {
      expect(maskKey('')).toBe('***');
    });
  });

  describe('validateByokKey', () => {
    const validKeys = new Set(['valid-key-1', 'valid-key-2']);

    it('missing key → valid: false, code: MISSING_API_KEY', () => {
      const r = validateByokKey('', { validKeys });
      expect(r.valid).toBe(false);
      expect(r.code).toBe('MISSING_API_KEY');
    });
    it('invalid key → valid: false, code: INVALID_API_KEY', () => {
      const r = validateByokKey('wrong-key', { validKeys });
      expect(r.valid).toBe(false);
      expect(r.code).toBe('INVALID_API_KEY');
    });
    it('valid key → valid: true, mode: byok', () => {
      const r = validateByokKey('valid-key-1', { validKeys });
      expect(r.valid).toBe(true);
      expect(r.mode).toBe('byok');
    });
    it('valid key with orgId and usage under limit → valid: true', () => {
      const keyToOrg = new Map([['valid-key-1', 'org-123']]);
      const r = validateByokKey('valid-key-1', {
        validKeys,
        keyToOrg,
        maxRequestsPerMinute: 60,
        currentUsage: () => 10,
      });
      expect(r.valid).toBe(true);
      expect(r.orgId).toBe('org-123');
    });
    it('valid key but rate limit exceeded → valid: false, rateLimitExceeded: true', () => {
      const keyToOrg = new Map([['valid-key-1', 'org-123']]);
      const r = validateByokKey('valid-key-1', {
        validKeys,
        keyToOrg,
        maxRequestsPerMinute: 60,
        currentUsage: () => 60,
      });
      expect(r.valid).toBe(false);
      expect(r.rateLimitExceeded).toBe(true);
      expect(r.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('validateManagedKey', () => {
    const managedKeys = new Set(['managed-pro-key']);
    const req = { ip: '1.2.3.4', socket: { remoteAddress: '1.2.3.4' } } as any;

    it('invalid managed key → valid: false', () => {
      const r = validateManagedKey('wrong', req, { managedKeys });
      expect(r.valid).toBe(false);
    });
    it('valid managed key → valid: true, mode: managed', () => {
      const r = validateManagedKey('managed-pro-key', req, { managedKeys });
      expect(r.valid).toBe(true);
      expect(r.mode).toBe('managed');
    });
  });

  describe('validateApiKey (unified)', () => {
    it('falls back to BYOK when only byok options provided', () => {
      const r = validateApiKey('valid-key-1', {} as any, {
        byok: { validKeys: new Set(['valid-key-1']) },
      });
      expect(r.valid).toBe(true);
      expect(r.mode).toBe('byok');
    });
    it('invalid key → valid: false', () => {
      const r = validateApiKey('invalid', {} as any, {
        byok: { validKeys: new Set(['valid-key-1']) },
      });
      expect(r.valid).toBe(false);
    });
  });
});
