// Vibe Coding Master - Service Layer
// AI-powered project planning & agent task execution

import { GoogleGenAI } from '@google/genai';
import type {
  OptimizerProvider,
  VibeCodingPlan,
  VibeCodingTask,
  VibeCodingAgentResult,
  ProjectScale,
} from '../types/optimizer';
import {
  getVibeCodingSystemPrompt,
  buildPlanGenerationPrompt,
  buildAgentTaskPrompt,
} from './vibeCodingPrompts';

type Language = 'tr' | 'en';

// --- API Key Helpers (shared with optimizerService) ---

function getGeminiKey(): string {
  const key =
    (typeof process !== 'undefined' && (process.env?.GEMINI_API_KEY || process.env?.API_KEY)) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY);
  if (!key) throw new Error('Gemini API key not configured');
  return String(key);
}

function getDeepSeekKey(): string {
  const key =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DEEPSEEK_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.DEEPSEEK_API_KEY);
  if (!key) throw new Error('DeepSeek API key not configured');
  return String(key);
}

function getOpenAIKey(): string {
  const key =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.OPENAI_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY);
  if (!key) throw new Error('OpenAI API key not configured');
  return String(key);
}

// --- Retry (skip retry on network/CORS errors) ---

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, baseDelayMs = 1000): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Don't retry on network/CORS errors - they won't recover
      const msg = lastError.message.toLowerCase();
      if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('cors')) {
        throw new Error(`Network error (${lastError.message}). Check API key and network connection.`);
      }
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// --- Provider Calls ---

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    const client = new GoogleGenAI({ apiKey: getGeminiKey() });
    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
      },
    });
    return result.text || '';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Gemini API error: ${msg}`);
  }
}

async function callDeepSeek(systemPrompt: string, userPrompt: string): Promise<string> {
  // Use OpenAI-compatible endpoint (better CORS support than Anthropic endpoint)
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getDeepSeekKey()}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.3,
      max_tokens: 16384,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getOpenAIKey()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 16384,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callProvider(provider: OptimizerProvider, systemPrompt: string, userPrompt: string): Promise<string> {
  return withRetry(() => {
    switch (provider) {
      case 'gemini': return callGemini(systemPrompt, userPrompt);
      case 'deepseek': return callDeepSeek(systemPrompt, userPrompt);
      case 'openai': return callOpenAI(systemPrompt, userPrompt);
      default: throw new Error(`Unknown provider: ${provider}`);
    }
  });
}

// --- JSON Parsing ---

function extractJSON(raw: string): any {
  let jsonStr = raw.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  if (!jsonStr.startsWith('{')) {
    const idx = jsonStr.indexOf('{');
    if (idx >= 0) jsonStr = jsonStr.slice(idx);
  }
  const lastBrace = jsonStr.lastIndexOf('}');
  if (lastBrace >= 0) jsonStr = jsonStr.slice(0, lastBrace + 1);
  return JSON.parse(jsonStr);
}

// --- Plan Generation ---

export interface GeneratePlanOptions {
  projectDescription: string;
  scale: ProjectScale;
  techPreferences: { frontend?: string; backend?: string; database?: string; deployment?: string };
  provider: OptimizerProvider;
  language: Language;
  onStatusChange?: (status: string) => void;
}

export async function generateVibeCodingPlan(options: GeneratePlanOptions): Promise<VibeCodingPlan> {
  const { projectDescription, scale, techPreferences, provider, language, onStatusChange } = options;

  onStatusChange?.(language === 'tr' ? 'Plan olusturuluyor...' : 'Generating plan...');

  const systemPrompt = getVibeCodingSystemPrompt(language);
  const userPrompt = buildPlanGenerationPrompt(projectDescription, scale, techPreferences, language);

  const startTime = Date.now();
  const raw = await callProvider(provider, systemPrompt, userPrompt);
  const parsed = extractJSON(raw);

  const phases = (parsed.phases || []).map((p: any) => ({
    phase: p.phase || 'implementation',
    description: String(p.description || ''),
    tasks: (p.tasks || []).map((t: any) => ({
      id: String(t.id || `T-${Math.random().toString(36).slice(2, 5)}`),
      title: String(t.title || ''),
      description: String(t.description || ''),
      phase: t.phase || p.phase || 'implementation',
      priority: t.priority || 'medium',
      estimatedComplexity: t.estimatedComplexity || 'moderate',
      dependencies: Array.isArray(t.dependencies) ? t.dependencies.map(String) : [],
      agentPrompt: String(t.agentPrompt || ''),
      status: 'pending' as const,
    })),
  }));

  const totalTasks = phases.reduce((sum: number, p: any) => sum + (p.tasks?.length || 0), 0);

  return {
    id: crypto.randomUUID(),
    projectName: String(parsed.projectName || 'Untitled Project'),
    projectDescription,
    scale,
    techStack: {
      frontend: parsed.techStack?.frontend || techPreferences.frontend || '',
      backend: parsed.techStack?.backend || techPreferences.backend || '',
      database: parsed.techStack?.database || techPreferences.database || '',
      deployment: parsed.techStack?.deployment || techPreferences.deployment || '',
    },
    phases,
    prd: String(parsed.prd || ''),
    totalTasks,
    generatedAt: startTime,
    provider,
  };
}

// --- Agent Task Execution ---

export interface ExecuteTaskOptions {
  task: VibeCodingTask;
  projectContext: string;
  techStack: { frontend?: string; backend?: string; database?: string };
  provider: OptimizerProvider;
  language: Language;
  onStatusChange?: (status: string) => void;
}

export async function executeAgentTask(options: ExecuteTaskOptions): Promise<VibeCodingAgentResult> {
  const { task, projectContext, techStack, provider, language, onStatusChange } = options;

  onStatusChange?.(language === 'tr' ? `Gorev calistiriliyor: ${task.title}` : `Executing task: ${task.title}`);

  const systemPrompt = getVibeCodingSystemPrompt(language);
  const userPrompt = buildAgentTaskPrompt(task, projectContext, techStack, language);

  const startTime = Date.now();
  const raw = await callProvider(provider, systemPrompt, userPrompt);

  // Extract code blocks from response
  const codeBlocks: { language: string; code: string; filename?: string }[] = [];
  try {
    const parsed = extractJSON(raw);
    if (parsed.files && Array.isArray(parsed.files)) {
      for (const file of parsed.files) {
        codeBlocks.push({
          language: String(file.language || 'typescript'),
          code: String(file.code || ''),
          filename: file.filename ? String(file.filename) : undefined,
        });
      }
    }
  } catch {
    // If JSON parsing fails, extract code blocks from markdown
    const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    while ((match = codeRegex.exec(raw)) !== null) {
      codeBlocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
      });
    }
  }

  return {
    taskId: task.id,
    prompt: task.agentPrompt,
    response: raw,
    codeBlocks,
    timestamp: startTime,
    durationMs: Date.now() - startTime,
    provider,
  };
}
