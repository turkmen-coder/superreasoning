/**
 * prompts.chat formatındaki JSON'u prompt kütüphanesine (.prompts) aktarır.
 * Format: { "prompts_chat_prompts": [ { "value": "...", "value_citation": "..." }, ... ] }
 *
 * Kullanım:
 *   npx tsx server/scripts/import-prompts-chat.ts [dosya.json]
 *   npm run import:prompts-chat -- data/prompts-chat-import.json
 *
 * Varsayılan dosya: data/prompts-chat-import.json
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { savePrompt } from '../store/prompts.js';

const DEFAULT_PATH = join(process.cwd(), 'data', 'prompts-chat-import.json');

interface PromptsChatItem {
  value: string;
  value_citation?: string;
}

interface PromptsChatInput {
  prompts_chat_prompts: PromptsChatItem[];
}

function slugify(text: string, maxLen = 40): string {
  const line = text.split(/\n/)[0]?.trim() || 'prompt';
  const cleaned = line.replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');
  return cleaned.slice(0, maxLen) || 'prompt';
}

function main(): void {
  const filePath = process.argv[2] || DEFAULT_PATH;
  if (!existsSync(filePath)) {
    console.error('Dosya bulunamadı:', filePath);
    console.error('Kullanım: npx tsx server/scripts/import-prompts-chat.ts [dosya.json]');
    process.exit(1);
  }

  let data: PromptsChatInput;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    data = JSON.parse(raw) as PromptsChatInput;
  } catch (e) {
    console.error('JSON okunamadı:', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const items = data.prompts_chat_prompts;
  if (!Array.isArray(items) || items.length === 0) {
    console.error('prompts_chat_prompts dizisi boş veya yok.');
    process.exit(1);
  }

  let saved = 0;
  const ids = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item.value !== 'string') continue;
    const baseId = slugify(item.value).toLowerCase().replace(/^-+|-+$/g, '') || 'prompt';
    let id = baseId;
    let n = 1;
    while (ids.has(id)) {
      id = `${baseId}-${n}`;
      n++;
    }
    ids.add(id);

    savePrompt({
      id,
      version: '1',
      name: item.value.split(/\n/)[0]?.trim().slice(0, 120) || id,
      masterPrompt: item.value,
      meta: item.value_citation ? { source: item.value_citation } as Record<string, unknown> : undefined,
    });
    saved++;
    if (saved % 50 === 0) console.log(`  ${saved} prompt kaydedildi...`);
  }

  console.log(`Toplam ${saved} prompt kütüphanesine eklendi (.prompts/index.json).`);
}

main();
