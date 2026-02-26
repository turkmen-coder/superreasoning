import React from 'react';

interface SkeletonLoaderProps {
    lines?: number;
    showHeader?: boolean;
}

export default function SkeletonLoader({ lines = 8, showHeader = true }: SkeletonLoaderProps) {
    return (
        <div className="glass-card p-5 space-y-4 animate-pulse">
            {showHeader && (
                <div className="flex items-center justify-between">
                    <div className="h-3 w-32 bg-cyber-border/40 rounded" />
                    <div className="h-5 w-16 bg-cyber-primary/20 rounded-full" />
                </div>
            )}
            <div className="space-y-2.5">
                {Array.from({ length: lines }).map((_, i) => (
                    <div key={i} className="h-2.5 bg-cyber-border/30 rounded"
                        style={{ width: `${65 + Math.sin(i * 2.3) * 30}%`, animationDelay: `${i * 80}ms` }} />
                ))}
            </div>
            <div className="space-y-2">
                <div className="h-2.5 w-3/4 bg-cyber-border/25 rounded" />
                <div className="h-2.5 w-1/2 bg-cyber-border/20 rounded" />
            </div>
            <div className="flex items-center gap-2 pt-1">
                <div className="h-6 w-20 bg-cyber-primary/10 rounded-lg border border-cyber-primary/20" />
                <div className="h-6 w-24 bg-cyber-border/20 rounded-lg" />
            </div>
        </div>
    );
}

/* Inline skeleton for smaller areas */
export function InlineSkeleton({ width = '60%' }: { width?: string }) {
    return <div className="h-2.5 bg-cyber-border/30 rounded animate-pulse inline-block" style={{ width }} />;
}
