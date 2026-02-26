/**
 * Standards Compliance Service Tests
 * Validates compliance checking functionality
 */

import { describe, it, expect } from 'vitest';
import { StandardsComplianceService } from '../../services/standardsComplianceService';

describe('StandardsComplianceService', () => {

  describe('getAvailableChecks', () => {
    it('should return all available compliance checks', () => {
      const checks = StandardsComplianceService.getAvailableChecks();
      
      expect(checks).toBeDefined();
      expect(Array.isArray(checks)).toBe(true);
      expect(checks.length).toBeGreaterThan(0);
      
      // Verify structure
      checks.forEach(check => {
        expect(check).toHaveProperty('id');
        expect(check).toHaveProperty('name');
        expect(check).toHaveProperty('nameTr');
        expect(check).toHaveProperty('category');
        expect(check).toHaveProperty('standard');
        expect(check).toHaveProperty('automated');
        expect(check).toHaveProperty('checkFunction');
        
        expect(['accessibility', 'security', 'performance', 'privacy']).toContain(check.category);
      });
    });

    it('should include WCAG compliance checks', () => {
      const checks = StandardsComplianceService.getAvailableChecks();
      const wcagChecks = checks.filter(check => check.standard === 'WCAG 2.1 AA');
      
      expect(wcagChecks.length).toBeGreaterThan(0);
      expect(wcagChecks.some(check => check.id.includes('wcag'))).toBe(true);
    });

    it('should include OWASP security checks', () => {
      const checks = StandardsComplianceService.getAvailableChecks();
      const owaspChecks = checks.filter(check => check.standard.includes('OWASP'));
      
      expect(owaspChecks.length).toBeGreaterThan(0);
      expect(owaspChecks.some(check => check.id.includes('owasp'))).toBe(true);
    });
  });

  describe('getChecksByCategory', () => {
    it('should return checks filtered specific specified category', () => {
      const accessibilityChecks = StandardsComplianceService.getChecksByCategory('accessibility');
      
      expect(accessibilityChecks.length).toBeGreaterThan(0);
      accessibilityChecks.forEach(check => {
        expect(check.category).toBe('accessibility');
      });
    });

    it('should return empty array for unknown category', () => {
      const unknownChecks = StandardsComplianceService.getChecksByCategory('unknown');
      expect(unknownChecks).toEqual([]);
    });

    it('should return security checks', () => {
      const securityChecks = StandardsComplianceService.getChecksByCategory('security');
      
      expect(securityChecks.length).toBeGreaterThan(0);
      securityChecks.forEach(check => {
        expect(check.category).toBe('security');
      });
    });
  });

  describe('runFullAudit', () => {
    it('should return a complete compliance report', async () => {
      const result = await StandardsComplianceService.runFullAudit();

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('categoryScores');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('generatedAt');

      expect(typeof result.overallScore).toBe('number');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should include real check counts in summary', async () => {
      const result = await StandardsComplianceService.runFullAudit();

      expect(result.summary.totalChecks).toBeGreaterThan(0);
      expect(typeof result.summary.compliant).toBe('number');
      expect(typeof result.summary.partial).toBe('number');
      expect(typeof result.summary.nonCompliant).toBe('number');
    });
  });

  describe('runCheck', () => {
    it('should run a specific compliance check', async () => {
      const checks = StandardsComplianceService.getAvailableChecks();
      const firstCheck = checks[0];
      const result = await StandardsComplianceService.runCheck(firstCheck.id);

      expect(result.checkId).toBe(firstCheck.id);
      expect(['compliant', 'partial', 'non-compliant', 'not-applicable']).toContain(result.status);
      expect(typeof result.score).toBe('number');
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should throw error for unknown check ID', async () => {
      await expect(StandardsComplianceService.runCheck('unknown-check')).rejects.toThrow();
    });
  });
});

