/**
 * Prompt store soyutlaması — docs/MULTI_TENANCY_AND_KEYS.md.
 * MVP: dosya tabanlı implementasyon. SaaS: DB implementasyonu takılıp org_id ile filtreleme.
 */

import * as fileStore from './prompts';
import { getPool } from '../db/client';
import { DbPromptStore } from './dbPromptStore';

export type StoredPrompt = fileStore.StoredPrompt;

export interface ListOptions {
  /** Tenant izolasyonu (DB store'da kullanılır; file store'da yok sayılır) */
  orgId?: string | null;
}

export interface SavePromptPayload extends Omit<StoredPrompt, 'createdAt'> {
  createdAt?: string;
}

export interface IPromptStore {
  list(options?: ListOptions): Promise<StoredPrompt[]>;
  get(id: string, version?: string, orgId?: string | null): Promise<StoredPrompt | null>;
  save(payload: SavePromptPayload, orgId?: string | null): Promise<StoredPrompt>;
  delete(id: string, version?: string, orgId?: string | null): Promise<boolean>;
  /** Bir prompt'un tüm versiyonlarını listele (en yeniden eskiye) */
  listVersions(id: string, orgId?: string | null): Promise<StoredPrompt[]>;
}

/** Dosya tabanlı store (mevcut .prompts/index.json). orgId şu an kullanılmıyor. */
const fileStoreAdapter: IPromptStore = {
  async list(options?: ListOptions) {
    void options?.orgId;
    return fileStore.listPrompts();
  },
  async get(id: string, version?: string, _orgId?: string | null) {
    return fileStore.getPrompt(id, version);
  },
  async save(payload: SavePromptPayload, _orgId?: string | null) {
    return fileStore.savePrompt(payload);
  },
  async delete(id: string, version?: string, _orgId?: string | null) {
    return fileStore.deletePrompt(id, version);
  },
  async listVersions(id: string, _orgId?: string | null) {
    const all = fileStore.listPrompts();
    return all
      .filter((p) => p.id === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
};

/**
 * Aktif prompt store.
 * SR_USE_DB_STORE=true ve DATABASE_URL/SR_DATABASE_URL tanımlıysa DB store kullanılır.
 */
export function getPromptStore(): IPromptStore {
  if (process.env.SR_USE_DB_STORE === 'true') {
    const pool = getPool();
    if (pool) return new DbPromptStore(pool);
  }
  return fileStoreAdapter;
}
