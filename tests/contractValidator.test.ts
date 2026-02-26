/**
 * Unit tests for services/contractValidator.ts
 * Tests the pure function validateContract(output, rules).
 */

import { validateContract } from '../services/contractValidator';
import type { ContractRule } from '../types/regression';

describe('validateContract', () => {
  // --- minLength ---
  describe('minLength rule', () => {
    it('should report violation when output is shorter than minLength', () => {
      const result = validateContract('hi', { minLength: 10 });
      const rule = result.violations.find((v) => v.ruleType === 'minLength');
      expect(rule).toBeDefined();
      expect(rule!.passed).toBe(false);
      expect(result.passed).toBe(false);
    });

    it('should pass when output meets minLength', () => {
      const result = validateContract('hello world, this is long enough', { minLength: 10 });
      const rule = result.violations.find((v) => v.ruleType === 'minLength');
      expect(rule).toBeDefined();
      expect(rule!.passed).toBe(true);
    });

    it('should pass when output length equals minLength exactly', () => {
      const output = 'a'.repeat(10);
      const result = validateContract(output, { minLength: 10 });
      const rule = result.violations.find((v) => v.ruleType === 'minLength');
      expect(rule!.passed).toBe(true);
    });
  });

  // --- maxLength ---
  describe('maxLength rule', () => {
    it('should report violation when output exceeds maxLength', () => {
      const result = validateContract('a'.repeat(101), { maxLength: 100 });
      const rule = result.violations.find((v) => v.ruleType === 'maxLength');
      expect(rule).toBeDefined();
      expect(rule!.passed).toBe(false);
    });

    it('should pass when output is within maxLength', () => {
      const result = validateContract('short', { maxLength: 100 });
      const rule = result.violations.find((v) => v.ruleType === 'maxLength');
      expect(rule!.passed).toBe(true);
    });

    it('should pass when output length equals maxLength exactly', () => {
      const output = 'x'.repeat(50);
      const result = validateContract(output, { maxLength: 50 });
      const rule = result.violations.find((v) => v.ruleType === 'maxLength');
      expect(rule!.passed).toBe(true);
    });
  });

  // --- requiredKeywords ---
  describe('requiredKeywords rule', () => {
    it('should pass when required keyword is present', () => {
      const result = validateContract('The API returns JSON data', {
        requiredKeywords: ['JSON'],
      });
      const rule = result.violations.find(
        (v) => v.ruleType === 'requiredKeywords'
      );
      expect(rule!.passed).toBe(true);
      expect(rule!.actual).toBe('Found');
    });

    it('should report violation when required keyword is missing', () => {
      const result = validateContract('The API returns data', {
        requiredKeywords: ['XML'],
      });
      const rule = result.violations.find(
        (v) => v.ruleType === 'requiredKeywords'
      );
      expect(rule!.passed).toBe(false);
      expect(rule!.actual).toBe('Not found');
    });

    it('should be case-insensitive', () => {
      const result = validateContract('json output expected', {
        requiredKeywords: ['JSON'],
      });
      const rule = result.violations.find(
        (v) => v.ruleType === 'requiredKeywords'
      );
      expect(rule!.passed).toBe(true);
    });

    it('should check multiple keywords independently', () => {
      const result = validateContract('This has foo but not the other', {
        requiredKeywords: ['foo', 'bar'],
      });
      const rules = result.violations.filter(
        (v) => v.ruleType === 'requiredKeywords'
      );
      expect(rules).toHaveLength(2);
      expect(rules[0].passed).toBe(true); // foo
      expect(rules[1].passed).toBe(false); // bar
    });
  });

  // --- forbiddenKeywords ---
  describe('forbiddenKeywords rule', () => {
    it('should report violation when forbidden keyword is present', () => {
      const result = validateContract('This contains a secret key', {
        forbiddenKeywords: ['secret'],
      });
      const rule = result.violations.find(
        (v) => v.ruleType === 'forbiddenKeywords'
      );
      expect(rule!.passed).toBe(false);
      expect(rule!.actual).toContain('violation');
    });

    it('should pass when forbidden keyword is absent', () => {
      const result = validateContract('This is clean output', {
        forbiddenKeywords: ['secret'],
      });
      const rule = result.violations.find(
        (v) => v.ruleType === 'forbiddenKeywords'
      );
      expect(rule!.passed).toBe(true);
    });

    it('should be case-insensitive for forbidden keywords', () => {
      const result = validateContract('Contains PASSWORD here', {
        forbiddenKeywords: ['password'],
      });
      const rule = result.violations.find(
        (v) => v.ruleType === 'forbiddenKeywords'
      );
      expect(rule!.passed).toBe(false);
    });
  });

  // --- regexPatterns ---
  describe('regexPatterns rule', () => {
    it('should pass when output matches regex pattern', () => {
      const result = validateContract('Order #12345 confirmed', {
        regexPatterns: [{ pattern: '#\\d{5}', label: 'Order ID' }],
      });
      const rule = result.violations.find(
        (v) => v.ruleType === 'regexPatterns'
      );
      expect(rule!.passed).toBe(true);
      expect(rule!.actual).toBe('Matched');
    });

    it('should report violation when output does not match regex', () => {
      const result = validateContract('Order confirmed', {
        regexPatterns: [{ pattern: '#\\d{5}' }],
      });
      const rule = result.violations.find(
        (v) => v.ruleType === 'regexPatterns'
      );
      expect(rule!.passed).toBe(false);
      expect(rule!.actual).toBe('No match');
    });

    it('should handle regex flags correctly', () => {
      const result = validateContract('Hello World', {
        regexPatterns: [{ pattern: 'hello', flags: 'i' }],
      });
      const rule = result.violations.find(
        (v) => v.ruleType === 'regexPatterns'
      );
      expect(rule!.passed).toBe(true);
    });

    it('should report violation for invalid regex pattern', () => {
      const result = validateContract('anything', {
        regexPatterns: [{ pattern: '[invalid(' }],
      });
      const rule = result.violations.find(
        (v) => v.ruleType === 'regexPatterns'
      );
      expect(rule!.passed).toBe(false);
      expect(rule!.actual).toBe('Invalid regex');
    });
  });

  // --- requiredSections ---
  describe('requiredSections rule', () => {
    it('should pass when markdown heading is present', () => {
      const output = '# Introduction\nSome content here.\n# Details\nMore content.';
      const result = validateContract(output, {
        requiredSections: [{ heading: 'Introduction' }],
      });
      const rule = result.violations.find(
        (v) => v.ruleType === 'requiredSections'
      );
      expect(rule!.passed).toBe(true);
    });

    it('should report violation when heading is missing', () => {
      const output = '# Introduction\nContent here.';
      const result = validateContract(output, {
        requiredSections: [{ heading: 'Conclusion' }],
      });
      const rule = result.violations.find(
        (v) => v.ruleType === 'requiredSections'
      );
      expect(rule!.passed).toBe(false);
      expect(rule!.actual).toContain('not found');
    });

    it('should check minWords in section content', () => {
      const output = '## Summary\nThis is a short section.';
      const result = validateContract(output, {
        requiredSections: [{ heading: 'Summary', minWords: 100 }],
      });
      const rule = result.violations.find(
        (v) => v.ruleType === 'requiredSections'
      );
      expect(rule!.passed).toBe(false);
    });

    it('should pass minWords when section has enough words', () => {
      const words = Array(50).fill('word').join(' ');
      const output = `## Summary\n${words}\n## Next`;
      const result = validateContract(output, {
        requiredSections: [{ heading: 'Summary', minWords: 10 }],
      });
      const rule = result.violations.find(
        (v) => v.ruleType === 'requiredSections'
      );
      expect(rule!.passed).toBe(true);
    });

    it('should support different heading levels', () => {
      const output = '### Details\nSome detail content.';
      const result = validateContract(output, {
        requiredSections: [{ heading: 'Details' }],
      });
      const rule = result.violations.find(
        (v) => v.ruleType === 'requiredSections'
      );
      expect(rule!.passed).toBe(true);
    });
  });

  // --- jsonSchema ---
  describe('jsonSchema rule', () => {
    it('should pass for valid JSON with correct type', () => {
      const output = JSON.stringify({ name: 'test', value: 42 });
      const result = validateContract(output, {
        jsonSchema: { type: 'object' },
      });
      const typeCheck = result.violations.find(
        (v) => v.ruleType === 'jsonSchema' && v.label === 'JSON type check'
      );
      expect(typeCheck!.passed).toBe(true);
    });

    it('should report violation for invalid JSON', () => {
      const result = validateContract('not valid json {{{', {
        jsonSchema: { type: 'object' },
      });
      const rule = result.violations.find(
        (v) => v.ruleType === 'jsonSchema'
      );
      expect(rule!.passed).toBe(false);
      expect(rule!.actual).toContain('not valid JSON');
    });

    it('should report violation when JSON type does not match schema', () => {
      const output = JSON.stringify([1, 2, 3]);
      const result = validateContract(output, {
        jsonSchema: { type: 'object' },
      });
      const typeCheck = result.violations.find(
        (v) => v.ruleType === 'jsonSchema' && v.label === 'JSON type check'
      );
      expect(typeCheck!.passed).toBe(false);
      expect(typeCheck!.actual).toBe('array');
    });

    it('should check required fields in JSON object', () => {
      const output = JSON.stringify({ name: 'test' });
      const result = validateContract(output, {
        jsonSchema: { type: 'object', required: ['name', 'age'] },
      });
      const nameField = result.violations.find(
        (v) => v.label === 'Required field: "name"'
      );
      const ageField = result.violations.find(
        (v) => v.label === 'Required field: "age"'
      );
      expect(nameField!.passed).toBe(true);
      expect(ageField!.passed).toBe(false);
    });

    it('should pass when all required fields are present', () => {
      const output = JSON.stringify({ name: 'test', age: 25 });
      const result = validateContract(output, {
        jsonSchema: { type: 'object', required: ['name', 'age'] },
      });
      const fields = result.violations.filter(
        (v) => v.label.startsWith('Required field')
      );
      expect(fields.every((f) => f.passed)).toBe(true);
    });
  });

  // --- Combined rules ---
  describe('combined rules', () => {
    it('should evaluate multiple rules at once', () => {
      const output = 'This output contains keyword1 and is reasonably long enough.';
      const rules: ContractRule = {
        minLength: 10,
        maxLength: 1000,
        requiredKeywords: ['keyword1'],
        forbiddenKeywords: ['banned'],
      };
      const result = validateContract(output, rules);
      expect(result.totalRules).toBe(4); // min, max, required, forbidden
      expect(result.passedRules).toBe(4);
      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
    });

    it('should calculate score correctly with partial failures', () => {
      const output = 'short';
      const rules: ContractRule = {
        minLength: 100, // will fail
        maxLength: 1000, // will pass
      };
      const result = validateContract(output, rules);
      expect(result.totalRules).toBe(2);
      expect(result.passedRules).toBe(1);
      expect(result.score).toBe(50);
      expect(result.passed).toBe(false);
    });
  });

  // --- Edge cases ---
  describe('edge cases', () => {
    it('should handle empty output string', () => {
      const result = validateContract('', { minLength: 1 });
      expect(result.passed).toBe(false);
      const rule = result.violations.find((v) => v.ruleType === 'minLength');
      expect(rule!.actual).toBe('0 chars');
    });

    it('should handle empty rules object (no rules)', () => {
      const result = validateContract('any output', {});
      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.totalRules).toBe(0);
      expect(result.violations).toHaveLength(0);
    });

    it('should return score 100 when all rules pass', () => {
      const output = 'A valid output with keyword present.';
      const rules: ContractRule = {
        minLength: 5,
        maxLength: 500,
        requiredKeywords: ['keyword'],
      };
      const result = validateContract(output, rules);
      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
    });

    it('should handle empty requiredKeywords array (no violations created)', () => {
      const result = validateContract('anything', { requiredKeywords: [] });
      expect(result.violations).toHaveLength(0);
      expect(result.score).toBe(100);
    });

    it('should handle empty forbiddenKeywords array', () => {
      const result = validateContract('anything', { forbiddenKeywords: [] });
      expect(result.violations).toHaveLength(0);
    });
  });
});
