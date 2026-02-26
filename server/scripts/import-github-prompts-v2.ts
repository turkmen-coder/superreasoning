/**
 * V2: Fabric patterns + mustvlad System Prompts + linexjlin/GPTs import
 *
 * Kullanım: npx tsx server/scripts/import-github-prompts-v2.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface StoredPrompt {
  id: string;
  version: string;
  name?: string;
  masterPrompt: string;
  reasoning?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

const PROMPTS_DIR = join(process.cwd(), '.prompts');
const INDEX_FILE = join(PROMPTS_DIR, 'index.json');
const CACHE_DIR = join(process.cwd(), '.cache', 'github-prompts-v2');
const NOW = new Date().toISOString();

function slugify(text: string, maxLen = 60): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '') || 'prompt'
  ).slice(0, maxLen);
}

function readIndex(): StoredPrompt[] {
  if (!existsSync(INDEX_FILE)) return [];
  try {
    const data = JSON.parse(readFileSync(INDEX_FILE, 'utf-8'));
    return Array.isArray(data.prompts) ? data.prompts : [];
  } catch {
    return [];
  }
}

function writeIndex(prompts: StoredPrompt[]) {
  if (!existsSync(PROMPTS_DIR)) mkdirSync(PROMPTS_DIR, { recursive: true });
  writeFileSync(INDEX_FILE, JSON.stringify({ prompts }, null, 2), 'utf-8');
}

async function fetchText(url: string): Promise<string> {
  const cacheKey = url.replace(/[^a-z0-9]/gi, '_').slice(0, 200);
  const cachePath = join(CACHE_DIR, cacheKey + '.txt');
  if (existsSync(cachePath)) {
    return readFileSync(cachePath, 'utf-8');
  }
  console.log(`  [fetch] ${url.slice(0, 90)}...`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SuperReasoning-PromptImporter/2.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const text = await res.text();
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath, text, 'utf-8');
  return text;
}

async function fetchJSON(url: string): Promise<unknown> {
  return JSON.parse(await fetchText(url));
}

// ── 1. Fabric Patterns ──────────────────────────────────────
async function fetchFabricPatterns(): Promise<StoredPrompt[]> {
  console.log('\n📦 [1/3] danielmiessler/fabric patterns (data/patterns/)...');
  const results: StoredPrompt[] = [];

  // Repo tree'yi al
  const tree = (await fetchJSON(
    'https://api.github.com/repos/danielmiessler/fabric/git/trees/main?recursive=1'
  )) as { tree: Array<{ path: string; type: string }> };

  // data/patterns/xxx/system.md dosyalarını bul
  const systemFiles = tree.tree.filter(
    (item) =>
      item.path.startsWith('data/patterns/') &&
      item.path.endsWith('/system.md') &&
      item.type === 'blob'
  );

  console.log(`  → ${systemFiles.length} pattern bulundu`);

  const batchSize = 15;
  for (let b = 0; b < systemFiles.length; b += batchSize) {
    const batch = systemFiles.slice(b, b + batchSize);
    const fetches = batch.map(async (file) => {
      try {
        const url = `https://raw.githubusercontent.com/danielmiessler/fabric/main/${file.path}`;
        const content = await fetchText(url);
        if (content && content.length > 20) {
          const folder = file.path.split('/')[2]; // data/patterns/FOLDER/system.md
          const name = folder
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());

          results.push({
            id: `fabric-${slugify(folder)}`,
            version: '1.0.0',
            name: `Fabric: ${name}`,
            masterPrompt: content.trim(),
            meta: {
              intent: 'fabric-pattern',
              domainId: 'fabric-pattern',
              source: 'github:danielmiessler/fabric',
              language: 'en',
              tags: ['fabric', 'pattern', 'system-prompt', folder],
            },
            createdAt: NOW,
          });
        }
      } catch {
        /* atla */
      }
    });
    await Promise.all(fetches);
    if (b + batchSize < systemFiles.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
    process.stdout.write(`\r  → ${Math.min(b + batchSize, systemFiles.length)}/${systemFiles.length} işlendi`);
  }

  console.log(`\n  → ${results.length} fabric pattern yüklendi`);
  return results;
}

// ── 2. mustvlad/ChatGPT-System-Prompts ─────────────────────
async function fetchMustvladPrompts(): Promise<StoredPrompt[]> {
  console.log('\n📦 [2/3] mustvlad/ChatGPT-System-Prompts...');
  const results: StoredPrompt[] = [];

  const categories = ['educational', 'entertainment', 'others', 'utility'];

  for (const cat of categories) {
    try {
      const apiUrl = `https://api.github.com/repos/mustvlad/ChatGPT-System-Prompts/contents/prompts/${cat}`;
      const items = (await fetchJSON(apiUrl)) as Array<{
        name: string;
        download_url: string;
      }>;
      const mdFiles = items.filter((item) => item.name.endsWith('.md'));

      for (const file of mdFiles) {
        try {
          const content = await fetchText(file.download_url);
          if (content && content.length > 50) {
            const fileName = file.name.replace(/\.md$/, '');
            const name = fileName
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());

            // İlk markdown başlığını kaldır
            const promptText = content
              .replace(/^#\s+.*\n+/m, '')
              .trim();

            if (promptText.length > 30) {
              results.push({
                id: `mustvlad-${slugify(fileName)}`,
                version: '1.0.0',
                name: `System: ${name}`,
                masterPrompt: promptText,
                meta: {
                  intent: `system-${cat}`,
                  domainId: 'system-prompts-collection',
                  source: 'github:mustvlad/ChatGPT-System-Prompts',
                  language: 'en',
                  tags: ['system-prompt', 'chatgpt', cat],
                },
                createdAt: NOW,
              });
            }
          }
        } catch {
          /* dosya okunamazsa atla */
        }
      }
      console.log(`  → ${cat}: ${mdFiles.length} dosya`);
    } catch (err) {
      console.error(`  ⚠ ${cat} çekilemedi:`, (err as Error).message);
    }
  }

  console.log(`  → ${results.length} prompt yüklendi`);
  return results;
}

