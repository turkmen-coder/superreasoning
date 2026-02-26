/**
 * OpenAI Agent SDK Service — Prompt kütüphanesini kullanan akıllı agent.
 *
 * Tools:
 *   - search_prompts: Semantik arama ile prompt bul
 *   - get_prompt: ID ile prompt detayı getir
 *   - list_categories: Tüm kategorileri listele
 *   - recommend_prompts: Kullanım senaryosuna göre prompt öner
 *   - parse_prompt: PyParsing-inspired yapısal analiz (AST)
 *   - extract_variables: Değişken çıkarımı ve tip tahmini
 *   - transform_prompt: Format dönüşümü (markdown→JSON, flat→structured, multiturn)
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';
import { generateEmbedding } from '../server/lib/embeddings';
import { getVectorStore } from '../server/lib/vectorStore';
import { loadPromptCorpus, getPromptCorpusTarget } from '../server/lib/promptCorpus';
import { enrichMasterPrompt } from '../server/lib/enrichment';
import { analyzeWithLangExtract } from '../server/lib/langextract/client';

// ---------- Lazy Prompt Data ----------

let promptsLoaded = false;
const PROMPT_TARGET = getPromptCorpusTarget();
const promptMap = new Map<string, {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  categoryEn: string;
  prompt: string;
  promptEn: string;
  tags: string[];
}>();
const categories = new Set<string>();

async function ensurePrompts() {
  if (promptsLoaded) return;
  const corpus = await loadPromptCorpus(PROMPT_TARGET);
  for (const p of corpus) {
    promptMap.set(p.id, {
      id: p.id,
      name: p.name,
      nameEn: p.nameEn,
      category: p.category,
      categoryEn: p.categoryEn,
      prompt: p.prompt,
      promptEn: p.promptEn,
      tags: p.tags,
    });
    if (p.categoryEn) categories.add(p.categoryEn);
  }
  promptsLoaded = true;
}

// ---------- Tools ----------

const searchPromptsTool = tool({
  name: 'search_prompts',
  description: 'Search the prompt library using semantic similarity. Returns top matching prompts with scores. Use this when the user asks to find prompts about a topic.',
  parameters: z.object({
    query: z.string().describe('Natural language search query'),
    topK: z.number().min(1).max(20).default(5).describe('Number of results to return'),
  }),
  execute: async (input) => {
    const store = getVectorStore();
    if (!store || !store.isReady() || store.count() === 0) {
      return JSON.stringify({ error: 'Vector store not ready. Prompts not yet indexed.' });
    }

    const queryVector = await generateEmbedding(input.query);
    const results = await store.search(queryVector, input.topK);

    await ensurePrompts();

    const enriched = results.map((r) => {
      const full = promptMap.get(r.id);
      return {
        id: r.id,
        score: Math.round(r.score * 10000) / 10000,
        name: full?.nameEn ?? r.metadata.name,
        category: full?.categoryEn ?? r.metadata.category,
        tags: full?.tags ?? r.metadata.tags,
        prompt: full?.promptEn ?? '',
      };
    });

    return JSON.stringify({ results: enriched, total: enriched.length });
  },
});

const getPromptTool = tool({
  name: 'get_prompt',
  description: 'Get full details of a specific prompt by its ID. Use when you need the complete prompt text.',
  parameters: z.object({
    promptId: z.string().describe('The prompt ID (e.g. "nlm-gold-source")'),
  }),
  execute: async (input) => {
    await ensurePrompts();
    const p = promptMap.get(input.promptId);
    if (!p) return JSON.stringify({ error: `Prompt not found: ${input.promptId}` });
    return JSON.stringify(p);
  },
});

const listCategoriesTool = tool({
  name: 'list_categories',
  description: 'List all available prompt categories in the library. Use to understand what types of prompts exist.',
  parameters: z.object({}),
  execute: async () => {
    await ensurePrompts();
    return JSON.stringify({
      categories: Array.from(categories).sort(),
      total: categories.size,
      totalPrompts: promptMap.size,
    });
  },
});

const recommendPromptsTool = tool({
  name: 'recommend_prompts',
  description: 'Get prompt recommendations for a specific use case or scenario. Searches by category and tags with keyword matching.',
  parameters: z.object({
    useCase: z.string().describe('Description of the use case (e.g. "reducing hallucination", "academic writing")'),
    category: z.string().nullable().default(null).describe('Optional category filter, null if not needed'),
    maxResults: z.number().min(1).max(20).default(5),
  }),
  execute: async (input) => {
    await ensurePrompts();

    let candidates = Array.from(promptMap.values());

    if (input.category && input.category !== '') {
      const cat = input.category.toLowerCase();
      candidates = candidates.filter(
        (p) => p.categoryEn.toLowerCase().includes(cat) || p.category.toLowerCase().includes(cat),
      );
    }

    const keywords = input.useCase.toLowerCase().split(/\s+/);
    const scored = candidates.map((p) => {
      const text = `${p.promptEn} ${p.nameEn} ${p.tags.join(' ')}`.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) score++;
      }
      return { ...p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, input.maxResults).filter((s) => s.score > 0);

    return JSON.stringify({
      results: top.map((p) => ({
        id: p.id,
        name: p.nameEn,
        category: p.categoryEn,
        tags: p.tags,
        prompt: p.promptEn,
        relevanceScore: p.score,
      })),
      total: top.length,
    });
  },
});

const enrichPromptTool = tool({
  name: 'enrich_prompt',
  description: 'Enrich a master prompt using ambiguity detection + prompt library integration. Use this when the user asks for improving an existing prompt.',
  parameters: z.object({
    masterPrompt: z.string().describe('Master prompt text to enrich'),
    domainId: z.string().nullable().default(null).describe('Optional domain id'),
    framework: z.string().nullable().default(null).describe('Optional framework'),
    mode: z.enum(['fast', 'deep']).default('fast').describe('Enrichment depth'),
  }),
  execute: async (input) => {
    const result = await enrichMasterPrompt(input.masterPrompt, {
      domainId: input.domainId ?? undefined,
      framework: input.framework ?? undefined,
      config: { mode: input.mode },
      language: 'en',
    });
    return JSON.stringify({
      enrichedPrompt: result.enrichedPrompt,
      metrics: result.metrics,
      integratedPrompts: result.integratedPrompts.map((p) => ({
        promptId: p.promptId,
        promptName: p.promptName,
        targetSection: p.targetSection,
        relevanceScore: p.relevanceScore,
      })),
    });
  },
});

const analyzePromptTextTool = tool({
  name: 'analyze_prompt_text',
  description: 'Analyze a prompt text using LangExtract to identify roles, constraints, placeholders, guardrails, output format hints, and variables. Use this when the user wants structural analysis of a prompt.',
  parameters: z.object({
    text: z.string().describe('The prompt text to analyze'),
    language: z.enum(['tr', 'en']).default('en').describe('Analysis language'),
  }),
  execute: async (input) => {
    const result = await analyzeWithLangExtract(input.text, input.language);
    return JSON.stringify({
      enabled: result.enabled,
      model: result.model,
      items: result.items.map((item) => ({
        class: item.extractionClass,
        text: item.extractionText,
        attributes: item.attributes,
      })),
      keywords: result.keywords,
      summary: result.summary,
      error: result.error,
    });
  },
});

// ---------- Agent ----------

import { parsePromptTool, extractVariablesTool, transformPromptTool } from './agentTools';

const AGENT_TOOLS = [searchPromptsTool, getPromptTool, listCategoriesTool, recommendPromptsTool, enrichPromptTool, analyzePromptTextTool, parsePromptTool, extractVariablesTool, transformPromptTool];

export interface AgentRunContext {
  currentPrompt?: string;
  domainId?: string;
  framework?: string;
  analyticsSnapshot?: {
    totalGenerations?: number;
    overallSuccessRate?: number;
    overallEditRate?: number;
    avgLatencyMs?: number;
    topDomains?: Array<{ domain: string; successRate: number; count: number }>;
    topFrameworks?: Array<{ framework: string; editRate: number; count: number }>;
    topProviders?: Array<{ provider: string; successRate: number; count: number }>;
  };
}

function buildContextBlock(language: 'tr' | 'en', context?: AgentRunContext): string {
  if (!context) return '';

  const parts: string[] = [];
  if (context.currentPrompt) {
    parts.push(
      language === 'tr'
        ? `Mevcut prompt:\n"""${context.currentPrompt}"""`
        : `Current prompt:\n"""${context.currentPrompt}"""`,
    );
  }
  if (context.domainId || context.framework) {
    parts.push(
      language === 'tr'
        ? `Bağlam: domain=${context.domainId ?? 'n/a'}, framework=${context.framework ?? 'n/a'}`
        : `Context: domain=${context.domainId ?? 'n/a'}, framework=${context.framework ?? 'n/a'}`,
    );
  }
  if (context.analyticsSnapshot) {
    parts.push(
      language === 'tr'
        ? `Analitik özet (dashboard):
${JSON.stringify(context.analyticsSnapshot, null, 2)}`
        : `Analytics snapshot (dashboard):
${JSON.stringify(context.analyticsSnapshot, null, 2)}`,
    );
  }
  if (parts.length === 0) return '';

  return language === 'tr'
    ? `\n\nEk bağlam (kullan ve yanıtını buna göre optimize et):\n${parts.join('\n\n')}`
    : `\n\nAdditional context (use this to optimize your answer):\n${parts.join('\n\n')}`;
}

function createPromptAgent(language: 'tr' | 'en' = 'en', context?: AgentRunContext): InstanceType<typeof Agent> {
  const instructions = language === 'tr'
    ? `Sen bir prompt mühendisliği asistanısın. ${PROMPT_TARGET.toLocaleString('tr-TR')}+ promptluk bir kütüphaneye erişimin var.

Görevlerin:
1. Kullanıcının ihtiyacına göre en uygun promptları bul ve öner
2. Prompt'ları açıkla ve nasıl kullanılacağını anlat
3. Farklı senaryolar için prompt kombinasyonları öner
4. Kategorileri ve etiketleri kullanarak doğru yönlendirme yap

Her zaman önce search_prompts ile semantik arama yap, sonra get_prompt ile detayları getir.
Kullanıcı mevcut bir prompt iyileştirmesi isterse enrich_prompt tool'unu kullan.
Kullanıcı bir prompt'un yapısal analizini isterse analyze_prompt_text tool'unu kullan (rol, kısıt, değişken, guardrail tespiti).
Kullanıcı bir prompt'un detaylı yapısal analizini (AST, bölüm, rol, kısıt, kalite metrikleri) isterse parse_prompt tool'unu kullan.
Kullanıcı değişken/placeholder analizi isterse extract_variables tool'unu kullan (tip tahmini, required/optional, stil tespiti).
Kullanıcı bir prompt'u farklı formata dönüştürmek isterse transform_prompt tool'unu kullan (markdown→JSON, düz metin→yapılandırılmış, tek→çoklu tur, değişken normalizasyonu).
Analitik bağlam verilmişse düşük başarı/ yüksek edit oranı sinyallerini dikkate alarak önerilerini net biçimde gerekçelendir.
Yanıtlarını Türkçe ver. Prompt içeriklerini olduğu gibi göster (İngilizce kalabilir).
Kısa ve net ol.${buildContextBlock('tr', context)}`
    : `You are a prompt engineering assistant with access to a library of ${PROMPT_TARGET.toLocaleString('en-US')}+ prompts.

Your tasks:
1. Find and recommend the most relevant prompts for the user's needs
2. Explain prompts and how to use them effectively
3. Suggest prompt combinations for different scenarios
4. Guide users using categories and tags

Always use search_prompts for semantic search first, then get_prompt for full details.
Use enrich_prompt when the user asks to improve an existing prompt.
Use analyze_prompt_text when the user asks for structural analysis of a prompt (roles, constraints, variables, guardrails detection).
Use parse_prompt for deep structural analysis — it produces an AST with sections, roles, constraints, output formats, examples, variables, CoT markers, guardrails, and quality metrics.
Use extract_variables for deep placeholder/variable analysis — detects multiple placeholder styles with type inference, required/optional detection, and default values.
Use transform_prompt to convert prompts between formats: markdown_to_json, flat_to_structured, single_to_multiturn, normalize_variables.
If analytics context is provided, prioritize recommendations based on low success/high edit signals and explain why.
Be concise and actionable. Show prompt contents as-is.${buildContextBlock('en', context)}`;

  return new Agent({
    name: 'PromptLibraryAgent',
    instructions,
    model: 'gpt-4o-mini',
    tools: AGENT_TOOLS,
  });
}

// ---------- Public API ----------

export interface AgentRunResult {
  answer: string;
  toolCalls: Array<{ tool: string; input: unknown; output: string }>;
  model: string;
  enrichedPrompt?: string;
}

function shouldTryDirectEnrichment(query: string, context?: AgentRunContext): boolean {
  if (!context?.currentPrompt) return false;
  const q = query.toLowerCase();
  return [
    'zenginleştir',
    'zenginlestir',
    'iyileştir',
    'iyilestir',
    'enrich',
    'improve',
    'refine',
    'enhance',
  ].some((k) => q.includes(k));
}

export async function runPromptAgent(
  query: string,
  language: 'tr' | 'en' = 'en',
  context?: AgentRunContext,
): Promise<AgentRunResult> {
  await ensurePrompts();

  const agent = createPromptAgent(language, context);
  const result = await run(agent, query);
  let enrichedPrompt: string | undefined;

  if (shouldTryDirectEnrichment(query, context)) {
    try {
      const mode = query.toLowerCase().includes('deep') || query.toLowerCase().includes('derin')
        ? 'deep'
        : 'fast';
      const enriched = await enrichMasterPrompt(context!.currentPrompt!, {
        domainId: context?.domainId,
        framework: context?.framework,
        language,
        config: { mode },
      });
      if (enriched.integratedPrompts.length > 0 && enriched.enrichedPrompt.trim()) {
        enrichedPrompt = enriched.enrichedPrompt;
      }
    } catch {
      // Agent cevabını bozma: zenginleştirme başarısızsa normal cevap devam eder.
    }
  }

  return {
    answer: typeof result.finalOutput === 'string' ? result.finalOutput : '',
    toolCalls: [],
    model: 'gpt-4o-mini',
    enrichedPrompt,
  };
}

export function getAgentStatus() {
  const vectorStore = getVectorStore();
  const vectorIndexedCount = vectorStore?.isReady() ? vectorStore.count() : 0;
  const indexedPromptCount = promptMap.size;
  const coverageBase = Math.max(1, PROMPT_TARGET);
  const coveragePercent = Math.min(100, Math.round((indexedPromptCount / coverageBase) * 100));

  return {
    ready: true,
    sdk: '@openai/agents',
    model: 'gpt-4o-mini',
    tools: AGENT_TOOLS.map((t) => t.name),
    promptsLoaded,
    promptCount: promptMap.size,
    targetPromptCount: PROMPT_TARGET,
    indexedPromptCount,
    vectorIndexedCount,
    coveragePercent,
    categories: Array.from(categories).sort(),
  };
}
