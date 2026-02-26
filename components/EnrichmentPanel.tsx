/**
 * Prompt Enrichment Panel — Kütüphaneden otomatik zenginleştirme UI.
 * Supports fast, deep, and agent enrichment modes.
 */
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { enrichPromptViaBrain } from '../services/brainClient';
import type { EnrichmentResult, AmbiguityGap, EnrichmentCandidate, AgentEnrichMetrics } from '../types/enrichment';

interface Props {
  masterPrompt: string;
  framework: string;
  domainId: string;
  language: string;
  agentMode?: boolean;
  onApply?: (enriched: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

type PanelMode = 'fast' | 'deep' | 'agent';

export default function EnrichmentPanel({ masterPrompt, framework, domainId, language, agentMode = false, onApply }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<PanelMode>('fast');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedCandidates, setExpandedCandidates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (agentMode) setMode('agent');
  }, [agentMode]);

  const runEnrich = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await enrichPromptViaBrain({
        masterPrompt,
        domainId,
        framework,
        language: language === 'tr' ? 'tr' : 'en',
        mode,
      }) as EnrichmentResult;
      setResult(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Enrichment failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [masterPrompt, domainId, framework, language, mode]);

  const handleApply = () => {
    if (result?.enrichedPrompt && onApply) {
      onApply(result.enrichedPrompt);
    }
  };

