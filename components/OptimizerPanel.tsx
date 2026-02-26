import { useState, useCallback, useRef } from 'react';
import { Icon } from './ui';
import type { OptimizationSession, OptimizationRound, OptimizerProvider, OptimizationInput, FrontendLang, BackendLang } from '../types/optimizer';
import { runOptimization, getBaselineSnapshot, type BaselineSnapshot, detectLanguageFromCode, wrapRawCodeAsInput, type DetectedLanguage } from '../services/optimizerService';
import { SAMPLE_INPUT } from '../services/optimizerPrompts';
import OptimizationMetrics from './OptimizationMetrics';
import OptimizationRoundCard from './OptimizationRoundCard';
import CodeDiffView from './CodeDiffView';
import EnrichmentPanel from './EnrichmentPanel';
import { useTranslation } from '../i18n';

const PROVIDERS: { id: OptimizerProvider; label: string; icon: string }[] = [
  { id: 'gemini', label: 'Gemini', icon: '♊' },
  { id: 'openai', label: 'OpenAI', icon: '◎' },
  { id: 'deepseek', label: 'DeepSeek', icon: '◈' },
];

function matchOptimizerErrorKey(msg: string): keyof typeof import('../locales').translations.tr.ui | null {
  if (msg.includes('at least one component')) return 'optimizerValidationAtLeastOne';
  if (msg.includes('folderStructure')) return 'optimizerValidationFolderStructure';
  if (msg.includes('must have a name')) return 'optimizerValidationComponentName';
  if (msg.includes('must have code')) return 'optimizerValidationComponentCode';
  if (msg.includes('dependencies must be an array')) return 'optimizerValidationDependencies';
  return null;
}