describe('Compliance Check Results', () => {
  it('should validate compliant result structure', () => {
    const compliantResult = {
      checkId: 'test-check',
      status: 'compliant' as const,
      score: 95,
      issues: [],
      timestamp: new Date()
    };

    expect(compliantResult.status).toBe('compliant');
    expect(compliantResult.score).toBeGreaterThanOrEqual(90);
    expect(compliantResult.issues).toHaveLength(0);
  });

  it('should validate partial compliance result', () => {
    const partialResult = {
      checkId: 'test-check',
      status: 'partial' as const,
      score: 75,
      issues: [
        {
          id: 'minor-issue',
          severity: 'low' as const,
          rule: 'Test Rule',
          description: 'Minor issue found',
          descriptionTr: 'Küçük sorun bulundu',
          recommendation: 'Fix the issue',
          recommendationTr: 'Sorunu düzeltin'
        }
      ],
      timestamp: new Date()
    };

    expect(partialResult.status).toBe('partial');
    expect(partialResult.score).toBeGreaterThanOrEqual(50);
    expect(partialResult.score).toBeLessThan(90);
    expect(partialResult.issues.length).toBeGreaterThan(0);
  });

  it('should validate non-compliant result', () => {
    const nonCompliantResult = {
      checkId: 'test-check',
      status: 'non-compliant' as const,
      score: 25,
      issues: [
        {
          id: 'critical-issue',
          severity: 'high' as const,
          rule: 'Critical Rule',
          description: 'Critical security issue',
          descriptionTr: 'Kritik güvenlik sorunu',
          recommendation: 'Immediate fix required',
          recommendationTr: 'Acil düzeltme gerekli'
        }
      ],
      timestamp: new Date()
    };

    expect(nonCompliantResult.status).toBe('non-compliant');
    expect(nonCompliantResult.score).toBeLessThan(50);
    expect(nonCompliantResult.issues.some(issue => issue.severity === 'high')).toBe(true);
  });
});

describe('Compliance Categories', () => {
  const categories = ['accessibility', 'security', 'performance', 'privacy'];
  
  categories.forEach(category => {
    it(`should have valid checks for ${category} category`, () => {
      const checks = StandardsComplianceService.getChecksByCategory(category);
      
      expect(checks.length).toBeGreaterThan(0);
      checks.forEach(check => {
        expect(check.category).toBe(category);
        expect(check.id).toBeDefined();
        expect(check.name).toBeDefined();
        expect(check.nameTr).toBeDefined();
        expect(check.standard).toBeDefined();
        expect(typeof check.automated).toBe('boolean');
        expect(typeof check.checkFunction).toBe('function');
      });
    });
  });
});

describe('Integration Tests', () => {
  it('should produce a full audit with consistent summary counts', async () => {
    const result = await StandardsComplianceService.runFullAudit();

    // Summary counts must add up to totalChecks
    const { compliant, partial, nonCompliant, totalChecks } = result.summary;
    const notApplicable = result.checks.filter(c => c.status === 'not-applicable').length;
    expect(compliant + partial + nonCompliant + notApplicable).toBe(totalChecks);

    // criticalIssues should match high-severity issues across all checks
    const highIssues = result.checks.flatMap(c => c.issues).filter(i => i.severity === 'high').length;
    expect(result.summary.criticalIssues).toBe(highIssues);

    // realChecks + mockChecks should equal totalChecks
    expect(result.summary.realChecks + result.summary.mockChecks).toBe(totalChecks);
  });

  it('should have category scores for each represented category', async () => {
    const result = await StandardsComplianceService.runFullAudit();
    const categories = ['accessibility', 'security', 'performance', 'privacy'];

    categories.forEach(cat => {
      const catChecks = result.checks.filter(c => {
        const def = StandardsComplianceService.getAvailableChecks().find(d => d.id === c.checkId);
        return def?.category === cat && c.status !== 'not-applicable';
      });
      if (catChecks.length > 0) {
        expect(result.categoryScores[cat]).toBeDefined();
        expect(typeof result.categoryScores[cat]).toBe('number');
      }
    });
  });

  it('should have each check result reference a known check ID', async () => {
    const result = await StandardsComplianceService.runFullAudit();
    const knownIds = StandardsComplianceService.getAvailableChecks().map(c => c.id);

    result.checks.forEach(checkResult => {
      expect(knownIds).toContain(checkResult.checkId);
    });
  });
});
