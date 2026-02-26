/**
 * Multi-tenancy tipleri — docs/MULTI_TENANCY_AND_KEYS.md ile uyumlu.
 * Tenant = Organization; tüm veri org_id (ve gerekiyorsa project_id) ile izole edilir.
 */

export type OrgRole = 'owner' | 'admin' | 'member';

export type Plan = 'free' | 'pro' | 'team';

export type KeyProvider = 'gemini' | 'groq' | 'claude' | 'openrouter' | 'hf';

/** Tenant = Organization */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  authProvider?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  orgId: string;
  userId: string;
  role: OrgRole;
  createdAt: string;
}

/** Proje: prompt setleri, workflow grupları (org altında) */
export interface Project {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

/** Prompt sürüm meta (prompt_versions tablosu ile uyumlu) */
export interface PromptVersionMeta {
  intent?: string;
  framework?: string;
  domainId?: string;
  provider?: string;
  language?: string;
}

/** Orchestrator / workflow çalıştırma kaydı (audit + history) */
export interface Run {
  id: string;
  orgId: string;
  userId?: string;
  workflowId?: string;
  intent?: string;
  provider?: string;
  model?: string;
  stepOutputs?: unknown[];
  tokenUsage?: number;
  requestUsage?: number;
  createdAt: string;
}

/** Ek dosya referansı (object storage key veya path) */
export interface AttachmentRecord {
  id: string;
  orgId: string;
  runId?: string;
  promptId?: string;
  storageKey: string;
  mimeType: string;
  createdAt: string;
}

/** Style profile (Interactive Teaching Mode) — org veya user bazlı */
export interface StyleProfileRecord {
  id: string;
  orgId: string;
  userId?: string;
  name: string;
  description?: string;
  examples: { input: string; output: string }[];
  toneKeywords?: string[];
  createdAt: string;
  updatedAt: string;
}

/** BYOK: org veya user'a bağlı şifreli API key */
export interface ApiKeyRecord {
  id: string;
  orgId?: string;
  userId?: string;
  provider: KeyProvider;
  encryptedKey: string;
  lastUsedAt?: string;
  createdAt: string;
}

/** Metered billing: org bazlı kullanım */
export interface UsageRecord {
  id: string;
  orgId: string;
  plan: Plan;
  periodStart: string;
  periodEnd: string;
  tokenCount: number;
  requestCount: number;
  createdAt: string;
}

/** İstek bağlamı: tenant/org bilgisi (middleware ile set edilir) */
export interface TenantContext {
  orgId: string | null;
  userId: string | null;
  role: OrgRole | null;
}
