import React from 'react';

interface ScoreBadgeProps {
    score: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export function getScoreTier(score: number): { label: string; emoji: string; color: string; glow: string } {
    if (score >= 90) return { label: 'Elite', emoji: '🏆', color: 'text-yellow-400', glow: 'shadow-[0_0_12px_rgba(250,204,21,0.4)]' };
    if (score >= 75) return { label: 'Pro', emoji: '⭐', color: 'text-cyber-primary', glow: 'shadow-[0_0_12px_rgba(6,232,249,0.3)]' };
    if (score >= 55) return { label: 'Good', emoji: '✅', color: 'text-green-400', glow: 'shadow-[0_0_8px_rgba(74,222,128,0.2)]' };
    if (score >= 35) return { label: 'Basic', emoji: '📝', color: 'text-orange-400', glow: '' };
    return { label: 'Beginner', emoji: '🔰', color: 'text-red-400', glow: '' };
}

export default function ScoreBadge({ score, size = 'md', showLabel = true }: ScoreBadgeProps) {
    const tier = getScoreTier(score);
    const pct = Math.min(100, Math.max(0, score));
    const radius = 18;
    const circ = 2 * Math.PI * radius;
    const dash = (pct / 100) * circ;

    const sizeMap = {
        sm: { w: 48, font: 'text-[9px]', badge: 'text-[8px]' },
        md: { w: 64, font: 'text-[11px]', badge: 'text-[9px]' },
        lg: { w: 80, font: 'text-[13px]', badge: 'text-[10px]' },
    };
    const s = sizeMap[size];
    const svgSize = s.w;
    const cx = svgSize / 2;
    const r = svgSize * 0.35;
    const c = 2 * Math.PI * r;
    const d = (pct / 100) * c;

    return (
        <div className={`flex items-center gap-2 ${tier.glow} rounded-lg`}>
            {/* Arc gauge */}
            <div className="relative flex-shrink-0" style={{ width: svgSize, height: svgSize }}>
                <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
                    <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                    <circle cx={cx} cy={cx} r={r} fill="none"
                        stroke={pct >= 90 ? '#facc15' : pct >= 75 ? '#06e8f9' : pct >= 55 ? '#4ade80' : pct >= 35 ? '#fb923c' : '#f87171'}
                        strokeWidth="3" strokeDasharray={`${d} ${c - d}`} strokeLinecap="round"
                        strokeDashoffset={c * 0.25} transform={`rotate(-90 ${cx} ${cx})`}
                    />
                </svg>
                <div className={`absolute inset-0 flex items-center justify-center font-mono font-bold ${s.font} ${tier.color}`}>
                    {score}
                </div>
            </div>

            {/* Label */}
            {showLabel && (
                <div>
                    <div className={`font-mono font-bold ${s.badge} ${tier.color} uppercase tracking-wider`}>
                        {tier.emoji} {tier.label}
                    </div>
                    <div className="font-mono text-[8px] text-gray-600">/100</div>
                </div>
            )}
        </div>
    );
}
