/**
 * Sunucu tarafı master prompt üretimi — process.env ile.
 * IR tabanlı pipeline: Niyet → IR → Provider'a özel prompt derleme.
 * SR_USE_IR=false ile legacy mod.
 */

import { Framework, PromptResponse, Language } from '../../types';
import { parseMarkdownResponse } from '../../utils/parseMarkdownResponse';
import { extractIR } from '../../services/irExtractor';
import { compileIRForProvider } from './compilers';
import { routeProvider, detectRiskLevel, type ProviderName } from './providerRouter';
import { getPool } from '../db/client';
import { withSpan, withSpanSync, SR_ATTRS } from './tracing';

const LANGUAGE = 'en' as Language;
const USE_IR = process.env.SR_USE_IR !== 'false';

const getSystemInstructionLegacy = (lang: Language) => `
[SYSTEM — SR-MPG v2.2 | Super Reasoning Master Prompt Generator]

Your Role: To compile the ambiguous/incomplete request from the user into a deterministic, high-performance "Master Prompt" package optimized for the target LLMs.

Priorities:
1) Determinism (same input + same context => same output)
2) Accuracy and security (hallucination reduction)
3) Performance (no unnecessary thinking/searching; token budget controlled)
4) I18n compliance (Target Language: ${lang === 'tr' ? 'Turkish' : 'English'})

Critical Rule:
- Do not pour chain-of-thought into the user or output.
- Only produce structured "compilation artifacts": intent, constraints, assumptions, questions, master prompt packages, validation plan.
- OUTPUT MUST BE SHORT AND CLEAR: concise sentences, bullet points over paragraphs, no filler. Reasoning: max 2-4 sentences.

========================
A) I18N and Intent Inference (Deterministic)
1) Identify the language: USER_INPUT language + user_locale_hint + CONTEXT preferences
2) Extract the "intent" and "job-to-be-done": goal, audience, format, tone, success criteria
3) Classify the uncertainties: missing_goal / missing_constraints / missing_data / conflicting_requirements
4) Generate 0-1 clarification questions only if necessary. If you generate them, still compile the master prompt package as "assumption-based".

========================
B) Super Reasoning Routing (System 1/System 2)
- System 1 (Fast): Clear and low-risk requests => single-pass compilation
- System 2 (Deliberative): High uncertainty, high risk, complex outputs => candidate compilations + validation

========================
C) Master Prompt Compilation (SINGLE UNIFIED OUTPUT)
Do NOT split into ## SYSTEM / ## DEVELOPER / ## USER sections.
Produce ONE single cohesive prompt block under ## PROMPT.
All instructions MUST use imperative mood.

========================
D) AVAILABLE STRATEGIC FRAMEWORKS
- KERNEL (Logic & Architecture)
- CO_STAR (Creative & Marketing)
- RISEN (Process & Agency)
- RTF (Structure & Format)
- BAB (Persuasion & Sales)
- TAG (Efficiency & Focus)
- CARE (Context & Education)
- REACT (Action & Feedback)
- CHAIN_OF_THOUGHT (Reasoning Depth)
- TREE_OF_THOUGHT (Alternative Exploration)
- REWOO (Planning & Tools)
- DSP (Structured Delivery)
- SELF_REFINE (Iterative Improvement)
- CRITIC_REVISE (Quality Assurance)
- SCENARIO_PLANNING (Strategy & Risk)
- OODA_LOOP (Decision Velocity)
- RED_TEAM (Security & Robustness)
- SOCRATIC (Inquiry & Discovery)
- SWOT (Strategy & Analysis)
- FIVE_WHYS (Root Cause Analysis)
- MECE (Structural Decomposition)
- SCAMPER (Creative Innovation)
- PDCA (Continuous Improvement)
- STAR (Situation & Outcome)
- SMART (Goal-Oriented)
- DIALECTIC (Synthesis & Reconciliation)
- STEP_BACK (Abstraction & Perspective)
- ANALOGICAL (Analogy & Transfer)
- MORPHOLOGICAL (Systematic Exploration)
- DELPHI (Expert Consensus)
- SIX_HATS (Multi-Perspective)
- TRIZ (Innovation & Contradiction)
- PESTEL (Macro Environment)
- PORTER (Competitive Analysis)
- LEAN (Efficiency & Waste Reduction)
- AGILE (Agile Delivery)
- FIRST_PRINCIPLES (Foundational Reasoning)
- INVERSION (Inverse Reasoning)
- FUTURES_WHEEL (Impact Mapping)
- BACKCASTING (Backward Planning)
- KANO (Prioritization)
- JOBS_TO_BE_DONE (User Need)
- DESIGN_THINKING (Human-Centered Design)
- SYSTEMS_THINKING (System Dynamics)
- GAME_THEORY (Strategic Interaction)
- BAYESIAN (Probability & Evidence)
- META_PROMPT (Recursive Prompt)
- LATERAL (Lateral Thinking)
- CATWOE (Stakeholder Perspective)
- DECISION_MATRIX (Decision Evaluation)
- MIND_MAP (Visual Thinking)
- RAPID (Decision Roles)
- MOSCOW (Requirement Priority)
- OKR (Goal Alignment)
- HYPOTHESIS (Experiment & Validate)
- PREMORTEM (Risk Prevention)

========================
E) OUTPUT FORMAT — YALNIZCA MARKDOWN (ONLY MARKDOWN, NO JSON)
Reply in plain Markdown only. No JSON.
1) First paragraph: short reasoning (2-4 sentences). Intent + chosen framework.
2) One blank line.
3) ONE single prompt block under ## PROMPT. No sub-sections. All sentences imperative.
Do not use code blocks or JSON. Output raw Markdown only.
`;

