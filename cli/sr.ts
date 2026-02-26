#!/usr/bin/env npx tsx
/**
 * Super Reasoning CLI — Prompt-as-Code
 * Kullanım: npx tsx cli/sr.ts <komut> [opts]
 * CI/CD: SR_API_URL=http://localhost:4000 npx tsx cli/sr.ts generate --intent "..." --framework RTF
 */

import { collectParamWarnings, hasErrors } from '../lib/paramWarnings';

const API_BASE = process.env.SR_API_URL || 'http://localhost:4000';
const API_KEY = process.env.SR_API_KEY || process.env.API_KEY;
const ORG_ID = process.env.SR_ORG_ID || process.env.SR_DEFAULT_ORG_ID;
const V1 = `${API_BASE}/v1`;

function buildHeaders(body?: object): Record<string, string> {
  const h: Record<string, string> = body ? { 'Content-Type': 'application/json' } : {};
  if (API_KEY) h['x-api-key'] = API_KEY;
  if (ORG_ID) h['x-org-id'] = ORG_ID;
  return h;
}

async function request<T>(
  method: string,
  path: string,
  body?: object
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const url = path.startsWith('http') ? path : `${V1}${path}`;
  const res = await fetch(url, {
    method,
    headers: buildHeaders(body),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: T | undefined;
  let error: string | undefined;
  try {
    const j = JSON.parse(text);
    if (res.ok) data = j as T;
    else error = j.error ?? text;
  } catch {
    if (!res.ok) error = text;
    else data = text as unknown as T;
  }
  return { ok: res.ok, status: res.status, data, error };
}

function usage() {
  console.log(`
Super Reasoning CLI (Prompt-as-Code)

  npx tsx cli/sr.ts health
  npx tsx cli/sr.ts generate --intent "REST API tasarla" [--framework RTF] [--provider groq] [--domainId auto] [--language en]
  npx tsx cli/sr.ts runs create --intent "..." [--workflowPreset quick] [--provider groq]
  npx tsx cli/sr.ts runs list [--projectId <uuid>]
  npx tsx cli/sr.ts runs get <runId>
  npx tsx cli/sr.ts usage
  npx tsx cli/sr.ts list
  npx tsx cli/sr.ts get <id> [--version 1.0.0]
  npx tsx cli/sr.ts save --id <id> --version <ver> --masterPrompt "..." [--name "..."] [--reasoning "..."]
  npx tsx cli/sr.ts delete <id> [--version 1.0.0]
  npx tsx cli/sr.ts optimize --intent "..." [--prompt "..."] [--params '{"tone":"professional"}'] [--iterations 3]
  npx tsx cli/sr.ts diff <id> --v1 <ver> --v2 <ver> [--format mermaid|html|json]
  npx tsx cli/sr.ts test --intent "..." [--var KEY=val] [--provider groq]

  optimize: --prompt = --intent alias. --params = JSON (contextRules vb.). --iterations = N kez üretim (sonuç son iterasyon).

Ortam: SR_API_URL (varsayılan http://localhost:4000), SR_API_KEY, SR_ORG_ID (runs için)
`);
}

function parseArgs(args: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && args[i].length > 2) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      out[key] = next && !next.startsWith('--') ? next : '';
      if (out[key]) i++;
    }
  }
  return out;
}

/** --var KEY=val listesini toplar (test komutu için) */
function parseVarArgs(args: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--var' && args[i + 1] && args[i + 1].includes('=')) {
      const [k, ...v] = args[i + 1].split('=');
      if (k) out[k.trim()] = v.join('=').trim();
      i++;
    }
  }
  return out;
}

