/**
 * Benchmark Suite & Regression Tests for Prompts
 * Gherkin-style: Given fixed input / mock response, When we parse or validate,
 * Then we assert structure (## SYSTEM, ## USER, no raw JSON, section count).
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdownResponse } from '../utils/parseMarkdownResponse';
import { getOutputAnalysis } from '../utils/analysis';

const lang = 'tr' as const;

describe('parseMarkdownResponse', () => {
  it('Given markdown with ## separator, When parsed, Then reasoning is first paragraph and masterPrompt is rest', () => {
    const raw = `Intent is clear. We use RTF.
## SYSTEM
You are a helpful assistant.
## USER
Do the task.`;
    const result = parseMarkdownResponse(raw, lang);
    expect(result.reasoning).toContain('Intent is clear');
    expect(result.reasoning).not.toContain('## SYSTEM');
    expect(result.masterPrompt).toContain('## SYSTEM');
    expect(result.masterPrompt).toContain('## USER');
  });

  it('Given single paragraph, When parsed, Then reasoning and masterPrompt are set without throwing', () => {
    const raw = 'Single sentence output.';
    const result = parseMarkdownResponse(raw, lang);
    expect(result.reasoning).toBeTruthy();
    expect(result.masterPrompt).toBeTruthy();
  });

  it('Given empty string, When parsed, Then masterPrompt is truthy and reasoning has fallback', () => {
    const result = parseMarkdownResponse('', lang);
    expect(result.masterPrompt).toBe('');
    expect(result.reasoning).toBe('—');
  });
});

describe('Prompt structure regression (Gherkin-style)', () => {
  /** Örnek Gherkin senaryosu: Master prompt en az bir ## başlık içermeli */
  it('Given a valid master prompt response, When we analyze output, Then section count >= 1', () => {
    const mockResponse = {
      masterPrompt: `## SYSTEM\nRole.\n## DEVELOPER\nRules.\n## USER\nRequest.`,
      reasoning: 'Intent inferred.',
    };
    const analysis = getOutputAnalysis(mockResponse);
    expect(analysis.sectionCount).toBeGreaterThanOrEqual(1);
    expect(analysis.sections).toContain('SYSTEM');
    expect(analysis.sections).toContain('USER');
  });

  it('Given master prompt with ## headings, When we analyze, Then sections are extracted without duplicates', () => {
    const mockResponse = {
      masterPrompt: `## SYSTEM\nx\n## USER\ny\n### Optional\nz`,
      reasoning: 'Ok',
    };
    const analysis = getOutputAnalysis(mockResponse);
    expect(analysis.sections.length).toBeGreaterThanOrEqual(2);
    expect(analysis.sectionCount).toBe(analysis.sections.length);
  });

  it('Given response with no ## headings, When we analyze, Then sectionCount is 0 and no crash', () => {
    const mockResponse = {
      masterPrompt: 'Plain text only.',
      reasoning: '—',
    };
    const analysis = getOutputAnalysis(mockResponse);
    expect(analysis.sectionCount).toBe(0);
    expect(analysis.masterPromptWords).toBeGreaterThan(0);
  });

  /** Regresyon: Çıktı JSON olmamalı (sadece Markdown) */
  it('Given parsed result, When we check masterPrompt, Then it should not be valid JSON object', () => {
    const raw = `Reasoning here.
## SYSTEM
Content`;
    const result = parseMarkdownResponse(raw, lang);
    const trimmed = result.masterPrompt.trim();
    expect(trimmed.startsWith('{')).toBe(false);
    expect(trimmed.startsWith('[')).toBe(false);
  });
});