export interface GenerateRequest {
  intent: string;
  framework: Framework;
  domainId: string;
  provider: 'groq' | 'gemini' | 'huggingface' | 'claude' | 'claude-opus' | 'openrouter' | 'deepseek' | 'openai' | 'ollama' | 'auto';
  language?: Language;
  contextRules?: string;
  /** OpenRouter için model id (örn. anthropic/claude-3.5-sonnet) */
  openRouterModel?: string;
}

function buildUserFromRequest(req: GenerateRequest, contextRules: string, _lang: Language): string {
  return `
[RUNTIME INPUTS]
USER_INPUT: "${req.intent}"
CONTEXT: Domain ID: ${req.domainId}, Rules: ${contextRules}
I18N: ${(req.language ?? 'en').toUpperCase()}
FRAMEWORK_OVERRIDE: ${req.framework}
ATTACHMENTS: NO

Reply in Markdown only. First: one short reasoning paragraph. Then a blank line. Then ONE unified prompt under ## PROMPT. No sub-sections. No JSON.
`.trim();
}

const SERVER_AUTO_ORDER: GenerateRequest['provider'][] = ['groq', 'huggingface', 'gemini', 'openai', 'deepseek', 'openrouter', 'claude', 'ollama'];

function hasServerProviderKey(provider: Exclude<GenerateRequest['provider'], 'auto'>): boolean {
  switch (provider) {
    case 'groq': return !!(process.env.VITE_GROQ_API_KEY ?? process.env.GROQ_API_KEY);
    case 'huggingface': return !!(process.env.HUGGING_FACE_HUB_TOKEN ?? process.env.VITE_HUGGING_FACE_HUB_TOKEN);
    case 'gemini': return !!(process.env.GEMINI_API_KEY ?? process.env.API_KEY);
    case 'openai': return !!process.env.OPENAI_API_KEY;
    case 'deepseek': return !!(process.env.DEEPSEEK_API_KEY ?? process.env.VITE_DEEPSEEK_API_KEY);
    case 'openrouter': return !!(process.env.OPENROUTER_API_KEY ?? process.env.VITE_OPENROUTER_API_KEY);
    case 'claude': return !!(process.env.ANTHROPIC_API_KEY ?? process.env.VITE_ANTHROPIC_API_KEY);
    case 'claude-opus': return !!(process.env.ANTHROPIC_API_KEY ?? process.env.VITE_ANTHROPIC_API_KEY);
    case 'ollama': return true; // Ollama runs locally, no API key needed
    default: return false;
  }
}

export async function generateMasterPromptServer(req: GenerateRequest): Promise<PromptResponse> {
  return withSpan('generate.pipeline', {
    attributes: {
      [SR_ATTRS.PROVIDER]: req.provider,
      [SR_ATTRS.DOMAIN]: req.domainId,
      [SR_ATTRS.FRAMEWORK]: String(req.framework),
    },
  }, async (pipelineSpan) => {
  return _generateMasterPromptServerInner(req, pipelineSpan);
  });
}

