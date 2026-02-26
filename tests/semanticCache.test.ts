/**
 * Unit tests for services/semanticCache.ts
 * Tests generateFingerprint, intentSimilarity, cacheGet, cachePut, getCacheStats, cacheClear.
 */

import {
  generateFingerprint,
  intentSimilarity,
  cacheGet,
  cachePut,
  getCacheStats,
  cacheClear,
} from '../services/semanticCache';

const mockResponse = {
  masterPrompt: 'test prompt',
  reasoning: 'test reasoning',
} as any; // minimal mock for PromptResponse

beforeEach(() => {
  cacheClear();
});

describe('generateFingerprint', () => {
  it('should produce the same fingerprint for identical inputs', () => {
    const fp1 = generateFingerprint('build an API', 'backend', 'express', 'groq');
    const fp2 = generateFingerprint('build an API', 'backend', 'express', 'groq');
    expect(fp1).toBe(fp2);
  });

  it('should produce different fingerprints for different intents', () => {
    const fp1 = generateFingerprint('build an API', 'backend', 'express', 'groq');
    const fp2 = generateFingerprint('design a database', 'backend', 'express', 'groq');
    expect(fp1).not.toBe(fp2);
  });

  it('should produce different fingerprints for different domains', () => {
    const fp1 = generateFingerprint('build an API', 'backend', 'express', 'groq');
    const fp2 = generateFingerprint('build an API', 'frontend', 'express', 'groq');
    expect(fp1).not.toBe(fp2);
  });

  it('should produce different fingerprints for different providers', () => {
    const fp1 = generateFingerprint('build an API', 'backend', 'express', 'groq');
    const fp2 = generateFingerprint('build an API', 'backend', 'express', 'claude');
    expect(fp1).not.toBe(fp2);
  });

  it('should be word-order independent: "hello world" vs "world hello"', () => {
    const fp1 = generateFingerprint('hello world', 'domain', 'fw', 'provider');
    const fp2 = generateFingerprint('world hello', 'domain', 'fw', 'provider');
    expect(fp1).toBe(fp2);
  });

  it('should be case insensitive: "Hello" vs "hello"', () => {
    const fp1 = generateFingerprint('Hello World', 'domain', 'fw', 'provider');
    const fp2 = generateFingerprint('hello world', 'domain', 'fw', 'provider');
    expect(fp1).toBe(fp2);
  });

  it('should handle optional styleProfileId', () => {
    const fp1 = generateFingerprint('test', 'domain', 'fw', 'provider', 'style1');
    const fp2 = generateFingerprint('test', 'domain', 'fw', 'provider', 'style2');
    expect(fp1).not.toBe(fp2);
  });

  it('should produce different fingerprint with vs without styleProfileId', () => {
    const fp1 = generateFingerprint('test', 'domain', 'fw', 'provider');
    const fp2 = generateFingerprint('test', 'domain', 'fw', 'provider', 'style1');
    expect(fp1).not.toBe(fp2);
  });
});

