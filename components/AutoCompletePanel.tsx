/**
 * Auto-Complete Panel — Tek butonla tum araclar calisir,
 * SYSTEM / DEVELOPER / USER sentezli prompt uretir.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '../services/apiClient';

interface PipelineStep {
  step: string;
  durationMs: number;
  status: 'ok' | 'skip' | 'error';
}

interface Analysis {
  statistics: {
    sectionCount: number;
    constraintCount: number;
    variableCount: number;
    hasRole: boolean;
    hasOutputFormat: boolean;
    hasExamples: boolean;
    hasGuardrails: boolean;
  };
  qualityScore: number;
  variableCount: number;
  elementCount: number;
  lintErrors: number;
  lintWarnings: number;
}

interface AutoCompleteResult {
  synthesized: string;
  pipeline: {
    steps: PipelineStep[];
    totalMs: number;
    stepsCompleted: number;
    stepsTotal: number;
  };
  analysis: Analysis;
}

interface Props {
  masterPrompt: string;
  domainId: string;
  framework: string;
  language: string;
  agentMode?: boolean;
  onApply?: (synthesized: string) => void;
}

const STEP_LABELS: Record<string, { en: string; tr: string }> = {
  parse: { en: 'Parsing structure', tr: 'Yapi ayristiriliyor' },
  variables: { en: 'Extracting variables', tr: 'Degiskenler cikariliyor' },
  langextract: { en: 'Analyzing elements', tr: 'Ogeler analiz ediliyor' },
  lint: { en: 'Running quality checks', tr: 'Kalite kontrolleri yapiliyor' },
  enrich: { en: 'Enriching from library', tr: 'Kutuphaneden zenginlestiriliyor' },
  enhance: { en: 'Enhancing quality', tr: 'Kalite yukseltiliyor' },
  synthesize: { en: 'Synthesizing SYSTEM/DEV/USER', tr: 'SYSTEM/DEV/USER sentezleniyor' },
};

export default function AutoCompletePanel({ masterPrompt, domainId, framework, language, agentMode = false, onApply }: Props) {
  const { language: uiLang } = useTranslation();
  const t = uiLang === 'tr';
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AutoCompleteResult | null>(null);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [copied, setCopied] = useState(false);
  const stepIndex = useRef(0);
  const animInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulated step animation during loading
  useEffect(() => {
    if (loading) {
      const stepNames = ['parse', 'variables', 'langextract', 'lint', 'enrich', 'enhance', 'synthesize'];
      stepIndex.current = 0;
      setActiveStep(stepNames[0]);
      animInterval.current = setInterval(() => {
        stepIndex.current = Math.min(stepIndex.current + 1, stepNames.length - 1);
        setActiveStep(stepNames[stepIndex.current]);
      }, 2500);
    } else {
      if (animInterval.current) clearInterval(animInterval.current);
      setActiveStep(null);
    }
    return () => {
      if (animInterval.current) clearInterval(animInterval.current);
    };
  }, [loading]);

  const runAutoComplete = useCallback(async () => {
    if (!masterPrompt.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/auto-complete`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterPrompt, domainId, framework, language, mode: agentMode ? 'agent' : 'fast' }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setShowPreview(true);
      }
    } catch (err) {
      console.error('Auto-complete error:', err);
    } finally {
      setLoading(false);
    }
  }, [masterPrompt, domainId, framework, language, agentMode]);

  const handleApply = () => {
    if (result?.synthesized && onApply) {
      onApply(result.synthesized);
    }
  };

  const handleCopy = () => {
    if (result?.synthesized) {
      navigator.clipboard.writeText(result.synthesized);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-mono text-xs font-bold tracking-wider">
            {t ? 'AUTO-COMPLETE SENTEZ' : 'AUTO-COMPLETE SYNTHESIS'}
          </span>
          {result && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
              {result.analysis.qualityScore}/100
            </span>
          )}
        </div>

        {/* Run button */}
        <button
          onClick={runAutoComplete}
          disabled={loading || !masterPrompt.trim()}
          className={`px-4 py-1.5 rounded text-xs font-mono font-bold transition-all ${
            loading
              ? 'bg-emerald-600/20 text-emerald-400 animate-pulse cursor-wait'
              : 'bg-emerald-600/40 hover:bg-emerald-600/60 text-emerald-200 hover:text-white'
          } disabled:opacity-30`}
        >
          {loading
            ? (t ? 'SENTEZLENIYOR...' : 'SYNTHESIZING...')
            : (t ? 'OTOMATIK TAMAMLA' : 'AUTO-COMPLETE')}
        </button>
      </div>

      {/* Pipeline progress */}
      {loading && activeStep && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            {Object.keys(STEP_LABELS).map((step, idx) => {
              const stepNames = Object.keys(STEP_LABELS);
              const currentIdx = stepNames.indexOf(activeStep);
              const isDone = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={step} className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    isDone ? 'bg-emerald-400' :
                    isCurrent ? 'bg-emerald-400 animate-pulse' :
                    'bg-gray-700'
                  }`} />
                  {idx < stepNames.length - 1 && (
                    <div className={`w-3 h-px ${isDone ? 'bg-emerald-500/50' : 'bg-gray-800'}`} />
                  )}
                </div>
              );
            })}
            <span className="text-emerald-400/70 text-[10px] font-mono ml-2">
              {t ? STEP_LABELS[activeStep]?.tr : STEP_LABELS[activeStep]?.en}
            </span>
          </div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="px-4 pb-4 space-y-3">
          {/* Pipeline summary */}
          <div className="flex flex-wrap gap-1.5">
            {result.pipeline.steps.map((s) => (
              <span
                key={s.step}
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  s.status === 'ok'
                    ? 'bg-emerald-900/40 text-emerald-300'
                    : s.status === 'skip'
                    ? 'bg-yellow-900/30 text-yellow-400'
                    : 'bg-red-900/30 text-red-400'
                }`}
              >
                {s.step} {s.durationMs}ms
              </span>
            ))}
            <span className="text-[9px] font-mono text-gray-500 px-1.5 py-0.5">
              {t ? 'toplam' : 'total'}: {result.pipeline.totalMs}ms
            </span>
          </div>

          {/* Analysis badges */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            <AnalysisBadge
              label={t ? 'Kalite' : 'Quality'}
              value={`${result.analysis.qualityScore}`}
              color={result.analysis.qualityScore >= 70 ? 'emerald' : result.analysis.qualityScore >= 50 ? 'yellow' : 'red'}
            />
            <AnalysisBadge label={t ? 'Bolum' : 'Sections'} value={`${result.analysis.statistics.sectionCount}`} color="cyan" />
            <AnalysisBadge label={t ? 'Kisit' : 'Constraints'} value={`${result.analysis.statistics.constraintCount}`} color="blue" />
            <AnalysisBadge label={t ? 'Degisken' : 'Variables'} value={`${result.analysis.variableCount}`} color="purple" />
            <AnalysisBadge label={t ? 'Oge' : 'Elements'} value={`${result.analysis.elementCount}`} color="indigo" />
            <AnalysisBadge
              label={t ? 'Lint' : 'Lint'}
              value={result.analysis.lintErrors > 0 ? `${result.analysis.lintErrors}E` : `${result.analysis.lintWarnings}W`}
              color={result.analysis.lintErrors > 0 ? 'red' : result.analysis.lintWarnings > 0 ? 'yellow' : 'emerald'}
            />
          </div>

          {/* Coverage checklist */}
          <div className="flex flex-wrap gap-1.5">
            <CoverageChip label={t ? 'Rol' : 'Role'} ok={result.analysis.statistics.hasRole} />
            <CoverageChip label={t ? 'Cikti Fmt' : 'Output Fmt'} ok={result.analysis.statistics.hasOutputFormat} />
            <CoverageChip label={t ? 'Ornekler' : 'Examples'} ok={result.analysis.statistics.hasExamples} />
            <CoverageChip label="Guardrails" ok={result.analysis.statistics.hasGuardrails} />
          </div>

          {/* Section indicators */}
          <div className="flex gap-2">
            {['## SYSTEM', '## DEVELOPER', '## USER'].map((section) => {
              const present = result.synthesized.includes(section);
              return (
                <div key={section} className={`flex-1 text-center py-1.5 rounded text-[10px] font-mono font-bold ${
                  present ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/30' : 'bg-glass-bg text-gray-600'
                }`}>
                  {section.replace('## ', '')}
                </div>
              );
            })}
          </div>

          {/* Preview toggle */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showPreview ? (t ? 'Onizlemeyi Gizle' : 'Hide Preview') : (t ? 'Sentezlenmis Promptu Goster' : 'Show Synthesized Prompt')}
          </button>

          {/* Preview */}
          {showPreview && (
            <div className="relative">
              <pre className="glass-card p-3 text-[11px] text-gray-300 font-mono max-h-64 overflow-auto whitespace-pre-wrap leading-relaxed">
                {result.synthesized.split('\n').map((line, i) => {
                  if (/^## (SYSTEM|DEVELOPER|USER)/.test(line)) {
                    return <span key={i} className="block text-emerald-400 font-bold text-xs mt-2">{line}{'\n'}</span>;
                  }
                  if (/^### /.test(line)) {
                    return <span key={i} className="block text-cyan-400 font-bold text-[11px] mt-1">{line}{'\n'}</span>;
                  }
                  if (/^- /.test(line)) {
                    return <span key={i} className="block text-gray-300">{line}{'\n'}</span>;
                  }
                  return <span key={i} className="block text-gray-400">{line}{'\n'}</span>;
                })}
              </pre>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleApply}
              className="flex-1 py-2.5 rounded bg-emerald-600/40 hover:bg-emerald-600/60 text-emerald-200 text-xs font-mono font-bold transition-all hover:shadow-lg hover:shadow-emerald-500/10"
            >
              {t ? 'SENTEZLENMIS PROMPTU UYGULA' : 'APPLY SYNTHESIZED PROMPT'}
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 rounded bg-glass-bg hover:bg-gray-700/50 text-gray-300 text-xs font-mono transition-colors"
            >
              {copied ? (t ? 'Kopyalandi!' : 'Copied!') : (t ? 'Kopyala' : 'Copy')}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div className="px-4 pb-3">
          <p className="text-gray-600 text-[10px] font-mono text-center">
            {t
              ? 'Parse + Variables + LangExtract + Lint + Enrich + Enhance → SYSTEM/DEVELOPER/USER sentezi'
              : 'Parse + Variables + LangExtract + Lint + Enrich + Enhance → SYSTEM/DEVELOPER/USER synthesis'}
          </p>
        </div>
      )}
    </div>
  );
}

function AnalysisBadge({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-900/40 text-emerald-300',
    cyan: 'bg-cyan-900/40 text-cyan-300',
    blue: 'bg-blue-900/40 text-blue-300',
    purple: 'bg-purple-900/40 text-purple-300',
    indigo: 'bg-indigo-900/40 text-indigo-300',
    yellow: 'bg-yellow-900/40 text-yellow-300',
    red: 'bg-red-900/40 text-red-300',
  };
  return (
    <div className={`rounded px-2 py-1.5 text-center ${colorClasses[color] || colorClasses.cyan}`}>
      <div className="font-mono text-sm font-bold">{value}</div>
      <div className="text-[8px] font-mono opacity-60">{label}</div>
    </div>
  );
}

function CoverageChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
      ok ? 'bg-emerald-900/30 text-emerald-400' : 'bg-glass-bg text-gray-600'
    }`}>
      {ok ? '[+]' : '[-]'} {label}
    </span>
  );
}
