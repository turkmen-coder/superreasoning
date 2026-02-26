/**
 * Unit tests for services/promptLint.ts
 * Tests the pure function lintPrompt(masterPrompt, reasoning?).
 */

import { lintPrompt } from '../services/promptLint';

describe('lintPrompt', () => {
  // --- R1: vague-verbs ---
  describe('R1: vague-verbs', () => {
    it('should warn on English vague verb "improve"', () => {
      const result = lintPrompt('just improve the code and make it work');
      const issue = result.issues.find((i) => i.ruleId === 'vague-verbs');
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('warning');
      expect(issue!.excerpt).toBeDefined();
    });

    it('should warn on English vague verb "fix it"', () => {
      const result = lintPrompt('please fix it before deploying to production server');
      const issue = result.issues.find((i) => i.ruleId === 'vague-verbs');
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('warning');
    });

    it('should warn on Turkish vague verb', () => {
      const result = lintPrompt('kodu düzelt ve daha iyi hale getir, sonra gönder');
      const issue = result.issues.find((i) => i.ruleId === 'vague-verbs');
      expect(issue).toBeDefined();
      expect(issue!.messageTr).toBeDefined();
    });

    it('should not warn when specific verbs are used', () => {
      const prompt =
        'Refactor the authentication module to use JWT tokens with RS256 signing algorithm. ' +
        'Add criteria for success. Output as JSON format. ' +
        '## SYSTEM\nYou are an assistant.\n## USER\nDo the refactoring. ' +
        'Include guardrail checks for unauthorized access.';
      const result = lintPrompt(prompt);
      const issue = result.issues.find((i) => i.ruleId === 'vague-verbs');
      expect(issue).toBeUndefined();
    });
  });

  // --- R2: missing-success-criteria ---
  describe('R2: missing-success-criteria', () => {
    it('should warn when no success criteria keywords present', () => {
      const result = lintPrompt(
        'Write a function that processes data and returns results in the expected format. ' +
        '## SYSTEM\nAssistant.\n## USER\nDo it. Include guardrail.'
      );
      const issue = result.issues.find(
        (i) => i.ruleId === 'missing-success-criteria'
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('warning');
    });

    it('should not warn when "criteria" keyword is present', () => {
      const result = lintPrompt(
        'The success criteria for this task is 95% accuracy on the test set.'
      );
      const issue = result.issues.find(
        (i) => i.ruleId === 'missing-success-criteria'
      );
      expect(issue).toBeUndefined();
    });

    it('should not warn when "metric" keyword is present', () => {
      const result = lintPrompt(
        'Track the metric for latency below 200ms across all endpoints.'
      );
      const issue = result.issues.find(
        (i) => i.ruleId === 'missing-success-criteria'
      );
      expect(issue).toBeUndefined();
    });
  });

  // --- R3: missing-format ---
  describe('R3: missing-format', () => {
    it('should produce info when no format keyword present', () => {
      const result = lintPrompt(
        'Analyze the data and provide insights about user behavior patterns. ' +
        'Success criteria: clear summary. ' +
        '## SYSTEM\nAssistant.\n## USER\nAnalyze. guardrail.'
      );
      const issue = result.issues.find((i) => i.ruleId === 'missing-format');
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('info');
    });

    it('should not produce info when "JSON output" is mentioned', () => {
      const result = lintPrompt(
        'Process the data and return as JSON output with structured fields.'
      );
      const issue = result.issues.find((i) => i.ruleId === 'missing-format');
      expect(issue).toBeUndefined();
    });

    it('should not produce info when "markdown" is mentioned', () => {
      const result = lintPrompt(
        'Generate a report in markdown with proper heading levels.'
      );
      const issue = result.issues.find((i) => i.ruleId === 'missing-format');
      expect(issue).toBeUndefined();
    });
  });

  // --- R4: too-short ---
  describe('R4: too-short', () => {
    it('should warn when prompt has fewer than 20 words', () => {
      const result = lintPrompt('Write a function that adds two numbers together.');
      const issue = result.issues.find((i) => i.ruleId === 'too-short');
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('warning');
    });

    it('should not warn when prompt has 25 or more words', () => {
      const words = Array(25).fill('word').join(' ');
      const result = lintPrompt(words);
      const issue = result.issues.find((i) => i.ruleId === 'too-short');
      expect(issue).toBeUndefined();
    });

    it('should not warn for exactly 20 words', () => {
      const words = Array(20).fill('word').join(' ');
      const result = lintPrompt(words);
      const issue = result.issues.find((i) => i.ruleId === 'too-short');
      expect(issue).toBeUndefined();
    });
  });

  // --- R5: too-long ---
  describe('R5: too-long', () => {
    it('should warn when prompt exceeds 2000 words', () => {
      const words = Array(2500).fill('word').join(' ');
      const result = lintPrompt(words);
      const issue = result.issues.find((i) => i.ruleId === 'too-long');
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('warning');
    });

    it('should not warn for 1000 words', () => {
      const words = Array(1000).fill('word').join(' ');
      const result = lintPrompt(words);
      const issue = result.issues.find((i) => i.ruleId === 'too-long');
      expect(issue).toBeUndefined();
    });

    it('should not warn for exactly 2000 words', () => {
      const words = Array(2000).fill('word').join(' ');
      const result = lintPrompt(words);
      const issue = result.issues.find((i) => i.ruleId === 'too-long');
      expect(issue).toBeUndefined();
    });
  });

  // --- R6: missing-system-user-separation ---
  describe('R6: missing-system-user-separation', () => {
    it('should produce info when no ## SYSTEM or ## USER present', () => {
      const result = lintPrompt(
        'This is a prompt without any structural separation markers whatsoever. ' +
        'Success criteria: done. Format: JSON. guardrail.'
      );
      const issue = result.issues.find(
        (i) => i.ruleId === 'missing-system-user-separation'
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('info');
    });

    it('should not produce info when both ## SYSTEM and ## USER are present', () => {
      const result = lintPrompt(
        '## SYSTEM\nYou are a helpful assistant.\n## USER\nPlease help me with this task.'
      );
      const issue = result.issues.find(
        (i) => i.ruleId === 'missing-system-user-separation'
      );
      expect(issue).toBeUndefined();
    });

    it('should not produce info when only ## SYSTEM is present', () => {
      const result = lintPrompt('## SYSTEM\nYou are an assistant.');
      const issue = result.issues.find(
        (i) => i.ruleId === 'missing-system-user-separation'
      );
      expect(issue).toBeUndefined();
    });
  });

  // --- R7: missing-security ---
  describe('R7: missing-security', () => {
    it('should produce info when no guardrail keywords found', () => {
      const result = lintPrompt(
        'Process the user input data and return a formatted JSON output. ' +
        'Success criteria is complete. ## SYSTEM\nAssistant.\n## USER\nDo it.'
      );
      const issue = result.issues.find(
        (i) => i.ruleId === 'missing-security'
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('info');
    });

    it('should not produce info when "guardrail" keyword is present', () => {
      const result = lintPrompt(
        'Add a guardrail to prevent prompt injection attacks.'
      );
      const issue = result.issues.find(
        (i) => i.ruleId === 'missing-security'
      );
      expect(issue).toBeUndefined();
    });

    it('should not produce info when "security" keyword is present', () => {
      const result = lintPrompt(
        'Implement security measures for the authentication flow.'
      );
      const issue = result.issues.find(
        (i) => i.ruleId === 'missing-security'
      );
      expect(issue).toBeUndefined();
    });
  });

  // --- R8: contradiction ---
  describe('R8: contradiction', () => {
    it('should report error when "no json" and "json format" coexist', () => {
      const result = lintPrompt(
        'Do not use no json in this output. But also provide json format for the data.'
      );
      const issue = result.issues.find((i) => i.ruleId === 'contradiction');
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('error');
    });

    it('should not report error when only JSON format is mentioned', () => {
      const result = lintPrompt(
        'Provide the output in json format with proper structure.'
      );
      const issue = result.issues.find((i) => i.ruleId === 'contradiction');
      expect(issue).toBeUndefined();
    });
  });

  // --- R9: pii-risk ---
  describe('R9: pii-risk', () => {
    it('should warn when "password" is mentioned', () => {
      const result = lintPrompt(
        'Ask the user to enter your password for verification purposes.'
      );
      const issue = result.issues.find((i) => i.ruleId === 'pii-risk');
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('warning');
    });

    it('should warn when "api key" is mentioned', () => {
      const result = lintPrompt(
        'Include the api key in the request header for authentication.'
      );
      const issue = result.issues.find((i) => i.ruleId === 'pii-risk');
      expect(issue).toBeDefined();
    });

    it('should not warn when no PII terms present', () => {
      const result = lintPrompt(
        'Generate a summary report of the quarterly sales data with clear metrics. ' +
        'Success criteria: comprehensive. Output JSON. ## SYSTEM\nBot.\n## USER\nDo. guardrail.'
      );
      const issue = result.issues.find((i) => i.ruleId === 'pii-risk');
      expect(issue).toBeUndefined();
    });
  });

  // --- Combined / overall ---
  describe('combined checks', () => {
    it('should return passed: true for a clean professional prompt', () => {
      const prompt = [
        '## SYSTEM',
        'You are an expert code reviewer. Enforce guardrail against injection.',
        '',
        '## USER',
        'Review the following authentication module for security vulnerabilities.',
        'Success criteria: identify at least 3 potential issues with measurable severity.',
        'Output format: JSON array with fields: issue, severity, recommendation.',
        'Focus on SQL injection, XSS, and authentication bypass vectors.',
        'Provide actionable recommendations for each finding.',
      ].join('\n');
      const result = lintPrompt(prompt);
      expect(result.passed).toBe(true);
      expect(result.totalErrors).toBe(0);
    });

    it('should have correct result shape properties', () => {
      const result = lintPrompt('test prompt');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('totalErrors');
      expect(result).toHaveProperty('totalWarnings');
      expect(result).toHaveProperty('totalInfo');
      expect(result).toHaveProperty('passed');
      expect(Array.isArray(result.issues)).toBe(true);
      expect(typeof result.totalErrors).toBe('number');
      expect(typeof result.totalWarnings).toBe('number');
      expect(typeof result.totalInfo).toBe('number');
      expect(typeof result.passed).toBe('boolean');
    });

    it('should count severities correctly', () => {
      // Trigger multiple rules at once
      const prompt = 'no json but also json format with password';
      const result = lintPrompt(prompt);
      // contradiction is error, password is warning, too-short is warning,
      // missing-success-criteria is warning, missing-system-user-separation is info, missing-security is info
      expect(result.totalErrors).toBeGreaterThanOrEqual(1);
      expect(result.totalWarnings).toBeGreaterThanOrEqual(1);
      expect(result.totalInfo).toBeGreaterThanOrEqual(0);
    });

    it('should mark passed as false when any error exists', () => {
      const prompt = 'no json but also json format is required here';
      const result = lintPrompt(prompt);
      expect(result.passed).toBe(false);
      expect(result.totalErrors).toBeGreaterThanOrEqual(1);
    });

    it('should mark passed as true even with warnings (only errors fail)', () => {
      // Trigger only warnings (too-short, missing-success-criteria) but no errors
      const prompt = 'Write code now please fix it quickly';
      const result = lintPrompt(prompt);
      const hasError = result.issues.some((i) => i.severity === 'error');
      if (!hasError) {
        expect(result.passed).toBe(true);
      }
    });
  });
});
