/**
 * Contract Validator — Output kontrat doğrulama engine.
 * Pure functions: DB erişimi yok, side effect yok.
 * @see types/regression.ts
 */

import type { ContractRule, ContractRuleViolation, ContractValidationResult } from '../types/regression';

/**
 * Validate an output string against a set of contract rules.
 */
export function validateContract(output: string, rules: ContractRule): ContractValidationResult {
  const violations: ContractRuleViolation[] = [];

  // 1. minLength
  if (rules.minLength != null) {
    const passed = output.length >= rules.minLength;
    violations.push({
      ruleType: 'minLength',
      label: `Min length: ${rules.minLength}`,
      expected: `>= ${rules.minLength} chars`,
      actual: `${output.length} chars`,
      passed,
    });
  }

  // 2. maxLength
  if (rules.maxLength != null) {
    const passed = output.length <= rules.maxLength;
    violations.push({
      ruleType: 'maxLength',
      label: `Max length: ${rules.maxLength}`,
      expected: `<= ${rules.maxLength} chars`,
      actual: `${output.length} chars`,
      passed,
    });
  }

  // 3. requiredKeywords
  if (rules.requiredKeywords && rules.requiredKeywords.length > 0) {
    for (const kw of rules.requiredKeywords) {
      const passed = output.toLowerCase().includes(kw.toLowerCase());
      violations.push({
        ruleType: 'requiredKeywords',
        label: `Required keyword: "${kw}"`,
        expected: `Contains "${kw}"`,
        actual: passed ? 'Found' : 'Not found',
        passed,
      });
    }
  }

  // 4. forbiddenKeywords
  if (rules.forbiddenKeywords && rules.forbiddenKeywords.length > 0) {
    for (const kw of rules.forbiddenKeywords) {
      const found = output.toLowerCase().includes(kw.toLowerCase());
      violations.push({
        ruleType: 'forbiddenKeywords',
        label: `Forbidden keyword: "${kw}"`,
        expected: `Must not contain "${kw}"`,
        actual: found ? 'Found (violation)' : 'Not found',
        passed: !found,
      });
    }
  }

  // 5. regexPatterns
  if (rules.regexPatterns && rules.regexPatterns.length > 0) {
    for (const rp of rules.regexPatterns) {
      try {
        const re = new RegExp(rp.pattern, rp.flags || '');
        const passed = re.test(output);
        violations.push({
          ruleType: 'regexPatterns',
          label: rp.label || `Regex: /${rp.pattern}/${rp.flags || ''}`,
          expected: `Match /${rp.pattern}/${rp.flags || ''}`,
          actual: passed ? 'Matched' : 'No match',
          passed,
        });
      } catch {
        violations.push({
          ruleType: 'regexPatterns',
          label: rp.label || `Regex: /${rp.pattern}/`,
          expected: 'Valid regex pattern',
          actual: 'Invalid regex',
          passed: false,
        });
      }
    }
  }

  // 6. requiredSections (markdown headings)
  if (rules.requiredSections && rules.requiredSections.length > 0) {
    for (const sec of rules.requiredSections) {
      const headingPattern = new RegExp(`^#{1,6}\\s+${escapeRegex(sec.heading)}\\s*$`, 'mi');
      const headingMatch = headingPattern.exec(output);

      if (!headingMatch) {
        violations.push({
          ruleType: 'requiredSections',
          label: `Required section: "${sec.heading}"`,
          expected: `Heading "# ${sec.heading}" present`,
          actual: 'Heading not found',
          passed: false,
        });
      } else if (sec.minWords != null) {
        const sectionContent = extractSectionContent(output, headingMatch.index);
        const wordCount = sectionContent.split(/\s+/).filter(Boolean).length;
        const passed = wordCount >= sec.minWords;
        violations.push({
          ruleType: 'requiredSections',
          label: `Section "${sec.heading}" min words: ${sec.minWords}`,
          expected: `>= ${sec.minWords} words`,
          actual: `${wordCount} words`,
          passed,
        });
      } else {
        violations.push({
          ruleType: 'requiredSections',
          label: `Required section: "${sec.heading}"`,
          expected: `Heading present`,
          actual: 'Found',
          passed: true,
        });
      }
    }
  }

  // 7. jsonSchema (basic structural validation without ajv for now)
  if (rules.jsonSchema && Object.keys(rules.jsonSchema).length > 0) {
    try {
      const parsed = JSON.parse(output);
      const schemaChecks = validateJsonStructure(parsed, rules.jsonSchema);
      violations.push(...schemaChecks);
    } catch {
      violations.push({
        ruleType: 'jsonSchema',
        label: 'JSON Schema validation',
        expected: 'Valid JSON output',
        actual: 'Output is not valid JSON',
        passed: false,
      });
    }
  }

  const totalRules = violations.length;
  const passedRules = violations.filter((v) => v.passed).length;
  const score = totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 100;

  return {
    passed: passedRules === totalRules,
    score,
    totalRules,
    passedRules,
    violations,
  };
}

/** Extract content after a heading until the next heading of same or higher level */
function extractSectionContent(text: string, headingIndex: number): string {
  const afterHeading = text.slice(headingIndex);
  const lines = afterHeading.split('\n');
  // Skip the heading line itself
  const headingLine = lines[0];
  const headingLevel = (headingLine.match(/^(#{1,6})\s/) || ['', '#'])[1].length;

  const contentLines: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const nextHeading = lines[i].match(/^(#{1,6})\s/);
    if (nextHeading && nextHeading[1].length <= headingLevel) break;
    contentLines.push(lines[i]);
  }
  return contentLines.join('\n');
}

/** Basic JSON structure validation (type check, required fields) */
function validateJsonStructure(
  data: unknown,
  schema: Record<string, unknown>
): ContractRuleViolation[] {
  const violations: ContractRuleViolation[] = [];

  const schemaType = schema.type as string | undefined;
  if (schemaType) {
    const actualType = Array.isArray(data) ? 'array' : typeof data;
    const passed = actualType === schemaType;
    violations.push({
      ruleType: 'jsonSchema',
      label: `JSON type check`,
      expected: schemaType,
      actual: actualType,
      passed,
    });
  }

  if (schema.required && Array.isArray(schema.required) && typeof data === 'object' && data !== null) {
    for (const field of schema.required as string[]) {
      const passed = field in (data as Record<string, unknown>);
      violations.push({
        ruleType: 'jsonSchema',
        label: `Required field: "${field}"`,
        expected: `Field "${field}" present`,
        actual: passed ? 'Present' : 'Missing',
        passed,
      });
    }
  }

  if (violations.length === 0) {
    violations.push({
      ruleType: 'jsonSchema',
      label: 'JSON Schema validation',
      expected: 'Valid structure',
      actual: 'Valid',
      passed: true,
    });
  }

  return violations;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
