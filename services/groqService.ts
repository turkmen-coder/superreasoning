import { Framework, PromptResponse, Language, Attachment } from '../types';
import { parseMarkdownResponse } from '../utils/parseMarkdownResponse';
import { getSystemInstruction } from './systemInstruction';

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';
const CHAT_URL = `${GROQ_API_BASE}/chat/completions`;
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';


function getGroqApiKey(): string {
  return (import.meta.env.VITE_GROQ_API_KEY ?? import.meta.env.GROQ_API_KEY ?? '') as string;
}

export const generateMasterPrompt = async (
  intent: string,
  framework: Framework,
  domainId: string,
  _useSearch: boolean,
  _thinkingMode: boolean,
  language: Language,
  localizedRules: string,
  attachments: Attachment[] = [],
  styleContext?: string
): Promise<PromptResponse> => {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error(language === 'tr' ? 'Groq API anahtarı tanımlı değil. .env içinde VITE_GROQ_API_KEY ekleyin.' : 'Groq API key not set. Add VITE_GROQ_API_KEY to .env');
  }
  const styleBlock = styleContext?.trim() ? `\nSTYLE/TONE (user-taught):\n${styleContext}\n` : '';
  const userPrompt = `
[RUNTIME INPUTS]
USER_INPUT: "${intent}"
CONTEXT: Domain ID: ${domainId}, Rules: ${localizedRules}
I18N: ${language.toUpperCase()}
FRAMEWORK_OVERRIDE: ${framework}
ATTACHMENTS: ${attachments.length > 0 ? 'YES (note: Groq text-only, attachment context not sent)' : 'NO'}${styleBlock}

Reply in Markdown only. First: one short reasoning paragraph. Then a blank line. Then the master prompt with ## SYSTEM, ## DEVELOPER, ## USER. No JSON.
`.trim();

  const messages = [
    { role: 'system' as const, content: getSystemInstruction(language) },
    { role: 'user' as const, content: userPrompt },
  ];

  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      stream: false,
      max_tokens: 2048,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    let msg = `Groq API ${res.status}`;
    try {
      const j = JSON.parse(errBody);
      if (j.error?.message) msg = j.error.message;
      else if (j.error) msg = j.error;
    } catch {
      if (errBody) msg = errBody.slice(0, 200);
    }
    throw new Error(msg);
  }

  const data = await res.json();
  const generatedText =
    data?.choices?.[0]?.message?.content ??
    (typeof data === 'string' ? data : '');
  if (!generatedText) {
    throw new Error(language === 'tr' ? 'Groq yanıt formatı beklenmiyor.' : 'Unexpected Groq response format.');
  }

  const parsed = parseMarkdownResponse(generatedText, language);
  if (!parsed.masterPrompt) parsed.masterPrompt = generatedText;
  if (!parsed.reasoning) parsed.reasoning = '—';
  return parsed;
};