function printParamWarnings(warnings: { code: string; severity: string; message: string; source: string }[]) {
  for (const w of warnings) {
    const prefix = w.severity === 'error' ? 'ERROR' : w.severity === 'warn' ? 'WARN' : 'INFO';
    console.error(`[${prefix}] [${w.source}] ${w.message}`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const rest = argv.slice(1);
  const opts = parseArgs(rest);

  if (!cmd || cmd === '--help' || cmd === '-h') {
    usage();
    process.exit(0);
  }

  if (cmd === 'health') {
    const r = await request<{ status: string }>('GET', '/health');
    if (!r.ok) {
      console.error('API error:', r.error ?? r.status);
      process.exit(1);
    }
    console.log(r.data ?? 'OK');
    process.exit(0);
  }

  if (cmd === 'generate' || cmd === 'optimize') {
    const intent = opts.intent ?? opts.prompt ?? rest.find((x) => !x.startsWith('--'));
    if (!intent) {
      console.error('--intent veya --prompt gerekli');
      process.exit(1);
    }
    const warnings = collectParamWarnings(
      { intent, framework: opts.framework, provider: opts.provider, apiKey: API_KEY, apiBaseUrl: API_BASE },
      { minIntentLength: 10, requireApiKey: true }
    );
    if (cmd === 'optimize') {
      printParamWarnings(warnings);
      if (hasErrors(warnings)) process.exit(1);
    }
    let paramsBody: Record<string, unknown> = {
      intent,
      framework: opts.framework || 'AUTO',
      domainId: opts.domainId || 'auto',
      provider: opts.provider || 'groq',
      language: opts.language === 'tr' ? 'tr' : 'en',
      contextRules: opts.contextRules,
    };
    if (opts.params) {
      try {
        const parsed = JSON.parse(opts.params) as Record<string, unknown>;
        if (parsed.contextRules !== undefined) paramsBody.contextRules = parsed.contextRules;
        if (parsed.language !== undefined) paramsBody.language = parsed.language;
        if (parsed.framework !== undefined) paramsBody.framework = parsed.framework;
      } catch {
        console.error('--params geçerli JSON olmalı');
        process.exit(1);
      }
    }
    const iterations = Math.min(Math.max(1, parseInt(opts.iterations || '1', 10) || 1), 10);
    let lastData: { masterPrompt: string; reasoning?: string } | null = null;
    for (let i = 0; i < iterations; i++) {
      if (iterations > 1) console.error(`--- Iterasyon ${i + 1}/${iterations} ---`);
      const r = await request<{ masterPrompt: string; reasoning?: string }>('POST', '/generate', paramsBody);
      if (!r.ok) {
        console.error('Generate error:', r.error ?? r.status);
        process.exit(1);
      }
      lastData = r.data ?? null;
      if (r.data && iterations > 1 && i < iterations - 1) {
        console.log((r.data as { masterPrompt: string }).masterPrompt?.slice(0, 500) ?? '');
        console.log('...');
      }
    }
    if (lastData) {
      if (cmd === 'optimize' && opts.diff !== undefined && opts.diff !== '') {
        console.log('--- DIFF (önceki → şimdiki) ---');
        console.log('(Gerçek zamanlı diff için: npx tsx cli/sr.ts diff <id> --v1 <ver> --v2 <ver> --format html)');
      }
      console.log('--- MASTER PROMPT ---');
      console.log(lastData.masterPrompt);
      if (lastData.reasoning) {
        console.log('\n--- REASONING ---');
        console.log(lastData.reasoning);
      }
    }
    process.exit(0);
  }

  if (cmd === 'diff') {
    const id = opts.id ?? rest[0];
    const v1 = opts.v1;
    const v2 = opts.v2;
    const format = (opts.format || 'json').toLowerCase();
    if (!id || !v1 || !v2) {
      console.error('diff <id> --v1 <ver> --v2 <ver> gerekli');
      process.exit(1);
    }
    if (format === 'mermaid' || format === 'html') {
      const path = `/prompts/${encodeURIComponent(id)}/diff/export?format=${format}&v1=${encodeURIComponent(v1)}&v2=${encodeURIComponent(v2)}`;
      const r = await request<string>('GET', path);
      if (!r.ok) {
        console.error('Diff export error:', r.error ?? r.status);
        process.exit(1);
      }
      console.log(typeof r.data === 'string' ? r.data : JSON.stringify(r.data));
    } else {
      const path = `/prompts/${encodeURIComponent(id)}/diff?v1=${encodeURIComponent(v1)}&v2=${encodeURIComponent(v2)}`;
      const r = await request<{ changes: unknown[]; stats: Record<string, number> }>('GET', path);
      if (!r.ok) {
        console.error('Diff error:', r.error ?? r.status);
        process.exit(1);
      }
      console.log(JSON.stringify(r.data, null, 2));
    }
    process.exit(0);
  }

  if (cmd === 'test') {
    let intent = opts.intent ?? rest.find((x) => !x.startsWith('--') && x !== 'test');
    if (!intent) {
      console.error('--intent gerekli');
      process.exit(1);
    }
    const vars = parseVarArgs(rest);
    for (const [k, v] of Object.entries(vars)) {
      intent = (intent as string).replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), v);
      intent = (intent as string).replace(new RegExp(`\\$\\{${k}\\}`, 'g'), v);
    }
    const r = await request<{ masterPrompt: string; reasoning?: string }>('POST', '/generate', {
      intent,
      framework: opts.framework || 'AUTO',
      domainId: opts.domainId || 'auto',
      provider: opts.provider || 'groq',
      language: opts.language === 'tr' ? 'tr' : 'en',
    });
    if (!r.ok) {
      console.error('Test error:', r.error ?? r.status);
      process.exit(1);
    }
    const d = r.data!;
    console.log('--- TEST ÇIKTISI ---');
    console.log(d.masterPrompt?.slice(0, 2000) ?? '');
    if (d.masterPrompt && d.masterPrompt.length > 2000) console.log('\n... (kesik)');
    process.exit(0);
  }

  if (cmd === 'list') {
    const r = await request<{ prompts: { id: string; version: string; name?: string }[] }>('GET', '/prompts');
    if (!r.ok) {
      console.error('List error:', r.error ?? r.status);
      process.exit(1);
    }
    const prompts = (r.data as { prompts: { id: string; version: string; name?: string }[] })?.prompts ?? [];
    console.log(prompts.length ? prompts.map((p) => `${p.id}@${p.version} ${p.name ?? ''}`).join('\n') : '(boş)');
    process.exit(0);
  }

  if (cmd === 'get') {
    const id = opts.id ?? rest[0];
    if (!id) {
      console.error('id gerekli (get <id> veya --id <id>)');
      process.exit(1);
    }
    const path = opts.version ? `/prompts/${id}?version=${encodeURIComponent(opts.version)}` : `/prompts/${id}`;
    const r = await request<{ masterPrompt: string; reasoning?: string }>('GET', path);
    if (!r.ok) {
      console.error('Get error:', r.error ?? r.status);
      process.exit(1);
    }
    const d = r.data as { masterPrompt: string; reasoning?: string };
    console.log(d?.masterPrompt ?? '');
    process.exit(0);
  }

  if (cmd === 'save') {
    const { id, version, masterPrompt, name, reasoning } = opts;
    if (!id || !version || !masterPrompt) {
      console.error('--id, --version, --masterPrompt gerekli');
      process.exit(1);
    }
    const r = await request('POST', '/prompts', {
      id,
      version,
      masterPrompt,
      name: name || undefined,
      reasoning: reasoning || undefined,
      meta: opts.meta ? JSON.parse(opts.meta) : undefined,
    });
    if (!r.ok) {
      console.error('Save error:', r.error ?? r.status);
      process.exit(1);
    }
    console.log('Saved:', (r.data as { id: string; version: string })?.id, (r.data as { version: string })?.version);
    process.exit(0);
  }

  if (cmd === 'delete') {
    const id = opts.id ?? rest[0];
    if (!id) {
      console.error('id gerekli (delete <id> veya --id <id>)');
      process.exit(1);
    }
    const path = opts.version ? `/prompts/${id}?version=${encodeURIComponent(opts.version)}` : `/prompts/${id}`;
    const r = await request('DELETE', path);
    if (!r.ok) {
      console.error('Delete error:', r.error ?? r.status);
      process.exit(1);
    }
    console.log('Deleted:', id);
    process.exit(0);
  }

  if (cmd === 'runs') {
    const sub = rest.find((x) => !x.startsWith('--')) ?? opts.subcmd;
    if (sub === 'create') {
      const intent = opts.intent ?? rest.find((x) => !x.startsWith('--') && x !== 'create');
      if (!intent) {
        console.error('--intent gerekli');
        process.exit(1);
      }
      const r = await request<{ runId: string; status: string; finalPrompt?: { masterPrompt: string } }>('POST', '/runs', {
        intent,
        framework: opts.framework || 'AUTO',
        domainId: opts.domainId || 'auto',
        provider: opts.provider || 'groq',
        workflowPreset: opts.workflowPreset || 'quick',
        projectId: opts.projectId || undefined,
      });
      if (!r.ok) {
        console.error('Run error:', r.error ?? r.status);
        process.exit(1);
      }
      const d = r.data!;
      console.log('RunId:', d.runId, 'Status:', d.status);
      if (d.finalPrompt?.masterPrompt) {
        console.log('\n--- MASTER PROMPT ---');
        console.log(d.finalPrompt.masterPrompt);
      }
    } else if (sub === 'list') {
      const projectId = opts.projectId ? `?projectId=${opts.projectId}` : '';
      const r = await request<{ runs: { runId: string; status: string; intentCompressed?: string }[] }>('GET', `/runs${projectId}`);
      if (!r.ok) {
        console.error('List error:', r.error ?? r.status);
        process.exit(1);
      }
      const runs = r.data?.runs ?? [];
      console.log(runs.length ? runs.map((r) => `${r.runId} ${r.status} ${(r.intentCompressed ?? '').slice(0, 60)}`).join('\n') : '(boş)');
    } else if (sub === 'get') {
      const runId = opts.runId ?? rest[rest.indexOf('get') + 1] ?? rest[1];
      if (!runId) {
        console.error('runId gerekli (runs get <runId>)');
        process.exit(1);
      }
      const r = await request<{ runId: string; status: string; stepOutputs?: unknown[]; intent?: string }>('GET', `/runs/${runId}`);
      if (!r.ok) {
        console.error('Get error:', r.error ?? r.status);
        process.exit(1);
      }
      const d = r.data!;
      console.log(JSON.stringify(d, null, 2));
    } else {
      console.error('runs create|list|get');
      process.exit(1);
    }
    process.exit(0);
  }

  if (cmd === 'usage') {
    const r = await request<{ orgId: string; plan: string; requestCount: number; tokenCount: number }>('GET', '/usage');
    if (!r.ok) {
      console.error('Usage error:', r.error ?? r.status);
      process.exit(1);
    }
    const d = r.data!;
    console.log('Org:', d.orgId, '| Plan:', d.plan, '| Requests:', d.requestCount, '| Tokens:', d.tokenCount);
    process.exit(0);
  }

  console.error('Bilinmeyen komut:', cmd);
  usage();
  process.exit(1);
}

main();
