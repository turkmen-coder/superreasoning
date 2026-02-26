#!/usr/bin/env node
/**
 * prompts.chat API'den tüm promptları çekip .prompts/index.json'a aktarır.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const API_BASE = 'https://prompts.chat/api/prompts';
const PROMPTS_DIR = join(process.cwd(), '.prompts');
const INDEX_FILE = join(PROMPTS_DIR, 'index.json');
const TOTAL_PAGES = 52;
const CONCURRENCY = 5; // parallel requests

async function fetchPage(page) {
  const url = `${API_BASE}?page=${page}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for page ${page}`);
      const data = await res.json();
      return Array.isArray(data) ? data : data.prompts || data.data || [];
    } catch (err) {
      console.error(`  Retry ${attempt + 1}/3 for page ${page}: ${err.message}`);
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  console.error(`  FAILED page ${page} after 3 attempts`);
  return [];
}

function transform(raw) {
  const tags = (raw.tags || [])
    .map(t => t.tag?.name || t.name || '')
    .filter(Boolean);

  return {
    id: raw.id || raw.slug || `prompt-${Date.now()}`,
    version: '1.0.0',
    name: raw.title || 'Untitled',
    masterPrompt: raw.content || '',
    reasoning: raw.description || undefined,
    meta: {
      intent: raw.category?.name || raw.category || undefined,
      framework: tags.length ? tags.join(', ') : undefined,
      domainId: raw.category?.slug || undefined,
      provider: (raw.bestWithModels || []).join(', ') || undefined,
      language: 'en',
    },
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

async function main() {
  console.log(`Fetching prompts from prompts.chat (${TOTAL_PAGES} pages)...`);

  const allRaw = [];

  // Fetch in batches of CONCURRENCY
  for (let start = 1; start <= TOTAL_PAGES; start += CONCURRENCY) {
    const end = Math.min(start + CONCURRENCY - 1, TOTAL_PAGES);
    const pages = [];
    for (let p = start; p <= end; p++) pages.push(p);

    const results = await Promise.all(pages.map(p => fetchPage(p)));
    for (const items of results) {
      allRaw.push(...items);
    }
    console.log(`  Pages ${start}-${end} done (total so far: ${allRaw.length})`);
  }

  console.log(`\nFetched ${allRaw.length} raw prompts. Transforming...`);

  // Filter out prompts without content
  const withContent = allRaw.filter(r => r.content && r.content.trim().length > 0);
  console.log(`  ${withContent.length} prompts with content`);

  // Transform
  const prompts = withContent.map(transform);

  // Deduplicate by id
  const seen = new Set();
  const unique = [];
  for (const p of prompts) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      unique.push(p);
    }
  }
  console.log(`  ${unique.length} unique prompts after dedup`);

  // Merge with existing prompts
  if (!existsSync(PROMPTS_DIR)) mkdirSync(PROMPTS_DIR, { recursive: true });

  let existing = [];
  if (existsSync(INDEX_FILE)) {
    try {
      const data = JSON.parse(readFileSync(INDEX_FILE, 'utf-8'));
      existing = Array.isArray(data.prompts) ? data.prompts : [];
    } catch {}
  }

  const existingIds = new Set(existing.map(p => p.id));
  const newPrompts = unique.filter(p => !existingIds.has(p.id));

  const merged = [...existing, ...newPrompts];
  writeFileSync(INDEX_FILE, JSON.stringify({ prompts: merged }, null, 2), 'utf-8');

  console.log(`\nDone!`);
  console.log(`  Existing: ${existing.length}`);
  console.log(`  New: ${newPrompts.length}`);
  console.log(`  Total: ${merged.length}`);
  console.log(`  Saved to: ${INDEX_FILE}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
