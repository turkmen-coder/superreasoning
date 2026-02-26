/**
 * Genetik Lab — Evolutionary Prompt Optimization UI
 *
 * Genetik algoritma ile prompt optimizasyonu: popülasyon görselleştirme,
 * fitness grafiği, çeşitlilik takibi, evrim günlüğü.
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from '../i18n';
import { Framework } from '../types';
import { runGeneticAlgorithm } from '../services/geneticAlgorithm';
import type {
  GeneticConfig,
  GeneticRunResult,
  GeneticRunStatus,
  GeneticProgressEvent,
  GenerationSnapshot,
  GeneticIndividual,
} from '../types/genetic';
import { DEFAULT_GENETIC_CONFIG } from '../types/genetic';
import type { ClientProvider } from '../services/unifiedProviderService';

// ─── Provider Options ────────────────────────────────────────────────────────

const PROVIDER_OPTIONS: { value: ClientProvider; label: string }[] = [
  { value: 'auto', label: 'Auto (Best Available)' },
  { value: 'groq', label: 'Groq (Fast/Free)' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'claude', label: 'Claude' },
  { value: 'ollama', label: 'Ollama (Local)' },
];

// ─── Framework subset for selector ──────────────────────────────────────────

const FRAMEWORK_OPTIONS: { value: Framework; label: string }[] = [
  { value: Framework.AUTO, label: 'AUTO (Diverse)' },
  { value: Framework.KERNEL, label: 'KERNEL' },
  { value: Framework.COSTAR, label: 'CO-STAR' },
  { value: Framework.RISEN, label: 'RISEN' },
  { value: Framework.CHAIN, label: 'Chain of Thought' },
  { value: Framework.TREE, label: 'Tree of Thought' },
  { value: Framework.REACT, label: 'ReAct' },
  { value: Framework.CRITIC, label: 'Critic-Revise' },
  { value: Framework.SELFREFINE, label: 'Self-Refine' },
  { value: Framework.FIRST_PRINCIPLES, label: 'First Principles' },
  { value: Framework.META_PROMPT, label: 'Meta-Prompt' },
  { value: Framework.SOCRATIC, label: 'Socratic' },
  { value: Framework.DSP, label: 'DSP' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function GenetikLabPage() {
  const { t, language } = useTranslation();

  // Config
  const [seedIntent, setSeedIntent] = useState('');
  const [populationSize, setPopulationSize] = useState(DEFAULT_GENETIC_CONFIG.populationSize);
  const [generations, setGenerations] = useState(DEFAULT_GENETIC_CONFIG.generations);
  const [crossoverRate, setCrossoverRate] = useState(DEFAULT_GENETIC_CONFIG.crossoverRate);
  const [mutationRate, setMutationRate] = useState(DEFAULT_GENETIC_CONFIG.mutationRate);
  const [elitismCount, setElitismCount] = useState(DEFAULT_GENETIC_CONFIG.elitismCount);
  const [framework, setFramework] = useState<Framework>(Framework.AUTO);
  const [provider, setProvider] = useState<ClientProvider>('auto');
  const [domainId, setDomainId] = useState('auto');

  // Run state
  const [status, setStatus] = useState<GeneticRunStatus>('idle');
  const [result, setResult] = useState<GeneticRunResult | null>(null);
  const [snapshots, setSnapshots] = useState<GenerationSnapshot[]>([]);
  const [logEntries, setLogEntries] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [selectedGen, setSelectedGen] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [configCollapsed, setConfigCollapsed] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // ─── Derived Data ────────────────────────────────────────────────────────

  const fitnessData = useMemo(() =>
    snapshots.map(s => ({
      name: `Gen ${s.generation}`,
      best: s.bestFitness,
      avg: s.avgFitness,
      worst: s.worstFitness,
    })),
    [snapshots],
  );

  const diversityData = useMemo(() =>
    snapshots.map(s => ({
      name: `Gen ${s.generation}`,
      diversity: Math.round(s.diversity * 100),
    })),
    [snapshots],
  );

  const currentSnapshot = snapshots[selectedGen] ?? null;
  const bestIndividual = result?.bestIndividual ?? null;

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleProgress = useCallback((event: GeneticProgressEvent) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogEntries(prev => [...prev, `[${timestamp}] ${event.detail}`]);
    setProgress(event.progress);

    if (event.snapshot) {
      setSnapshots(prev => {
        const existing = prev.findIndex(s => s.generation === event.snapshot!.generation);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = event.snapshot!;
          return updated;
        }
        return [...prev, event.snapshot!];
      });
      setSelectedGen(event.snapshot.generation);
    }

    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  const handleEvolve = useCallback(async () => {
    if (!seedIntent.trim()) return;

    const config: GeneticConfig = {
      seedIntent: seedIntent.trim(),
      populationSize,
      generations,
      tournamentSize: Math.min(3, populationSize - 1),
      crossoverRate,
      mutationRate,
      elitismCount,
      domainId,
      framework,
      language,
      provider,
    };

    setStatus('running');
    setResult(null);
    setSnapshots([]);
    setLogEntries([]);
    setProgress(0);
    setError(null);
    setSelectedGen(0);
    setExpandedId(null);
    setConfigCollapsed(true);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await runGeneticAlgorithm(config, handleProgress, ac.signal);
      setResult(res);
      setStatus('completed');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('idle');
        setLogEntries(prev => [...prev, `[${new Date().toLocaleTimeString()}] Evolution stopped by user.`]);
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    } finally {
      abortRef.current = null;
    }
  }, [seedIntent, populationSize, generations, crossoverRate, mutationRate, elitismCount, domainId, framework, language, provider, handleProgress]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleCopyBest = useCallback(() => {
    if (bestIndividual) {
      navigator.clipboard.writeText(bestIndividual.promptText);
    }
  }, [bestIndividual]);

  const handleUseAsSeed = useCallback(() => {
    if (bestIndividual) {
      setSeedIntent(bestIndividual.promptText);
      setConfigCollapsed(false);
      setStatus('idle');
    }
  }, [bestIndividual]);

  const handleExport = useCallback(() => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genetik-run-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  // ─── Render Helpers ──────────────────────────────────────────────────────

  const statusBadge = () => {
    const map: Record<GeneticRunStatus, { label: string; color: string }> = {
      idle: { label: t.ui.genetikStatusIdle, color: 'text-gray-500 border-gray-500/30' },
      running: { label: t.ui.genetikStatusRunning, color: 'text-cyan-400 border-cyan-400/30 animate-pulse' },
      completed: { label: t.ui.genetikStatusCompleted, color: 'text-emerald-400 border-emerald-400/30' },
      paused: { label: 'Paused', color: 'text-amber-400 border-amber-400/30' },
      error: { label: t.ui.genetikStatusError, color: 'text-red-400 border-red-400/30' },
    };
    const s = map[status];
    return (
      <span className={`px-2 py-0.5 text-[10px] font-mono border rounded ${s.color}`}>
        {s.label}
      </span>
    );
  };

  const renderIndividualCard = (ind: GeneticIndividual, isBest: boolean) => {
    const fitness = ind.fitness?.compositeFitness ?? 0;
    const isExpanded = expandedId === ind.id;

    return (
      <div
        key={ind.id}
        onClick={() => setExpandedId(isExpanded ? null : ind.id)}
        className={`
          p-3 rounded-lg border font-mono text-[10px] cursor-pointer transition-all duration-300
          ${isBest
            ? 'border-cyan-400/50 bg-cyan-400/5 shadow-[0_0_12px_rgba(6,232,249,0.15)]'
            : 'border-gray-700/40 bg-glass-bg hover:border-purple-500/40'}
        `}
      >
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-600">#{ind.id.slice(0, 6)}</span>
            {isBest && <span className="text-[8px] px-1 py-0.5 bg-cyan-400/20 text-cyan-400 rounded">BEST</span>}
          </div>
          <span className={`font-bold text-xs ${
            fitness >= 75 ? 'text-emerald-400' :
            fitness >= 50 ? 'text-cyan-400' :
            fitness >= 25 ? 'text-amber-400' :
            'text-red-400'
          }`}>
            {fitness.toFixed(1)}
          </span>
        </div>

        {/* Fitness bar */}
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-1.5">
          <div
            className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-purple-500 to-cyan-400"
            style={{ width: `${fitness}%` }}
          />
        </div>

        <div className="flex justify-between text-[8px] text-gray-600">
          <span>{ind.framework}</span>
          <span>Gen {ind.generation}</span>
        </div>

        {/* Expanded details */}
        {isExpanded && ind.fitness && (
          <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-[9px]">
              <div>
                <span className="text-gray-500">{t.ui.genetikJudgeScore}</span>
                <div className="text-cyan-400 font-bold">{ind.fitness.judgeTotal.toFixed(1)}</div>
              </div>
              <div>
                <span className="text-gray-500">{t.ui.genetikLintPenalty}</span>
                <div className="text-amber-400 font-bold">-{ind.fitness.lintPenalty.toFixed(1)}</div>
              </div>
              <div>
                <span className="text-gray-500">{t.ui.genetikTokenPenalty}</span>
                <div className="text-red-400 font-bold">-{ind.fitness.tokenCostPenalty.toFixed(1)}</div>
              </div>
            </div>
            <div className="text-[9px] text-gray-400 max-h-24 overflow-y-auto">
              {ind.promptText.slice(0, 300)}...
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
              <path d="M12 2v6m0 8v6" />
              <circle cx="12" cy="12" r="2" />
              <path d="M8 4c0 2.2 1.8 4 4 4s4-1.8 4-4" />
              <path d="M8 20c0-2.2 1.8-4 4-4s4 1.8 4 4" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-sm font-bold text-white uppercase tracking-wider">
              {t.ui.genetikTitle}
            </h1>
            <p className="font-mono text-[10px] text-gray-500">{t.ui.genetikSubtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {statusBadge()}
          {status === 'running' && (
            <div className="font-mono text-[10px] text-cyan-400">{progress}%</div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {status === 'running' && (
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Config Panel */}
      <div className="bg-glass-bg border border-emerald-500/20 rounded-lg overflow-hidden">
        <button
          onClick={() => setConfigCollapsed(!configCollapsed)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-emerald-500/5 transition-colors"
        >
          <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider">
            {t.ui.genetikSeedLabel}
          </span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" className={`text-gray-500 transition-transform ${configCollapsed ? '' : 'rotate-180'}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {!configCollapsed && (
          <div className="px-4 pb-4 space-y-4">
            {/* Seed Intent */}
            <textarea
              value={seedIntent}
              onChange={e => setSeedIntent(e.target.value)}
              placeholder={t.ui.genetikSeedPlaceholder}
              rows={3}
              className="w-full bg-glass-bg border border-gray-700/40 rounded-lg px-3 py-2 font-mono text-xs text-gray-200 placeholder-gray-600 focus:border-emerald-500/50 focus:outline-none resize-none"
            />

            {/* Settings Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Population Size */}
              <div>
                <label className="block font-mono text-[10px] text-gray-500 mb-1">{t.ui.genetikPopulationSize}: {populationSize}</label>
                <input
                  type="range" min={4} max={12} step={1} value={populationSize}
                  onChange={e => setPopulationSize(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
              {/* Generations */}
              <div>
                <label className="block font-mono text-[10px] text-gray-500 mb-1">{t.ui.genetikGenerations}: {generations}</label>
                <input
                  type="range" min={2} max={10} step={1} value={generations}
                  onChange={e => setGenerations(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
              {/* Crossover Rate */}
              <div>
                <label className="block font-mono text-[10px] text-gray-500 mb-1">{t.ui.genetikCrossoverRate}: {(crossoverRate * 100).toFixed(0)}%</label>
                <input
                  type="range" min={0} max={100} step={5} value={crossoverRate * 100}
                  onChange={e => setCrossoverRate(Number(e.target.value) / 100)}
                  className="w-full accent-cyan-400"
                />
              </div>
              {/* Mutation Rate */}
              <div>
                <label className="block font-mono text-[10px] text-gray-500 mb-1">{t.ui.genetikMutationRate}: {(mutationRate * 100).toFixed(0)}%</label>
                <input
                  type="range" min={0} max={100} step={5} value={mutationRate * 100}
                  onChange={e => setMutationRate(Number(e.target.value) / 100)}
                  className="w-full accent-purple-500"
                />
              </div>
              {/* Elitism */}
              <div>
                <label className="block font-mono text-[10px] text-gray-500 mb-1">{t.ui.genetikElitism}: {elitismCount}</label>
                <input
                  type="range" min={0} max={3} step={1} value={elitismCount}
                  onChange={e => setElitismCount(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
              {/* Provider */}
              <div>
                <label className="block font-mono text-[10px] text-gray-500 mb-1">{t.ui.genetikProvider}</label>
                <select
                  value={provider}
                  onChange={e => setProvider(e.target.value as ClientProvider)}
                  className="w-full bg-glass-bg border border-gray-700/40 rounded px-2 py-1 font-mono text-[10px] text-gray-300 focus:border-emerald-500/50 focus:outline-none"
                >
                  {PROVIDER_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Framework & Domain row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[10px] text-gray-500 mb-1">{t.ui.genetikFramework}</label>
                <select
                  value={framework}
                  onChange={e => setFramework(e.target.value as Framework)}
                  className="w-full bg-glass-bg border border-gray-700/40 rounded px-2 py-1 font-mono text-[10px] text-gray-300 focus:border-emerald-500/50 focus:outline-none"
                >
                  {FRAMEWORK_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-mono text-[10px] text-gray-500 mb-1">{t.ui.genetikDomain}</label>
                <input
                  type="text" value={domainId}
                  onChange={e => setDomainId(e.target.value)}
                  placeholder="auto"
                  className="w-full bg-glass-bg border border-gray-700/40 rounded px-2 py-1 font-mono text-[10px] text-gray-300 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              {status !== 'running' ? (
                <button
                  onClick={handleEvolve}
                  disabled={!seedIntent.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(0,240,180,0.2)] hover:shadow-[0_0_30px_rgba(0,240,180,0.3)]"
                >
                  {t.ui.genetikEvolveBtn}
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg hover:from-red-500 hover:to-rose-500 transition-all"
                >
                  {t.ui.genetikStopBtn}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="font-mono text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Charts Row */}
      {snapshots.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Fitness Chart */}
          <div className="bg-glass-bg border border-gray-700/30 rounded-lg p-4">
            <h3 className="font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-3">
              {t.ui.genetikFitnessChart}
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={fitnessData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                <XAxis dataKey="name" stroke="#555" fontSize={9} fontFamily="monospace" />
                <YAxis domain={[0, 100]} stroke="#555" fontSize={9} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{
                    background: '#0c0c18',
                    border: '1px solid rgba(112,0,255,0.3)',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                  }}
                />
                <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: '10px' }} />
                <Line
                  type="monotone" dataKey="best" name={t.ui.genetikBestLabel}
                  stroke="#06e8f9" strokeWidth={2} dot={{ r: 3, fill: '#06e8f9' }}
                />
                <Line
                  type="monotone" dataKey="avg" name={t.ui.genetikAvgLabel}
                  stroke="#9d00ff" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 2 }}
                />
                <Line
                  type="monotone" dataKey="worst" name={t.ui.genetikWorstLabel}
                  stroke="#ff003c" strokeWidth={1} opacity={0.5} dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Diversity Chart */}
          <div className="bg-glass-bg border border-gray-700/30 rounded-lg p-4">
            <h3 className="font-mono text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-3">
              {t.ui.genetikDiversityChart}
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={diversityData}>
                <defs>
                  <linearGradient id="genetikDivGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9d00ff" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#9d00ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                <XAxis dataKey="name" stroke="#555" fontSize={9} fontFamily="monospace" />
                <YAxis domain={[0, 100]} stroke="#555" fontSize={9} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{
                    background: '#0c0c18',
                    border: '1px solid rgba(112,0,255,0.3)',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                  }}
                />
                <Area
                  type="monotone" dataKey="diversity" name={t.ui.genetikDiversity}
                  stroke="#9d00ff" fill="url(#genetikDivGrad)" strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Generation Selector + Population Grid */}
      {snapshots.length > 0 && (
        <div className="bg-glass-bg border border-gray-700/30 rounded-lg p-4">
          {/* Generation tabs */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            <span className="font-mono text-[10px] text-gray-500 uppercase tracking-wider shrink-0">
              {t.ui.genetikGeneration}:
            </span>
            {snapshots.map(s => (
              <button
                key={s.generation}
                onClick={() => setSelectedGen(s.generation)}
                className={`
                  px-3 py-1 rounded font-mono text-[10px] transition-all shrink-0
                  ${selectedGen === s.generation
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gray-800/50 text-gray-500 border border-gray-700/30 hover:border-gray-600/50'}
                `}
              >
                Gen {s.generation}
                <span className="ml-1 text-[8px] opacity-60">({s.bestFitness})</span>
              </button>
            ))}
          </div>

          {/* Population Grid */}
          <h3 className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
            {t.ui.genetikPopulationGrid}
            {currentSnapshot && (
              <span className="ml-2 text-gray-600 normal-case">
                ({currentSnapshot.population.length} {t.ui.genetikIndividual})
              </span>
            )}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
            {currentSnapshot?.population.map(ind =>
              renderIndividualCard(ind, ind.id === currentSnapshot.bestIndividualId)
            )}
          </div>
        </div>
      )}

      {/* Best Individual Panel */}
      {bestIndividual && status === 'completed' && (
        <div className="bg-glass-bg border border-cyan-400/20 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
              {t.ui.genetikBestIndividual}
            </h3>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-cyan-400">
                {bestIndividual.fitness?.compositeFitness.toFixed(1)}
              </span>
              <span className="font-mono text-[10px] text-gray-600">/ 100</span>
            </div>
          </div>

          {/* Score breakdown */}
          {bestIndividual.fitness && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-glass-bg rounded-lg p-2.5 text-center">
                <div className="font-mono text-[9px] text-gray-500 mb-1">{t.ui.genetikJudgeScore}</div>
                <div className="font-mono text-sm font-bold text-cyan-400">{bestIndividual.fitness.judgeTotal.toFixed(1)}</div>
              </div>
              <div className="bg-glass-bg rounded-lg p-2.5 text-center">
                <div className="font-mono text-[9px] text-gray-500 mb-1">{t.ui.genetikLintPenalty}</div>
                <div className="font-mono text-sm font-bold text-amber-400">-{bestIndividual.fitness.lintPenalty.toFixed(1)}</div>
              </div>
              <div className="bg-glass-bg rounded-lg p-2.5 text-center">
                <div className="font-mono text-[9px] text-gray-500 mb-1">{t.ui.genetikTokenPenalty}</div>
                <div className="font-mono text-sm font-bold text-red-400">-{bestIndividual.fitness.tokenCostPenalty.toFixed(1)}</div>
              </div>
              <div className="bg-glass-bg rounded-lg p-2.5 text-center">
                <div className="font-mono text-[9px] text-gray-500 mb-1">{t.ui.genetikComposite}</div>
                <div className="font-mono text-sm font-bold text-emerald-400">{bestIndividual.fitness.compositeFitness.toFixed(1)}</div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex gap-4 mb-4 text-[10px] font-mono text-gray-500">
            <span>{t.ui.genetikFramework}: <span className="text-purple-400">{bestIndividual.framework}</span></span>
            <span>{t.ui.genetikGeneration}: <span className="text-cyan-400">{bestIndividual.generation}</span></span>
            {result?.convergenceGeneration !== null && result?.convergenceGeneration !== undefined && (
              <span>{t.ui.genetikConvergence}: <span className="text-emerald-400">Gen {result.convergenceGeneration}</span></span>
            )}
            <span>{t.ui.genetikLlmCalls}: <span className="text-amber-400">{result?.totalLLMCalls}</span></span>
            <span>{t.ui.genetikDuration}: <span className="text-gray-400">{((result?.totalDurationMs ?? 0) / 1000).toFixed(1)}s</span></span>
          </div>

          {/* Prompt text */}
          <div className="bg-glass-bg rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
            <pre className="font-mono text-[11px] text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
              {bestIndividual.promptText}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCopyBest}
              className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-cyan-500/20 transition-all"
            >
              {t.ui.genetikCopy}
            </button>
            <button
              onClick={handleUseAsSeed}
              className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-purple-500/20 transition-all"
            >
              {t.ui.genetikUseAsSeed}
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-500/20 transition-all"
            >
              {t.ui.genetikExport}
            </button>
          </div>
        </div>
      )}

      {/* Evolution Log */}
      {logEntries.length > 0 && (
        <div className="bg-glass-bg border border-gray-700/30 rounded-lg p-4">
          <h3 className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
            {t.ui.genetikLog}
          </h3>
          <div className="bg-glass-bg rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-[10px] text-gray-500 space-y-0.5">
            {logEntries.map((entry, i) => (
              <div key={i} className="hover:text-gray-300 transition-colors">
                {entry}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