export default function OptimizerPanel() {
  const { t, language } = useTranslation();

  // Input
  const [inputJson, setInputJson] = useState('');
  const [provider, setProvider] = useState<OptimizerProvider>('gemini');
  const [maxRounds, setMaxRounds] = useState(3);
  const [frontendLang, setFrontendLang] = useState<FrontendLang>('react-ts');
  const [backendLang, setBackendLang] = useState<BackendLang | undefined>(undefined);

  // State
  const [session, setSession] = useState<OptimizationSession | null>(null);
  const [baseline, setBaseline] = useState<BaselineSnapshot | null>(null);
  const [running, setRunning] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Auto-detection
  const [detectedLang, setDetectedLang] = useState<DetectedLanguage | null>(null);

  // UI
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check if input looks like JSON
  const isJsonInput = useCallback((text: string) => {
    const t = text.trim();
    if (!t.startsWith('{')) return false;
    try { JSON.parse(t); return true; } catch { return false; }
  }, []);

  // Handle input change with auto-detection
  const handleInputChange = useCallback((value: string) => {
    setInputJson(value);
    setError(null);

    const trimmed = value.trim();
    if (!trimmed) {
      setDetectedLang(null);
      return;
    }

    // If it's JSON, try to detect from code fields inside it
    if (isJsonInput(trimmed)) {
      try {
        const parsed = JSON.parse(trimmed);
        const codes = (parsed.components || []).map((c: { code?: string }) => c.code || '').join('\n');
        if (codes.trim()) {
          const detected = detectLanguageFromCode(codes);
          if (detected.detectedName) {
            setDetectedLang(detected);
            if (detected.frontendLang) setFrontendLang(detected.frontendLang);
            if (detected.backendLang) setBackendLang(detected.backendLang);
          } else {
            setDetectedLang(null);
          }
        } else {
          setDetectedLang(null);
        }
      } catch {
        setDetectedLang(null);
      }
      return;
    }

    // Raw code — detect language
    const detected = detectLanguageFromCode(trimmed);
    if (detected.detectedName) {
      setDetectedLang(detected);
      if (detected.frontendLang) setFrontendLang(detected.frontendLang);
      if (detected.backendLang) setBackendLang(detected.backendLang);
    } else {
      setDetectedLang(null);
    }
  }, [isJsonInput]);

  // Load sample data
  const handleLoadExample = useCallback(() => {
    setInputJson(JSON.stringify(SAMPLE_INPUT, null, 2));
    setError(null);
    setSession(null);
    setBaseline(null);
  }, []);

  // Parse current input to OptimizationInput (shared helper — supports JSON and raw code)
  const parseInputFromJson = useCallback((): OptimizationInput | null => {
    const trimmed = (inputJson ?? '').trim();
    if (!trimmed) return null;

    // Try JSON first
    if (isJsonInput(trimmed)) {
      try {
        const raw = JSON.parse(trimmed) as { components?: unknown[]; folderStructure?: Record<string, unknown> };
        if (!raw?.components || !Array.isArray(raw.components) || raw.components.length === 0) return null;
        return {
          components: raw.components as OptimizationInput['components'],
          folderStructure: (raw.folderStructure && typeof raw.folderStructure === 'object' ? raw.folderStructure : {}) as OptimizationInput['folderStructure'],
        };
      } catch {
        return null;
      }
    }

    // Raw code — wrap as input
    return wrapRawCodeAsInput(trimmed);
  }, [inputJson, isJsonInput]);

  // Pre-optimization baseline analysis
  const handleAnalyze = useCallback(() => {
    setError(null);
    const input = parseInputFromJson();
    if (!input) {
      const msg = (t.ui as Record<string, string>).optimizerValidationNoComponents;
      const hint = (t.ui as Record<string, string>).optimizerValidationHint;
      setError(hint ? `${msg} ${hint}` : msg);
      setBaseline(null);
      return;
    }
    const snapshot = getBaselineSnapshot(input);
    setBaseline(snapshot);
    if (!snapshot) setError((t.ui as Record<string, string>).optimizerValidationAtLeastOne);
  }, [parseInputFromJson, t.ui]);

  // Run optimization
  const handleOptimize = useCallback(async () => {
    setError(null);
    const trimmed = (inputJson ?? '').trim();
    if (!trimmed) {
      setError((t.ui as Record<string, string>).optimizerValidationEmptyInput);
      return;
    }

    setRunning(true);
    setSession(null);
    setExpandedRound(null);
    setShowDiff(false);

    let input: OptimizationInput;

    if (isJsonInput(trimmed)) {
      // JSON mode
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {
        const msg = e instanceof SyntaxError ? e.message : 'Invalid JSON';
        setError(`Invalid JSON: ${msg}. Check brackets, commas, and quotes.`);
        setRunning(false);
        return;
      }

      const raw = parsed as { components?: unknown[]; folderStructure?: Record<string, unknown> };
      if (!raw || typeof raw !== 'object' || !Array.isArray(raw.components) || raw.components.length === 0) {
        const msg = (t.ui as Record<string, string>).optimizerValidationNoComponents;
        const hint = (t.ui as Record<string, string>).optimizerValidationHint;
        setError(hint ? `${msg} ${hint}` : msg);
        setRunning(false);
        return;
      }
      input = {
        components: raw.components as OptimizationInput['components'],
        folderStructure: (raw.folderStructure && typeof raw.folderStructure === 'object' ? raw.folderStructure : {}) as OptimizationInput['folderStructure'],
      };
    } else {
      // Raw code mode — wrap automatically
      input = wrapRawCodeAsInput(trimmed);
    }

    // Capture baseline for before/after summary (if not already set)
    if (!baseline) setBaseline(getBaselineSnapshot(input));

    try {
      const result = await runOptimization({
        input,
        provider,
        maxRounds,
        language,
        frontendLang,
        backendLang,
        onRoundComplete: (round: OptimizationRound) => {
          setSession(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              rounds: [...prev.rounds, round],
              currentRound: round.round,
            };
          });
        },
        onStatusChange: (status: string) => {
          setStatusText(status);
        },
      });

      setSession(result);
      if (result.error) {
        const key = matchOptimizerErrorKey(result.error);
        const text = key ? (t.ui as Record<string, string>)[key] : result.error;
        const hint = (t.ui as Record<string, string>).optimizerValidationHint;
        setError(hint ? `${text} ${hint}` : text);
      } else if (result.rounds.length > 0) {
        setExpandedRound(result.rounds.length - 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
      setStatusText('');
    }
  }, [inputJson, provider, maxRounds, frontendLang, backendLang, language, t.ui, isJsonInput]);

  // Copy result
  const handleCopy = useCallback(async () => {
    if (!session?.finalOutput) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(session.finalOutput, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [session]);

  const originalCode = inputJson
    ? (() => {
        const trimmed = inputJson.trim();
        if (isJsonInput(trimmed)) {
          try { const p = JSON.parse(trimmed); return p.components?.map((c: { code: string }) => c.code).join('\n\n') || ''; } catch { return ''; }
        }
        return trimmed; // raw code
      })()
    : '';
  const optimizedCode = session?.finalOutput?.components?.map(c => c.code).join('\n\n') || '';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyber-primary/20 via-purple-500/20 to-emerald-500/20 border border-cyber-primary/20 flex items-center justify-center">
          <Icon name="bolt" size={20} className="text-cyber-primary" />
        </div>
        <div>
          <h2 className="font-display text-sm font-bold text-gray-200 uppercase tracking-wider">
            Code Optimizer
          </h2>
          <p className="font-mono text-[10px] text-gray-500">
            MasterPrompt.Developer | CWV + Bundle + TypeScript | Frontend & Backend
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="glass-card p-4 space-y-4">
        {/* JSON Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">
              Component JSON Input
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAnalyze}
                className="font-mono text-[9px] text-gray-400 hover:text-cyber-accent uppercase tracking-wider transition-colors"
              >
                Analyze
              </button>
              <button
                onClick={handleLoadExample}
                className="font-mono text-[9px] text-cyber-primary hover:text-cyber-primary/80 uppercase tracking-wider transition-colors"
              >
                Load Example
              </button>
            </div>
          </div>
          <textarea
            ref={inputRef}
            value={inputJson}
            onChange={e => handleInputChange(e.target.value)}
            placeholder={(t.ui as Record<string, string>).optimizerRawCodeHint || 'Paste raw code or JSON'}
            rows={10}
            className="w-full glass-input px-4 py-3 font-mono text-[11px] text-gray-200 placeholder-gray-700 resize-y"
            spellCheck={false}
          />
          {detectedLang?.detectedName && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyber-primary/10 border border-cyber-primary/30 font-mono text-[9px] text-cyber-primary uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-primary animate-pulse" />
                {detectedLang.detectedName} — {(t.ui as Record<string, string>).optimizerAutoDetected || 'Auto-detected'}
              </span>
            </div>
          )}
        </div>

        {/* Frontend / Backend stack */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">
              {(t.ui as Record<string, string>).optimizerFrontendLabel}
            </label>
            <select
              value={frontendLang}
              onChange={e => setFrontendLang(e.target.value as FrontendLang)}
              className="w-full glass-input px-3 py-2 font-mono text-[11px] text-gray-200"
            >
              <option value="react-ts">{(t.ui as Record<string, string>).optimizerFrontendReactTs}</option>
              <option value="react-js">{(t.ui as Record<string, string>).optimizerFrontendReactJs}</option>
              <option value="vue">{(t.ui as Record<string, string>).optimizerFrontendVue}</option>
              <option value="angular">{(t.ui as Record<string, string>).optimizerFrontendAngular}</option>
              <option value="svelte">{(t.ui as Record<string, string>).optimizerFrontendSvelte}</option>
              <option value="nextjs">Next.js</option>
              <option value="nuxt">Nuxt</option>
              <option value="sveltekit">SvelteKit</option>
              <option value="html-css-js">HTML/CSS/JS</option>
            </select>
          </div>
          <div>
            <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">
              {(t.ui as Record<string, string>).optimizerBackendLabel}
            </label>
            <select
              value={backendLang ?? ''}
              onChange={e => setBackendLang((e.target.value || undefined) as BackendLang | undefined)}
              className="w-full glass-input px-3 py-2 font-mono text-[11px] text-gray-200"
            >
              <option value="">{(t.ui as Record<string, string>).optimizerStackNone}</option>
              <option value="node">{(t.ui as Record<string, string>).optimizerBackendNode}</option>
              <option value="python">{(t.ui as Record<string, string>).optimizerBackendPython}</option>
              <option value="go">{(t.ui as Record<string, string>).optimizerBackendGo}</option>
              <option value="java">{(t.ui as Record<string, string>).optimizerBackendJava}</option>
              <option value="csharp">{(t.ui as Record<string, string>).optimizerBackendCsharp}</option>
              <option value="php">{(t.ui as Record<string, string>).optimizerBackendPhp}</option>
              <option value="rust">Rust</option>
              <option value="c">{(t.ui as Record<string, string>).optimizerBackendC}</option>
              <option value="cpp">{(t.ui as Record<string, string>).optimizerBackendCpp}</option>
              <option value="assembly">{(t.ui as Record<string, string>).optimizerBackendAssembly}</option>
              <option value="swift">{(t.ui as Record<string, string>).optimizerBackendSwift}</option>
              <option value="kotlin">{(t.ui as Record<string, string>).optimizerBackendKotlin}</option>
              <option value="ruby">{(t.ui as Record<string, string>).optimizerBackendRuby}</option>
              <option value="scala">{(t.ui as Record<string, string>).optimizerBackendScala}</option>
              <option value="dart">{(t.ui as Record<string, string>).optimizerBackendDart}</option>
              <option value="elixir">{(t.ui as Record<string, string>).optimizerBackendElixir}</option>
              <option value="haskell">{(t.ui as Record<string, string>).optimizerBackendHaskell}</option>
              <option value="lua">{(t.ui as Record<string, string>).optimizerBackendLua}</option>
              <option value="perl">{(t.ui as Record<string, string>).optimizerBackendPerl}</option>
              <option value="r">{(t.ui as Record<string, string>).optimizerBackendR}</option>
              <option value="zig">{(t.ui as Record<string, string>).optimizerBackendZig}</option>
              <option value="deno">{(t.ui as Record<string, string>).optimizerBackendDeno}</option>
            </select>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-end gap-4">
          {/* Provider Selector */}
          <div className="flex-1">
            <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">
              Optimization Engine
            </label>
            <div className="flex gap-1.5">
              {PROVIDERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`flex-1 py-2 px-3 rounded-lg font-mono text-[10px] uppercase tracking-wider border transition-all ${
                    provider === p.id
                      ? 'border-cyber-primary bg-cyber-primary/10 text-cyber-primary'
                      : 'border-glass-border text-gray-500 hover:border-glass-border/60 hover:text-gray-400'
                  }`}
                >
                  <span className="mr-1">{p.icon}</span> {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rounds Slider */}
          <div className="w-32">
            <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">
              Max Rounds: {maxRounds}
            </label>
            <input
              type="range"
              min={3}
              max={5}
              value={maxRounds}
              onChange={e => setMaxRounds(Number(e.target.value))}
              className="w-full accent-cyber-primary"
            />
          </div>

          {/* Optimize Button */}
          <button
            onClick={handleOptimize}
            disabled={running || !inputJson.trim()}
            className="px-6 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-cyber-primary/20 to-cyber-accent/20 border border-cyber-primary/40 text-cyber-primary hover:from-cyber-primary/30 hover:to-cyber-accent/30 hover:shadow-[0_0_25px_rgba(6,232,249,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {running ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-cyber-primary/40 border-t-cyber-primary rounded-full animate-spin" />
                {statusText || 'OPTIMIZING...'}
              </span>
            ) : (
              'OPTIMIZE'
            )}
          </button>
        </div>
      </div>

      {/* Baseline (pre-optimization) snapshot */}
      {baseline && !running && (
        <div className="glass-card p-4">
          <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-2">
            Current input — baseline
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono text-sm font-bold text-gray-300">
              Score: <span className={baseline.score >= 80 ? 'text-cyber-success' : baseline.score >= 60 ? 'text-yellow-400' : 'text-orange-400'}>{baseline.score}/100</span>
            </span>
            <span className="font-mono text-[10px] text-gray-500">
              LCP {baseline.webVitals.lcp}s {baseline.webVitals.lcpPass ? '✓' : '✗'} · INP {baseline.webVitals.inp}ms {baseline.webVitals.inpPass ? '✓' : '✗'} · CLS {baseline.webVitals.cls} {baseline.webVitals.clsPass ? '✓' : '✗'}
            </span>
            <span className="font-mono text-[10px] text-gray-500">
              Bundle {baseline.bundle.originalSizeKb}KB · {baseline.bundle.lazyLoadedCount} lazy · TS {baseline.typescript.strictModeCompliant ? 'strict ✓' : `${baseline.typescript.anyUsageCount} any`}
            </span>
          </div>
        </div>
      )}

      {/* Progress */}
      {running && session && session.rounds.length > 0 && (
        <div className="glass-card border-cyber-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[9px] text-cyber-primary uppercase tracking-wider animate-pulse">
              {statusText || `Processing Round ${session.currentRound}/${session.maxRounds}`}
            </span>
            <span className="font-mono text-[10px] text-gray-500">
              {session.rounds.length} complete
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyber-primary to-cyber-accent rounded-full transition-all duration-500"
              style={{ width: `${(session.rounds.length / session.maxRounds) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/5 border border-red-500/30 rounded-lg p-3">
          <p className="font-mono text-[10px] text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {session && session.status === 'complete' && (
        <div className="space-y-4">
          {/* Before → After summary */}
          {baseline && session.rounds.length > 0 && (
            <div className="bg-gradient-to-r from-cyber-primary/5 to-cyber-accent/5 border border-cyber-primary/20 rounded-lg p-4">
              <p className="font-mono text-[9px] text-cyber-primary uppercase tracking-wider mb-2">
                Before → After
              </p>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-gray-500">Score</span>
                  <span className="font-mono font-bold text-gray-400">{baseline.score}</span>
                  <span className="text-gray-600">→</span>
                  <span className={`font-mono font-bold ${(session.rounds[session.rounds.length - 1]?.score ?? 0) >= 80 ? 'text-cyber-success' : 'text-yellow-400'}`}>
                    {session.rounds[session.rounds.length - 1]?.score ?? '-'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-gray-500">LCP</span>
                  <span className={baseline.webVitals.lcpPass ? 'text-cyber-success' : 'text-gray-400'}>{baseline.webVitals.lcp}s</span>
                  <span className="text-gray-600">→</span>
                  <span className={(session.rounds[session.rounds.length - 1]?.webVitals.lcpPass) ? 'text-cyber-success' : 'text-gray-400'}>
                    {session.rounds[session.rounds.length - 1]?.webVitals.lcp ?? '-'}s
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-gray-500">Bundle</span>
                  <span className="text-gray-400">{baseline.bundle.originalSizeKb}KB</span>
                  <span className="text-gray-600">→</span>
                  <span className="text-cyber-primary">{session.rounds[session.rounds.length - 1]?.bundle.optimizedSizeKb ?? '-'}KB</span>
                  {typeof session.rounds[session.rounds.length - 1]?.bundle.reductionPercent === 'number' && (
                    <span className="font-mono text-[10px] text-cyber-success">(-{session.rounds[session.rounds.length - 1]?.bundle.reductionPercent}%)</span>
                  )}
                </div>
                {session.rounds[session.rounds.length - 1]?.backendMetrics && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-gray-500">Backend</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      TTFB {session.rounds[session.rounds.length - 1]?.backendMetrics?.ttfbMs}ms
                    </span>
                    <span className={`font-mono text-[10px] ${(session.rounds[session.rounds.length - 1]?.backendMetrics?.score ?? 0) >= 70 ? 'text-cyber-success' : 'text-amber-400'}`}>
                      Score: {session.rounds[session.rounds.length - 1]?.backendMetrics?.score}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metrics Dashboard */}
          <OptimizationMetrics session={session} />

          {/* Round Cards */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">
                Optimization Rounds
              </span>
              <span className="font-mono text-[9px] text-gray-600">
                {session.rounds.length} rounds completed
              </span>
            </div>
            <div className="space-y-2">
              {session.rounds.map((round, i) => (
                <OptimizationRoundCard
                  key={round.round}
                  round={round}
                  isExpanded={expandedRound === i}
                  onToggle={() => setExpandedRound(expandedRound === i ? null : i)}
                />
              ))}
            </div>
          </div>

          {/* Diff View Toggle */}
          {originalCode && optimizedCode && (
            <div>
              <button
                onClick={() => setShowDiff(!showDiff)}
                className="mb-2 font-mono text-[9px] text-cyber-primary hover:text-cyber-primary/80 uppercase tracking-wider transition-colors"
              >
                {showDiff ? '▼ HIDE DIFF' : '▶ SHOW DIFF'}
              </button>
              {showDiff && (
                <CodeDiffView original={originalCode} optimized={optimizedCode} />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-lg font-mono text-[10px] uppercase tracking-wider border border-glass-border text-gray-400 hover:border-cyber-primary/40 hover:text-cyber-primary transition-all"
            >
              {copied ? 'COPIED!' : 'COPY RESULT JSON'}
            </button>
            <button
              onClick={() => {
                if (!session.finalOutput) return;
                const blob = new Blob([JSON.stringify(session.finalOutput, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `optimized-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              disabled={!session.finalOutput}
              className="px-4 py-2 rounded-lg font-mono text-[10px] uppercase tracking-wider border border-glass-border text-gray-400 hover:border-cyber-accent/40 hover:text-cyber-accent transition-all disabled:opacity-40"
            >
              DOWNLOAD JSON
            </button>
          </div>

          {/* Enrichment — optimize edilmis promptu zenginlestir */}
          <EnrichmentPanel
            masterPrompt={
              session.rounds.length > 0
                ? `Optimize the following code for performance. Rounds completed: ${session.rounds.length}. Final score: ${session.rounds[session.rounds.length - 1]?.score ?? 0}/100. Key improvements: ${session.rounds.map(r => r.changes?.map(c => c.description).join(', ')).join('; ')}`
                : ''
            }
            framework="auto"
            domainId="frontend"
            language={language}
            onApply={(enriched) => navigator.clipboard.writeText(enriched)}
          />

          {/* Validation Checklist */}
          <div className="glass-card p-4">
            <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-3">
              Validation Plan
            </p>
            <div className="space-y-1.5 font-mono text-[10px]">
              <CheckItem pass={session.rounds[session.rounds.length - 1]?.webVitals.allPass} label="Core Web Vitals thresholds (LCP<2.5s, INP<200ms, CLS<0.1)" />
              <CheckItem pass={session.rounds[session.rounds.length - 1]?.typescript.strictModeCompliant} label="Clean Architecture & TypeScript compliance" />
              <CheckItem pass={(session.rounds[session.rounds.length - 1]?.bundle.reductionPercent || 0) > 0} label="Bundle optimization (tree-shaking, lazy loading)" />
              <CheckItem pass={session.status === 'complete'} label="One-click optimization completed" />
              <CheckItem pass={session.rounds.length >= 3} label={`Multi-round improvement (${session.rounds.length} rounds)`} />
              <CheckItem pass={!!session.finalOutput} label="Output format: Component Architecture JSON" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckItem({ pass, label }: { pass?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={pass ? 'text-cyber-success' : 'text-gray-600'}>
        {pass ? '[x]' : '[ ]'}
      </span>
      <span className={pass ? 'text-gray-300' : 'text-gray-500'}>{label}</span>
    </div>
  );
}
