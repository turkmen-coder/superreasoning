/**
 * Tüm Veri Setlerini Prompt Kütüphanesine Aktarma Script'i
 *
 * Bu script projedeki tüm veri setlerini okuyarak .prompts/index.json'a aktarır:
 *  1. data/prompts.csv                               — 154 "Act as..." prompt
 *  2. data/prompts-chat-import.json                   — prompts.chat sistem prompt'ları
 *  3. archive (5)/data/llm_system_prompts_lookup.csv  — LLM sistem talimatları
 *  4. archive (5)/data/llm_system_instruction_tuning_samples.csv — SFT kalıpları
 *  5. archive (5)/data/llm_system_interactions.csv    — Etkileşim verisi
 *  6. archive (5)/data/llm_system_sessions_summary.csv — Oturum analitikleri
 *  7. archive (5)/data/llm_system_users_summary.csv   — Kullanıcı analitikleri
 *  8. train_v2_drcat_02.csv                           — Makale eğitim verisi
 *  9. data/datasetPrompts.ts içerikleri (TypeScript modül)
 *
 * Kullanım: npm run import:all-datasets
 *           npx tsx server/scripts/import-all-datasets.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ALL_DATASET_PROMPTS } from '../../data/datasetPrompts';

// ── Tipler ─────────────────────────────────────────────────────
interface StoredPrompt {
  id: string;
  version: string;
  name?: string;
  masterPrompt: string;
  reasoning?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

// ── Sabitler ───────────────────────────────────────────────────
const ROOT = process.cwd();
const PROMPTS_DIR = join(ROOT, '.prompts');
const INDEX_FILE = join(PROMPTS_DIR, 'index.json');
const NOW = new Date().toISOString();

// ── Yardımcı Fonksiyonlar ──────────────────────────────────────
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

/** CSV satırını çift tırnaklı alanlara parse eder */
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

/** Basit CSV okuyucu — büyük dosyalar için satır satır işler */
function readCSV(filePath: string): Array<Record<string, string>> {
  if (!existsSync(filePath)) {
    console.warn(`  ⚠ Dosya bulunamadı: ${filePath}`);
    return [];
  }
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════
// 1) data/prompts.csv — Awesome ChatGPT Prompts
// ═══════════════════════════════════════════════════════════════
function importAwesomeChatGPTPrompts(): StoredPrompt[] {
  console.log('\n📦 [1/8] data/prompts.csv — Awesome ChatGPT Prompts');
  const filePath = join(ROOT, 'data', 'prompts.csv');
  const rows = readCSV(filePath);
  const results: StoredPrompt[] = [];

  for (const row of rows) {
    const act = row['act']?.trim() ?? '';
    const prompt = row['prompt']?.trim() ?? '';
    if (!prompt || prompt.length < 20) continue;

    const id = `awesome-${slugify(act || prompt.slice(0, 40))}`;
    results.push({
      id,
      version: '1.0.0',
      name: act || prompt.split(/\n/)[0]?.slice(0, 120) || id,
      masterPrompt: prompt,
      meta: {
        intent: 'act-as',
        domainId: 'awesome-chatgpt-prompts',
        source: 'data/prompts.csv',
        language: 'en',
        tags: ['awesome-chatgpt-prompts', 'act-as', 'role-play'],
      },
      createdAt: NOW,
    });
  }

  console.log(`  → ${results.length} prompt çıkarıldı`);
  return results;
}

// ═══════════════════════════════════════════════════════════════
// 2) data/prompts-chat-import.json — prompts.chat
// ═══════════════════════════════════════════════════════════════
function importPromptsChatJSON(): StoredPrompt[] {
  console.log('\n📦 [2/8] data/prompts-chat-import.json — prompts.chat');
  const filePath = join(ROOT, 'data', 'prompts-chat-import.json');
  if (!existsSync(filePath)) {
    console.warn('  ⚠ Dosya bulunamadı');
    return [];
  }

  const data = JSON.parse(readFileSync(filePath, 'utf-8'));
  const items = data.prompts_chat_prompts ?? [];
  const results: StoredPrompt[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item?.value || item.value.length < 20) continue;

    const firstLine = item.value.split(/\n/)[0]?.trim().slice(0, 60) || 'prompt';
    const id = `pchat-${slugify(firstLine)}-${i}`;
    results.push({
      id,
      version: '1.0.0',
      name: item.value.split(/\n/)[0]?.trim().slice(0, 120) || id,
      masterPrompt: item.value,
      meta: {
        intent: 'system-prompt',
        domainId: 'prompts-chat',
        source: item.value_citation || 'data/prompts-chat-import.json',
        language: 'en',
        tags: ['prompts-chat', 'system-prompt'],
      },
      createdAt: NOW,
    });
  }

  console.log(`  → ${results.length} prompt çıkarıldı`);
  return results;
}

