import { GoogleGenAI } from "@google/genai";
import { Framework, PromptResponse, GroundingSource, Language, Attachment } from '../types';
import { parseMarkdownResponse } from '../utils/parseMarkdownResponse';
import { getSystemInstruction } from './systemInstruction';

function getClient(): GoogleGenAI {
  const key =
    (typeof process !== 'undefined' && (process.env?.GEMINI_API_KEY || process.env?.API_KEY)) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY);
  if (!key) throw new Error('Gemini API anahtarı tanımlı değil. .env dosyasına GEMINI_API_KEY veya VITE_GEMINI_API_KEY ekleyin.');
  return new GoogleGenAI({ apiKey: String(key) });
}

const GROUNDING_CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika
const groundingCache = new Map<string, { result: PromptResponse; timestamp: number }>();

function groundingCacheKey(intent: string, domainId: string, framework: string, useSearch: boolean): string {
  return JSON.stringify({ i: intent.slice(0, 300), d: domainId, f: framework, s: useSearch });
}

/** Kaynak doğruluk puanı 0-100: Search açıkken kaynak sayısı + temel heuristik */
function computeGroundingScore(useSearch: boolean, sourceCount: number, masterPromptLength: number): number {
  if (!useSearch) return 0;
  if (sourceCount === 0) return 25; // Açık ama kaynak dönmemiş
  const sourceFactor = Math.min(50, sourceCount * 12);
  const lengthFactor = masterPromptLength > 200 ? 30 : masterPromptLength > 50 ? 20 : 10;
  return Math.min(100, 20 + sourceFactor + lengthFactor);
}

export const generateMasterPrompt = async (
  intent: string,
  framework: Framework,
  domainId: string,
  useSearch: boolean,
  thinkingMode: boolean,
  language: Language,
  localizedRules: string,
  attachments: Attachment[] = [],
  styleContext?: string
): Promise<PromptResponse> => {
  const cacheKey = groundingCacheKey(intent, domainId, framework, useSearch) + (styleContext ? `|s:${styleContext.slice(0, 100)}` : '');
  const cached = groundingCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < GROUNDING_CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    const styleBlock = styleContext?.trim()
      ? `\nSTYLE/TONE (user-taught, match this):\n${styleContext}\n`
      : '';
    const textPrompt = `
[RUNTIME INPUTS]
USER_INPUT: "${intent}"
CONTEXT: Domain ID: ${domainId}, Rules: ${localizedRules}
I18N: ${language.toUpperCase()}
THINKING_MODE: ${thinkingMode ? 'ENABLED (Deep)' : 'DISABLED (Shallow)'}
KG: ${useSearch ? 'ENABLED (Search Grounding)' : 'DISABLED'}
TARGET: Model: ${thinkingMode ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview'}
FRAMEWORK_OVERRIDE: ${framework}
ATTACHMENTS: ${attachments.length > 0 ? 'YES' : 'NO'}${styleBlock}
    `.trim();

    // Prepare content parts for Multimodal input
    const parts: any[] = [{ text: textPrompt }];

    // Add attachments if any
    attachments.forEach(file => {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data
        }
      });
    });

    // Öncelik: Gemini 3; kota (429) olursa Gemini 2.5 ile dene
    const primaryModel = thinkingMode ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    const fallbackModel = thinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const modelPair: [string, string] = [primaryModel, fallbackModel];

    const config: any = {
      systemInstruction: getSystemInstruction(language),
      temperature: 0,
    };

    if (thinkingMode) {
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    let lastError: unknown;
    for (let i = 0; i < modelPair.length; i++) {
      const model = modelPair[i];
      try {
        const response = await getClient().models.generateContent({
          model,
          contents: { parts },
          config,
        });

        const result = response.text;
        if (!result) throw new Error("Data stream interrupted.");

        const parsedResult = parseMarkdownResponse(result, language);

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
          const sources: GroundingSource[] = [];
          groundingChunks.forEach((chunk: any) => {
            if (chunk.web?.uri && chunk.web?.title) {
              sources.push({
                title: chunk.web.title,
                uri: chunk.web.uri
              });
            }
          });
          parsedResult.groundingSources = sources.filter((v, i, a) => a.findIndex(x => x.uri === v.uri) === i);
        }

        parsedResult.groundingScore = computeGroundingScore(useSearch, parsedResult.groundingSources?.length ?? 0, parsedResult.masterPrompt?.length ?? 0);
        groundingCache.set(cacheKey, { result: parsedResult, timestamp: Date.now() });
        return parsedResult;
      } catch (err) {
        lastError = err;
        const is429 = (e: unknown) => {
          const o = e as any;
          return o?.status === 429 || o?.code === 429 || o?.status === 'RESOURCE_EXHAUSTED' ||
            o?.error?.code === 429 || o?.error?.status === 'RESOURCE_EXHAUSTED' ||
            String(o?.message ?? '').includes('429') || String(o?.message ?? '').includes('RESOURCE_EXHAUSTED') ||
            String(o?.error?.message ?? '').includes('quota');
        };
        if (is429(err) && i < modelPair.length - 1) continue;
        throw err;
      }
    }
    throw lastError;
  } catch (error) {
    console.error("[CRITICAL_ERROR]:", error);
    const msg = (error as any)?.message ?? String(error);
    const statusCode = (error as any)?.status ?? (error as any)?.code ?? (error as any)?.error?.code;
    const isQuota = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
    if (isQuota) {
      throw new Error(
        language === 'tr'
          ? 'Gemini API kotası aşıldı veya ücretsiz planda bu model kullanılamıyor. Bir süre sonra tekrar deneyin veya plan/faturalandırma ayarlarınızı kontrol edin: https://ai.google.dev/gemini-api/docs/rate-limits'
          : 'Gemini API quota exceeded or this model is not available on your plan. Try again later or check your plan and billing: https://ai.google.dev/gemini-api/docs/rate-limits'
      );
    }
    // Orijinal hata mesajını koru — kullanıcının sorunu görebilmesi için
    const detail = msg.length > 10 ? msg.slice(0, 300) : 'Unknown error';
    const prefix = language === 'tr' ? 'Gemini API hatası' : 'Gemini API error';
    throw new Error(`${prefix}${statusCode ? ` (${statusCode})` : ''}: ${detail}`);
  }
};
