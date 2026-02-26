import { useMemo } from 'react';
import { computeDiff } from '../services/webVitalsAnalyzer';

interface Props {
  original: string;
  optimized: string;
}

export default function CodeDiffView({ original, optimized }: Props) {
  const diff = useMemo(() => computeDiff(original, optimized), [original, optimized]);

  const lineColor = (type: 'added' | 'removed' | 'unchanged') => {
    switch (type) {
      case 'added': return 'bg-cyber-success/5 text-cyber-success';
      case 'removed': return 'bg-red-500/5 text-red-400';
      default: return 'text-gray-500';
    }
  };

  const linePrefix = (type: 'added' | 'removed' | 'unchanged') => {
    switch (type) {
      case 'added': return '+';
      case 'removed': return '-';
      default: return ' ';
    }
  };

  return (
    <div className="border border-glass-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-cyber-dark/50 border-b border-glass-border">
        <span className="font-mono text-[9px] text-gray-400 uppercase tracking-wider">
          DIFF VIEW
        </span>
        <div className="flex items-center gap-3 font-mono text-[9px]">
          <span className="text-cyber-success">+{diff.stats.added}</span>
          <span className="text-red-400">-{diff.stats.removed}</span>
          <span className="text-gray-600">~{diff.stats.unchanged}</span>
        </div>
      </div>

      {/* Diff Lines */}
      <div className="max-h-[400px] overflow-y-auto">
        <pre className="font-mono text-[10px] leading-relaxed">
          {diff.lines.map((line, i) => (
            <div
              key={i}
              className={`flex ${lineColor(line.type)} hover:bg-white/[0.02] transition-colors`}
            >
              <span className="w-10 text-right pr-2 text-gray-600 select-none border-r border-glass-border shrink-0">
                {line.lineNumber}
              </span>
              <span className="w-4 text-center select-none shrink-0 opacity-60">
                {linePrefix(line.type)}
              </span>
              <span className="pl-1 whitespace-pre-wrap break-all">
                {line.content}
              </span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