// ═══════════════════════════════════════════════════════════════
// 3) LLM Sistem Prompt Lookup (archive 5)
// ═══════════════════════════════════════════════════════════════
function importLLMSystemPrompts(): StoredPrompt[] {
  console.log('\n📦 [3/8] archive (5)/data/llm_system_prompts_lookup.csv');
  const filePath = join(ROOT, 'archive (5)', 'data', 'llm_system_prompts_lookup.csv');
  const rows = readCSV(filePath);
  const results: StoredPrompt[] = [];
  const seenTexts = new Set<string>();

  for (const row of rows) {
    const instructionText = row['instruction_text']?.trim() ?? '';
    const template = row['instruction_template'] ?? '';
    const useCase = row['use_case'] ?? '';
    const promptId = row['prompt_id'] ?? '';
    const nInteractions = parseInt(row['n_interactions'] ?? '0', 10);

    if (!instructionText || instructionText.length < 20) continue;

    // Benzersiz instruction_text + template kombinasyonunu al
    const key = `${instructionText}|${template}`;
    if (seenTexts.has(key)) continue;
    seenTexts.add(key);

    const id = `llm-sys-${slugify(template)}-${slugify(useCase)}`;
    results.push({
      id,
      version: '1.0.0',
      name: `LLM System: ${template} / ${useCase}`,
      masterPrompt: instructionText,
      reasoning: `Template: ${template}, Use case: ${useCase}, Interactions: ${nInteractions}`,
      meta: {
        intent: 'llm-system-instruction',
        domainId: 'llm-system-prompts',
        source: 'archive (5)/data/llm_system_prompts_lookup.csv',
        language: 'en',
        tags: ['llm-system', 'instruction', template, useCase, 'production-data'],
        promptId,
        nInteractions,
      },
      createdAt: NOW,
    });
  }

  console.log(`  → ${results.length} benzersiz template/use_case kombinasyonu çıkarıldı`);
  return results;
}

// ═══════════════════════════════════════════════════════════════
// 4) SFT Instruction Tuning Samples (archive 5)
//    Benzersiz instruction_text + sft_user_prompt kalıpları
// ═══════════════════════════════════════════════════════════════
function importSFTSamples(): StoredPrompt[] {
  console.log('\n📦 [4/8] archive (5)/data/llm_system_instruction_tuning_samples.csv — SFT Samples');
  const filePath = join(ROOT, 'archive (5)', 'data', 'llm_system_instruction_tuning_samples.csv');
  const rows = readCSV(filePath);
  const results: StoredPrompt[] = [];
  const seenInstructions = new Set<string>();
  const seenUserPrompts = new Set<string>();

  // Benzersiz instruction metinlerini çıkar
  for (const row of rows) {
    const instruction = row['instruction_text']?.trim() ?? '';
    if (instruction && instruction.length >= 30 && !seenInstructions.has(instruction)) {
      seenInstructions.add(instruction);
      const useCase = row['use_case'] ?? 'general';
      const id = `sft-inst-${slugify(instruction.slice(0, 40))}-${seenInstructions.size}`;
      results.push({
        id,
        version: '1.0.0',
        name: `SFT Instruction: ${instruction.slice(0, 80)}`,
        masterPrompt: instruction,
        meta: {
          intent: 'sft-instruction',
          domainId: 'instruction-tuning',
          source: 'archive (5)/data/llm_system_instruction_tuning_samples.csv',
          language: 'en',
          tags: ['sft', 'instruction-tuning', useCase],
        },
        createdAt: NOW,
      });
    }
  }

  // Benzersiz SFT user prompt kalıplarını çıkar (ilk 200 benzersiz)
  let userPromptCount = 0;
  for (const row of rows) {
    if (userPromptCount >= 200) break;
    const userPrompt = row['sft_user_prompt']?.trim() ?? '';
    if (!userPrompt || userPrompt.length < 30) continue;

    // İlk satırı anahtar olarak kullan
    const key = userPrompt.slice(0, 100).toLowerCase();
    if (seenUserPrompts.has(key)) continue;
    seenUserPrompts.add(key);

    const useCase = row['use_case'] ?? 'general';
    const impact = row['business_impact_tag'] ?? 'medium';
    const id = `sft-user-${slugify(userPrompt.slice(0, 40))}-${userPromptCount}`;
    results.push({
      id,
      version: '1.0.0',
      name: `SFT User: ${userPrompt.split(/\n/)[0]?.slice(0, 80)}`,
      masterPrompt: userPrompt,
      meta: {
        intent: 'sft-user-prompt',
        domainId: 'instruction-tuning',
        source: 'archive (5)/data/llm_system_instruction_tuning_samples.csv',
        language: 'en',
        tags: ['sft', 'user-prompt', useCase, `impact-${impact}`],
      },
      createdAt: NOW,
    });
    userPromptCount++;
  }

  console.log(`  → ${seenInstructions.size} benzersiz instruction + ${userPromptCount} user prompt çıkarıldı`);
  return results;
}

