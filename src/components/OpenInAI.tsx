import React, { useState } from 'react';

interface AITarget {
    id: string;
    name: string;
    icon: string;
    url: (prompt: string) => string | null; // null = clipboard only
    color: string;
}

const AI_TARGETS: AITarget[] = [
    {
        id: 'chatgpt',
        name: 'ChatGPT',
        icon: '🤖',
        url: () => 'https://chat.openai.com/',
        color: 'hover:border-emerald-500/60 hover:text-emerald-400',
    },
    {
        id: 'claude',
        name: 'Claude',
        icon: '🟠',
        url: () => 'https://claude.ai/new',
        color: 'hover:border-orange-500/60 hover:text-orange-400',
    },
    {
        id: 'gemini',
        name: 'Gemini',
        icon: '✨',
        url: () => 'https://gemini.google.com/',
        color: 'hover:border-blue-500/60 hover:text-blue-400',
    },
    {
        id: 'perplexity',
        name: 'Perplexity',
        icon: '🔍',
        url: (prompt) => `https://www.perplexity.ai/?q=${encodeURIComponent(prompt.slice(0, 500))}`,
        color: 'hover:border-purple-500/60 hover:text-purple-400',
    },
    {
        id: 'phind',
        name: 'Phind',
        icon: '🧠',
        url: (prompt) => `https://www.phind.com/search?q=${encodeURIComponent(prompt.slice(0, 400))}`,
        color: 'hover:border-cyan-500/60 hover:text-cyan-400',
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        icon: '🌊',
        url: () => 'https://chat.deepseek.com/',
        color: 'hover:border-sky-500/60 hover:text-sky-400',
    },
    {
        id: 'mistral',
        name: 'Le Chat',
        icon: '🐱',
        url: () => 'https://chat.mistral.ai/',
        color: 'hover:border-yellow-500/60 hover:text-yellow-400',
    },
    {
        id: 'grok',
        name: 'Grok',
        icon: '⚡',
        url: () => 'https://grok.com/',
        color: 'hover:border-gray-400/60 hover:text-gray-300',
    },
];

interface OpenInAIProps {
    prompt: string;
}

export default function OpenInAI({ prompt }: OpenInAIProps) {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    const openInAI = async (target: AITarget) => {
        // 1. Copy prompt to clipboard
        try {
            await navigator.clipboard.writeText(prompt);
            setCopiedId(target.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch { /* ignore clipboard error */ }

        // 2. Navigate to AI URL
        const url = target.url(prompt);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="glass-card p-4 space-y-3">
            {/* Header */}
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between text-left"
            >
                <div className="flex items-center gap-2">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#06e8f9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    <span className="font-mono text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                        AI Platformlarında Aç
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-gray-600">Prompt kopyalanır + platform açılır</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>
            </button>

            {expanded && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in duration-200">
                    {AI_TARGETS.map((target) => (
                        <button
                            key={target.id}
                            type="button"
                            onClick={() => openInAI(target)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-cyber-border/30 bg-cyber-dark/40 font-mono text-[10px] text-gray-500 transition-all duration-150 ${target.color} hover:bg-white/5 active:scale-95`}
                        >
                            <span className="text-sm flex-shrink-0">{target.icon}</span>
                            <span className="font-bold uppercase tracking-wider truncate">{target.name}</span>
                            {copiedId === target.id && (
                                <span className="ml-auto text-[8px] text-cyber-success flex-shrink-0">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {!expanded && (
                <div className="flex flex-wrap gap-1.5">
                    {AI_TARGETS.slice(0, 4).map((target) => (
                        <button
                            key={target.id}
                            type="button"
                            onClick={() => openInAI(target)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md border border-cyber-border/30 bg-cyber-dark/40 font-mono text-[9px] text-gray-500 transition-all hover:bg-white/5 ${target.color} active:scale-95`}
                            title={`${target.name}'de aç`}
                        >
                            <span>{target.icon}</span>
                            <span className="uppercase tracking-wider">{target.name}</span>
                            {copiedId === target.id && <span className="text-cyber-success">✓</span>}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        className="px-2 py-1 rounded-md border border-cyber-border/20 font-mono text-[9px] text-gray-600 hover:text-gray-400 transition-colors"
                    >
                        +{AI_TARGETS.length - 4} daha...
                    </button>
                </div>
            )}
        </div>
    );
}
