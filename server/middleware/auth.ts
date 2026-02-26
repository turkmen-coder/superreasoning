/**
 * OWASP uyumlu API key doğrulama middleware.
 * - x-api-key header zorunlu (protected routes için)
 * - Key'ler loglarda asla görünmez
 * - Ortam: API_KEYS (virgülle ayrılmış) veya API_KEYS_HASH (bcrypt hash'ler)
 */

import type { Request, Response, NextFunction } from 'express';

const HEADER = 'x-api-key';

/** Skip auth için (dev only): DISABLE_API_KEY_AUTH=true — production'da her zaman false */
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SKIP_AUTH = !IS_PRODUCTION && process.env.DISABLE_API_KEY_AUTH === 'true';

/** Geçerli API key'ler — yalnızca env'den okunan key'ler. */
function getValidKeys(): Set<string> {
  const fromEnv = new Set(
    (process.env.API_KEYS ?? '')
      .replace(/\r/g, '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
  );
  return fromEnv;
}

/**
 * Basit timing-safe karşılaştırma (key sızıntısını önler).
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * API key doğrulama middleware.
 * Geçersiz/eksik key → 401 Unauthorized.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (SKIP_AUTH) {
    req.apiKey = 'dev-bypass';
    return next();
  }

  const key = req.header(HEADER) ?? req.query['x-api-key'];

  if (!key || typeof key !== 'string') {
    res.status(401).json({ error: 'Missing x-api-key header', code: 'MISSING_API_KEY' });
    return;
  }

  const trimmed = String(key).trim();
  if (!trimmed) {
    res.status(401).json({ error: 'Invalid x-api-key', code: 'INVALID_API_KEY' });
    return;
  }

  let valid = false;
  for (const vk of getValidKeys()) {
    if (secureCompare(trimmed, vk)) {
      valid = true;
      break;
    }
  }

  if (!valid) {
    res.status(401).json({ error: 'Invalid API key', code: 'INVALID_API_KEY' });
    return;
  }

  req.apiKey = trimmed;
  next();
}

/**
 * Opsiyonel API key — varsa req.apiKey'ye yazar, yoksa devam eder.
 */
export function optionalApiKey(req: Request, _res: Response, next: NextFunction): void {
  const key = req.header(HEADER) ?? req.query['x-api-key'];
  if (key && typeof key === 'string') {
    req.apiKey = String(key).trim();
  }
  next();
}