// ═══════════════════════════════════════════════════════════════
// 5) LLM Etkileşim Verileri — benzersiz request kalıpları
// ═══════════════════════════════════════════════════════════════
function importInteractionPatterns(): StoredPrompt[] {
  console.log('\n📦 [5/8] archive (5)/data/llm_system_interactions.csv — Request Patterns');
  const filePath = join(ROOT, 'archive (5)', 'data', 'llm_system_interactions.csv');
  const rows = readCSV(filePath);
  const results: StoredPrompt[] = [];
  const seenTemplates = new Set<string>();

  // Benzersiz request_text_template kalıplarını çıkar
  let count = 0;
  for (const row of rows) {
    if (count >= 300) break;
    const template = row['request_text_template']?.trim() ?? '';
    const requestText = row['request_text']?.trim() ?? '';
    const text = template || requestText;

    if (!text || text.length < 20) continue;
    const key = text.slice(0, 80).toLowerCase();
    if (seenTemplates.has(key)) continue;
    seenTemplates.add(key);

    const useCase = row['use_case'] ?? 'general';
    const provider = row['model_provider'] ?? '';
    const model = row['model_name'] ?? '';
    const quality = parseFloat(row['response_quality_score'] ?? '0');

    const id = `interaction-${slugify(text.slice(0, 40))}-${count}`;
    results.push({
      id,
      version: '1.0.0',
      name: `Request: ${text.split(/\n/)[0]?.slice(0, 80)}`,
      masterPrompt: text,
      reasoning: `Model: ${provider}/${model}, Quality: ${quality.toFixed(2)}`,
      meta: {
        intent: 'interaction-pattern',
        domainId: 'llm-interactions',
        source: 'archive (5)/data/llm_system_interactions.csv',
        language: 'en',
        tags: ['interaction', 'request-pattern', useCase],
        modelProvider: provider,
        modelName: model,
        qualityScore: quality,
      },
      createdAt: NOW,
    });
    count++;
  }

  console.log(`  → ${count} benzersiz request kalıbı çıkarıldı`);
  return results;
}

