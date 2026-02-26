/**
 * Prompt Lint Panel — Lint sonuçları UI.
 * @see docs/PROMPT_FEATURES_ROADMAP.md §3
 */
import { useTranslation } from '../i18n';
import type { LintResult } from '../services/promptLint';

interface Props {
  result: LintResult;
}

const SEVERITY_CONFIG = {
  error: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: '✕' },
  warning: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: '⚠' },
  info: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'ℹ' },
};

export default function PromptLintPanel({ result }: Props) {
  const { language } = useTranslation();

  if (result.issues.length === 0) {
    return (
      <div className="border border-cyber-success/30 bg-cyber-success/5 rounded-lg p-3">
        <p className="text-[10px] font-mono text-cyber-success uppercase tracking-wider font-bold">
          {language === 'tr' ? 'LİNT: SORUN YOK' : 'LINT: ALL CLEAR'}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-glass-border rounded-lg p-4 space-y-2" role="region" aria-label={language === 'tr' ? 'Prompt Kalite Kontrolü' : 'Prompt Quality Check'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-300">
          {language === 'tr' ? 'PROMPT KALİTE KONTROLÜ' : 'PROMPT LINT'}
        </h3>
        <div className="flex items-center gap-2">
          {result.totalErrors > 0 && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400">
              {result.totalErrors} {language === 'tr' ? 'hata' : 'error'}
            </span>
          )}
          {result.totalWarnings > 0 && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
              {result.totalWarnings} {language === 'tr' ? 'uyarı' : 'warn'}
            </span>
          )}
          {result.totalInfo > 0 && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
              {result.totalInfo} info
            </span>
          )}
        </div>
      </div>

      {/* Issues */}
      <div className="space-y-1.5">
        {result.issues.map((issue, i) => {
          const cfg = SEVERITY_CONFIG[issue.severity];
          return (
            <div key={i} className={`flex items-start gap-2 p-2 rounded ${cfg.bg} border ${cfg.border}`}>
              <span className={`text-xs ${cfg.color} shrink-0`}>{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-mono ${cfg.color}`}>
                  [{issue.ruleId}] {language === 'tr' ? issue.messageTr : issue.message}
                </p>
                {issue.excerpt && (
                  <code className="text-[10px] font-mono text-gray-500 mt-0.5 block truncate">
                    &quot;{issue.excerpt}&quot;
                  </code>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
