/**
 * system_prompts_leaks-main ve system-prompts-and-models-of-ai-tools-main
 * klasörlerindeki prompt dosyalarını prompt kütüphanesine (.prompts) aktarır.
 *
 * Desteklenen uzantılar: .md, .txt, .html, .xml, .json
 *
 * Kullanım:
 *   npx tsx server/scripts/import-system-prompts-leaks.ts [kaynak_dizin]
 *   npm run import:system-prompts-leaks
 *   npm run import:system-prompts-leaks -- --all          (her iki klasör)
 *   npm run import:system-prompts-leaks -- --dry-run --provider Anthropic,Google
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, basename, extname, relative, sep } from 'path';
import { savePrompt } from '../store/prompts.js';

const DEFAULT_SOURCE_DIR = join(process.cwd(), 'system_prompts_leaks-main');
const SUPPORTED_EXTENSIONS = new Set(['.md', '.txt', '.html', '.xml']);
const SKIP_DIRS = new Set(['.github']);

type Provider = 'OpenAI' | 'Anthropic' | 'Google' | 'Perplexity' | 'xAI' | 'Misc' | string;

interface CliOptions {
  sourceDir: string;
  providers: Set<string> | null;
  dryRun: boolean;
}

interface SourceFile {
  fullPath: string;
  relPath: string;
}

function parseArgs(argv: string[]): CliOptions {
  let sourceDir = DEFAULT_SOURCE_DIR;
  let providers: Set<string> | null = null;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--provider' || arg === '--providers') {
      const raw = argv[i + 1];
      if (!raw) {
        throw new Error('--provider parametresi bir değer gerektirir. Örnek: --provider OpenAI,Anthropic');
      }
      providers = new Set(
        raw
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => p.toLowerCase())
      );
      i++;
      continue;
    }
    if (!arg.startsWith('--') && sourceDir === DEFAULT_SOURCE_DIR) {
      sourceDir = join(process.cwd(), arg);
    }
  }

  return { sourceDir, providers, dryRun };
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
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('._')) continue; // macOS metadata
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
        walk(fullPath);
        continue;
      }
      const ext = extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue;
      out.push({ fullPath, relPath: relative(root, fullPath) });
    }
  }

  walk(root);
  return out;
}

function shouldSkipFile(relPath: string): boolean {
  const name = basename(relPath).toLowerCase();
  return name === 'readme.md' || name === 'readme.txt';
}

function normalizeProvider(relPath: string): Provider {
  const provider = relPath.split(sep)[0] || 'Misc';
  return provider;
}

function normalizeName(relPath: string): string {
  const file = basename(relPath, extname(relPath));
  return file.replace(/[-_]+/g, ' ').trim();
}

function main(): void {
  let options: CliOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
    return;
  }

  if (!existsSync(options.sourceDir)) {
    console.error('Kaynak klasör bulunamadı:', options.sourceDir);
    process.exit(1);
  }

  const files = discoverFiles(options.sourceDir);
  let scanned = 0;
  let matchedProvider = 0;
  let saved = 0;
  let skipped = 0;

  for (const file of files) {
    scanned++;

    if (shouldSkipFile(file.relPath)) {
      skipped++;
      continue;
    }

    const provider = normalizeProvider(file.relPath);
    if (options.providers && !options.providers.has(provider.toLowerCase())) {
      continue;
    }
    matchedProvider++;

    const raw = readFileSync(file.fullPath, 'utf-8').replace(/\r\n/g, '\n').trim();
    if (!raw || raw.length < 20) {
      skipped++;
      continue;
    }

    const id = `spl-${slugify(file.relPath) || 'prompt'}`;
    const version = '1.0.0';
    const name = normalizeName(file.relPath) || id;

    if (!options.dryRun) {
      savePrompt({
        id,
        version,
        name,
        masterPrompt: raw,
        reasoning: `Imported from system_prompts_leaks-main/${file.relPath.replace(/\\/g, '/')}`,
        source: 'imported',
        meta: {
          intent: 'System Prompt',
          framework: 'Imported',
          domainId: 'system-prompts',
          provider,
          language: 'en',
        },
      });
    }

    saved++;
    if (saved % 25 === 0) {
      console.log(`  ${saved} prompt işlendi...`);
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        sourceDir: options.sourceDir,
        providerFilter: options.providers ? Array.from(options.providers) : null,
        scannedFiles: scanned,
        providerMatchedFiles: matchedProvider,
        processedPrompts: saved,
        skippedFiles: skipped,
      },
      null,
      2
    )
  );

  if (!options.dryRun) {
    console.log('Import tamamlandı: .prompts/index.json güncellendi.');
  }
}

main();