  const toggleCandidate = (id: string) => {
    setExpandedCandidates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scoreImprovement = result
    ? result.metrics.ambiguityScoreBefore - result.metrics.ambiguityScoreAfter
    : 0;

  const agentMetrics = result?.agentMetrics as AgentEnrichMetrics | undefined;

  return (
    <div className="glass-card overflow-hidden" role="region" aria-label={t.ui.enrichTitle}>
      {/* Header: Title + Mode Toggle + Run Button */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">🧬</span>
          <div>
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-purple-400">
              {t.ui.enrichTitle}
            </h3>
            <p className="text-[9px] font-mono text-gray-600 mt-0.5">{t.ui.enrichSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <div className="flex rounded border border-glass-border overflow-hidden">
            {(['fast', 'deep', 'agent'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors
                  ${mode === m
                    ? m === 'agent'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-purple-500/20 text-purple-400'
                    : 'text-gray-600 hover:text-gray-400'}`}
              >
                {m === 'fast' ? t.ui.enrichModeFast : m === 'deep' ? t.ui.enrichModeDeep : t.ui.enrichModeAgent}
              </button>
            ))}
          </div>

          {/* Run Button */}
          <button
            type="button"
            onClick={runEnrich}
            disabled={loading || !masterPrompt}
            className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded
              border transition-colors disabled:opacity-40
              ${mode === 'agent'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-purple-500/20 text-purple-400 border-purple-500/40 hover:bg-purple-500/30'}`}
          >
            {loading ? t.ui.enrichRunning : t.ui.enrichRun}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="border-t border-glass-border p-3">
          <p className="text-red-400 text-xs font-mono">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="border-t border-glass-border p-3 space-y-3">

          {/* No gaps */}
          {result.metrics.gapsFound === 0 && !agentMetrics && (
            <p className="text-[10px] font-mono text-cyber-success text-center py-2">
              {t.ui.enrichNoGaps}
            </p>
          )}

          {/* Agent Metrics Bar */}
          {agentMetrics && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                <MetricChip
                  label={t.ui.enrichJudgeScore}
                  value={`${Math.round(agentMetrics.judgeScoreBefore)} → ${Math.round(agentMetrics.judgeScoreAfter)}`}
                  color={agentMetrics.targetScoreReached ? 'green' : 'orange'}
                />
                <MetricChip label={t.ui.enrichIterations} value={String(agentMetrics.iterations)} color="purple" />
                <MetricChip label={t.ui.enrichAutoFixes} value={String(agentMetrics.autoFixesApplied)} color="cyan" />
                <MetricChip label={t.ui.enrichGapsFound} value={String(agentMetrics.deepGapsFound)} color="red" />
                <MetricChip label={t.ui.enrichPromptsIntegrated} value={String(result.metrics.promptsIntegrated)} color="green" />
                <MetricChip label={t.ui.enrichTokensAdded} value={`+${result.metrics.tokensAdded}`} color="cyan" />
                {agentMetrics.targetScoreReached ? (
                  <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[9px]">
                    {t.ui.enrichTargetReached}
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold text-[9px]">
                    {t.ui.enrichTargetNotReached}
                  </span>
                )}
              </div>
              {/* Domain & Framework badges */}
              <div className="flex items-center gap-2 text-[9px] font-mono">
                {agentMetrics.domainKnowledgeInjected && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    DOMAIN: {domainId}
                  </span>
                )}
                {agentMetrics.frameworkEnhanced && (
                  <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    FW: {framework}
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/20">
                  {result.metrics.durationMs}ms
                </span>
              </div>
            </div>
          )}

          {/* Standard Metrics (fast/deep mode) */}
          {result.metrics.gapsFound > 0 && !agentMetrics && (
            <>
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono">
                <MetricChip label={t.ui.enrichAmbiguityScore} value={`${result.metrics.ambiguityScoreBefore} → ${result.metrics.ambiguityScoreAfter}`} color="purple" />
                <MetricChip label={t.ui.enrichGapsFound} value={String(result.metrics.gapsFound)} color="red" />
                <MetricChip label={t.ui.enrichPromptsIntegrated} value={String(result.metrics.promptsIntegrated)} color="green" />
                <MetricChip label={t.ui.enrichSectionsEnhanced} value={String(result.metrics.sectionsEnhanced.length)} color="blue" />
                <MetricChip label={t.ui.enrichTokensAdded} value={`+${result.metrics.tokensAdded}`} color="cyan" />
                {scoreImprovement > 0 && (
                  <span className="px-2 py-1 rounded bg-cyber-success/20 text-cyber-success border border-cyber-success/30 font-bold">
                    -{scoreImprovement} {language === 'tr' ? 'belirsizlik' : 'ambiguity'}
                  </span>
                )}
              </div>
            </>
          )}

          {/* Gap List */}
          {(result.metrics.gapsFound > 0 || agentMetrics) && result.ambiguityReport.gaps.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                {language === 'tr' ? 'Tespit Edilen Boşluklar:' : 'Detected Gaps:'}
              </span>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {result.ambiguityReport.gaps.map((gap: AmbiguityGap) => (
                  <div key={gap.id} className="flex items-start gap-2 text-[10px] font-mono">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[8px] uppercase ${SEVERITY_COLORS[gap.severity]}`}>
                      {gap.severity}
                    </span>
                    <span className="text-gray-500 shrink-0">[{gap.section}]</span>
                    <span className="text-gray-300">{language === 'tr' ? gap.descriptionTr : gap.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Candidates */}
          {result.candidatesFound.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                {language === 'tr' ? 'Bulunan Promptlar:' : 'Found Prompts:'}
              </span>
              <div className="space-y-1">
                {result.candidatesFound.map((c: EnrichmentCandidate) => (
                  <div key={c.promptId} className="border border-glass-border rounded bg-cyber-dark/30">
                    <button
                      type="button"
                      onClick={() => toggleCandidate(c.promptId)}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-left hover:bg-cyber-dark/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="text-purple-400 font-bold">{Math.round(c.relevanceScore * 100)}%</span>
                        <span className="text-gray-300">{c.promptName}</span>
                        <span className="text-gray-600">[{c.targetSection}]</span>
                      </div>
                      <span className="text-[9px] text-gray-600 px-1.5 py-0.5 rounded bg-cyber-dark/60 border border-glass-border">
                        {c.category}
                      </span>
                    </button>
                    {expandedCandidates.has(c.promptId) && (
                      <div className="px-2 pb-2 text-[10px] font-mono text-gray-400 border-t border-glass-border/10 pt-1.5">
                        {c.promptContent}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {(result.integratedPrompts.length > 0 || agentMetrics) && (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-[10px] font-mono px-3 py-1.5 border border-glass-border rounded hover:border-purple-500/50 text-gray-400 hover:text-gray-200 transition-colors"
              >
                {showPreview
                  ? (language === 'tr' ? 'ÖNİZLEMEYİ GİZLE' : 'HIDE PREVIEW')
                  : t.ui.enrichPreview}
              </button>
              {onApply && (
                <button
                  type="button"
                  onClick={handleApply}
                  className={`text-[10px] font-mono font-bold px-4 py-1.5 rounded border transition-colors
                    ${mode === 'agent'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30 hover:border-emerald-500/60'
                      : 'bg-purple-500/20 text-purple-400 border-purple-500/40 hover:bg-purple-500/30 hover:border-purple-500/60'}`}
                >
                  {t.ui.enrichApply}
                </button>
              )}
            </div>
          )}

          {/* Preview */}
          {showPreview && result.enrichedPrompt && (
            <div className="border border-glass-border rounded p-2 bg-cyber-dark/40 max-h-80 overflow-y-auto">
              <pre className="text-[10px] font-mono text-gray-300 whitespace-pre-wrap">
                {result.enrichedPrompt}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Helper Components ----------

function MetricChip({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    green: 'bg-cyber-success/10 text-cyber-success border-cyber-success/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    cyan: 'bg-cyber-primary/10 text-cyber-primary border-cyber-primary/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${colorMap[color] ?? colorMap.purple}`}>
      <span className="text-gray-500 uppercase">{label}:</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