describe('intentSimilarity', () => {
  it('should return 1 for identical strings', () => {
    expect(intentSimilarity('hello world', 'hello world')).toBe(1);
  });

  it('should return 0 for completely different strings', () => {
    const sim = intentSimilarity('apple banana cherry', 'dog elephant fox');
    expect(sim).toBe(0);
  });

  it('should return value between 0 and 1 for partial overlap', () => {
    const sim = intentSimilarity('build secure API', 'build fast API');
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  it('should return 1 for both empty strings', () => {
    expect(intentSimilarity('', '')).toBe(1);
  });

  it('should return 0 when one string is empty', () => {
    expect(intentSimilarity('hello world', '')).toBe(0);
  });

  it('should return 0 when the other string is empty', () => {
    expect(intentSimilarity('', 'hello world')).toBe(0);
  });

  it('should be case insensitive', () => {
    expect(intentSimilarity('Hello World', 'hello world')).toBe(1);
  });

  it('should correctly compute Jaccard similarity', () => {
    // "build secure API" => {build, secure, api}
    // "build a secure API endpoint" => {build, a, secure, api, endpoint}
    // intersection = {build, secure, api} = 3
    // union = 5
    // Jaccard = 3/5 = 0.6
    const sim = intentSimilarity('build secure API', 'build a secure API endpoint');
    expect(sim).toBeCloseTo(0.6, 1);
  });
});

describe('cache lifecycle', () => {
  it('should return cached entry on exact fingerprint match after cachePut', () => {
    cachePut('build an API', 'backend', 'express', 'groq', mockResponse);
    const entry = cacheGet('build an API', 'backend', 'express', 'groq');
    expect(entry).not.toBeNull();
    expect(entry!.response).toEqual(mockResponse);
    expect(entry!.intent).toBe('build an API');
    expect(entry!.domainId).toBe('backend');
  });

  it('should return null on cache miss', () => {
    const entry = cacheGet('nonexistent query', 'domain', 'fw', 'provider');
    expect(entry).toBeNull();
  });

  it('should return null after cacheClear', () => {
    cachePut('build an API', 'backend', 'express', 'groq', mockResponse);
    cacheClear();
    const entry = cacheGet('build an API', 'backend', 'express', 'groq');
    expect(entry).toBeNull();
  });

  it('should match via semantic similarity when intent is similar enough', () => {
    cachePut('build a secure API endpoint', 'backend', 'express', 'groq', mockResponse);
    // "build secure API" vs "build a secure API endpoint" => Jaccard ~0.6
    // Need Jaccard >= 0.7 for semantic match
    // Use a closer match: "build a secure API" vs "build a secure API endpoint"
    // {build, a, secure, api} vs {build, a, secure, api, endpoint}
    // intersection=4, union=5, sim=0.8 >= 0.7
    const entry = cacheGet('build a secure API', 'backend', 'express', 'groq');
    expect(entry).not.toBeNull();
    expect(entry!.response).toEqual(mockResponse);
  });

  it('should not match semantically when domain is different', () => {
    cachePut('build a secure API endpoint', 'backend', 'express', 'groq', mockResponse);
    const entry = cacheGet('build a secure API', 'frontend', 'express', 'groq');
    expect(entry).toBeNull();
  });

  it('should not match semantically when framework is different', () => {
    cachePut('build a secure API endpoint', 'backend', 'express', 'groq', mockResponse);
    const entry = cacheGet('build a secure API', 'backend', 'django', 'groq');
    expect(entry).toBeNull();
  });

  it('should not match semantically when provider is different', () => {
    cachePut('build a secure API endpoint', 'backend', 'express', 'groq', mockResponse);
    const entry = cacheGet('build a secure API', 'backend', 'express', 'claude');
    expect(entry).toBeNull();
  });

  it('should increment hitCount on repeated gets', () => {
    cachePut('test query', 'domain', 'fw', 'groq', mockResponse);
    cacheGet('test query', 'domain', 'fw', 'groq');
    cacheGet('test query', 'domain', 'fw', 'groq');
    const entry = cacheGet('test query', 'domain', 'fw', 'groq');
    expect(entry).not.toBeNull();
    expect(entry!.hitCount).toBe(3);
  });
});

describe('getCacheStats', () => {
  it('should return zero stats after cacheClear', () => {
    const stats = getCacheStats();
    expect(stats.totalEntries).toBe(0);
    expect(stats.totalHits).toBe(0);
    expect(stats.totalMisses).toBe(0);
    expect(stats.hitRate).toBe(0);
  });

  it('should track hits correctly', () => {
    cachePut('test', 'domain', 'fw', 'groq', mockResponse);
    cacheGet('test', 'domain', 'fw', 'groq'); // hit
    cacheGet('test', 'domain', 'fw', 'groq'); // hit
    const stats = getCacheStats();
    expect(stats.totalHits).toBe(2);
    expect(stats.totalEntries).toBe(1);
  });

  it('should track misses correctly', () => {
    cacheGet('nonexistent', 'domain', 'fw', 'groq'); // miss
    cacheGet('also-nonexistent', 'domain', 'fw', 'groq'); // miss
    const stats = getCacheStats();
    expect(stats.totalMisses).toBe(2);
    expect(stats.totalHits).toBe(0);
  });

  it('should calculate hitRate correctly', () => {
    cachePut('test', 'domain', 'fw', 'groq', mockResponse);
    cacheGet('test', 'domain', 'fw', 'groq'); // hit
    cacheGet('missing', 'domain', 'fw', 'groq'); // miss
    const stats = getCacheStats();
    // 1 hit, 1 miss => hitRate = round(1/2 * 100) = 50
    expect(stats.hitRate).toBe(50);
  });

  it('should count totalEntries after multiple puts', () => {
    cachePut('query1', 'domain', 'fw', 'groq', mockResponse);
    cachePut('query2', 'domain', 'fw', 'groq', mockResponse);
    cachePut('query3', 'domain', 'fw', 'groq', mockResponse);
    const stats = getCacheStats();
    expect(stats.totalEntries).toBe(3);
  });
});

describe('cacheClear', () => {
  it('should reset all entries and stats', () => {
    cachePut('test1', 'domain', 'fw', 'groq', mockResponse);
    cachePut('test2', 'domain', 'fw', 'groq', mockResponse);
    cacheGet('test1', 'domain', 'fw', 'groq'); // hit
    cacheGet('missing', 'domain', 'fw', 'groq'); // miss

    cacheClear();

    const stats = getCacheStats();
    expect(stats.totalEntries).toBe(0);
    expect(stats.totalHits).toBe(0);
    expect(stats.totalMisses).toBe(0);
    expect(stats.hitRate).toBe(0);
  });

  it('should make previously cached entries inaccessible', () => {
    cachePut('cached query', 'domain', 'fw', 'groq', mockResponse);
    expect(cacheGet('cached query', 'domain', 'fw', 'groq')).not.toBeNull();

    cacheClear();
    expect(cacheGet('cached query', 'domain', 'fw', 'groq')).toBeNull();
  });
});
