import React from 'react';

interface EmptyStateProps {
    language?: string;
    onQuickStart?: (intent: string) => void;
}

const QUICK_STARTS = [
    { tr: 'React hook yaz', en: 'Write React hook', icon: '⚛️' },
    { tr: 'REST API tasarla', en: 'Design REST API', icon: '🔌' },
    { tr: 'SQL sorgusu optimize et', en: 'Optimize SQL query', icon: '🗄️' },
    { tr: 'CI/CD pipeline kur', en: 'Setup CI/CD pipeline', icon: '🚀' },
];

export default function EmptyState({ language = 'tr', onQuickStart }: EmptyStateProps) {
    const isTr = language === 'tr';
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-8">
            {/* Animated icon */}
            <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyber-primary/20 to-purple-500/10 border border-cyber-primary/20 flex items-center justify-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" strokeWidth="1.2" strokeLinecap="round">
                        <defs>
                            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#06e8f9" />
                                <stop offset="100%" stopColor="#9d00ff" />
                            </linearGradient>
                        </defs>
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                </div>
                {/* Orbit dots */}
                {[0, 1, 2].map(i => (
                    <div key={i} className="absolute w-2 h-2 rounded-full bg-cyber-primary/40"
                        style={{
                            top: `${50 + 45 * Math.sin((i * 120 * Math.PI) / 180)}%`,
                            left: `${50 + 45 * Math.cos((i * 120 * Math.PI) / 180)}%`,
                            transform: 'translate(-50%, -50%)',
                            animation: `pulse ${1.5 + i * 0.3}s ease-in-out infinite`,
                            animationDelay: `${i * 0.4}s`,
                        }} />
                ))}
            </div>

            {/* Text */}
            <div className="space-y-2">
                <h2 className="font-mono text-sm font-bold text-white">
                    {isTr ? 'İlk promptunu oluştur' : 'Create your first prompt'}
                </h2>
                <p className="font-mono text-[11px] text-gray-600 max-w-xs leading-relaxed">
                    {isTr
                        ? 'Ne geliştirmek istediğini yaz, AI en güçlü prompt çerçevesini seçsin.'
                        : 'Describe what you want to build. AI will pick the best prompt framework.'}
                </p>
            </div>

            {/* Quick starts */}
            {onQuickStart && (
                <div className="w-full max-w-sm">
                    <p className="font-mono text-[9px] text-gray-700 uppercase tracking-wider mb-3">
                        {isTr ? '⚡ Hızlı Başlangıç' : '⚡ Quick Start'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {QUICK_STARTS.map((qs, i) => (
                            <button key={i} type="button"
                                onClick={() => onQuickStart(isTr ? qs.tr : qs.en)}
                                className="flex items-center gap-2 p-2.5 rounded-lg border border-cyber-border/30 bg-cyber-dark/30 hover:border-cyber-primary/40 hover:bg-cyber-primary/5 transition-all text-left group">
                                <span className="text-sm">{qs.icon}</span>
                                <span className="font-mono text-[9px] text-gray-500 group-hover:text-gray-300 transition-colors">
                                    {isTr ? qs.tr : qs.en}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <p className="font-mono text-[9px] text-gray-700">
                {isTr ? 'Ctrl+Enter ile hızlı generate • ? ile kısayollar' : 'Ctrl+Enter to generate • ? for shortcuts'}
            </p>
        </div>
    );
}