async function _generateMasterPromptServerInner(req: GenerateRequest, pipelineSpan: import('@opentelemetry/api').Span): Promise<PromptResponse> {
  if (req.provider === 'auto') {
    const available = SERVER_AUTO_ORDER.filter(
      (p): p is Exclude<GenerateRequest['provider'], 'auto'> => p !== 'auto' && hasServerProviderKey(p),
    );
    if (available.length === 0) throw new Error('No API key configured for any provider. Set at least one provider key in .env');

    // Smart routing: score providers based on benchmark, cost, latency, quality, domain
    const pool = getPool();
    const decision = await withSpan('generate.route_provider', async (routeSpan) => {
      const d = await routeProvider(
        {
          domain: req.domainId ?? 'auto',
          framework: req.framework ?? 'AUTO',
          intentLength: req.intent.length,
          riskLevel: detectRiskLevel(req.domainId ?? 'auto'),
          budgetCeiling: 0,
          availableProviders: available as ProviderName[],
        },
        pool,
      );
      routeSpan.setAttribute(SR_ATTRS.PROVIDER, d.selected_provider);
      routeSpan.setAttribute(SR_ATTRS.COST_USD, d.estimated_cost);
      routeSpan.setAttribute(SR_ATTRS.RISK_LEVEL, d.confidence.toString());
      return d;
    });

    // Try best provider first, then fallback chain
    const toTry = [decision.selected_provider, ...decision.fallback_chain]
      .filter(p => available.includes(p as any));

    let lastErr: Error | null = null;
    for (const p of toTry) {
      try {
        return await generateMasterPromptServer({ ...req, provider: p as GenerateRequest['provider'] });
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
      }
    }
    throw lastErr ?? new Error('All providers failed');
  }

  const lang = (req.language ?? LANGUAGE) as Language;
  const contextRules = req.contextRules ?? 'General software development.';

  const providerTyped = req.provider as 'groq' | 'gemini' | 'huggingface' | 'claude' | 'claude-opus' | 'openrouter' | 'deepseek' | 'openai' | 'ollama';

  let systemContent: string;
  let userContent: string;

  if (USE_IR) {
    const compiled = withSpanSync('generate.ir_compile', (irSpan) => {
      const ir = extractIR({
        intent: req.intent,
        framework: req.framework,
        domainId: req.domainId,
        contextRules,
        language: lang,
      });
      irSpan.setAttribute('sr.ir.framework', String(ir.framework ?? 'unknown'));
      return compileIRForProvider(ir, providerTyped);
    });
    systemContent = compiled.system;
    userContent = compiled.user;
  } else {
    systemContent = getSystemInstructionLegacy(lang);
    userContent = buildUserFromRequest(req, contextRules, lang);
  }

  // Tag the pipeline span with the actual provider used
  pipelineSpan.setAttribute(SR_ATTRS.PROVIDER, req.provider);

  if (req.provider === 'groq') {
    const apiKey = process.env.VITE_GROQ_API_KEY ?? process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY or VITE_GROQ_API_KEY not set');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        stream: false,
        max_tokens: 2048,
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq API ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error('Empty Groq response');
    const parsed = parseMarkdownResponse(text, lang);
    return { masterPrompt: parsed.masterPrompt || text, reasoning: parsed.reasoning ?? '—' };
  }

  if (req.provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY or API_KEY not set');
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: systemContent + (userContent ? '\n\n' + userContent : '') }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 2048 },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) throw new Error('Empty Gemini response');
    const parsed = parseMarkdownResponse(text, lang);
    return { masterPrompt: parsed.masterPrompt || text, reasoning: parsed.reasoning ?? '—' };
  }

  if (req.provider === 'huggingface') {
    const token = process.env.HUGGING_FACE_HUB_TOKEN ?? process.env.VITE_HUGGING_FACE_HUB_TOKEN;
    if (!token) throw new Error('HUGGING_FACE_HUB_TOKEN not set');
    const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        stream: false,
        max_tokens: 2048,
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Hugging Face API ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error('Empty Hugging Face response');
    const parsed = parseMarkdownResponse(text, lang);
    return { masterPrompt: parsed.masterPrompt || text, reasoning: parsed.reasoning ?? '—' };
  }

  if (req.provider === 'claude' || req.provider === 'claude-opus') {
    const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY or VITE_ANTHROPIC_API_KEY not set');
    const model = req.provider === 'claude-opus' ? 'claude-opus-4-6' : 'claude-3-5-sonnet-20241022';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemContent,
        messages: [{ role: 'user', content: userContent }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    let text = '';
    const content = data?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === 'text' && block.text) text += block.text;
      }
    }
    if (!text) throw new Error('Empty Claude response');
    const parsed = parseMarkdownResponse(text, lang);
    return { masterPrompt: parsed.masterPrompt || text, reasoning: parsed.reasoning ?? '—' };
  }

  if (req.provider === 'openrouter') {
    const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY or VITE_OPENROUTER_API_KEY not set');
    const model = req.openRouterModel ?? 'anthropic/claude-3.5-sonnet';
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        max_tokens: 4096,
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error('Empty OpenRouter response');
    const parsed = parseMarkdownResponse(text, lang);
    return { masterPrompt: parsed.masterPrompt || text, reasoning: parsed.reasoning ?? '—' };
  }

  if (req.provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        stream: false,
        max_tokens: 2048,
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error('Empty OpenAI response');
    const parsed = parseMarkdownResponse(text, lang);
    return { masterPrompt: parsed.masterPrompt || text, reasoning: parsed.reasoning ?? '—' };
  }

  if (req.provider === 'deepseek') {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set');
    const res = await fetch('https://api.deepseek.com/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 4096,
        system: systemContent,
        messages: [{ role: 'user', content: userContent }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`DeepSeek API ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    let text = '';
    const content = data?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === 'text' && block.text) text += block.text;
      }
    }
    if (!text) throw new Error('Empty DeepSeek response');
    const parsed = parseMarkdownResponse(text, lang);
    return { masterPrompt: parsed.masterPrompt || text, reasoning: parsed.reasoning ?? '—' };
  }

  if (req.provider === 'ollama') {
    const ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434';
    const model = process.env.OLLAMA_TEXT_MODEL ?? 'llama3.2';
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        stream: false,
        options: { temperature: 0.2, num_predict: 2048 },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama API ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.message?.content ?? '';
    if (!text) throw new Error('Empty Ollama response');
    const parsed = parseMarkdownResponse(text, lang);
    return { masterPrompt: parsed.masterPrompt || text, reasoning: parsed.reasoning ?? '—' };
  }

  throw new Error(`Unknown provider: ${req.provider}`);
}
