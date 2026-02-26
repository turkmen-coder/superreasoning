import { Icon } from '../ui';

export type NodeType = 'input' | 'thought' | 'evaluation' | 'action';

interface CoTNodeProps {
  id: string;
  type: NodeType;
  label: string;
  content: string;
  fullContent?: string;
  showFull?: boolean;
  onToggleFull?: () => void;
  x: number;
  y: number;
  isActive?: boolean;
  confidence?: number;
  onClick?: () => void;
}

const NODE_CONFIG: Record<NodeType, { icon: string; color: string; border: string; bg: string; glow: string }> = {
  input: {
    icon: 'input',
    color: 'text-cyber-primary',
    border: 'border-cyber-primary/40',
    bg: 'bg-cyber-primary/10',
    glow: 'shadow-[0_0_12px_rgba(6,232,249,0.3)]',
  },
  thought: {
    icon: 'psychology',
    color: 'text-violet-400',
    border: 'border-violet-500/40',
    bg: 'bg-violet-500/10',
    glow: 'shadow-[0_0_12px_rgba(139,92,246,0.3)]',
  },
  evaluation: {
    icon: 'analytics',
    color: 'text-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
  },
  action: {
    icon: 'bolt',
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    glow: 'shadow-[0_0_12px_rgba(52,211,153,0.3)]',
  },
};

export function CoTNode({ type, label, content, fullContent, showFull, onToggleFull, isActive, confidence, onClick }: CoTNodeProps) {
  const config = NODE_CONFIG[type];
  const hasFullContent = fullContent && fullContent !== content;

  return (
    <div
      className={`
        glass-card p-3 w-[200px] cursor-pointer transition-all duration-200
        ${config.border} ${isActive ? config.glow : ''}
        hover:scale-[1.02]
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onClick) onClick(); }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${config.bg} ${config.border} border flex items-center justify-center`}>
          <Icon name={config.icon} size={16} className={config.color} />
        </div>
        <span className={`font-display text-xs font-semibold ${config.color}`}>{label}</span>
      </div>
      <div className="relative">
        <p className={`text-[11px] text-gray-400 leading-relaxed ${showFull ? '' : 'line-clamp-2'}`}>
          {showFull && fullContent ? fullContent : content}
        </p>
        {hasFullContent && (
          <button
            className={`absolute bottom-0 right-0 text-[9px] ${config.color} hover:underline`}
            onClick={(e) => { e.stopPropagation(); onToggleFull?.(); }}
            aria-label={showFull ? 'Show less' : 'Show more'}
          >
            {showFull ? '▲' : '▼'}
          </button>
        )}
      </div>
      {confidence !== undefined && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full ${config.bg.replace('/10', '/60')}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="text-[9px] text-gray-500 font-mono">{confidence}%</span>
        </div>
      )}
    </div>
  );
}
