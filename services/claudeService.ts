import { Framework, PromptResponse, Language, Attachment } from '../types';
import { parseMarkdownResponse } from '../utils/parseMarkdownResponse';
import { getSystemInstruction } from './systemInstruction';

/** Tarayıcıdan doğrudan Anthropic CORS engelliyor; proxy kullanıyoruz (Vite dev veya Express). */
const ANTHROPIC_API_BASE = '/api/claude/v1/messages';
/** Default: hızlı/ekonomik model */
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
/** Thinking + Web Search destekleyen model (Sonnet 4) */
const MODEL_WITH_THINKING_AND_SEARCH = 'claude-sonnet-4-20250514';
/** Claude Opus 4.6 — thinking + web search destekler */
const MODEL_OPUS_4_6 = 'claude-opus-4-6';


function getClaudeApiKey(): string {
  return (import.meta.env.VITE_ANTHROPIC_API_KEY ?? import.meta.env.ANTHROPIC_API_KEY ?? '') as string;
}

type ClaudeModelVariant = 'sonnet' | 'opus';

function resolveModel(variant: ClaudeModelVariant, thinkingMode: boolean, useSearch: boolean): string {
  if (variant === 'opus') return MODEL_OPUS_4_6;
  const useExtendedFeatures = thinkingMode || useSearch;
  return useExtendedFeatures ? MODEL_WITH_THINKING_AND_SEARCH : DEFAULT_MODEL;
}

async function generateWithModel(
  variant: ClaudeModelVariant,
  intent: string,
  framework: Framework,
  domainId: string,
  useSearch: boolean,
  thinkingMode: boolean,
  language: Language,
  localizedRules: string,
  attachments: Attachment[] = [],
  styleContext?: string
): Promise<PromptResponse> {
  const apiKey = getClaudeApiKey();
  const styleBlock = styleContext?.trim() ? `\nSTYLE/TONE (user-taught):\n${styleContext}\n` : '';
  const kgHint = useSearch ? '\nKG: ENABLED (Web Search). Use search when helpful; cite sources in the master prompt as [1], [2].' : '';
  const userPrompt = `
[RUNTIME INPUTS]
USER_INPUT: "${intent}"
CONTEXT: Domain ID: ${domainId}, Rules: ${localizedRules}
I18N: ${language.toUpperCase()}
FRAMEWORK_OVERRIDE: ${framework}
ATTACHMENTS: ${attachments.length > 0 ? 'YES (note: attachment context not sent in this request)' : 'NO'}${kgHint}${styleBlock}

Reply in Markdown only. First: one short reasoning paragraph. Then a blank line. Then the master prompt with ## SYSTEM, ## DEVELOPER, ## USER. No JSON.
`.trim();

  const model = resolveModel(variant, thinkingMode, useSearch);
  const body: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    system: getSystemInstruction(language),
    messages: [{ role: 'user' as const, content: userPrompt }],
  };
  if (thinkingMode) {
    body.thinking = { type: 'enabled', budget_tokens: 10000 };
  }
  if (useSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }];
  }

  const res = await fetch(ANTHROPIC_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } : {}),
    },
    body: JSON.stringify(body),
  });
  if (res.type === 'opaqueredirect' || res.status === 0) {
    throw new Error(
      language === 'tr'
        ? 'Claude isteği CORS veya ağ nedeniyle engellendi. Uygulamayı npm run dev ile çalıştırın (proxy açık).'
        : 'Claude request blocked (CORS/network). Run the app with npm run dev (proxy enabled).'
    );
  }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        language === 'tr'
          ? 'Claude API anahtarı tanımlı değil veya geçersiz. .env içinde ANTHROPIC_API_KEY ekleyip dev sunucusunu yeniden başlatın.'
          : 'Claude API key not set or invalid. Add ANTHROPIC_API_KEY to .env and restart the dev server.'
      );
    }
    if (res.status === 404) {
      throw new Error(
        language === 'tr'
          ? 'Claude proxy yanıt vermiyor. .env içinde ANTHROPIC_API_KEY tanımlayıp "npm run dev" ile yeniden başlatın.'
          : 'Claude proxy not available. Add ANTHROPIC_API_KEY to .env and restart with "npm run dev".'
      );
    }
    const errBody = await res.text();
    let msg = `Claude API ${res.status}`;
    try {
      const j = JSON.parse(errBody);
      if (j.error?.message) msg = j.error.message;
      else if (j.error) msg = typeof j.error === 'string' ? j.error : JSON.stringify(j.error);
    } catch {
      if (errBody) msg = errBody.slice(0, 200);
    }
    throw new Error(msg);
  }

  const data = await res.json();
  const content = data?.content;
  let generatedText = '';
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block?.type === 'text' && block.text) generatedText += block.text;
    }
  }
  if (!generatedText) {
    throw new Error(
      language === 'tr' ? 'Claude yanıt formatı beklenmiyor.' : 'Unexpected Claude response format.'
    );
  }

  const parsed = parseMarkdownResponse(generatedText, language);
  if (!parsed.masterPrompt) parsed.masterPrompt = generatedText;
  if (!parsed.reasoning) parsed.reasoning = '—';
  return parsed;
}

export const generateMasterPrompt = (
  intent: string,
  framework: Framework,
  domainId: string,
  useSearch: boolean,
  thinkingMode: boolean,
  language: Language,
  localizedRules: string,
  attachments: Attachment[] = [],
  styleContext?: string
): Promise<PromptResponse> =>
  generateWithModel('sonnet', intent, framework, domainId, useSearch, thinkingMode, language, localizedRules, attachments, styleContext);

/** Claude Opus 4.6 — aynı imza, her zaman claude-opus-4-6 kullanır (thinking + web search destekli). */
export const generateMasterPromptOpus = (
  intent: string,
  framework: Framework,
  domainId: string,
  useSearch: boolean,
  thinkingMode: boolean,
  language: Language,
  localizedRules: string,
  attachments: Attachment[] = [],
  styleContext?: string
): Promise<PromptResponse> =>
  generateWithModel('opus', intent, framework, domainId, useSearch, thinkingMode, language, localizedRules, attachments, styleContext);
