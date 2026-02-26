/**
 * Standards Compliance Dashboard — Real-time monitoring of industry standards compliance
 * Provides comprehensive view of WCAG, OWASP, and other regulatory compliance status
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import CyberButton from './CyberButton';

interface ComplianceMetric {
  id: string;
  name: string;
  nameTr: string;
  category: 'accessibility' | 'security' | 'performance' | 'privacy';
  status: 'compliant' | 'partial' | 'non-compliant' | 'not-applicable';
  score: number; // 0-100
  lastChecked: Date;
  issues: ComplianceIssue[];
  standards: string[];
}

interface ComplianceIssue {
  id: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  descriptionTr: string;
  recommendation: string;
  recommendationTr: string;
  automated?: boolean;
  manualVerification?: boolean;
}

interface ComplianceSummary {
  overallScore: number;
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
  criticalIssues: number;
  lastAudit: Date;
}

const CATEGORY_CONFIG = {
  accessibility: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: '♿',
    label: 'Accessibility',
    labelTr: 'Erişilebilirlik'
  },
  security: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: '🔒',
    label: 'Security',
    labelTr: 'Güvenlik'
  },
  performance: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: '⚡',
    label: 'Performance',
    labelTr: 'Performans'
  },
  privacy: {
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: '🛡️',
    label: 'Privacy',
    labelTr: 'Gizlilik'
  }
};

const STATUS_CONFIG = {
  compliant: {
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    icon: '✓',
    label: 'Compliant',
    labelTr: 'Uyumlu'
  },
  partial: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    icon: '⚠',
    label: 'Partial',
    labelTr: 'Kısmi'
  },
  'non-compliant': {
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    icon: '✗',
    label: 'Non-Compliant',
    labelTr: 'Uyumsuz'
  },
  'not-applicable': {
    color: 'text-gray-400',
    bg: 'bg-gray-500/20',
    icon: '—',
    label: 'N/A',
    labelTr: 'Uygulanamaz'
  }
};

// Mock compliance data - in production, this would come from API
const generateMockComplianceData = (): ComplianceMetric[] => [
  {
    id: 'wcag-21-aa',
    name: 'WCAG 2.1 AA Compliance',
    nameTr: 'WCAG 2.1 AA Uyumluluğu',
    category: 'accessibility',
    status: 'partial',
    score: 85,
    lastChecked: new Date(),
    standards: ['WCAG 2.1 AA', 'Section 508'],
    issues: [
      {
        id: 'wcag-color-contrast',
        severity: 'medium',
        description: 'Color contrast ratio below 4.5:1 for secondary text',
        descriptionTr: 'İkincil metin için renk kontrast oranı 4.5:1 altında',
        recommendation: 'Increase text color brightness or use darker background',
        recommendationTr: 'Metin rengi parlaklığını artırın veya daha koyu arka plan kullanın',
        automated: true
      },
      {
        id: 'wcag-keyboard-navigation',
        severity: 'low',
        description: 'Some interactive elements lack keyboard focus indicators',
        descriptionTr: 'Bazı etkileşimli öğeler klavye odak göstergesinden yoksun',
        recommendation: 'Add visible focus styles for all interactive elements',
        recommendationTr: 'Tüm etkileşimli öğeler için görünür odak stilleri ekleyin',
        automated: false,
        manualVerification: true
      }
    ]
  },
  {
    id: 'owasp-top-10',
    name: 'OWASP Top 10 Security',
    nameTr: 'OWASP Top 10 Güvenlik',
    category: 'security',
    status: 'compliant',
    score: 95,
    lastChecked: new Date(),
    standards: ['OWASP Top 10 2021', 'ISO 27001'],
    issues: [
      {
        id: 'owasp-api-rate-limit',
        severity: 'low',
        description: 'API rate limiting could be more granular',
        descriptionTr: 'API hız sınırlaması daha ayrıntılı olabilir',
        recommendation: 'Implement tiered rate limiting by user role',
        recommendationTr: 'Kullanıcı rolüne göre katmanlı hız sınırlaması uygulayın',
        automated: true
      }
    ]
  },
  {
    id: 'core-web-vitals',
    name: 'Core Web Vitals',
    nameTr: 'Temel Web Vitali',
    category: 'performance',
    status: 'compliant',
    score: 92,
    lastChecked: new Date(),
    standards: ['Google Core Web Vitals', 'Web Performance Working Group'],
    issues: []
  },
  {
    id: 'gdpr-compliance',
    name: 'GDPR Data Protection',
    nameTr: 'GDPR Veri Koruma',
    category: 'privacy',
    status: 'partial',
    score: 78,
    lastChecked: new Date(),
    standards: ['GDPR', 'CCPA'],
    issues: [
      {
        id: 'gdpr-data-retention',
        severity: 'high',
        description: 'Data retention policy not clearly communicated to users',
        descriptionTr: 'Veri saklama politikası kullanıcılara açıkça iletilmiyor',
        recommendation: 'Add clear data retention information to privacy policy',
        recommendationTr: 'Gizlilik politikasına net veri saklama bilgileri ekleyin',
        automated: false,
        manualVerification: true
      }
    ]
  }
];

export default function StandardsComplianceDashboard() {
  const { t, language } = useTranslation();
  const [metrics, setMetrics] = useState<ComplianceMetric[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState(false);

  useEffect(() => {
    // Load compliance data
    setMetrics(generateMockComplianceData());
  }, []);

  const summary: ComplianceSummary = useMemo(() => {
    const compliant = metrics.filter(m => m.status === 'compliant').length;
    const partial = metrics.filter(m => m.status === 'partial').length;
    const nonCompliant = metrics.filter(m => m.status === 'non-compliant').length;
    const critical = metrics.flatMap(m => m.issues).filter(i => i.severity === 'high').length;
    const overallScore = metrics.length > 0
      ? Math.round(metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length)
      : 0;

    return {
      overallScore,
      compliantCount: compliant,
      partialCount: partial,
      nonCompliantCount: nonCompliant,
      criticalIssues: critical,
      lastAudit: new Date()
    };
  }, [metrics]);

  const filteredMetrics = useMemo(() => {
    if (!selectedCategory) return metrics;
    return metrics.filter(m => m.category === selectedCategory);
  }, [metrics, selectedCategory]);

  const runComplianceAudit = async () => {
    setIsRunningAudit(true);
    // Simulate audit process
    await new Promise(resolve => setTimeout(resolve, 3000));
    setMetrics(generateMockComplianceData());
    setIsRunningAudit(false);
  };

  const exportComplianceReport = () => {
    const report = {
      summary,
      metrics,
      generatedAt: new Date().toISOString(),
      standards: ['WCAG 2.1 AA', 'OWASP Top 10 2021', 'GDPR', 'Core Web Vitals']
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold text-cyber-primary mb-2">
            {t.ui.complianceDashboardTitle}
          </h2>
          <p className="text-xs text-gray-400 font-mono">
            {t.ui.complianceDashboardDesc}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CyberButton
            onClick={runComplianceAudit}
            disabled={isRunningAudit}
            className="px-4 py-2 text-xs"
          >
            {isRunningAudit ? t.ui.complianceAuditRunning : t.ui.complianceRun}
          </CyberButton>
          <CyberButton
            onClick={exportComplianceReport}
            variant="secondary"
            className="px-4 py-2 text-xs"
          >
            {t.ui.complianceExportReport}
          </CyberButton>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-gray-400">
              {t.ui.complianceOverallScore}
            </span>
            <span className={`text-lg font-bold ${
              summary.overallScore >= 90 ? 'text-green-400' :
              summary.overallScore >= 70 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {summary.overallScore}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                summary.overallScore >= 90 ? 'bg-green-500' :
                summary.overallScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${summary.overallScore}%` }}
            />
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-green-400">
              {t.ui.complianceCompliant}
            </span>
            <span className="text-lg font-bold text-green-400">
              {summary.compliantCount}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {t.ui.complianceStandards}
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-yellow-400">
              {t.ui.compliancePartial}
            </span>
            <span className="text-lg font-bold text-yellow-400">
              {summary.partialCount}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {t.ui.complianceImprovementNeeded}
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-red-400">
              {t.ui.complianceCritical}
            </span>
            <span className="text-lg font-bold text-red-400">
              {summary.criticalIssues}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {t.ui.complianceIssues}
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
            !selectedCategory
              ? 'bg-cyber-primary/20 border-cyber-primary text-cyber-primary'
              : 'border-glass-border text-gray-400 hover:border-glass-border/60'
          }`}
        >
          {t.ui.complianceAll}
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
              selectedCategory === key
                ? `${config.bg} ${config.border} ${config.color}`
                : 'border-glass-border text-gray-400 hover:border-glass-border/60'
            }`}
          >
            {config.icon} {language === 'tr' ? config.labelTr : config.label}
          </button>
        ))}
      </div>

      {/* Metrics List */}
      <div className="space-y-3">
        {filteredMetrics.map((metric) => {
          const categoryConfig = CATEGORY_CONFIG[metric.category];
          const statusConfig = STATUS_CONFIG[metric.status];

          return (
            <div key={metric.id} className="glass-card overflow-hidden">
              {/* Metric Header */}
              <div
                className="p-4 cursor-pointer hover:bg-cyber-border/10 transition-colors"
                onClick={() => setExpandedMetric(expandedMetric === metric.id ? null : metric.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg ${categoryConfig.color}`}>
                      {categoryConfig.icon}
                    </span>
                    <div>
                      <h3 className="text-sm font-display font-semibold text-white">
                        {language === 'tr' ? metric.nameTr : metric.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${statusConfig.bg} ${statusConfig.color}`}>
                          {statusConfig.icon} {language === 'tr' ? statusConfig.labelTr : statusConfig.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {metric.score}% • {metric.standards.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{metric.score}%</div>
                      <div className="text-xs text-gray-400">
                        {t.ui.complianceLastChecked}: {metric.lastChecked.toLocaleDateString()}
                      </div>
                    </div>
                    <span className="text-gray-400">
                      {expandedMetric === metric.id ? '▼' : '▶'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedMetric === metric.id && (
                <div className="border-t border-glass-border p-4 bg-cyber-black/20">
                  {metric.issues.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-xs font-display font-bold uppercase tracking-wider text-gray-400">
                        {t.ui.complianceIdentifiedIssues}
                      </h4>
                      {metric.issues.map((issue) => (
                        <div key={issue.id} className="glass-card p-3">
                          <div className="flex items-start gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                              issue.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                              issue.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {issue.severity.toUpperCase()}
                            </span>
                            <div className="flex-1">
                              <p className="text-xs text-gray-300 mb-1">
                                {language === 'tr' ? issue.descriptionTr : issue.description}
                              </p>
                              <p className="text-xs text-gray-500 mb-2">
                                {language === 'tr' ? issue.recommendationTr : issue.recommendation}
                              </p>
                              <div className="flex items-center gap-2">
                                {issue.automated && (
                                  <span className="text-xs text-green-400 font-mono">
                                    ✓ {t.ui.complianceAutomated}
                                  </span>
                                )}
                                {issue.manualVerification && (
                                  <span className="text-xs text-yellow-400 font-mono">
                                    👁 {t.ui.complianceManualVerification}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <span className="text-green-400 text-sm">
                        ✓ {t.ui.complianceNoIssues}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Last Audit Info */}
      <div className="text-center text-xs text-gray-500 font-mono">
        {t.ui.complianceLastAudit}: {summary.lastAudit.toLocaleString()}
      </div>
    </div>
  );
}
