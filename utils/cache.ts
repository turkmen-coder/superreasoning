interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set<T>(key: string, value: T, ttl: number = 3600000): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value ?? '';
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  has(key: string): boolean {
    return this.cache.has(key) && this.get(key) !== null;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const memoryCache = new MemoryCache();

setInterval(() => {
  memoryCache.cleanExpired();
}, 60000);

export interface RedisConfig {
  url: string;
  ttl?: number;
}

export class RedisCache {
  private ttl: number;

  constructor(config: RedisConfig) {
    this.ttl = config.ttl || 3600;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = memoryCache.get<string>(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      memoryCache.set(key, JSON.stringify(value), (ttl || this.ttl) * 1000);
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    memoryCache.delete(key);
  }

  async clear(): Promise<void> {
    memoryCache.clear();
  }
}

export function createCacheKey(...parts: (string | number)[]): string {
  return parts.map(p => String(p).trim()).join(':');
}

export function hashKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
