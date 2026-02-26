import React, { useState, useEffect, useRef, useMemo } from 'react';

export interface Command {
    id: string;
    label: string;
    icon: string;
    keywords?: string[];
    action: () => void;
    group?: string;
}

interface CommandPaletteProps {
    commands: Command[];
    isOpen: boolean;
    onClose: () => void;
}

export default function CommandPalette({ commands, isOpen, onClose }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const filtered = useMemo(() => {
        if (!query) return commands;
        const q = query.toLowerCase();
        return commands.filter(c =>
            c.label.toLowerCase().includes(q) ||
            c.keywords?.some(k => k.toLowerCase().includes(q)) ||
            c.group?.toLowerCase().includes(q)
        );
    }, [query, commands]);

    // Group filtered commands
    const grouped = useMemo(() => {
        const groups: Record<string, Command[]> = {};
        filtered.forEach(c => {
            const g = c.group || 'Genel';
            (groups[g] = groups[g] || []).push(c);
        });
        return groups;
    }, [filtered]);

    const flatFiltered = filtered;

    useEffect(() => {
        if (isOpen) {
            setQuery(''); setSelected(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => { setSelected(0); }, [query]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { onClose(); return; }
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, flatFiltered.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
            if (e.key === 'Enter' && flatFiltered[selected]) {
                flatFiltered[selected].action();
                onClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, flatFiltered, selected, onClose]);

    if (!isOpen) return null;

    let globalIdx = 0;

    return (
        <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
            onClick={onClose}>
            <div className="w-full max-w-lg mx-4 glass-card border border-cyber-border/50 rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-150"
                onClick={e => e.stopPropagation()}>
                {/* Search */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-cyber-border/30">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 flex-shrink-0">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                        placeholder="Komut ara... (generate, export, settings...)"
                        className="flex-1 bg-transparent font-mono text-sm text-gray-200 placeholder-gray-600 focus:outline-none" />
                    <kbd className="font-mono text-[9px] text-gray-600 border border-cyber-border/40 px-1.5 py-0.5 rounded">ESC</kbd>
                </div>

                {/* Results */}
                <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
                    {flatFiltered.length === 0 ? (
                        <div className="py-8 text-center font-mono text-[10px] text-gray-600">Komut bulunamadı</div>
                    ) : (
                        Object.entries(grouped).map(([group, cmds]) => (
                            <div key={group}>
                                <div className="px-4 py-1.5 font-mono text-[8px] text-gray-600 uppercase tracking-widest">{group}</div>
                                {cmds.map(cmd => {
                                    const idx = globalIdx++;
                                    return (
                                        <button key={cmd.id} type="button"
                                            onMouseEnter={() => setSelected(idx)}
                                            onClick={() => { cmd.action(); onClose(); }}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${selected === idx ? 'bg-cyber-primary/15 text-white' : 'text-gray-400 hover:bg-white/5'
                                                }`}>
                                            <span className="text-base flex-shrink-0">{cmd.icon}</span>
                                            <span className="font-mono text-[11px] flex-1">{cmd.label}</span>
                                            {selected === idx && <kbd className="font-mono text-[9px] text-gray-600 border border-cyber-border/40 px-1.5 py-0.5 rounded">↵</kbd>}
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-cyber-border/20">
                    {[['↑↓', 'Gezin'], ['↵', 'Seç'], ['ESC', 'Kapat']].map(([key, label]) => (
                        <div key={key} className="flex items-center gap-1">
                            <kbd className="font-mono text-[8px] text-gray-600 border border-cyber-border/30 px-1 py-0.5 rounded">{key}</kbd>
                            <span className="font-mono text-[8px] text-gray-700">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
