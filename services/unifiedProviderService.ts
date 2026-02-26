/**
 * Ortak API katmanı — tüm sağlayıcılar tek arayüzden.
 * "Otomatik (En İyi)": Öncelik sırasına göre ilk başarılı API kullanılır.
 * Öncelik: Hız/ücretsiz önce (Groq, HF, Gemini, OpenAI, DeepSeek, OpenRouter, Claude).
 */

import { Framework, PromptResponse, Language, Attachment } from '../types';
import { generateMasterPrompt as generateWithGroq } from './groqService';
import { generateMasterPrompt as generateWithHuggingFace } from './huggingFaceService';
import { generateMasterPrompt as generateWithGemini } from './geminiService';
import { generateMasterPrompt as generateWithOpenAI } from './openaiService';
import { generateMasterPrompt as generateWithDeepSeek } from './deepseekService';
import { generateMasterPrompt as generateWithOpenRouter, setOpenRouterModel } from './openRouterService';
import { generateMasterPrompt as generateWithClaude, generateMasterPromptOpus as generateWithClaudeOpus } from './claudeService';

export type ClientProvider =
  | 'auto'
  | 'groq'
  | 'huggingface'
  | 'gemini'
  | 'openai'
  | 'deepseek'
  | 'openrouter'
  | 'claude'
  | 'ollama';

/** Otomatik modda deneme sırası (en iyi değer / hızlı önce) */
const AUTO_ORDER: Exclude<ClientProvider, 'auto'>[] = [
  'groq',      // Ücretsiz, hızlı
  'huggingface',
  'gemini',
  'openai',
  'deepseek',
  'openrouter',
  'claude',    // En güçlü, genelde ücretli
  'ollama',    // Lokal, API key gerektirmez
];

function getEnv(key: string): string {
  if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
    return String((import.meta.env as Record<string, unknown>)[key] ?? '');
  }
  return '';
}

export function hasProviderKey(provider: Exclude<ClientProvider, 'auto'>): boolean {
  switch (provider) {
    case 'groq':
      return !!(getEnv('VITE_GROQ_API_KEY') || getEnv('GROQ_API_KEY'));
    case 'huggingface':
      return !!(getEnv('VITE_HUGGING_FACE_HUB_TOKEN') || getEnv('HUGGING_FACE_HUB_TOKEN'));
    case 'gemini':
      return !!(getEnv('VITE_GEMINI_API_KEY') || getEnv('GEMINI_API_KEY') || getEnv('API_KEY'));
    case 'openai':
      return !!getEnv('OPENAI_API_KEY');
    case 'deepseek':
      return !!(getEnv('VITE_DEEPSEEK_API_KEY') || getEnv('DEEPSEEK_API_KEY'));
    case 'openrouter':
      return !!(getEnv('VITE_OPENROUTER_API_KEY') || getEnv('OPENROUTER_API_KEY'));
    case 'claude':
      return !!(getEnv('VITE_ANTHROPIC_API_KEY') || getEnv('ANTHROPIC_API_KEY'));
    case 'ollama':
      return !!(getEnv('VITE_OLLAMA_URL') || getEnv('OLLAMA_URL'));
    default:
      return false;
  }
}

/** Anahtarı tanımlı olan sağlayıcılar (otomatik modda kullanılacak sırada) */
export function getAvailableProviders(): Exclude<ClientProvider, 'auto'>[] {
  return AUTO_ORDER.filter((p) => hasProviderKey(p));
}

export interface GenerateParams {
  intent: string;
  framework: Framework;
  domainId: string;
  useSearch: boolean;
  thinkingMode: boolean;
  language: Language;
  localizedRules: string;
  attachments?: Attachment[];
  styleContext?: string;
  claudeModel?: 'sonnet' | 'opus';
  openRouterModel?: string;
  systemPrompt?: string;
}

export interface GenerateResult {
  response: PromptResponse;
  usedProvider: ClientProvider;
}

