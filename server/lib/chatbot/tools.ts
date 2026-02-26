/**
 * Chatbot Agent Tools — 8 tools for the chatbot agent using @openai/agents SDK.
 */

import { tool } from '@openai/agents';
import { z } from 'zod';
import { generateEmbedding } from '../embeddings';
import { getVectorStore } from '../vectorStore';
import {
  APP_PAGES,
  FRAMEWORK_INFO,
  PROVIDER_INFO,
  DOMAIN_CATEGORIES,
} from './knowledgeBase';

// Lazy prompt data (same pattern as agentService.ts)
let promptsLoaded = false;
const promptMap = new Map<string, {
  id: string; name: string; nameEn: string;
  category: string; categoryEn: string;
  prompt: string; promptEn: string; tags: string[];
}>();

async function ensurePrompts() {
  if (promptsLoaded) return;
  const { NOTEBOOKLM_PROMPTS } = await import('../../../data/notebookLmPrompts');
  for (const p of NOTEBOOKLM_PROMPTS) {
    promptMap.set(p.id, {
      id: p.id, name: p.name, nameEn: p.nameEn,
      category: p.category, categoryEn: p.categoryEn,
      prompt: p.prompt, promptEn: p.promptEn, tags: p.tags,
    });
  }
  promptsLoaded = true;
}

// ---------- Tool 1: Navigate ----------

const navigateToPageTool = tool({
  name: 'navigate_to_page',
  description: 'Suggest navigating the user to a specific page in the app. Use when the user asks about a feature, wants to go somewhere, or would benefit from a different page.',
  parameters: z.object({
    pageId: z.string().describe('Page ID (e.g. "dashboard", "testing", "genetik")'),
    reason: z.string().describe('Brief reason why this page is relevant'),
  }),
  execute: async (input) => {
    const page = APP_PAGES.find(p => p.id === input.pageId);
    if (!page) return JSON.stringify({ error: `Unknown page: ${input.pageId}`, validPages: APP_PAGES.map(p => p.id) });
    return JSON.stringify({
      action: { type: 'navigate', label: `Go to ${page.name.en}`, params: { page: input.pageId } },
      page: { id: page.id, name: page.name, description: page.description, capabilities: page.capabilities },
      reason: input.reason,
    });
  },
});

// ---------- Tool 2: Search Prompts ----------

const searchPromptsTool = tool({
  name: 'search_prompts',
  description: 'Search the 1040+ prompt library using semantic similarity. Use when user asks to find, search, or look up prompts about a topic.',
  parameters: z.object({
    query: z.string().describe('Natural language search query'),
    topK: z.number().min(1).max(10).default(5).describe('Number of results'),
  }),
  execute: async (input) => {
    const store = getVectorStore();
    if (!store || !store.isReady() || store.count() === 0) {
      // Fallback to keyword search
      await ensurePrompts();
      const keywords = input.query.toLowerCase().split(/\s+/);
      const results = Array.from(promptMap.values())
        .map(p => {
          const text = `${p.promptEn} ${p.nameEn} ${p.tags.join(' ')}`.toLowerCase();
          let score = 0;
          for (const kw of keywords) if (text.includes(kw)) score++;
          return { ...p, score };
        })
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, input.topK);

      return JSON.stringify({ results: results.map(r => ({ id: r.id, name: r.nameEn, category: r.categoryEn, tags: r.tags, preview: r.promptEn.slice(0, 200) })), method: 'keyword' });
    }

    const queryVector = await generateEmbedding(input.query);
    const results = await store.search(queryVector, input.topK);
    await ensurePrompts();

    const enriched = results.map(r => {
      const full = promptMap.get(r.id);
      return {
        id: r.id,
        score: Math.round(r.score * 10000) / 10000,
        name: full?.nameEn ?? r.metadata.name,
        category: full?.categoryEn ?? r.metadata.category,
        tags: full?.tags ?? [],
        preview: (full?.promptEn ?? '').slice(0, 200),
      };
    });

    return JSON.stringify({ results: enriched, total: enriched.length, method: 'semantic' });
  },
});

// ---------- Tool 3: Recommend Framework ----------

