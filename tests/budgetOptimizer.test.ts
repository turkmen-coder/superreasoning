/**
 * Unit tests for services/budgetOptimizer.ts
 * Tests estimateTokenCount(text) and analyzeBudget(inputText, outputText, provider).
 */

import { estimateTokenCount, analyzeBudget } from '../services/budgetOptimizer';

describe('estimateTokenCount', () => {
  it('should return 0 for empty string', () => {
    expect(estimateTokenCount('')).toBe(0);
  });

  it('should return 0 for whitespace-only string', () => {
    expect(estimateTokenCount('   ')).toBe(0);
  });

  it('should estimate "hello world" as Math.ceil(2 * 1.3) = 3', () => {
    expect(estimateTokenCount('hello world')).toBe(Math.ceil(2 * 1.3));
  });

  it('should return Math.ceil(wordCount * 1.3) for longer text', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const wordCount = text.split(/\s+/).filter(Boolean).length; // 9
    expect(estimateTokenCount(text)).toBe(Math.ceil(wordCount * 1.3));
  });

  it('should handle single word', () => {
    expect(estimateTokenCount('hello')).toBe(Math.ceil(1 * 1.3)); // 2
  });

  it('should handle text with multiple spaces between words', () => {
    const text = 'hello    world';
    // split by \s+ and filter(Boolean) gives ['hello', 'world'] => 2 words
    expect(estimateTokenCount(text)).toBe(Math.ceil(2 * 1.3));
  });
});

