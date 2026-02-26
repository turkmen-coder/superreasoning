import { getPromptStore } from '../store/promptStore';

export interface CorpusPrompt {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  categoryEn: string;
  prompt: string;
  promptEn: string;
  tags: string[];
}

function toSafeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toTags(values: Array<unknown>): string[] {
  return values
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .slice(0, 12);
}

/**
 * Unified prompt corpus for Agent SDK + vector indexing.
 * Priority: PromptStore (DB/file) first, then bundled notebook prompts as fallback.
 */
export async function loadPromptCorpus(targetCount = 10070): Promise<CorpusPrompt[]> {
  const prompts: CorpusPrompt[] = [];
  const seen = new Set<string>();

  // 1) Store prompts (DB if SR_USE_DB_STORE=true, else file store)
  try {
    const store = getPromptStore();
    const stored = await store.list({ orgId: null });

    for (const sp of stored) {
      const uniqueId = `${sp.id}@${sp.version}`;
      if (seen.has(uniqueId)) continue;
      const domain = toSafeString(sp.meta?.domainId, 'custom');
      const framework = toSafeString(sp.meta?.framework, 'auto');
      const provider = toSafeString(sp.meta?.provider, 'unknown');
      const language = toSafeString(sp.meta?.language, 'en');
      const name = toSafeString(sp.name, sp.id);
      const text = toSafeString(sp.masterPrompt);

      if (!text.trim()) continue;

      prompts.push({
        id: uniqueId,
        name,
        nameEn: name,
        category: domain,
        categoryEn: domain,
        prompt: text,
        promptEn: text,
        tags: toTags([framework, provider, language, 'stored_prompt']),
      });
      seen.add(uniqueId);

      if (prompts.length >= targetCount) return prompts;
    }
  } catch {
    // Optional source: continue with bundled prompts
  }

  // 2) Bundled notebook prompt corpus fallback
  const { NOTEBOOKLM_PROMPTS } = await import('../../data/notebookLmPrompts');
  for (const p of NOTEBOOKLM_PROMPTS) {
    if (seen.has(p.id)) continue;

    prompts.push({
      id: p.id,
      name: p.name,
      nameEn: p.nameEn,
      category: p.category,
      categoryEn: p.categoryEn,
      prompt: p.prompt,
      promptEn: p.promptEn,
      tags: Array.isArray(p.tags) ? p.tags : [],
    });
    seen.add(p.id);

    if (prompts.length >= targetCount) break;
  }

  return prompts;
}

export function getPromptCorpusTarget(): number {
  const raw = Number(process.env.SR_AGENT_PROMPT_TARGET ?? '10070');
  if (!Number.isFinite(raw) || raw <= 0) return 10070;
  return Math.min(Math.floor(raw), 50000);
}
