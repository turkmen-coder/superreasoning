/**
 * system_prompts_leaks-main ve system-prompts-and-models-of-ai-tools-main
 * klasörlerindeki prompt dosyalarını prompt kütüphanesine (.prompts) aktarır.
 *
 * Desteklenen uzantılar: .md, .txt, .html, .xml, .json
 *
 * Kullanım:
 *   npx tsx server/scripts/import-all-system-prompts.ts
 *   npx tsx server/scripts/import-all-system-prompts.ts --dry-run
 *   npx tsx server/scripts/import-all-system-prompts.ts --source system_prompts_leaks-main
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, basename, extname, relative, sep } from 'path';
import { savePrompt } from '../store/prompts.js';

const SOURCE_DIRS = [
  { dir: join(process.cwd(), 'system_prompts_leaks-main'), prefix: 'spl' },
  { dir: join(process.cwd(), 'system-prompts-and-models-of-ai-tools-main'), prefix: 'spat' },
];

const SUPPORTED_EXTENSIONS = new Set(['.md', '.txt', '.html', '.xml', '.json']);
const SKIP_DIRS = new Set(['.github', 'assets', 'old', 'Old', '.git']);
const SKIP_FILENAMES = new Set(['readme.md', 'readme.txt', 'license.md', 'license.txt', 'changelog.md', '.nojekyll']);

interface SourceFile {
  fullPath: string;
  relPath: string;
}

function parseArgs(argv: string[]): { dryRun: boolean; onlySource: string | null } {
  let dryRun = false;
  let onlySource: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') dryRun = true;
    if (argv[i] === '--source' && argv[i + 1]) { onlySource = argv[i + 1]; i++; }
  }
  return { dryRun, onlySource };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function discoverFiles(root: string): SourceFile[] {
  const out: SourceFile[] = [];
  function walk(dir: string): void {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('._') || entry.name.startsWith('.')) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(fullPath);
        continue;
      }
      const ext = extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue;
      if (SKIP_FILENAMES.has(entry.name.toLowerCase())) continue;
      out.push({ fullPath, relPath: relative(root, fullPath) });
    }
  }
  walk(root);
  return out;
}

function normalizeCategory(relPath: string): string {
  return relPath.split(sep)[0] || 'Misc';
}

function normalizeName(relPath: string): string {
  const parts = relPath.split(sep);
  const file = basename(parts[parts.length - 1], extname(parts[parts.length - 1]));
  // Include parent folder in name if nested
  const parent = parts.length > 2 ? parts[parts.length - 2] + ' / ' : '';
  return (parent + file).replace(/[-_]+/g, ' ').trim();
}


function main(): void {
  const { dryRun, onlySource } = parseArgs(process.argv.slice(2));

  let totalSaved = 0;
  let totalSkipped = 0;
  let totalScanned = 0;

  const activeDirs = onlySource
    ? SOURCE_DIRS.filter(s => s.dir.includes(onlySource!))
    : SOURCE_DIRS;

  for (const { dir, prefix } of activeDirs) {
    if (!existsSync(dir)) {
      process.stderr.write(`[SKIP] Klasör bulunamadı: ${dir}\n`);
      continue;
    }

    process.stderr.write(`\n[IMPORT] ${dir}\n`);
    const files = discoverFiles(dir);
    let saved = 0;
    let skipped = 0;

    for (const file of files) {
      totalScanned++;

      let raw: string;
      try {
        raw = readFileSync(file.fullPath, 'utf-8').replace(/\r\n/g, '\n').trim();
      } catch {
        skipped++;
        totalSkipped++;
        continue;
      }

      if (!raw || raw.length < 30) {
        skipped++;
        totalSkipped++;
        continue;
      }

      const category = normalizeCategory(file.relPath);
      const name = normalizeName(file.relPath);
      const id = `${prefix}-${slugify(file.relPath) || 'prompt'}`;
      const sourceLabel = dir.split('/').pop() ?? 'imported';

      if (!dryRun) {
        savePrompt({
          id,
          version: '1.0.0',
          name,
          masterPrompt: raw,
          reasoning: `Imported from ${sourceLabel}/${file.relPath.replace(/\\/g, '/')}`,
          source: 'imported',
          meta: {
            intent: 'System Prompt',
            framework: 'Imported',
            domainId: 'system-prompts',
            provider: category,
            language: 'en',
          },
        });
      }

      saved++;
      totalSaved++;

      if (saved % 25 === 0) {
        process.stderr.write(`  ${saved} prompt işlendi...\n`);
      }
    }

    process.stderr.write(`  ✓ ${saved} kaydedildi, ${skipped} atlandı (${files.length} dosya tarandı)\n`);
    totalSkipped += skipped;
  }

  process.stdout.write(
    JSON.stringify({
      dryRun,
      sources: activeDirs.map(s => s.dir),
      totalScanned,
      totalSaved,
      totalSkipped,
    }, null, 2) + '\n'
  );

  if (!dryRun) {
    process.stderr.write(`\nImport tamamlandı: ${totalSaved} prompt .prompts/index.json'a eklendi.\n`);
  }
}

main();
