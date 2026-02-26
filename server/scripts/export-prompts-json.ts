/**
 * Prompt verisi JSON export script.
 * notebookLmPrompts.ts + datasetPrompts.ts → data/prompts-export.json
 * Python SK servisi bu dosyayı okuyarak RAG pipeline'da kullanır.
 *
 * Kullanım: npm run export:prompts
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { NOTEBOOKLM_PROMPTS } from '../../data/notebookLmPrompts';
// ALL_DATASET_PROMPTS zaten NOTEBOOKLM_PROMPTS'a push edildiği için ayrı import gerekmiyor

const OUT_PATH = path.resolve(process.cwd(), 'data', 'prompts-export.json');

function main() {
  // Benzersiz ID seti (NotebookLM zaten datasetPrompts push edilmiş olabilir)
  const seenIds = new Set<string>();
  const allPrompts = NOTEBOOKLM_PROMPTS.filter(p => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });

  const prompts = allPrompts.map((p) => ({
    id: p.id,
    category: p.categoryEn,
    name: p.nameEn,
    prompt: p.promptEn,
    prompt_tr: p.prompt,
    name_tr: p.name,
    category_tr: p.category,
    tags: p.tags,
    source: p.id.startsWith('ds-') ? 'dataset' : 'notebooklm',
  }));

  const dir = path.dirname(OUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(OUT_PATH, JSON.stringify(prompts, null, 2), 'utf-8');

  const notebookCount = prompts.filter(p => p.source === 'notebooklm').length;
  const datasetCount = prompts.filter(p => p.source === 'dataset').length;
  console.log(`[export:prompts] ${prompts.length} prompt → ${OUT_PATH}`);
  console.log(`[export:prompts]   ↳ NotebookLM: ${notebookCount}`);
  console.log(`[export:prompts]   ↳ Dataset: ${datasetCount}`);
}

main();
