/**
 * Prompt-as-Code: dosya tabanlı sürüm deposu.
 * CI/CD'de .prompts/ dizini versionlanabilir.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
const PROMPTS_DIR = process.env.SR_PROMPTS_DIR || join(process.cwd(), '.prompts');
const INDEX_FILE = join(PROMPTS_DIR, 'index.json');

export interface StoredPrompt {
  id: string;
  version: string;
  name?: string;
  masterPrompt: string;
  reasoning?: string;
  source?: 'dashboard' | 'imported' | 'api';
  meta?: {
    intent?: string;
    framework?: string;
    domainId?: string;
    provider?: string;
    language?: string;
  };
  createdAt: string; // ISO
}

function ensureDir() {
  if (!existsSync(PROMPTS_DIR)) {
    mkdirSync(PROMPTS_DIR, { recursive: true });
  }
}

function readIndex(): StoredPrompt[] {
  ensureDir();
  if (!existsSync(INDEX_FILE)) return [];
  try {
    const raw = readFileSync(INDEX_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data.prompts) ? data.prompts : [];
  } catch {
    return [];
  }
}

function writeIndex(prompts: StoredPrompt[]) {
  ensureDir();
  writeFileSync(INDEX_FILE, JSON.stringify({ prompts }, null, 2), 'utf-8');
}

export function listPrompts(): StoredPrompt[] {
  return readIndex();
}

export function getPrompt(id: string, version?: string): StoredPrompt | null {
  const prompts = readIndex();
  const matches = prompts.filter((p) => p.id === id);
  if (version) {
    return matches.find((p) => p.version === version) ?? null;
  }
  return matches.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export function savePrompt(
  payload: Omit<StoredPrompt, 'createdAt'> & { createdAt?: string }
): StoredPrompt {
  const prompt: StoredPrompt = {
    ...payload,
    createdAt: payload.createdAt ?? new Date().toISOString(),
  };
  const prompts = readIndex();
  const rest = prompts.filter((p) => !(p.id === prompt.id && p.version === prompt.version));
  writeIndex([...rest, prompt]);
  return prompt;
}

export function deletePrompt(id: string, version?: string): boolean {
  const prompts = readIndex();
  const filtered = version
    ? prompts.filter((p) => !(p.id === id && p.version === version))
    : prompts.filter((p) => p.id !== id);
  if (filtered.length === prompts.length) return false;
  writeIndex(filtered);
  return true;
}
