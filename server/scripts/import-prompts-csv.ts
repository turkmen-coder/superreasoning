/**
 * "act","prompt" formatındaki CSV'yi prompt kütüphanesine (.prompts) aktarır.
 *
 * Kullanım:
 *   npx tsx server/scripts/import-prompts-csv.ts [dosya.csv]
 *   npm run import:prompts-csv -- data/prompts.csv
 *
 * Varsayılan dosya: data/prompts.csv
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { savePrompt } from '../store/prompts.js';

const DEFAULT_PATH = join(process.cwd(), 'data', 'prompts.csv');

/** CSV satırını çift tırnaklı alanlara parse eder ("" = tek tırnak) */
function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let field = '';
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          field += line[i];
          i++;
        }
      }
      out.push(field);
      while (i < line.length && (line[i] === ',' || line[i] === ' ')) i++;
    } else {
      const start = i;
      while (i < line.length && line[i] !== ',') i++;
      out.push(line.slice(start, i).replace(/""/g, '"').trim());
      if (line[i] === ',') i++;
    }
  }
  return out;
}

function slugify(text: string, maxLen = 50): string {
  const cleaned = text
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (cleaned || 'prompt').slice(0, maxLen).toLowerCase();
}

function main(): void {
  const filePath = process.argv[2] || DEFAULT_PATH;
  if (!existsSync(filePath)) {
    console.error('Dosya bulunamadı:', filePath);
    console.error('Kullanım: npx tsx server/scripts/import-prompts-csv.ts [dosya.csv]');
    process.exit(1);
  }

  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.error('CSV en az bir başlık ve bir veri satırı içermeli.');
    process.exit(1);
  }

  const header = parseCSVLine(lines[0]);
  const actIdx = header.findIndex((h) => h.toLowerCase() === 'act');
  const promptIdx = header.findIndex((h) => h.toLowerCase() === 'prompt');
  if (actIdx === -1 || promptIdx === -1) {
    console.error('CSV sütunları "act" ve "prompt" içermeli.');
    process.exit(1);
  }

  const ids = new Set<string>();
  let saved = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const act = row[actIdx]?.trim() ?? '';
    const prompt = row[promptIdx]?.trim() ?? '';
    if (!prompt) continue;

    let baseId = slugify(act || prompt.slice(0, 40));
    if (!baseId) baseId = 'prompt';
    let id = baseId;
    let n = 1;
    while (ids.has(id)) {
      id = `${baseId}-${n}`;
      n++;
    }
    ids.add(id);

    const name = act || prompt.split(/\n/)[0]?.trim().slice(0, 120) || id;

    savePrompt({
      id,
      version: '1',
      name,
      masterPrompt: prompt,
      meta: { intent: 'Act as', source: 'prompts.csv' } as Record<string, unknown>,
    });
    saved++;
    if (saved % 25 === 0) console.log(`  ${saved} prompt kaydedildi...`);
  }

  console.log(`Toplam ${saved} prompt kütüphanesine eklendi (.prompts/index.json).`);
}

main();
