/**
 * Prompt Analysis Panel — Birleşik yapısal analiz.
 * 4 tab: Structure (AST), Variables, Elements (LangExtract), Quality (Metrics).
 */
import { useState, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { analyzePromptViaBrain } from '../services/brainClient';

type Tab = 'structure' | 'variables' | 'elements' | 'quality';

interface Props {
  masterPrompt: string;
  language: string;
  agentMode?: boolean;
}

interface ASTStatistics {
  sectionCount: number;
  constraintCount: number;
  variableCount: number;
  nodesByType: Record<string, number>;
  maxDepth: number;
  hasRole: boolean;
  hasOutputFormat: boolean;
  hasExamples: boolean;
  hasGuardrails: boolean;
}

interface QualityMetrics {
  complexity: { wordCount: number; sectionCount: number; maxDepth: number; score: number };
  coverage: { hasRole: boolean; hasConstraints: boolean; hasOutputFormat: boolean; hasExamples: boolean; hasGuardrails: boolean; score: number };
  quality: { variableConsistency: number; structureScore: number; overall: number };
}

interface Variable {
  name: string;
  style: string;
  raw: string;
  inferredType?: string;
  required?: boolean;
  defaultValue?: string;
}

interface VariableResult {
  variables: Variable[];
  summary: { total: number; unique: number; styles: string[]; mixedStyles: boolean; required: number; optional: number };
}

interface LangExtractItem {
  extractionClass: string;
  extractionText: string;
  attributes?: Record<string, string>;
}

interface LangExtractResult {
  enabled: boolean;
  model: string;
  items: LangExtractItem[];
  keywords: string[];
  summary: string;
  error?: string;
}

export default function PromptAnalysisPanel({ masterPrompt, language, agentMode: _agentMode = false }: Props) {
  const { language: uiLang } = useTranslation();
  const t = uiLang === 'tr';
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('structure');
  const [loading, setLoading] = useState(false);

  // Structure state
  const [stats, setStats] = useState<ASTStatistics | null>(null);
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [parseSummary, setParseSummary] = useState('');

  // Variables state
  const [varResult, setVarResult] = useState<VariableResult | null>(null);

  // Elements state
  const [elements, setElements] = useState<LangExtractResult | null>(null);

  // Quality state (reuses metrics)

  const runAnalysis = useCallback(async (targetTab: Tab) => {
    if (!masterPrompt.trim()) return;
    setLoading(true);
    try {
      if (targetTab === 'structure' || targetTab === 'quality') {
        const data = await analyzePromptViaBrain({
          prompt: masterPrompt,
          language: language === 'tr' ? 'tr' : 'en',
          analysisType: targetTab,
        }) as { statistics?: ASTStatistics; metrics?: QualityMetrics; summary?: string };
        if (data?.statistics) setStats(data.statistics);
        if (data?.metrics) setMetrics(data.metrics);
        if (typeof data?.summary === 'string') setParseSummary(data.summary);
      }

      if (targetTab === 'variables') {
        const data = await analyzePromptViaBrain({
          prompt: masterPrompt,
          language: language === 'tr' ? 'tr' : 'en',
          analysisType: 'variables',
        }) as VariableResult;
        setVarResult(data);
      }

      if (targetTab === 'elements') {
        const data = await analyzePromptViaBrain({
          prompt: masterPrompt,
          language: language === 'tr' ? 'tr' : 'en',
          analysisType: 'elements',
        }) as LangExtractResult;
        setElements(data);
      }
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  }, [masterPrompt, language]);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    runAnalysis(newTab);
  };

  const handleOpen = () => {
    setOpen(!open);
    if (!open && !stats) {
      runAnalysis('structure');
    }
  };

  const tabs: { key: Tab; label: string; labelTr: string }[] = [
    { key: 'structure', label: 'Structure', labelTr: 'Yapi' },
    { key: 'variables', label: 'Variables', labelTr: 'Degiskenler' },
    { key: 'elements', label: 'Elements', labelTr: 'Ogeler' },
    { key: 'quality', label: 'Quality', labelTr: 'Kalite' },
  ];

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-between px-4 py-3 bg-cyber-darker/50 hover:bg-cyber-darker/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-mono text-xs font-bold">
            {t ? 'PROMPT ANALIZ' : 'PROMPT ANALYSIS'}
          </span>
          {stats && (
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
              {stats.sectionCount}S {stats.constraintCount}C {stats.variableCount}V
            </span>
          )}
        </div>
        <span className="text-gray-500 text-xs">{open ? '[-]' : '[+]'}</span>
      </button>

      {open && (
        <div className="p-4 space-y-3 bg-cyber-black/50">
          {/* Tab bar */}
          <div className="flex gap-1 bg-cyber-darker/40 rounded p-0.5">
            {tabs.map(({ key, label, labelTr }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`flex-1 text-[10px] font-mono py-1.5 px-2 rounded transition-colors ${
                  tab === key
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t ? labelTr : label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="text-center py-4">
              <span className="text-cyan-400 text-xs font-mono animate-pulse">
                {t ? 'ANALIZ EDILIYOR...' : 'ANALYZING...'}
              </span>
            </div>
          )}

          {/* Structure Tab */}
          {tab === 'structure' && stats && !loading && (
            <div className="space-y-3">
              <p className="text-gray-400 text-xs font-mono">{parseSummary}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <StatChip label={t ? 'Bolumler' : 'Sections'} value={stats.sectionCount} />
                <StatChip label={t ? 'Kisitlar' : 'Constraints'} value={stats.constraintCount} />
                <StatChip label={t ? 'Degiskenler' : 'Variables'} value={stats.variableCount} />
                <StatChip label={t ? 'Maks Derinlik' : 'Max Depth'} value={stats.maxDepth} />
                <BoolChip label={t ? 'Rol' : 'Role'} value={stats.hasRole} />
                <BoolChip label={t ? 'Cikti Formati' : 'Output Fmt'} value={stats.hasOutputFormat} />
                <BoolChip label={t ? 'Ornekler' : 'Examples'} value={stats.hasExamples} />
                <BoolChip label="Guardrails" value={stats.hasGuardrails} />
              </div>
              {stats.nodesByType && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(stats.nodesByType).map(([type, count]) => (
                    <span key={type} className="text-[9px] font-mono bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                      {type}: {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Variables Tab */}
          {tab === 'variables' && varResult && !loading && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                <span className="text-green-400">
                  {t ? 'Toplam' : 'Total'}: {varResult.summary.total}
                </span>
                <span className="text-cyan-400">
                  {t ? 'Benzersiz' : 'Unique'}: {varResult.summary.unique}
                </span>
                <span className="text-yellow-400">
                  {t ? 'Zorunlu' : 'Required'}: {varResult.summary.required}
                </span>
                <span className="text-gray-400">
                  {t ? 'Opsiyonel' : 'Optional'}: {varResult.summary.optional}
                </span>
                {varResult.summary.mixedStyles && (
                  <span className="text-red-400 text-[10px]">
                    {t ? 'KARISIK STILLER!' : 'MIXED STYLES!'}
                  </span>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {varResult.variables.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 glass-card px-2 py-1">
                    <code className="text-cyan-300 text-xs">{v.raw}</code>
                    <span className="text-gray-500 text-[10px]">{v.style}</span>
                    {v.inferredType && (
                      <span className="text-purple-400 text-[10px]">{v.inferredType}</span>
                    )}
                    {v.required !== undefined && (
                      <span className={`text-[10px] ${v.required ? 'text-red-400' : 'text-gray-500'}`}>
                        {v.required ? (t ? 'zorunlu' : 'req') : (t ? 'ops' : 'opt')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {varResult.summary.styles.length > 0 && (
                <div className="flex gap-1">
                  {varResult.summary.styles.map(s => (
                    <span key={s} className="text-[9px] font-mono bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Elements Tab */}
          {tab === 'elements' && elements && !loading && (
            <div className="space-y-3">
              {elements.error && (
                <p className="text-red-400 text-xs">{elements.error}</p>
              )}
              {elements.summary && (
                <p className="text-gray-400 text-xs font-mono">{elements.summary}</p>
              )}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {elements.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 glass-card px-2 py-1.5">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      item.extractionClass === 'role' ? 'bg-blue-900/40 text-blue-300' :
                      item.extractionClass === 'constraint' ? 'bg-red-900/40 text-red-300' :
                      item.extractionClass === 'guardrail' ? 'bg-orange-900/40 text-orange-300' :
                      item.extractionClass === 'output_format' ? 'bg-green-900/40 text-green-300' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {item.extractionClass}
                    </span>
                    <span className="text-gray-300 text-xs flex-1 line-clamp-2">{item.extractionText}</span>
                  </div>
                ))}
              </div>
              {elements.keywords && elements.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-gray-500 text-[10px]">{t ? 'Anahtar kelimeler:' : 'Keywords:'}</span>
                  {elements.keywords.map(kw => (
                    <span key={kw} className="text-[9px] font-mono bg-cyan-900/30 text-cyan-300 px-1.5 py-0.5 rounded">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quality Tab */}
          {tab === 'quality' && metrics && !loading && (
            <div className="space-y-3">
              {/* Overall Score */}
              <div className="text-center">
                <div className={`text-3xl font-mono font-bold ${
                  metrics.quality.overall >= 80 ? 'text-green-400' :
                  metrics.quality.overall >= 60 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {Math.round(metrics.quality.overall)}
                </div>
                <div className="text-gray-500 text-[10px] font-mono">
                  {t ? 'GENEL KALITE PUANI' : 'OVERALL QUALITY SCORE'}
                </div>
              </div>

              {/* Metric bars */}
              <div className="space-y-2">
                <MetricBar label={t ? 'Karmasiklik' : 'Complexity'} value={metrics.complexity.score} />
                <MetricBar label={t ? 'Kapsam' : 'Coverage'} value={metrics.coverage.score} />
                <MetricBar label={t ? 'Yapi' : 'Structure'} value={metrics.quality.structureScore} />
                <MetricBar label={t ? 'Degisken Tutarl.' : 'Var Consistency'} value={metrics.quality.variableConsistency} />
              </div>

              {/* Coverage checklist */}
              <div className="grid grid-cols-2 gap-1">
                <BoolChip label={t ? 'Rol Tanimi' : 'Role Def'} value={metrics.coverage.hasRole} />
                <BoolChip label={t ? 'Kisitlar' : 'Constraints'} value={metrics.coverage.hasConstraints} />
                <BoolChip label={t ? 'Cikti Formati' : 'Output Fmt'} value={metrics.coverage.hasOutputFormat} />
                <BoolChip label={t ? 'Ornekler' : 'Examples'} value={metrics.coverage.hasExamples} />
                <BoolChip label="Guardrails" value={metrics.coverage.hasGuardrails} />
              </div>

              {/* Complexity details */}
              <div className="flex flex-wrap gap-2 text-[10px] font-mono text-gray-500">
                <span>{t ? 'Kelime' : 'Words'}: {metrics.complexity.wordCount}</span>
                <span>{t ? 'Bolum' : 'Sections'}: {metrics.complexity.sectionCount}</span>
                <span>{t ? 'Derinlik' : 'Depth'}: {metrics.complexity.maxDepth}</span>
              </div>
            </div>
          )}

          {/* Empty states */}
          {!loading && tab === 'structure' && !stats && (
            <EmptyState text={t ? 'Analiz icin prompt gerekli' : 'Generate a prompt to analyze'} />
          )}
          {!loading && tab === 'variables' && !varResult && (
            <EmptyState text={t ? 'Degisken analizi icin tiklayin' : 'Click to analyze variables'} />
          )}
          {!loading && tab === 'elements' && !elements && (
            <EmptyState text={t ? 'Oge analizi icin tiklayin' : 'Click to analyze elements'} />
          )}
          {!loading && tab === 'quality' && !metrics && (
            <EmptyState text={t ? 'Kalite analizi icin tiklayin' : 'Click to analyze quality'} />
          )}
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card px-2 py-1.5 text-center">
      <div className="text-cyan-300 font-mono text-sm font-bold">{value}</div>
      <div className="text-gray-500 text-[9px] font-mono">{label}</div>
    </div>
  );
}

function BoolChip({ label, value }: { label: string; value: boolean }) {
  return (
    <div className={`rounded px-2 py-1 text-[10px] font-mono flex items-center gap-1 ${
      value ? 'bg-green-900/30 text-green-400' : 'bg-gray-900/30 text-gray-500'
    }`}>
      <span>{value ? '[+]' : '[-]'}</span>
      <span>{label}</span>
    </div>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-6 text-center text-gray-600 text-xs font-mono">{text}</div>
  );
}
