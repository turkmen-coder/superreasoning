import React from 'react';
import { Icon } from './ui';

interface StatusFooterProps {
  latencyMs: number;
  tokensPerSec: number;
  model: string;
}

const StatusFooter: React.FC<StatusFooterProps> = ({ latencyMs, tokensPerSec, model }) => {
  return (
    <footer className="flex items-center justify-between h-9 px-6 border-t border-glass-border bg-glass-bg/80 backdrop-blur-xl font-mono text-[10px] text-gray-600 uppercase tracking-wider">
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-1.5">
          <Icon name="speed" size={12} className="text-gray-600" />
          Latency: <span className="text-gray-400">{latencyMs}ms</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="token" size={12} className="text-gray-600" />
          Token/Sec: <span className="text-gray-400">{tokensPerSec}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="model_training" size={12} className="text-gray-600" />
          Model: <span className="text-gray-400">{model}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400/60">System Active</span>
        </span>
      </div>
      <span>&copy; 2026 Super Reasoning Systems</span>
    </footer>
  );
};

export default StatusFooter;
