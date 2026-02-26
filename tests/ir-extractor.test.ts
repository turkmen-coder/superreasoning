import { describe, it, expect } from 'vitest';
import { extractIR } from '../services/irExtractor';
import { Framework } from '../types';

describe('irExtractor', () => {
  it('extracts IR from intent + framework + domain', () => {
    const ir = extractIR({
      intent: 'Backend API OWASP standartlarına uygun hale getir',
      framework: Framework.KERNEL,
      domainId: 'backend',
      contextRules: 'OpenAPI 3.0, Rate Limiting, OWASP.',
      language: 'tr',
    });

    expect(ir.version).toBe('1.0');
    expect(ir.intent_raw).toBe('Backend API OWASP standartlarına uygun hale getir');
    expect(ir.framework).toBe(Framework.KERNEL);
    expect(ir.domain_id).toBe('backend');
    expect(ir.language).toBe('tr');
    expect(ir.goals.length).toBeGreaterThan(0);
    expect(ir.constraints.some((c) => c.type === 'scope' && c.rule.includes('backend'))).toBe(true);
    expect(ir.format_schema.sections).toContainEqual(
      expect.objectContaining({ id: 'reasoning', required: true })
    );
    expect(ir.security_policies.length).toBeGreaterThan(0);
    expect(ir.stop_conditions.length).toBeGreaterThan(0);
  });

  it('compresses intent', () => {
    const ir = extractIR({
      intent: '  API   tasarla  ,  güvenli  .  ',
      framework: Framework.AUTO,
      domainId: 'auto',
      contextRules: 'General',
    });
    expect(ir.intent_compressed).not.toContain('  ');
    expect(ir.intent_compressed.trim()).toBe(ir.intent_compressed);
  });
});
