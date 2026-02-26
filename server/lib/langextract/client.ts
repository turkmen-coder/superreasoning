import { spawn } from 'node:child_process';
import path from 'node:path';

export interface LangExtractItem {
  extractionClass: string;
  extractionText: string;
  attributes: Record<string, string | string[]>;
}

export interface LangExtractAnalysis {
  enabled: boolean;
  model: string;
  items: LangExtractItem[];
  keywords: string[];
  summary: string;
  error?: string;
}

const RUNNER_PATH = path.resolve(process.cwd(), 'server', 'lib', 'langextract', 'runner.py');
const WORKSPACE_ROOT = path.resolve(process.cwd());

function normalizeKeywords(items: LangExtractItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    if (item.extractionClass) set.add(item.extractionClass.toLowerCase());
    if (item.extractionText) set.add(item.extractionText.toLowerCase());
    for (const [k, v] of Object.entries(item.attributes ?? {})) {
      set.add(k.toLowerCase());
      if (Array.isArray(v)) {
        for (const x of v) set.add(String(x).toLowerCase());
      } else if (typeof v === 'string') {
        set.add(v.toLowerCase());
      }
    }
  }
  return Array.from(set)
    .map((x) => x.trim())
    .filter((x) => x.length >= 3)
    .slice(0, 40);
}

export async function analyzeWithLangExtract(
  text: string,
  language: 'tr' | 'en' = 'en',
): Promise<LangExtractAnalysis> {
  return new Promise<LangExtractAnalysis>((resolve) => {
    const py = spawn('python3', [RUNNER_PATH], {
      cwd: WORKSPACE_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      py.kill('SIGTERM');
    }, 30000);

    py.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    py.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    py.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        enabled: false,
        model: '',
        items: [],
        keywords: [],
        summary: '',
        error: err.message,
      });
    });

    py.on('close', () => {
      clearTimeout(timeout);
      try {
        const parsed = JSON.parse(stdout || '{}') as Partial<LangExtractAnalysis> & {
          items?: LangExtractItem[];
        };
        const items = Array.isArray(parsed.items) ? parsed.items : [];
        const keywords = normalizeKeywords(items);
        resolve({
          enabled: Boolean(parsed.enabled),
          model: String(parsed.model ?? ''),
          items,
          keywords,
          summary: String(parsed.summary ?? ''),
          error: parsed.error ? String(parsed.error) : undefined,
        });
      } catch {
        resolve({
          enabled: false,
          model: '',
          items: [],
          keywords: [],
          summary: '',
          error: stderr || 'Failed to parse langextract output',
        });
      }
    });

    const payload = JSON.stringify({ text, language });
    py.stdin.write(payload);
    py.stdin.end();
  });
}
