/**
 * Rate limiting middleware — OWASP uyumlu.
 * Dakika başına istek limiti; 429 + Retry-After header.
 * IPv6 bypass önlemek için ipKeyGenerator kullanılır (express-rate-limit 8+).
 */

import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

const WINDOW_MS = 60 * 1000; // 1 dakika
const DEFAULT_MAX = 60; // Free: 60/dk (geliştirme için yüksek)
const MAX_FREE = Number(process.env.RATE_LIMIT_FREE) || 60;
const MAX_PRO = Number(process.env.RATE_LIMIT_PRO) || 100;
const MAX_TEAM = Number(process.env.RATE_LIMIT_TEAM) || 300;
const MAX_GENERATE_FREE = Number(process.env.RATE_LIMIT_GENERATE_FREE) || 15;
const MAX_GENERATE_PRO = Number(process.env.RATE_LIMIT_GENERATE_PRO) || 60;
const MAX_GENERATE_TEAM = Number(process.env.RATE_LIMIT_GENERATE_TEAM) || 120;

/**
 * API key'e göre limit (req.apiKey varsa Pro, yoksa Free).
 * Not: Pro key'leri API_KEYS_PRO env'de tanımlanabilir.
 */
const PRO_KEYS = new Set(
  (process.env.API_KEYS_PRO ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
);

function getMaxForRequest(req: Request): number {
  // Plan-based limits from authenticated user
  const authUser = req.authUser;
  if (authUser?.plan === 'team') return MAX_TEAM;
  if (authUser?.plan === 'pro') return MAX_PRO;
  // Fallback to API key based
  const key = req.apiKey;
  if (key && PRO_KEYS.has(key)) return MAX_PRO;
  return MAX_FREE;
}

/**
 * Dinamik limit ile rate limiter.
 * standardHeaders: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 */
export const apiRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: (req) => getMaxForRequest(req) || DEFAULT_MAX,
  message: {
    error: 'Too many requests. Please retry later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true, // X-RateLimit-* headers
  legacyHeaders: false,
  handler: (_req, res, _next, options) => {
    res.status(429).json({
      error: options.message?.error ?? 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(WINDOW_MS / 1000),
    });
    res.setHeader('Retry-After', String(Math.ceil(WINDOW_MS / 1000)));
  },
  keyGenerator: (req) => {
    const key = req.apiKey;
    if (key) return String(key);
    return ipKeyGenerator(req.ip ?? '0.0.0.0');
  },
});

/**
 * Sadece /generate için daha sıkı limit (varsayılan 15/dk).
 */
export const generateRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: (req) => {
    const authUser = req.authUser;
    if (authUser?.plan === 'team') return MAX_GENERATE_TEAM;
    if (authUser?.plan === 'pro') return MAX_GENERATE_PRO;
    const key = req.apiKey;
    if (key && PRO_KEYS.has(key)) return MAX_GENERATE_PRO;
    return MAX_GENERATE_FREE;
  },
  message: {
    error: 'Generate rate limit exceeded. Upgrade for higher limits.',
    code: 'GENERATE_RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res, _next, options) => {
    res.status(429).json({
      error: options.message?.error ?? 'Rate limit exceeded',
      code: 'GENERATE_RATE_LIMIT',
      retryAfter: Math.ceil(WINDOW_MS / 1000),
    });
    res.setHeader('Retry-After', String(Math.ceil(WINDOW_MS / 1000)));
  },
  keyGenerator: (req) => {
    const key = req.apiKey;
    if (key) return `gen:${key}`;
    return `gen:${ipKeyGenerator(req.ip ?? '0.0.0.0')}`;
  },
});
