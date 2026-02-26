/**
 * Provenance View — Prompt izlenebilirlik bilgisi.
 * @see docs/PROMPT_LEADERSHIP_ROADMAP.md §9
 */
import { useState } from 'react';
import { useTranslation } from '../i18n';
import type { ProvenanceRecord } from '../types/provenance';

interface Props {
  provenance: ProvenanceRecord;
}

export default function ProvenanceView({ provenance }: Props) {
  const { language } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-glass-border rounded-lg overflow-hidden" role="region" aria-label={language === 'tr' ? 'İzlenebilirlik' : 'Provenance'}>
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-cyber-dark/30 transition-colors text-left"
        aria-expanded={expanded}
      >
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-300">
          {language === 'tr' ? 'İZLENEBİLİRLİK' : 'PROVENANCE'}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-500">
            {provenance.durationMs}ms
          </span>
          {provenance.cacheHit && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyber-success/20 text-cyber-success">
              CACHE
            </span>
          )}
          <span className="text-gray-500 text-xs">{expanded ? '▼' : '▶'}</span>
        </div>
      </button>

      {/* Detail - collapsible */}
      {expanded && (
        <div className="border-t border-glass-border p-3 space-y-2">
          {/* Pipeline info */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div>
              <span className="text-gray-500 uppercase">{language === 'tr' ? 'Framework' : 'Framework'}</span>
              <p className="text-gray-300">{provenance.framework}</p>
            </div>
            <div>
              <span className="text-gray-500 uppercase">{language === 'tr' ? 'Domain' : 'Domain'}</span>
              <p className="text-gray-300">{provenance.domainId}</p>
            </div>
            <div>
              <span className="text-gray-500 uppercase">{language === 'tr' ? 'Sağlayıcı' : 'Provider'}</span>
              <p className="text-gray-300">{provenance.provider}{provenance.model ? ` (${provenance.model})` : ''}</p>
            </div>
            <div>
              <span className="text-gray-500 uppercase">{language === 'tr' ? 'IR Pipeline' : 'IR Pipeline'}</span>
              <p className={provenance.irPipelineUsed ? 'text-cyber-success' : 'text-gray-500'}>
                {provenance.irPipelineUsed ? 'ON' : 'OFF'}
              </p>
            </div>
          </div>

          {/* Style Profile */}
          {provenance.styleProfileName && (
            <div className="text-[10px] font-mono">
              <span className="text-gray-500 uppercase">{language === 'tr' ? 'Üslup Profili' : 'Style Profile'}</span>
              <p className="text-cyber-accent">{provenance.styleProfileName}</p>
            </div>
          )}

          {/* Guardrails */}
          {provenance.guardrailsApplied.length > 0 && (
            <div className="text-[10px] font-mono">
              <span className="text-gray-500 uppercase">{language === 'tr' ? 'Guardrail\'ler' : 'Guardrails'}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {provenance.guardrailsApplied.map((g, i) => (
                  <span key={i} className="px-1.5 py-0.5 glass-card text-gray-400">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Security Policies */}
          {provenance.securityPolicies.length > 0 && (
            <div className="text-[10px] font-mono">
              <span className="text-gray-500 uppercase">{language === 'tr' ? 'Güvenlik Politikaları' : 'Security Policies'}</span>
              <ul className="mt-1 space-y-0.5">
                {provenance.securityPolicies.map((p, i) => (
                  <li key={i} className="text-gray-400 pl-2 border-l border-glass-border">{p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Constraints */}
          {provenance.constraintsApplied.length > 0 && (
            <div className="text-[10px] font-mono">
              <span className="text-gray-500 uppercase">{language === 'tr' ? 'Kısıtlar' : 'Constraints'}</span>
              <ul className="mt-1 space-y-0.5">
                {provenance.constraintsApplied.map((c, i) => (
                  <li key={i} className="text-gray-400 pl-2 border-l border-glass-border">{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-[10px] font-mono text-gray-600 pt-1 border-t border-glass-border">
            {new Date(provenance.createdAt).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')}
          </div>
        </div>
      )}
    </div>
  );
}