function getGenerator(
  provider: Exclude<ClientProvider, 'auto'>,
  params: GenerateParams
): () => Promise<PromptResponse> {
  const {
    intent: rawIntent,
    framework,
    domainId,
    useSearch,
    thinkingMode,
    language,
    localizedRules,
    attachments = [],
    styleContext,
    claudeModel = 'sonnet',
    openRouterModel,
    systemPrompt,
  } = params;

  // Prepend system prompt if provided
  const intent = systemPrompt?.trim()
    ? `[SYSTEM]\n${systemPrompt.trim()}\n[/SYSTEM]\n\n${rawIntent}`
    : rawIntent;

  switch (provider) {
    case 'groq':
      return () => generateWithGroq(intent, framework, domainId, useSearch, thinkingMode, language, localizedRules, attachments, styleContext);
    case 'huggingface':
      return () => generateWithHuggingFace(intent, framework, domainId, useSearch, thinkingMode, language, localizedRules, attachments, styleContext);
    case 'gemini':
      return () => generateWithGemini(intent, framework, domainId, useSearch, thinkingMode, language, localizedRules, attachments, styleContext);
    case 'openai':
      return () => generateWithOpenAI(intent, framework, domainId, useSearch, thinkingMode, language, localizedRules, attachments, styleContext);
    case 'deepseek':
      return () => generateWithDeepSeek(intent, framework, domainId, useSearch, thinkingMode, language, localizedRules, attachments, styleContext);
    case 'openrouter':
      setOpenRouterModel(openRouterModel ?? 'anthropic/claude-3.5-sonnet');
      return () => generateWithOpenRouter(intent, framework, domainId, useSearch, thinkingMode, language, localizedRules, attachments, styleContext);
    case 'claude':
      return claudeModel === 'opus'
        ? () => generateWithClaudeOpus(intent, framework, domainId, useSearch, thinkingMode, language, localizedRules, attachments, styleContext)
        : () => generateWithClaude(intent, framework, domainId, useSearch, thinkingMode, language, localizedRules, attachments, styleContext);
    case 'ollama':
      throw new Error('Ollama is server-side only. Use the /v1/generate API endpoint with provider: "ollama".');
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Tek entry point — isteğe göre belirli provider veya otomatik.
 * Otomatik: Öncelik sırasına göre ilk başarılı API kullanılır.
 */
export async function generateMasterPromptUnified(
  provider: ClientProvider,
  params: GenerateParams
): Promise<GenerateResult> {
  if (provider !== 'auto') {
    if (!hasProviderKey(provider)) {
      const msg = params.language === 'tr'
        ? `API anahtarı tanımlı değil: ${provider}. .env dosyasını kontrol edin.`
        : `API key not set for: ${provider}. Check .env.`;
      throw new Error(msg);
    }
    const gen = getGenerator(provider, params);
    const response = await gen();
    return { response, usedProvider: provider };
  }

  const toTry = getAvailableProviders();
  if (toTry.length === 0) {
    throw new Error(
      params.language === 'tr'
        ? 'Hiçbir API anahtarı tanımlı değil. .env içinde en az bir VITE_*_API_KEY ekleyin.'
        : 'No API key configured. Add at least one VITE_*_API_KEY in .env.'
    );
  }

  let lastError: Error | null = null;
  for (const p of toTry) {
    try {
      const gen = getGenerator(p, params);
      const response = await gen();
      return { response, usedProvider: p };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError ?? new Error(params.language === 'tr' ? 'Tüm API\'lar başarısız oldu.' : 'All APIs failed.');
}

/** Provider etiketleri (UI) */
export function getProviderLabel(provider: ClientProvider, claudeModel?: 'sonnet' | 'opus'): string {
  if (provider === 'auto') return 'Otomatik';
  switch (provider) {
    case 'groq': return 'Groq';
    case 'huggingface': return 'HF';
    case 'gemini': return 'Gemini';
    case 'openai': return 'OpenAI';
    case 'deepseek': return 'DeepSeek';
    case 'openrouter': return 'OpenRouter';
    case 'claude': return claudeModel === 'opus' ? 'Claude Opus 4.6' : 'Claude';
    case 'ollama': return 'Ollama';
    default: return provider;
  }
}

/** Footer / model etiketi */
export function getModelLabel(provider: ClientProvider, opts?: { openRouterModel?: string; claudeModel?: 'sonnet' | 'opus' }): string {
  if (provider === 'auto') return 'Auto';
  switch (provider) {
    case 'groq': return 'Groq-Preview';
    case 'huggingface': return 'HF-Inference';
    case 'openrouter': return opts?.openRouterModel?.split('/').pop() || 'OpenRouter';
    case 'claude': return opts?.claudeModel === 'opus' ? 'Claude-Opus-4.6' : 'Claude-Sonnet';
    case 'deepseek': return 'DeepSeek-V3';
    case 'openai': return 'OpenAI-GPT-4o-mini';
    case 'gemini': return 'Gemini-Pro';
    case 'ollama': return 'Ollama-Local';
    default: return provider;
  }
}
