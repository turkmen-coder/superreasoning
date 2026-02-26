/**
 * API Key Yönetimi — BYOK + Managed, OWASP uyumlu.
 * - Key'ler loglarda/yanıtlarda asla düz metin görünmez.
 * - Timing-safe karşılaştırma (enumeration önleme).
 * - BYOK: doğrulama + org/user limiti.
 * - Managed: platform key + metered billing / abuse (IP, usage spike).
 * @see docs/SAAS_TRANSFORMATION.md, OWASP API Security Top 10
 */

import type { Request } from 'express';

export type KeyMode = 'byok' | 'managed';

export interface KeyValidationResult {
  valid: boolean;
  mode: KeyMode;
  orgId?: string;
  userId?: string;
  plan?: 'free' | 'pro' | 'team';
  /** 429 için: limit aşıldı */
  rateLimitExceeded?: boolean;
  /** Hata kodu (401/429 için) */
  code?: string;
}

/** OWASP: Timing-safe string karşılaştırma — key enumeration önleme */
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  const len = a.length;
  for (let i = 0; i < len; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Key'i log/response'da maskele (OWASP: sensitive data exposure) */
export function maskKey(key: string): string {
  if (!key || key.length < 8) return '***';
  return key.slice(0, 4) + '…' + key.slice(-4);
}

/**
 * BYOK: Kullanıcı key doğrulama.
 * - Key geçerli mi (format + DB/env lookup).
 * - Org/user limiti aşıldı mı (usage tablosu veya rate limiter).
 */
export interface ByokValidationOptions {
  /** Geçerli key'ler (hash veya plain — production'da hash) */
  validKeys: Set<string>;
  /** Key → orgId eşlemesi (opsiyonel; DB'den de alınabilir) */
  keyToOrg?: Map<string, string>;
  /** Org bazlı dakikalık limit (BYOK) */
  maxRequestsPerMinute?: number;
  /** Mevcut kullanım (orgId → bu dakikadaki istek sayısı) */
  currentUsage?: (orgId: string) => number;
}

export function validateByokKey(
  rawKey: string,
  options: ByokValidationOptions
): KeyValidationResult {
  const trimmed = typeof rawKey === 'string' ? rawKey.trim() : '';
  if (!trimmed) {
    return { valid: false, mode: 'byok', code: 'MISSING_API_KEY' };
  }

  let matched = false;
  let orgId: string | undefined;
  for (const validKey of options.validKeys) {
    if (secureCompare(trimmed, validKey)) {
      matched = true;
      orgId = options.keyToOrg?.get(validKey);
      break;
    }
  }
  if (!matched) {
    return { valid: false, mode: 'byok', code: 'INVALID_API_KEY' };
  }

  const maxPerMin = options.maxRequestsPerMinute ?? 60;
  const usage = orgId && options.currentUsage ? options.currentUsage(orgId) : 0;
  if (usage >= maxPerMin) {
    return {
      valid: false,
      mode: 'byok',
      orgId,
      rateLimitExceeded: true,
      code: 'RATE_LIMIT_EXCEEDED',
    };
  }

  return { valid: true, mode: 'byok', orgId, plan: 'free' };
}

/**
 * Managed: Platform key ile kullanım (Pro/Team).
 * - Platform key'i env'den; org quota + abuse kontrol (IP/usage spike).
 */
export interface ManagedValidationOptions {
  /** Platform (Managed) key'leri */
  managedKeys: Set<string>;
  /** Key → { orgId, plan } */
  keyToOrgPlan?: Map<string, { orgId: string; plan: 'pro' | 'team' }>;
  /** Plan bazlı limit (dakika) */
  limits?: { pro: number; team: number };
  currentUsage?: (orgId: string) => number;
  /** Abuse: IP başına ek limit (DDoS önleme) */
  maxPerIpPerMinute?: number;
  ipUsage?: (ip: string) => number;
}

export function validateManagedKey(
  rawKey: string,
  req: Request,
  options: ManagedValidationOptions
): KeyValidationResult {
  const trimmed = typeof rawKey === 'string' ? rawKey.trim() : '';
  if (!trimmed) {
    return { valid: false, mode: 'managed', code: 'MISSING_API_KEY' };
  }

  let matched = false;
  let orgId: string | undefined;
  let plan: 'free' | 'pro' | 'team' = 'free';
  for (const mk of options.managedKeys) {
    if (secureCompare(trimmed, mk)) {
      matched = true;
      const meta = options.keyToOrgPlan?.get(mk);
      if (meta) {
        orgId = meta.orgId;
        plan = meta.plan;
      }
      break;
    }
  }
  if (!matched) {
    return { valid: false, mode: 'managed', code: 'INVALID_API_KEY' };
  }

  const limits = options.limits ?? { pro: 100, team: 300 };
  const maxOrg = plan === 'team' ? limits.team : limits.pro;
  if (orgId && options.currentUsage && options.currentUsage(orgId) >= maxOrg) {
    return {
      valid: false,
      mode: 'managed',
      orgId,
      plan,
      rateLimitExceeded: true,
      code: 'RATE_LIMIT_EXCEEDED',
    };
  }

  const maxIp = options.maxPerIpPerMinute ?? 60;
  const ip = (req.ip ?? req.socket?.remoteAddress ?? '').toString();
  if (ip && options.ipUsage && options.ipUsage(ip) >= maxIp) {
    return {
      valid: false,
      mode: 'managed',
      orgId,
      plan,
      rateLimitExceeded: true,
      code: 'ABUSE_IP_LIMIT',
    };
  }

  return { valid: true, mode: 'managed', orgId, plan };
}

/**
 * Birleşik doğrulama: Önce Managed, sonra BYOK.
 * OWASP: Tek bir validate noktası; 401/429 tutarlı yanıt.
 */
export function validateApiKey(
  rawKey: string,
  req: Request,
  options: {
    managed?: ManagedValidationOptions;
    byok?: ByokValidationOptions;
  }
): KeyValidationResult {
  if (options.managed && options.managed.managedKeys.size > 0) {
    const r = validateManagedKey(rawKey, req, options.managed);
    if (r.valid) return r;
    if (r.code === 'INVALID_API_KEY') {
      // Managed'da yoksa BYOK'a düş
    } else {
      return r; // rate limit vb.
    }
  }
  if (options.byok) {
    return validateByokKey(rawKey, options.byok);
  }
  return { valid: false, mode: 'byok', code: 'INVALID_API_KEY' };
}
