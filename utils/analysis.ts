import { PromptResponse } from '../types';

export interface InputAnalysis {
  chars: number;
  words: number;
  detailLevel: 'short' | 'medium' | 'detailed' | 'empty';
  hasContent: boolean;
}

export interface OutputAnalysis {
  masterPromptChars: number;
  masterPromptWords: number;
  reasoningChars: number;
  reasoningWords: number;
  sections: string[];
  sectionCount: number;
}

const WORD_SPLIT = /\s+/;

export function getInputAnalysis(text: string): InputAnalysis {
  const trimmed = text.trim();
  const chars = trimmed.length;
  const words = trimmed ? trimmed.split(WORD_SPLIT).filter(Boolean).length : 0;
  let detailLevel: InputAnalysis['detailLevel'] = 'empty';
  if (chars > 0) {
    if (words < 15) detailLevel = 'short';
    else if (words < 80) detailLevel = 'medium';
    else detailLevel = 'detailed';
  }
  return {
    chars,
    words,
    detailLevel,
    hasContent: chars > 0,
  };
}

/** Markdown ## veya ### başlıklarını bulur */
export function getOutputAnalysis(result: PromptResponse): OutputAnalysis {
  const masterPrompt = result.masterPrompt || '';
  const reasoning = result.reasoning || '';
  const sectionRegex = /^#{2,3}\s*(.+)$/gm;
  const sections: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(sectionRegex.source, 'gm');
  while ((m = re.exec(masterPrompt)) !== null) {
    const title = m[1].trim();
    if (title && !sections.includes(title)) sections.push(title);
  }
  return {
    masterPromptChars: masterPrompt.length,
    masterPromptWords: masterPrompt.trim() ? masterPrompt.split(WORD_SPLIT).filter(Boolean).length : 0,
    reasoningChars: reasoning.length,
    reasoningWords: reasoning.trim() ? reasoning.split(WORD_SPLIT).filter(Boolean).length : 0,
    sections,
    sectionCount: sections.length,
  };
}
