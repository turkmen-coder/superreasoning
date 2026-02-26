/**
 * Backend API istemcisi — Prompt-as-Code, auth/validate, prompts.
 * JWT (Supabase Auth) veya API key ile auth.
 * Geliştirmede Vite proxy /api/v1 -> http://localhost:4000/v1 kullanır.
 */

import { supabase } from './supabaseClient';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '') || '/api/v1';

/** Auth header'ları al — JWT varsa Bearer, yoksa API key */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      return { Authorization: `Bearer ${data.session.access_token}` };
    }
  } catch { /* fallback to api key */ }
  const apiKey = import.meta.env.VITE_API_KEY ?? '';
  if (apiKey) {
    return { 'x-api-key': apiKey };
  }
  return {};
}

export interface ValidateKeyResult {
  valid: boolean;
  mode?: string;
  orgId?: string;
  plan?: string;
}

export interface StoredPromptItem {
  id: string;
  version: string;
  name?: string;
  masterPrompt: string;
  reasoning?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

/** POST /v1/auth/validate — API key doğrula */
export async function validateApiKey(apiKey: string): Promise<{ ok: boolean; data?: ValidateKeyResult; error?: string; status: number }> {
  try {
    const res = await fetch(`${API_BASE}/auth/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || res.statusText, status: res.status };
    }
    return { ok: true, data: data as ValidateKeyResult, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
}

/** GET /v1/health */
export async function apiHealth(): Promise<{ ok: boolean; status?: string }> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: data.status };
  } catch {
    return { ok: false };
  }
}

/** GET /v1/prompts — Kaydedilen promptları listele (x-api-key gerekli) */
export async function listPromptsFromApi(apiKey: string): Promise<{ ok: boolean; prompts?: StoredPromptItem[]; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/prompts`, {
      headers: { 'x-api-key': apiKey },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || res.statusText };
    }
    return { ok: true, prompts: data.prompts || [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

/** GET /v1/orgs/:orgId/prompts — Org promptları (tenant) */
export async function listOrgPromptsFromApi(apiKey: string, orgId: string): Promise<{ ok: boolean; prompts?: StoredPromptItem[]; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/orgs/${encodeURIComponent(orgId)}/prompts`, {
      headers: { 'x-api-key': apiKey },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || res.statusText };
    }
    return { ok: true, prompts: data.prompts || [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
