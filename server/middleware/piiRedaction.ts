/**
 * PII Redaction Middleware — Request/response body ve audit log metadata'sında
 * kişisel veri (email, telefon, TC kimlik, kredi kartı) maskeleme.
 *
 * GDPR/SOC2 uyumluluğu için audit loglarına PII sızmaz.
 */

// ── PII Patterns ─────────────────────────────────────────────────────────────

const PII_PATTERNS: { name: string; pattern: RegExp; replacement: string }[] = [
  {
    name: 'email',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[EMAIL_REDACTED]',
  },
  {
    name: 'phone_international',
    pattern: /\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
    replacement: '[PHONE_REDACTED]',
  },
  {
    name: 'credit_card',
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: '[CC_REDACTED]',
  },
  {
    name: 'ssn_us',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[SSN_REDACTED]',
  },
  {
    name: 'tc_kimlik',
    pattern: /\b[1-9]\d{10}\b/g,
    replacement: '[TC_REDACTED]',
  },
  {
    name: 'ip_address',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[IP_REDACTED]',
  },
];

// ── Core Redaction Function ──────────────────────────────────────────────────

/**
 * Verilen string'deki PII pattern'lerini maskeler.
 * @param text  - Taranacak metin
 * @param level - 'standard' (email, phone, CC) veya 'strict' (tümü)
 */
export function redactPII(text: string, level: 'standard' | 'strict' = 'standard'): string {
  if (!text || typeof text !== 'string') return text;

  const patterns = level === 'strict'
    ? PII_PATTERNS
    : PII_PATTERNS.filter(p => ['email', 'phone_international', 'credit_card', 'ssn_us'].includes(p.name));

  let result = text;
  for (const { pattern, replacement } of patterns) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Object içindeki string değerlerde PII redaction uygular (recursive).
 * Audit log metadata gibi nested objelerde kullanılır.
 */
export function redactPIIFromObject<T>(obj: T, level: 'standard' | 'strict' = 'standard'): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return redactPII(obj, level) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactPIIFromObject(item, level)) as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Skip redaction for fields that are known safe (IDs, timestamps, etc.)
      if (['id', 'orgId', 'userId', 'runId', 'promptId', 'createdAt', 'updatedAt', 'version'].includes(key)) {
        result[key] = value;
      } else {
        result[key] = redactPIIFromObject(value, level);
      }
    }
    return result as T;
  }

  return obj;
}

/**
 * PII olup olmadığını tespit eder (redact etmeden).
 * Uyarı veya audit flag için kullanılır.
 */
export function containsPII(text: string): { hasPII: boolean; types: string[] } {
  if (!text || typeof text !== 'string') return { hasPII: false, types: [] };

  const found: string[] = [];
  for (const { name, pattern } of PII_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      found.push(name);
    }
    pattern.lastIndex = 0;
  }

  return { hasPII: found.length > 0, types: found };
}