const recommendFrameworkTool = tool({
  name: 'recommend_framework',
  description: 'Recommend the best strategic framework(s) based on the user intent and use case. Use when user asks which framework to use or needs guidance on framework selection.',
  parameters: z.object({
    intent: z.string().describe('What the user wants to achieve'),
    domain: z.string().nullable().default(null).describe('Domain context if known'),
  }),
  execute: async (input) => {
    const q = input.intent.toLowerCase();

    // Score each framework
    const scored = FRAMEWORK_INFO.map(f => {
      let score = 0;
      for (const bf of f.bestFor) {
        const words = bf.toLowerCase().split(/\s+/);
        for (const w of words) {
          if (w.length > 2 && q.includes(w)) score += 2;
        }
      }
      if (f.name.toLowerCase().includes(q)) score += 5;
      return { ...f, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.filter(s => s.score > 0).slice(0, 5);

    // If no match, suggest auto + some general ones
    if (top.length === 0) {
      return JSON.stringify({
        recommendations: [
          { id: 'AUTO', name: 'Auto', reason: 'Automatically selects the best framework for your intent', confidence: 'high' },
          { id: 'KERNEL', name: 'Kernel', reason: 'Good default for structured, technical prompts', confidence: 'medium' },
          { id: 'CHAIN_OF_THOUGHT', name: 'Chain of Thought', reason: 'Good for complex reasoning tasks', confidence: 'medium' },
        ],
        note: 'No strong match found. These are general recommendations.',
      });
    }

    return JSON.stringify({
      recommendations: top.map((f, i) => ({
        id: f.id,
        name: f.name,
        bestFor: f.bestFor,
        confidence: i === 0 ? 'high' : i < 3 ? 'medium' : 'low',
      })),
      action: { type: 'recommend_framework', label: `Use ${top[0].name}`, params: { framework: top[0].id } },
    });
  },
});

// ---------- Tool 4: Recommend Domain ----------

const recommendDomainTool = tool({
  name: 'recommend_domain',
  description: 'Recommend the best domain expertise area for the user task. Use when user asks which domain to pick.',
  parameters: z.object({
    intent: z.string().describe('What the user is working on'),
  }),
  execute: async (input) => {
    const q = input.intent.toLowerCase();
    const matches: Array<{ domain: string; category: string; score: number }> = [];

    for (const [_catId, cat] of Object.entries(DOMAIN_CATEGORIES)) {
      for (const domain of cat.items) {
        const domainWords = domain.replace(/-/g, ' ').toLowerCase().split(/\s+/);
        let score = 0;
        for (const w of domainWords) {
          if (w.length > 2 && q.includes(w)) score += 3;
        }
        if (score > 0) matches.push({ domain, category: cat.en, score });
      }
    }

    matches.sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      return JSON.stringify({
        recommendations: [
          { domain: 'auto', category: 'Core', reason: 'Auto-detect domain from intent' },
          { domain: 'general', category: 'Core', reason: 'General-purpose domain' },
        ],
        note: 'No specific domain match. Use auto for best results.',
      });
    }

    return JSON.stringify({
      recommendations: matches.slice(0, 5).map(m => ({
        domain: m.domain,
        category: m.category,
      })),
      action: { type: 'recommend_domain', label: `Use ${matches[0].domain}`, params: { domainId: matches[0].domain } },
    });
  },
});

// ---------- Tool 5: Trigger Generation ----------

const triggerGenerationTool = tool({
  name: 'trigger_generation',
  description: 'Set up and trigger a prompt generation with specified parameters. Use when the user explicitly asks to generate a prompt. Returns an action for the frontend to execute.',
  parameters: z.object({
    intent: z.string().describe('The user intent/goal for generation'),
    framework: z.string().default('AUTO').describe('Framework ID'),
    domainId: z.string().default('auto').describe('Domain ID'),
    provider: z.string().default('auto').describe('Provider ID'),
  }),
  execute: async (input) => {
    return JSON.stringify({
      action: {
        type: 'generate',
        label: 'Generate Prompt',
        params: {
          intent: input.intent,
          framework: input.framework,
          domainId: input.domainId,
          provider: input.provider,
        },
      },
      message: `Ready to generate with: Framework=${input.framework}, Domain=${input.domainId}, Provider=${input.provider}`,
    });
  },
});

// ---------- Tool 6: Quality Check ----------

const qualityCheckTool = tool({
  name: 'quality_check',
  description: 'Run quality analysis on a prompt text (judge scoring + lint check). Use when user has a prompt and wants feedback on its quality.',
  parameters: z.object({
    masterPrompt: z.string().describe('The prompt text to analyze'),
    domainId: z.string().nullable().default(null),
    framework: z.string().nullable().default(null),
  }),
  execute: async (input) => {
    try {
      const { judgePrompt } = await import('../../../services/judgeEnsemble');
      const { lintPrompt } = await import('../../../services/promptLint');

      const judge = judgePrompt(input.masterPrompt, {
        domainId: input.domainId ?? undefined,
        framework: input.framework ?? undefined,
      });
      const lint = lintPrompt(input.masterPrompt, '');

      return JSON.stringify({
        judge: { score: judge.totalScore, suggestions: judge.suggestions?.slice(0, 3) },
        lint: { errors: lint.totalErrors ?? 0, warnings: lint.totalWarnings ?? 0, issues: lint.issues?.slice(0, 5) },
        action: { type: 'quality_check', label: `Score: ${judge.totalScore}/100`, params: {} },
      });
    } catch (e: any) {
      return JSON.stringify({ error: `Quality check failed: ${e.message}` });
    }
  },
});

// ---------- Tool 7: Explain Feature ----------

const explainFeatureTool = tool({
  name: 'explain_feature',
  description: 'Get detailed explanation of a platform feature or page. Use when user asks "what is", "how does", or "explain" about a feature.',
  parameters: z.object({
    featureOrPage: z.string().describe('Name or ID of the feature/page to explain'),
  }),
  execute: async (input) => {
    const page = APP_PAGES.find(p =>
      p.id === input.featureOrPage.toLowerCase() ||
      p.name.en.toLowerCase().includes(input.featureOrPage.toLowerCase()) ||
      p.name.tr.toLowerCase().includes(input.featureOrPage.toLowerCase()) ||
      p.keywords.some(k => input.featureOrPage.toLowerCase().includes(k))
    );

    if (!page) {
      return JSON.stringify({
        error: `Feature "${input.featureOrPage}" not found`,
        availablePages: APP_PAGES.map(p => ({ id: p.id, name: p.name.en })),
      });
    }

    return JSON.stringify({
      page: {
        id: page.id,
        name: page.name,
        description: page.description,
        capabilities: page.capabilities,
        relatedPages: page.relatedPages,
      },
      action: { type: 'navigate', label: `Go to ${page.name.en}`, params: { page: page.id } },
    });
  },
});

// ---------- Tool 8: Get App Context ----------

const getAppContextTool = tool({
  name: 'get_app_context',
  description: 'Get lists of available providers, frameworks, or domains. Use when user asks what options are available.',
  parameters: z.object({
    infoType: z.enum(['providers', 'frameworks', 'domains', 'pages', 'all']).describe('What to list'),
  }),
  execute: async (input) => {
    const result: Record<string, unknown> = {};

    if (input.infoType === 'providers' || input.infoType === 'all') {
      result.providers = PROVIDER_INFO.map(p => ({ id: p.id, name: p.name, speed: p.speed, quality: p.quality, cost: p.costTier }));
    }
    if (input.infoType === 'frameworks' || input.infoType === 'all') {
      result.frameworks = FRAMEWORK_INFO.map(f => ({ id: f.id, name: f.name, bestFor: f.bestFor.slice(0, 3) }));
      result.totalFrameworks = FRAMEWORK_INFO.length;
    }
    if (input.infoType === 'domains' || input.infoType === 'all') {
      result.domains = DOMAIN_CATEGORIES;
    }
    if (input.infoType === 'pages' || input.infoType === 'all') {
      result.pages = APP_PAGES.map(p => ({ id: p.id, name: p.name.en }));
    }

    return JSON.stringify(result);
  },
});

// ---------- Export ----------

export const CHATBOT_TOOLS = [
  navigateToPageTool,
  searchPromptsTool,
  recommendFrameworkTool,
  recommendDomainTool,
  triggerGenerationTool,
  qualityCheckTool,
  explainFeatureTool,
  getAppContextTool,
];
