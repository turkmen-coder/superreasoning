import type { OptimizationRound } from '../types/optimizer';

interface Props {
  round: OptimizationRound;
  isExpanded: boolean;
  onToggle: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-cyber-success';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

const OPT_TYPE_COLORS: Record<string, string> = {
  'lazy-loading': 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  'tree-shaking': 'text-green-400 bg-green-500/10 border-green-500/30',
  'code-splitting': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  'import-optimization': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  'typescript-strict': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  'clean-architecture': 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  'cwv-optimization': 'text-pink-400 bg-pink-500/10 border-pink-500/30',
  'barrel-elimination': 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  'async-waterfall': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  'backend-optimization': 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  'db-query-optimization': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  'memory-optimization': 'text-red-400 bg-red-500/10 border-red-500/30',
  'api-optimization': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};

const IMPACT_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

export default function OptimizationRoundCard({ round, isExpanded, onToggle }: Props) {
  return (
    <div className="border border-glass-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-cyber-dark/30 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-gray-500 uppercase">
            Round {round.round}
          </span>
          <span className={`font-mono text-sm font-bold ${getScoreColor(round.score)}`}>
            {round.score}
          </span>
          <div className="flex items-center gap-1.5">
            {round.webVitals.lcpPass && (
              <span className="px-1 py-0.5 rounded text-[7px] font-mono bg-cyber-success/10 text-cyber-success border border-cyber-success/20">LCP</span>
            )}
            {round.webVitals.inpPass && (
              <span className="px-1 py-0.5 rounded text-[7px] font-mono bg-cyber-success/10 text-cyber-success border border-cyber-success/20">INP</span>
            )}
            {round.webVitals.clsPass && (
              <span className="px-1 py-0.5 rounded text-[7px] font-mono bg-cyber-success/10 text-cyber-success border border-cyber-success/20">CLS</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] text-gray-600">
            {round.provider} | {Math.round(round.durationMs / 1000)}s
          </span>
          <span className="text-gray-500 text-xs">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-glass-border p-3 space-y-3">
          {/* Metrics Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded bg-cyber-dark/40 border border-glass-border">
              <p className="text-[8px] font-mono text-gray-500 uppercase">LCP</p>
              <p className={`text-sm font-mono font-bold ${round.webVitals.lcpPass ? 'text-cyber-success' : 'text-red-400'}`}>
                {round.webVitals.lcp}s
              </p>
            </div>
            <div className="text-center p-2 rounded bg-cyber-dark/40 border border-glass-border">
              <p className="text-[8px] font-mono text-gray-500 uppercase">INP</p>
              <p className={`text-sm font-mono font-bold ${round.webVitals.inpPass ? 'text-cyber-success' : 'text-red-400'}`}>
                {round.webVitals.inp}ms
              </p>
            </div>
            <div className="text-center p-2 rounded bg-cyber-dark/40 border border-glass-border">
              <p className="text-[8px] font-mono text-gray-500 uppercase">CLS</p>
              <p className={`text-sm font-mono font-bold ${round.webVitals.clsPass ? 'text-cyber-success' : 'text-red-400'}`}>
                {round.webVitals.cls}
              </p>
            </div>
          </div>

          {/* Backend Metrics (if available) */}
          {round.backendMetrics && (
            <div className="space-y-2">
              <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">Backend Metrics</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="text-center p-2 rounded bg-cyber-dark/40 border border-glass-border">
                  <p className="text-[8px] font-mono text-gray-500 uppercase">TTFB</p>
                  <p className={`text-sm font-mono font-bold ${round.backendMetrics.ttfbMs <= 500 ? 'text-cyber-success' : 'text-amber-400'}`}>
                    {round.backendMetrics.ttfbMs}ms
                  </p>
                </div>
                <div className="text-center p-2 rounded bg-cyber-dark/40 border border-glass-border">
                  <p className="text-[8px] font-mono text-gray-500 uppercase">Memory</p>
                  <p className={`text-sm font-mono font-bold ${round.backendMetrics.memoryPatterns.length === 0 ? 'text-cyber-success' : 'text-red-400'}`}>
                    {round.backendMetrics.memoryPatterns.length} issues
                  </p>
                </div>
                <div className="text-center p-2 rounded bg-cyber-dark/40 border border-glass-border">
                  <p className="text-[8px] font-mono text-gray-500 uppercase">DB Query</p>
                  <p className={`text-sm font-mono font-bold ${round.backendMetrics.dbQueryIssues.length === 0 ? 'text-cyber-success' : 'text-amber-400'}`}>
                    {round.backendMetrics.dbQueryIssues.length} issues
                  </p>
                </div>
                <div className="text-center p-2 rounded bg-cyber-dark/40 border border-glass-border">
                  <p className="text-[8px] font-mono text-gray-500 uppercase">API</p>
                  <p className={`text-sm font-mono font-bold ${round.backendMetrics.apiPatterns.length === 0 ? 'text-cyber-success' : 'text-blue-400'}`}>
                    {round.backendMetrics.apiPatterns.length} issues
                  </p>
                </div>
              </div>
              {(round.backendMetrics.memoryPatterns.length > 0 || round.backendMetrics.dbQueryIssues.length > 0 || round.backendMetrics.apiPatterns.length > 0) && (
                <div className="space-y-1">
                  {round.backendMetrics.memoryPatterns.map((p, i) => (
                    <div key={`mem-${i}`} className="font-mono text-[9px] text-red-400/80 pl-2 border-l border-red-500/20">{p}</div>
                  ))}
                  {round.backendMetrics.dbQueryIssues.map((p, i) => (
                    <div key={`db-${i}`} className="font-mono text-[9px] text-amber-400/80 pl-2 border-l border-amber-500/20">{p}</div>
                  ))}
                  {round.backendMetrics.apiPatterns.map((p, i) => (
                    <div key={`api-${i}`} className="font-mono text-[9px] text-blue-400/80 pl-2 border-l border-blue-500/20">{p}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Changes */}
          {round.changes.length > 0 && (
            <div>
              <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-2">
                Changes ({round.changes.length})
              </p>
              <div className="space-y-1.5">
                {round.changes.map((change, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2 rounded bg-cyber-dark/30 border border-glass-border/10"
                  >
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[7px] font-mono font-bold uppercase border ${OPT_TYPE_COLORS[change.type] || 'text-gray-400 bg-gray-500/10 border-gray-500/30'}`}>
                      {change.type.replace(/-/g, ' ')}
                    </span>
                    {change.impact && (
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[7px] font-mono uppercase border ${IMPACT_COLORS[change.impact] || IMPACT_COLORS.low}`}>
                        {change.impact}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] text-gray-300">{change.description}</p>
                      {change.file && (
                        <p className="font-mono text-[9px] text-gray-600 mt-0.5">{change.file}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimized Components */}
          <div>
            <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-2">
              Components ({round.output.components.length})
            </p>
            <div className="space-y-1.5">
              {round.output.components.map((comp, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded bg-cyber-dark/30 border border-glass-border/10"
                >
                  <span className="font-mono text-[10px] text-cyber-primary">{comp.name}</span>
                  <div className="flex items-center gap-1">
                    {comp.optimizations.map((opt, j) => (
                      <span
                        key={j}
                        className="px-1 py-0.5 rounded text-[7px] font-mono bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/20"
                      >
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CWV Issues */}
          {round.webVitals.details.length > 0 && (
            <div>
              <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-2">
                Issues ({round.webVitals.details.length})
              </p>
              <div className="space-y-1">
                {round.webVitals.details.map((detail, i) => (
                  <div key={i} className="flex items-start gap-2 font-mono text-[10px]">
                    <span className={`shrink-0 ${
                      detail.severity === 'critical' ? 'text-red-400' :
                      detail.severity === 'warning' ? 'text-yellow-400' : 'text-gray-500'
                    }`}>
                      {detail.severity === 'critical' ? '!!' : detail.severity === 'warning' ? '!' : 'i'}
                    </span>
                    <span className="text-gray-400">
                      <span className="text-gray-600">[{detail.component}]</span> {detail.issue}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
