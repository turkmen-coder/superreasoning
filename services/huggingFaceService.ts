import { Framework, PromptResponse, Language, Attachment } from '../types';
import { parseMarkdownResponse } from '../utils/parseMarkdownResponse';

// Router API: OpenAI-uyumlu chat completions (v1)
const DEFAULT_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';
const HF_API_BASE = import.meta.env.DEV ? '/api/hf' : 'https://router.huggingface.co';
const CHAT_COMPLETIONS_URL = `${HF_API_BASE}/v1/chat/completions`;

const getSystemInstruction = (lang: Language) => `
[SYSTEM — SR-MPG v2.2 | Super Reasoning Master Prompt Generator]

Your Role: To compile the ambiguous/incomplete request from the user into a deterministic, high-performance "Master Prompt" package optimized for the target LLMs.

Priorities:
1) Determinism (same input + same context => same output)
2) Accuracy and security (hallucination reduction)
3) Performance (no unnecessary thinking/searching; token budget controlled)
4) I18n compliance (Target Language: ${lang === 'tr' ? 'Turkish' : 'English'})
5) Knowledge Graph Grounding (verifiable/traceable information with QG)

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
C) Master Prompt Compilation (output packages)
The output must include:
1) MasterPrompt.System
2) MasterPrompt.Developer
3) MasterPrompt.User (a rewritten clear form of the user's request)
4) Tool/Function call contract (if any)
5) Validation plan (mini checklist + test inputs)
6) "Stop conditions" and "budget" directives

========================
D) AVAILABLE STRATEGIC FRAMEWORKS
- KERNEL (Logic & Architecture)
- CO_STAR (Creative & Marketing)
- RISEN (Process & Agency)
- RTF (Structure & Format)
- BAB (Persuasion & Sales)
- TAG (Efficiency & Focus)
- CARE (Context & Education)

========================
E) OUTPUT FORMAT — YALNIZCA MARKDOWN (ONLY MARKDOWN, NO JSON)
Reply in plain Markdown only. No JSON.
1) First paragraph: short reasoning (2-4 sentences). Intent + chosen framework.
2) One blank line.
3) Then the master prompt in Markdown with ## SYSTEM, ## DEVELOPER, ## USER. Short sections.
Do not use code blocks or JSON. Output raw Markdown only.
`;

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
  const styleBlock = styleContext?.trim() ? `\nSTYLE/TONE (user-taught):\n${styleContext}\n` : '';
  const userPrompt = `
[RUNTIME INPUTS]
USER_INPUT: "${intent}"
CONTEXT: Domain ID: ${domainId}, Rules: ${localizedRules}
I18N: ${language.toUpperCase()}
FRAMEWORK_OVERRIDE: ${framework}
ATTACHMENTS: ${attachments.length > 0 ? 'YES (note: HF API text-only, attachment context not sent)' : 'NO'}${styleBlock}

Reply in Markdown only. First: one short reasoning paragraph. Then a blank line. Then the master prompt with ## SYSTEM, ## DEVELOPER, ## USER. No JSON.
`.trim();

  const systemInstruction = getSystemInstruction(language);
  const messages = [
    { role: 'system' as const, content: systemInstruction },
    { role: 'user' as const, content: userPrompt },
  ];

  const res = await fetch(CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(import.meta.env.DEV ? {} : { Authorization: `Bearer ${import.meta.env.VITE_HUGGING_FACE_HUB_TOKEN || ''}` }),
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
    let msg = `Hugging Face API ${res.status}`;
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
  // OpenAI-uyumlu yanıt: { choices: [{ message: { content: "..." } }] }
  const generatedText =
    data?.choices?.[0]?.message?.content ??
    (typeof data === 'string' ? data : '');
  if (!generatedText) {
    throw new Error('Hugging Face yanıt formatı beklenmiyor.');
  }

  const parsed = parseMarkdownResponse(generatedText, language);
  if (!parsed.masterPrompt) parsed.masterPrompt = generatedText;
  if (!parsed.reasoning) parsed.reasoning = '—';
  return parsed;
};
