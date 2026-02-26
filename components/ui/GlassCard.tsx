import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  purple?: boolean;
  onClick?: () => void;
}

const PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
} as const;

export function GlassCard({
  children,
  className = '',
  padding = 'md',
  hover = true,
  purple = false,
  onClick,
}: GlassCardProps) {
  const base = 'glass-card';
  const hoverClass = purple ? 'glass-card-purple' : '';
  const pad = PADDING[padding];
  const clickable = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`${base} ${hover ? hoverClass : ''} ${pad} ${clickable} ${className}`.trim()}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      {children}
    </div>
  );
}
