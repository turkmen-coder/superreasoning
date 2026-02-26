import type { OptimizationSession } from '../types/optimizer';

interface Props {
  session: OptimizationSession;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-cyber-success';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getBarColor(score: number): string {
  if (score >= 80) return 'bg-cyber-success';
  if (score >= 60) return 'bg-yellow-400';
  if (score >= 40) return 'bg-orange-400';
  return 'bg-red-400';
}

function PassBadge({ pass }: { pass: boolean }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
      pass
        ? 'bg-cyber-success/20 text-cyber-success border border-cyber-success/30'
        : 'bg-red-500/20 text-red-400 border border-red-500/30'
    }`}>
      {pass ? 'PASS' : 'FAIL'}
    </span>
  );
}

export default function OptimizationMetrics({ session }: Props) {
  const lastRound = session.rounds[session.rounds.length - 1];
  if (!lastRound) return null;

  const { webVitals, bundle, typescript } = lastRound;
  const totalDurationMs = session.rounds.reduce((sum, r) => sum + r.durationMs, 0);

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-cyber-dark/50 border-b border-glass-border">
        <div className="flex items-center gap-2">
          <span className="font-display text-[9px] text-gray-400 uppercase tracking-wider">
            OPTIMIZATION RESULTS
          </span>
          <PassBadge pass={webVitals.allPass} />
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-sm font-bold ${getScoreColor(lastRound.score)}`}>
            {lastRound.score}/100
          </span>
          <span className="font-mono text-[9px] text-gray-600">
            {session.rounds.length} rounds | {Math.round(totalDurationMs / 1000)}s
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-cyber-border/20">
        {/* LCP */}
        <div className="glass-card p-3 text-center">
          <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1">LCP</p>
          <p className={`font-mono text-lg font-bold ${webVitals.lcpPass ? 'text-cyber-success' : 'text-red-400'}`}>
            {webVitals.lcp}s
          </p>
          <p className="font-mono text-[9px] text-gray-600">target &lt;2.5s</p>
          <div className="mt-1.5 w-full h-1 bg-cyber-dark rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${webVitals.lcpPass ? 'bg-cyber-success' : 'bg-red-400'}`}
              style={{ width: `${Math.min(100, (2.5 / Math.max(webVitals.lcp, 0.1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* INP */}
        <div className="glass-card p-3 text-center">
          <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1">INP</p>
          <p className={`font-mono text-lg font-bold ${webVitals.inpPass ? 'text-cyber-success' : 'text-red-400'}`}>
            {webVitals.inp}ms
          </p>
          <p className="font-mono text-[9px] text-gray-600">target &lt;200ms</p>
          <div className="mt-1.5 w-full h-1 bg-cyber-dark rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${webVitals.inpPass ? 'bg-cyber-success' : 'bg-red-400'}`}
              style={{ width: `${Math.min(100, (200 / Math.max(webVitals.inp, 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* CLS */}
        <div className="glass-card p-3 text-center">
          <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1">CLS</p>
          <p className={`font-mono text-lg font-bold ${webVitals.clsPass ? 'text-cyber-success' : 'text-red-400'}`}>
            {webVitals.cls}
          </p>
          <p className="font-mono text-[9px] text-gray-600">target &lt;0.1</p>
          <div className="mt-1.5 w-full h-1 bg-cyber-dark rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${webVitals.clsPass ? 'bg-cyber-success' : 'bg-red-400'}`}
              style={{ width: `${Math.min(100, (0.1 / Math.max(webVitals.cls, 0.001)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Bundle */}
        <div className="glass-card p-3 text-center">
          <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1">BUNDLE</p>
          <p className={`font-mono text-lg font-bold ${bundle.reductionPercent >= 20 ? 'text-cyber-success' : 'text-yellow-400'}`}>
            -{bundle.reductionPercent}%
          </p>
          <p className="font-mono text-[9px] text-gray-600">
            {bundle.originalSizeKb}KB → {bundle.optimizedSizeKb}KB
          </p>
          <div className="mt-1.5 w-full h-1 bg-cyber-dark rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getBarColor(bundle.reductionPercent * 2)}`}
              style={{ width: `${Math.min(100, bundle.reductionPercent * 2)}%` }}
            />
          </div>
        </div>
      </div>

      {/* TypeScript & Architecture Row */}
      <div className="grid grid-cols-2 gap-px bg-cyber-border/20 border-t border-glass-border">
        <div className="glass-card p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-gray-500 uppercase">TypeScript Strict</span>
            <PassBadge pass={typescript.strictModeCompliant} />
          </div>
          <div className="mt-1.5 flex items-center gap-3 font-mono text-[10px]">
            <span className="text-gray-400">{typescript.interfacesCount} interfaces</span>
            <span className="text-gray-400">{typescript.typesCount} types</span>
            {typescript.anyUsageCount > 0 && (
              <span className="text-red-400">{typescript.anyUsageCount} any</span>
            )}
          </div>
        </div>
        <div className="glass-card p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-gray-500 uppercase">Architecture</span>
            <span className="font-mono text-[10px] text-cyber-primary">
              {bundle.lazyLoadedCount} lazy | {bundle.chunksCount} chunks
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-3 font-mono text-[10px]">
            {bundle.treeShaken.length > 0 ? (
              <span className="text-yellow-400">{bundle.treeShaken.length} need tree-shaking</span>
            ) : (
              <span className="text-cyber-success">All imports optimized</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