// ═══════════════════════════════════════════════════════════════
// 6) Oturum & Kullanıcı Analitik Meta-Prompt'ları
// ═══════════════════════════════════════════════════════════════
function importAnalyticsMetaPrompts(): StoredPrompt[] {
  console.log('\n📦 [6/8] archive (5)/data/sessions & users — Analytics Meta-Prompts');
  const results: StoredPrompt[] = [];

  // Sessions summary — benzersiz use_case + channel kombinasyonları
  const sessionsPath = join(ROOT, 'archive (5)', 'data', 'llm_system_sessions_summary.csv');
  const sessRows = readCSV(sessionsPath);
  const useCaseChannels = new Map<string, { count: number; avgCsat: number; avgLatency: number }>();

  for (const row of sessRows) {
    const uc = row['use_case'] ?? '';
    const ch = row['channel'] ?? '';
    const key = `${uc}|${ch}`;
    const existing = useCaseChannels.get(key) || { count: 0, avgCsat: 0, avgLatency: 0 };
    existing.count++;
    existing.avgCsat += parseFloat(row['csat_mean'] ?? '0') || 0;
    existing.avgLatency += parseFloat(row['avg_latency_ms'] ?? '0') || 0;
    useCaseChannels.set(key, existing);
  }

  for (const [key, stats] of useCaseChannels) {
    const [useCase, channel] = key.split('|');
    if (!useCase || !channel) continue;
    const avgCsat = stats.count > 0 ? (stats.avgCsat / stats.count).toFixed(2) : '0';
    const avgLatency = stats.count > 0 ? Math.round(stats.avgLatency / stats.count) : 0;

    const id = `analytics-${slugify(useCase)}-${slugify(channel)}`;
    results.push({
      id,
      version: '1.0.0',
      name: `Analytics: ${useCase} via ${channel}`,
      masterPrompt: `LLM Analytics Profile — Use case: ${useCase}, Channel: ${channel}. Sessions: ${stats.count}, Avg CSAT: ${avgCsat}, Avg Latency: ${avgLatency}ms. This profile represents production usage patterns for optimizing prompt strategies in ${useCase} scenarios delivered via ${channel}.`,
      meta: {
        intent: 'analytics-profile',
        domainId: 'llm-analytics',
        source: 'archive (5)/data/llm_system_sessions_summary.csv',
        language: 'en',
        tags: ['analytics', 'session', useCase, channel],
        sessions: stats.count,
        avgCsat: parseFloat(avgCsat),
        avgLatencyMs: avgLatency,
      },
      createdAt: NOW,
    });
  }

  // Users summary — segment bazlı meta-prompt'lar
  const usersPath = join(ROOT, 'archive (5)', 'data', 'llm_system_users_summary.csv');
  const userRows = readCSV(usersPath);
  const segments = new Map<string, { count: number; avgCost: number; avgTokens: number }>();

  for (const row of userRows) {
    const seg = row['dominant_segment'] ?? '';
    const tier = row['dominant_account_tier'] ?? '';
    const key = `${seg}|${tier}`;
    const existing = segments.get(key) || { count: 0, avgCost: 0, avgTokens: 0 };
    existing.count++;
    existing.avgCost += parseFloat(row['total_cost_usd'] ?? '0') || 0;
    existing.avgTokens += parseFloat(row['total_tokens'] ?? '0') || 0;
    segments.set(key, existing);
  }

  for (const [key, stats] of segments) {
    const [segment, tier] = key.split('|');
    if (!segment || !tier) continue;
    const avgCost = stats.count > 0 ? (stats.avgCost / stats.count).toFixed(4) : '0';
    const avgTokens = stats.count > 0 ? Math.round(stats.avgTokens / stats.count) : 0;

    const id = `user-seg-${slugify(segment)}-${slugify(tier)}`;
    results.push({
      id,
      version: '1.0.0',
      name: `User Segment: ${segment} / ${tier}`,
      masterPrompt: `LLM User Segment Profile — Segment: ${segment}, Tier: ${tier}. Users: ${stats.count}, Avg Cost: $${avgCost}, Avg Tokens: ${avgTokens}. Use this profile for tailoring prompt strategies, SLA definitions, and cost budgets for ${segment} users on ${tier} plans.`,
      meta: {
        intent: 'user-segment',
        domainId: 'llm-analytics',
        source: 'archive (5)/data/llm_system_users_summary.csv',
        language: 'en',
        tags: ['analytics', 'user-segment', segment, tier],
        userCount: stats.count,
        avgCostUsd: parseFloat(avgCost),
        avgTokens,
      },
      createdAt: NOW,
    });
  }

  console.log(`  → ${results.length} analitik profil çıkarıldı`);
  return results;
}

// ═══════════════════════════════════════════════════════════════
// 7) Makale Eğitim Verisi — benzersiz prompt kalıpları
// ═══════════════════════════════════════════════════════════════
function importEssayPromptPatterns(): StoredPrompt[] {
  console.log('\n📦 [7/8] train_v2_drcat_02.csv — Essay Prompt Patterns');
  const filePath = join(ROOT, 'train_v2_drcat_02.csv');
  const rows = readCSV(filePath);
  const results: StoredPrompt[] = [];
  const seenPromptNames = new Set<string>();

  // Benzersiz prompt_name'leri çıkar (sadece isim bazlı — kaynak bazlı değil)
  // Her prompt_name için en iyi örnek metni seç
  const promptMap = new Map<string, { labels: Set<string>; sources: Set<string>; sampleText: string }>();

  for (const row of rows) {
    const promptName = row['prompt_name']?.trim() ?? '';
    if (!promptName) continue;

    const key = promptName.toLowerCase();
    if (!promptMap.has(key)) {
      const text = row['text']?.trim() ?? '';
      promptMap.set(key, {
        labels: new Set(),
        sources: new Set(),
        sampleText: text ? text.slice(0, 200).replace(/\n/g, ' ') + '...' : '',
      });
    }
    const entry = promptMap.get(key)!;
    const label = row['label']?.trim();
    const source = row['source']?.trim();
    if (label) entry.labels.add(label);
    if (source) entry.sources.add(source);
  }

  // En fazla 500 benzersiz essay prompt al
  let count = 0;
  for (const [key, info] of promptMap) {
    if (count >= 500) break;

    const promptName = key;
    const labels = [...info.labels].join(', ');
    const sources = [...info.sources].join(', ');
    const id = `essay-${slugify(promptName)}`;

    // Aynı ID ile tekrar oluşturmayı önle
    if (seenPromptNames.has(id)) continue;
    seenPromptNames.add(id);

    results.push({
      id,
      version: '1.0.0',
      name: `Essay: ${promptName.slice(0, 80)}`,
      masterPrompt: `Write an essay about "${promptName}". ${info.sampleText ? `Example approach: "${info.sampleText}"` : ''} The essay should be well-structured with clear thesis, supporting arguments, and conclusion. Labels: ${labels || 'unspecified'}. Sources: ${sources || 'unknown'}.`,
      meta: {
        intent: 'essay-writing',
        domainId: 'essay-training-data',
        source: 'train_v2_drcat_02.csv',
        language: 'en',
        tags: ['essay', 'training-data', 'writing'],
        promptName,
        labels: [...info.labels],
        sources: [...info.sources],
      },
      createdAt: NOW,
    });
    count++;
  }

  console.log(`  → ${promptMap.size} benzersiz prompt_name, ${results.length} prompt oluşturuldu (max 500)`);
  return results;
}

