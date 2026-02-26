

interface GlowProgressProps {
  value: number; // 0-100
  variant?: 'gradient' | 'cyan' | 'purple';
  className?: string;
  height?: number;
  showLabel?: boolean;
}

export function GlowProgress({
  value,
  variant = 'gradient',
  className = '',
  height = 6,
  showLabel = false,
}: GlowProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const variantClass = variant === 'gradient' ? '' : variant;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="neon-progress flex-1" style={{ height }}>
        <div
          className={`neon-progress-bar ${variantClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-cyber-primary font-mono tabular-nums">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
