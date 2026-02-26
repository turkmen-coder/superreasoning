/**
 * Prompt Security Scanner — Detect prompt injection and security vulnerabilities.
 */
import { useState } from 'react';
import { useTranslation } from '../i18n';

interface SecurityIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  position?: { start: number; end: number };
  suggestion?: string;
}

interface ScanResult {
  prompt: string;
  issues: SecurityIssue[];
  score: number;
  scannedAt: string;
}

const SECURITY_PATTERNS = [
  {
    id: 'prompt_injection',
    severity: 'critical' as const,
    pattern: /(ignore previous instructions|ignore all previous|disregard previous|forget your instructions|you are now|you are a new|act as a different|pretend to be)/gi,
    messageTr: 'Prompt injection girişimi tespit edildi',
    messageEn: 'Prompt injection attempt detected',
    suggestionTr: 'Kullanıcı girdilerini sanitize edin',
    suggestionEn: 'Sanitize user inputs',
  },
  {
    id: 'system_override',
    severity: 'high' as const,
    pattern: /(system:|system prompt|override system|change system)/gi,
    messageTr: 'System prompt override denemesi',
    messageEn: 'System prompt override attempt',
    suggestionTr: 'System talimatlarını koruyun',
    suggestionEn: 'Protect system instructions',
  },
  {
    id: 'role_manipulation',
    severity: 'high' as const,
    pattern: /(you are now|act as if you are|from now on you are|pretend to be a|roleplay as)/gi,
    messageTr: 'Rol manipülasyonu tespit edildi',
    messageEn: 'Role manipulation detected',
    suggestionTr: 'Rol değişikliklerini sınırlayın',
    suggestionEn: 'Limit role changes',
  },
  {
    id: 'jailbreak',
    severity: 'critical' as const,
    pattern: /(DAN|do anything now|developer mode|jailbreak|bypass restrictions)/gi,
    messageTr: 'Jailbreak girişimi tespit edildi',
    messageEn: 'Jailbreak attempt detected',
    suggestionTr: 'Güvenlik kontrollerini güçlendirin',
    suggestionEn: 'Strengthen security controls',
  },
  {
    id: 'data_extraction',
    severity: 'medium' as const,
    pattern: /(show me your|reveal your|tell me your|output your|print your)/gi,
    messageTr: 'Veri çıkarma girişimi',
    messageEn: 'Data extraction attempt',
    suggestionTr: 'Hassas bilgi ifşasını engelleyin',
    suggestionEn: 'Prevent sensitive information disclosure',
  },
  {
    id: 'code_injection',
    severity: 'high' as const,
    pattern: /(eval\(|exec\(|import os|import sys|subprocess|__import__)/gi,
    messageTr: 'Kod injection riski',
    messageEn: 'Code injection risk',
    suggestionTr: 'Kod yürütmesini sınırlayın',
    suggestionEn: 'Limit code execution',
  },
  {
    id: '越权',
    severity: 'high' as const,
    pattern: /(越权|提权|权限|管理员|root|sudo|admin)/gi,
    messageTr: 'Yetki yükseltme girişimi',
    messageEn: 'Privilege escalation attempt',
    suggestionTr: 'Yetki kontrollerini uygulayın',
    suggestionEn: 'Implement privilege controls',
  },
  {
    id: '越狱',
    severity: 'critical' as const,
    pattern: /(越狱|break out|jail|释放|解除限制)/gi,
    messageTr: 'Kısıtlama kaldırma girişimi',
    messageEn: 'Restriction bypass attempt',
    suggestionTr: 'Güvenlik duvarını güçlendirin',
    suggestionEn: 'Strengthen security guardrails',
  },
];

export default function PromptSecurityScanner() {
  const { t, language } = useTranslation();

  const [prompt, setPrompt] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleScan = async () => {
    if (!prompt.trim()) return;
    setScanning(true);
    await new Promise(r => setTimeout(r, 800));

    const issues: SecurityIssue[] = [];
    SECURITY_PATTERNS.forEach(pattern => {
      const matches = prompt.match(pattern.pattern);
      if (matches) {
        matches.forEach((_match, index) => {
          issues.push({
            id: `${pattern.id}-${index}`,
            severity: pattern.severity,
            type: pattern.id,
            message: language === 'tr' ? pattern.messageTr : pattern.messageEn,
            suggestion: language === 'tr' ? pattern.suggestionTr : pattern.suggestionEn,
          });
        });
      }
    });

    const score = Math.max(0, 100 - issues.reduce((acc, issue) => {
      switch (issue.severity) {
        case 'critical': return acc + 30;
        case 'high': return acc + 20;
        case 'medium': return acc + 10;
        case 'low': return acc + 5;
        default: return acc;
      }
    }, 0));

    setResult({
      prompt,
      issues,
      score,
      scannedAt: new Date().toISOString(),
    });
    setScanning(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-cyber-primary font-display">
            {t.ui.securityScannerTitle}
          </h1>
          <p className="text-gray-400 mt-1">
            {t.ui.securityScannerDesc}
          </p>
        </div>

        {/* Input */}
        <div className="glass-card p-4 mb-6">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t.ui.securityScannerInputPlaceholder}
            className="glass-input w-full h-40 font-mono text-sm resize-none"
          />
          <button
            onClick={handleScan}
            disabled={!prompt.trim() || scanning}
            className="mt-4 px-6 py-2 bg-cyber-primary text-black font-semibold rounded-lg hover:bg-cyber-primary/80 disabled:opacity-50"
          >
            {scanning ? t.ui.securityScannerBtnLoading : t.ui.securityScannerBtn}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold font-display">{t.ui.securityScannerResults}</h2>
              <div className="flex items-center gap-4">
                <span className="text-gray-400">{t.ui.securityScannerScore}:</span>
                <span className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
                  {result.score}/100
                </span>
              </div>
            </div>

            {result.issues.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-400 font-semibold">{t.ui.securityScannerSafe}</p>
                <p className="text-gray-500 text-sm mt-1">
                  {t.ui.securityScannerNoIssues}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {result.issues.map(issue => (
                  <div
                    key={issue.id}
                    className={`p-4 rounded-lg border ${getSeverityColor(issue.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="uppercase text-xs font-bold">{issue.severity}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm">{issue.message}</span>
                        </div>
                        {issue.suggestion && (
                          <p className="text-sm opacity-80 mt-2">
                            💡 {issue.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
              {t.ui.securityScannerTime} {new Date(result.scannedAt).toLocaleString()}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 p-4 glass-card">
          <h3 className="font-semibold text-gray-300 mb-2 font-display">
            {t.ui.securityScannerThreats}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
            <div>• Prompt Injection</div>
            <div>• System Override</div>
            <div>• Role Manipulation</div>
            <div>• Jailbreak Attempts</div>
            <div>• Data Extraction</div>
            <div>• Code Injection</div>
          </div>
        </div>
      </div>
    </div>
  );
}