// ═══════════════════════════════════════════════════════════════
// 8) datasetPrompts.ts — Önceden hazırlanmış prompt'lar
// ═══════════════════════════════════════════════════════════════
function importDatasetPromptsTS(): StoredPrompt[] {
  console.log('\n📦 [8/8] data/datasetPrompts.ts — Curated Dataset Prompts');
  const results: StoredPrompt[] = ALL_DATASET_PROMPTS.map(p => ({
    id: p.id,
    version: '1.0.0',
    name: p.name,
    masterPrompt: p.prompt,
    reasoning: p.promptEn,
    meta: {
      intent: p.category,
      intentEn: p.categoryEn,
      nameEn: p.nameEn,
      promptEn: p.promptEn,
      tags: p.tags,
      source: 'datasetPrompts.ts',
      language: 'tr',
    },
    createdAt: NOW,
  }));

  console.log(`  → ${results.length} curated prompt`);
  return results;
}

// ═══════════════════════════════════════════════════════════════
// ANA FONKSİYON
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Tüm Veri Setlerini Prompt Kütüphanesine Aktarma');
  console.log('  Super Reasoning v3.2 — Dataset Integration');
  console.log('═══════════════════════════════════════════════════════════');

  const existing = readIndex();
  const existingIds = new Set(existing.map(p => p.id));
  const existingTexts = new Set(
    existing.map(p => p.masterPrompt.slice(0, 100).toLowerCase())
  );
  console.log(`\nMevcut prompt sayısı: ${existing.length}`);

  // Tüm kaynaklardan prompt'ları topla
  const allCandidates: StoredPrompt[] = [
    ...importAwesomeChatGPTPrompts(),
    ...importPromptsChatJSON(),
    ...importLLMSystemPrompts(),
    ...importSFTSamples(),
    ...importInteractionPatterns(),
    ...importAnalyticsMetaPrompts(),
    ...importEssayPromptPatterns(),
    ...importDatasetPromptsTS(),
  ];

  console.log(`\n─────────────────────────────────────────────────────────`);
  console.log(`Toplam aday prompt: ${allCandidates.length}`);

  // Duplicate kontrolü
  const allNew: StoredPrompt[] = [];
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

  console.log(`Eklenen yeni prompt: ${added}`);
  console.log(`Atlanan (duplicate): ${skipped}`);

  if (added > 0) {
    const merged = [...existing, ...allNew];
    writeIndex(merged);
    console.log(`\n✅ Toplam ${merged.length} prompt kaydedildi (.prompts/index.json)`);
  } else {
    console.log(`\nℹ Yeni prompt eklenmedi — tüm veri zaten mevcut.`);
  }

  // Kaynak Özeti
  console.log('\n─── Kaynak Özeti ───');
  const srcMap: Record<string, number> = {};
  for (const p of allNew) {
    const src = (p.meta?.source as string) || 'unknown';
    srcMap[src] = (srcMap[src] || 0) + 1;
  }
  for (const [src, count] of Object.entries(srcMap).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${src}: ${count}`);
  }

  // Kategori Özeti
  console.log('\n─── Kategori Özeti ───');
  const catMap: Record<string, number> = {};
  for (const p of allNew) {
    const cat = (p.meta?.intent as string) || 'other';
    catMap[cat] = (catMap[cat] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(catMap).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Aktarma tamamlandı!');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
