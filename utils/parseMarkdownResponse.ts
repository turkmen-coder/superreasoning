import { PromptResponse } from '../types';
import type { Language } from '../types';

/** Markdown yanıtı ayrıştır: ilk paragraf = reasoning, ## PROMPT (veya ilk ##) = masterPrompt */
export function parseMarkdownResponse(raw: string, _language: Language): PromptResponse {
  const trimmed = raw.trim();

  // Prefer ## PROMPT heading (new single-template format)
  const promptHeading = trimmed.search(/\n##\s*PROMPT\b/im);
  const firstH2 = trimmed.search(/\n##\s/m);
  const splitAt = promptHeading > 0 ? promptHeading : firstH2;

  let reasoning: string;
  let masterPrompt: string;

  if (splitAt > 0) {
    reasoning = trimmed.slice(0, splitAt).trim().replace(/\n+/g, ' ');
    // Strip the ## PROMPT heading line itself, keep only the body
    const body = trimmed.slice(splitAt).trim();
    masterPrompt = body.replace(/^##\s*PROMPT\b[^\n]*/im, '').trim();
    if (!masterPrompt) masterPrompt = body;
  } else {
    const firstBlank = trimmed.indexOf('\n\n');
    if (firstBlank > 0) {
      reasoning = trimmed.slice(0, firstBlank).trim().replace(/\n+/g, ' ');
      masterPrompt = trimmed.slice(firstBlank).trim();
    } else {
      const firstSentence = trimmed.match(/^[^.!?]+[.!?]?/)?.[0]?.trim() || trimmed.slice(0, 200).trim();
      reasoning = firstSentence;
      masterPrompt = trimmed;
    }
  }
  return {
    masterPrompt: masterPrompt || trimmed,
    reasoning: reasoning || '—',
  };
}