// ── 3. linexjlin/GPTs (popular GPT prompts) ─────────────────
async function fetchGPTsPrompts(): Promise<StoredPrompt[]> {
  console.log('\n📦 [3/3] linexjlin/GPTs...');
  const results: StoredPrompt[] = [];

  try {
    const tree = (await fetchJSON(
      'https://api.github.com/repos/linexjlin/GPTs/git/trees/main?recursive=1'
    )) as { tree: Array<{ path: string; type: string }> };

    const mdFiles = tree.tree.filter(
      (item) =>
        item.path.startsWith('prompts/') &&
        item.path.endsWith('.md') &&
        item.type === 'blob'
    );

    console.log(`  → ${mdFiles.length} GPT prompt dosyası bulundu`);

    // En fazla 200 tane al (çok fazla olabilir)
    const limited = mdFiles.slice(0, 200);

    const batchSize = 15;
    for (let b = 0; b < limited.length; b += batchSize) {
      const batch = limited.slice(b, b + batchSize);
      const fetches = batch.map(async (file) => {
        try {
          const url = `https://raw.githubusercontent.com/linexjlin/GPTs/main/${encodeURI(file.path)}`;
          const content = await fetchText(url);
          if (content && content.length > 50) {
            const fileName = file.path
              .replace('prompts/', '')
              .replace(/\.md$/, '');
            const name = fileName.replace(/[-_]/g, ' ');

            results.push({
              id: `gpt-${slugify(fileName)}`,
              version: '1.0.0',
              name: `GPT: ${name.slice(0, 80)}`,
              masterPrompt: content.trim(),
              meta: {
                intent: 'gpt-leaked',
                domainId: 'gpt-store-leaked',
                source: 'github:linexjlin/GPTs',
                language: 'en',
                tags: ['gpt', 'gpt-store', 'system-prompt', 'leaked'],
              },
              createdAt: NOW,
            });
          }
        } catch {
          /* atla */
        }
      });
      await Promise.all(fetches);
      if (b + batchSize < limited.length) {
        await new Promise((r) => setTimeout(r, 300));
      }
      process.stdout.write(`\r  → ${Math.min(b + batchSize, limited.length)}/${limited.length} işlendi`);
    }
  } catch (err) {
    console.error('  ⚠ GPTs prompts çekilemedi:', (err as Error).message);
  }

  console.log(`\n  → ${results.length} GPT prompt yüklendi`);
  return results;
}

// ── Ana ─────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  GitHub Prompt Import V2 - Fabric + System + GPTs');
  console.log('═══════════════════════════════════════════════════');

  const existing = readIndex();
  const existingIds = new Set(existing.map((p) => p.id));
  const existingTexts = new Set(
    existing.map((p) => p.masterPrompt.slice(0, 100).toLowerCase())
  );
  console.log(`\nMevcut prompt sayısı: ${existing.length}`);

  const allNew: StoredPrompt[] = [];

  // Fabric
  const fabric = await fetchFabricPatterns();
  // Mustvlad
  const mustvlad = await fetchMustvladPrompts();
  // GPTs
  const gpts = await fetchGPTsPrompts();

  // Hepsini birleştir
  const allCandidates = [...fabric, ...mustvlad, ...gpts];

  // Duplicate kontrolü
  let added = 0;
  let skipped = 0;
  for (const p of allCandidates) {
    const textKey = p.masterPrompt.slice(0, 100).toLowerCase();
    if (existingTexts.has(textKey) || existingIds.has(p.id)) {
      skipped++;
      continue;
    }
    existingTexts.add(textKey);
    existingIds.add(p.id);
    allNew.push(p);
    added++;
  }

  console.log(`\n─────────────────────────────────────────────────`);
  console.log(`Eklenen yeni prompt: ${added}`);
  console.log(`Atlanan (duplicate): ${skipped}`);

  if (added > 0) {
    const merged = [...existing, ...allNew];
    writeIndex(merged);
    console.log(`✅ Toplam ${merged.length} prompt kaydedildi (.prompts/index.json)`);
  }

  // Özet
  console.log('\n─── Kaynak Özeti ───');
  const srcMap: Record<string, number> = {};
  for (const p of allNew) {
    const src = (p.meta as Record<string, unknown>)?.source as string || 'unknown';
    srcMap[src] = (srcMap[src] || 0) + 1;
  }
  for (const [src, count] of Object.entries(srcMap).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${src}: ${count}`);
  }
  console.log('═══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
