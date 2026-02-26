import React, { useState } from 'react';
import type { PromptHistoryEntry } from '../hooks/usePromptHistory';

interface PromptHistoryPanelProps {
    history: PromptHistoryEntry[];
    onReuse: (entry: PromptHistoryEntry) => void;
    onRemove: (id: string) => void;
    onClear: () => void;
    language: string;
}

export default function PromptHistoryPanel({ history, onReuse, onRemove, onClear, language }: PromptHistoryPanelProps) {
    const [search, setSearch] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const filtered = history.filter(e =>
        e.intent.toLowerCase().includes(search.toLowerCase()) ||
        e.masterPrompt.toLowerCase().includes(search.toLowerCase())
    );

    const copyPrompt = async (entry: PromptHistoryEntry) => {
        await navigator.clipboard.writeText(entry.masterPrompt);
        setCopiedId(entry.id);
        setTimeout(() => setCopiedId(null), 1500);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                    {language === 'tr' ? 'Prompt Geçmişi' : 'Prompt History'}
                </h1>
                {history.length > 0 && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="font-mono text-[9px] text-gray-600 hover:text-red-400 transition-colors uppercase tracking-wider"
                    >
                        {language === 'tr' ? 'Tümünü Sil' : 'Clear All'}
                    </button>
                )}
            </div>

            {/* Search */}
            {history.length > 0 && (
                <input
                    type="search"
                    placeholder={language === 'tr' ? 'Geçmişte ara...' : 'Search history...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-cyber-dark/60 border border-cyber-border/40 rounded-lg px-3 py-2 font-mono text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyber-primary/40 transition-colors"
                />
            )}

            {/* Empty state */}
            {history.length === 0 && (
                <div className="glass-card p-8 flex flex-col items-center gap-3 text-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-700">
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    <p className="font-mono text-xs text-gray-600">
                        {language === 'tr' ? 'Henüz geçmiş yok. Prompt üretince burada görünecek.' : 'No history yet. Generate a prompt to see it here.'}
                    </p>
                </div>
            )}

            {/* History list */}
            <div className="space-y-2">
                {filtered.map((entry) => (
                    <div key={entry.id} className="glass-card p-4 space-y-2 group hover:border-cyber-primary/20 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                            <p className="font-mono text-[10px] text-gray-300 line-clamp-2 flex-1">{entry.intent}</p>
                            <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* Copy */}
                                <button
                                    type="button"
                                    onClick={() => copyPrompt(entry)}
                                    className={`p-1 rounded transition-colors ${copiedId === entry.id ? 'text-cyber-success' : 'text-gray-600 hover:text-cyber-primary'}`}
                                    title="Kopyala"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        {copiedId === entry.id
                                            ? <polyline points="20 6 9 17 4 12" />
                                            : <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>
                                        }
                                    </svg>
                                </button>
                                {/* Reuse */}
                                <button
                                    type="button"
                                    onClick={() => onReuse(entry)}
                                    className="p-1 rounded text-gray-600 hover:text-cyber-primary transition-colors"
                                    title="Yeniden Kullan"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                </button>
                                {/* Delete */}
                                <button
                                    type="button"
                                    onClick={() => onRemove(entry.id)}
                                    className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors"
                                    title="Sil"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-cyber-primary/10 border border-cyber-primary/20 font-mono text-[9px] text-cyber-primary/80">
                                {entry.framework}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-cyber-dark border border-cyber-border/30 font-mono text-[9px] text-gray-500">
                                {entry.domainId}
                            </span>
                            <span className="font-mono text-[9px] text-gray-600 ml-auto">
                                {new Date(entry.createdAt).toLocaleString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && search && (
                    <p className="font-mono text-[10px] text-gray-600 text-center py-4">Sonuç bulunamadı.</p>
                )}
            </div>

            {history.length > 0 && (
                <p className="font-mono text-[9px] text-gray-700 text-center">
                    {history.length} / 50 kayıt
                </p>
            )}
        </div>
    );
}