describe('analyzeBudget', () => {
  describe('token counting', () => {
    it('should calculate correct inputTokens and outputTokens with groq', () => {
      const input = 'hello world';
      const output = 'response text here now';
      const result = analyzeBudget(input, output, 'groq');
      expect(result.inputTokens).toBe(estimateTokenCount(input));
      expect(result.outputTokens).toBe(estimateTokenCount(output));
      expect(result.totalTokens).toBe(result.inputTokens + result.outputTokens);
    });

    it('should have totalTokens equal to inputTokens + outputTokens', () => {
      const result = analyzeBudget('some input text', 'some output text', 'groq');
      expect(result.totalTokens).toBe(result.inputTokens + result.outputTokens);
    });
  });

  describe('cost calculation', () => {
    it('should calculate groq pricing correctly (input: 0.05/1M, output: 0.08/1M)', () => {
      const input = 'hello world';
      const output = 'response text';
      const result = analyzeBudget(input, output, 'groq');

      const expectedInputCost = (result.inputTokens / 1_000_000) * 0.05;
      const expectedOutputCost = (result.outputTokens / 1_000_000) * 0.08;

      expect(result.estimatedCost.provider).toBe('groq');
      expect(result.estimatedCost.model).toBe('llama-3.3-70b');
      expect(result.estimatedCost.inputCostUsd).toBeCloseTo(expectedInputCost, 10);
      expect(result.estimatedCost.outputCostUsd).toBeCloseTo(expectedOutputCost, 10);
      expect(result.estimatedCost.totalCostUsd).toBeCloseTo(
        expectedInputCost + expectedOutputCost,
        10
      );
    });

    it('should use claude pricing when provider is claude', () => {
      const result = analyzeBudget('input', 'output', 'claude');
      const expectedInputCost = (result.inputTokens / 1_000_000) * 3.0;
      const expectedOutputCost = (result.outputTokens / 1_000_000) * 15.0;
      expect(result.estimatedCost.provider).toBe('claude');
      expect(result.estimatedCost.model).toBe('claude-sonnet-4-5');
      expect(result.estimatedCost.inputCostUsd).toBeCloseTo(expectedInputCost, 10);
      expect(result.estimatedCost.outputCostUsd).toBeCloseTo(expectedOutputCost, 10);
    });

    it('should use gemini pricing when provider is gemini', () => {
      const result = analyzeBudget('input', 'output', 'gemini');
      expect(result.estimatedCost.provider).toBe('gemini');
      expect(result.estimatedCost.model).toBe('gemini-2.0-flash');
      const expectedInputCost = (result.inputTokens / 1_000_000) * 0.075;
      expect(result.estimatedCost.inputCostUsd).toBeCloseTo(expectedInputCost, 10);
    });

    it('should use huggingface pricing (free tier)', () => {
      const result = analyzeBudget('input text', 'output text', 'huggingface');
      expect(result.estimatedCost.provider).toBe('huggingface');
      expect(result.estimatedCost.inputCostUsd).toBe(0);
      expect(result.estimatedCost.outputCostUsd).toBe(0);
      expect(result.estimatedCost.totalCostUsd).toBe(0);
    });

    it('should use deepseek pricing', () => {
      const result = analyzeBudget('input', 'output', 'deepseek');
      expect(result.estimatedCost.provider).toBe('deepseek');
      expect(result.estimatedCost.model).toBe('deepseek-chat-v3');
      const expectedInputCost = (result.inputTokens / 1_000_000) * 0.27;
      expect(result.estimatedCost.inputCostUsd).toBeCloseTo(expectedInputCost, 10);
    });

    it('should use openrouter pricing', () => {
      const result = analyzeBudget('input', 'output', 'openrouter');
      expect(result.estimatedCost.provider).toBe('openrouter');
      expect(result.estimatedCost.model).toBe('various');
    });

    it('should fall back to groq pricing for unknown provider', () => {
      const result = analyzeBudget('hello world', 'response', 'unknown-provider');
      // Falls back to groq pricing
      const groqResult = analyzeBudget('hello world', 'response', 'groq');
      expect(result.estimatedCost.inputCostUsd).toBeCloseTo(
        groqResult.estimatedCost.inputCostUsd,
        10
      );
      expect(result.estimatedCost.outputCostUsd).toBeCloseTo(
        groqResult.estimatedCost.outputCostUsd,
        10
      );
      expect(result.estimatedCost.model).toBe('llama-3.3-70b');
    });
  });

  describe('optimization detection', () => {
    it('should detect repeated sentences', () => {
      const repeatedSentence = 'This is a repeated sentence that appears multiple times.';
      const output = `${repeatedSentence} ${repeatedSentence} ${repeatedSentence}`;
      const result = analyzeBudget('input', output, 'groq');
      const repetitionOpt = result.optimizations.find(
        (o) => o.id === 'remove-repetitions'
      );
      expect(repetitionOpt).toBeDefined();
      expect(repetitionOpt!.tokenSaved).toBeGreaterThan(0);
      expect(repetitionOpt!.applied).toBe(false);
    });

    it('should not flag whitespace when word-based tokenizer produces same count', () => {
      // estimateTokenCount is word-based (split(/\s+/)), so extra newlines
      // between words yield the same token count before and after cleaning.
      const output = 'Line one.\n\n\n\n\n\nLine two.\n\n\n\n\n\nLine three.';
      const result = analyzeBudget('input', output, 'groq');
      const wsOpt = result.optimizations.find(
        (o) => o.id === 'trim-whitespace'
      );
      expect(wsOpt).toBeUndefined();
    });

    it('should detect long code examples that can be compressed', () => {
      const longCode = 'x '.repeat(250); // > 200 tokens worth
      const output = `Some text.\n\`\`\`\n${longCode}\n\`\`\`\nMore text.`;
      const result = analyzeBudget('input', output, 'groq');
      const exampleOpt = result.optimizations.find(
        (o) => o.id === 'compress-examples'
      );
      expect(exampleOpt).toBeDefined();
      expect(exampleOpt!.tokenSaved).toBeGreaterThan(0);
    });

    it('should return empty optimizations for clean text', () => {
      const output = 'This is a clean output without repetition or excess whitespace.';
      const result = analyzeBudget('input', output, 'groq');
      expect(result.optimizations).toHaveLength(0);
    });

    it('should not flag short code examples', () => {
      const output = 'Example:\n```\nconst x = 1;\n```\nDone.';
      const result = analyzeBudget('input', output, 'groq');
      const exampleOpt = result.optimizations.find(
        (o) => o.id === 'compress-examples'
      );
      expect(exampleOpt).toBeUndefined();
    });
  });

  describe('savings calculation', () => {
    it('should calculate savedPercentage correctly', () => {
      const repeatedSentence = 'This is a repeated sentence with enough words to count.';
      const output = `${repeatedSentence} ${repeatedSentence} ${repeatedSentence}`;
      const result = analyzeBudget('input', output, 'groq');

      expect(result.savings.originalTokens).toBe(result.totalTokens);
      expect(result.savings.savedTokens).toBeGreaterThanOrEqual(0);
      expect(result.savings.optimizedTokens).toBe(
        result.savings.originalTokens - result.savings.savedTokens
      );
      if (result.savings.savedTokens > 0) {
        const expectedPct = Math.round(
          (result.savings.savedTokens / result.savings.originalTokens) * 100
        );
        expect(result.savings.savedPercentage).toBe(expectedPct);
      }
    });

    it('should return 0% savings for clean text', () => {
      const result = analyzeBudget('input', 'clean output here', 'groq');
      expect(result.savings.savedTokens).toBe(0);
      expect(result.savings.savedPercentage).toBe(0);
      expect(result.savings.optimizedTokens).toBe(result.savings.originalTokens);
    });

    it('should return savedPercentage of 0 when totalTokens is 0', () => {
      const result = analyzeBudget('', '', 'groq');
      expect(result.savings.savedPercentage).toBe(0);
    });
  });

  describe('result structure', () => {
    it('should have all required top-level fields', () => {
      const result = analyzeBudget('input', 'output', 'groq');
      expect(result).toHaveProperty('inputTokens');
      expect(result).toHaveProperty('outputTokens');
      expect(result).toHaveProperty('totalTokens');
      expect(result).toHaveProperty('estimatedCost');
      expect(result).toHaveProperty('optimizations');
      expect(result).toHaveProperty('savings');
    });

    it('should have correct estimatedCost structure', () => {
      const result = analyzeBudget('input', 'output', 'groq');
      expect(result.estimatedCost).toHaveProperty('provider');
      expect(result.estimatedCost).toHaveProperty('model');
      expect(result.estimatedCost).toHaveProperty('inputCostUsd');
      expect(result.estimatedCost).toHaveProperty('outputCostUsd');
      expect(result.estimatedCost).toHaveProperty('totalCostUsd');
    });

    it('should have correct savings structure', () => {
      const result = analyzeBudget('input', 'output', 'groq');
      expect(result.savings).toHaveProperty('originalTokens');
      expect(result.savings).toHaveProperty('optimizedTokens');
      expect(result.savings).toHaveProperty('savedTokens');
      expect(result.savings).toHaveProperty('savedPercentage');
    });
  });
});
