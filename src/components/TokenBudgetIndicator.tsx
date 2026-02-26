import React, { useMemo } from 'react';

const MODEL_LIMITS: Record<string, number> = {
    auto: 8192, groq: 8192, gemini: 32768, openai: 128000,
    claude: 200000, deepseek: 65536, openrouter: 32768,
    huggingface: 8192, ollama: 8192,
};

function estimateTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.35);
}

interface TokenBudgetIndicatorProps {
    text: string;
    provider: string;
}

export default function TokenBudgetIndicator({ text, provider }: TokenBudgetIndicatorProps) {
    const limit = MODEL_LIMITS[provider] ?? 8192;
    const tokens = useMemo(() => estimateTokens(text), [text]);
    const pct = Math.min(100, (tokens / limit) * 100);

    const color = pct < 50 ? 'bg-cyber-success' : pct < 80 ? 'bg-yellow-400' : 'bg-red-400';
    const textColor = pct < 50 ? 'text-cyber-success' : pct < 80 ? 'text-yellow-400' : 'text-red-400';

    if (!text) return null;

    return (
        <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1 bg-cyber-border/30 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`font-mono text-[9px] flex-shrink-0 ${textColor}`}>
                ~{tokens.toLocaleString()} / {limit.toLocaleString()} token
            </span>
            {pct > 80 && (
                <span className="font-mono text-[8px] text-red-400 flex-shrink-0">⚠ Limit yakın!</span>
            )}
        </div>
    );
}
