import React, { useState, useRef } from 'react';
import { generateMasterPromptUnified, type ClientProvider } from '../../services/unifiedProviderService';
import { Framework } from '../types';

interface BatchResult { intent: string; masterPrompt: string; status: 'pending' | 'ok' | 'error'; error?: string }

interface BatchProcessorProps {
    framework: Framework;
    domainId: string;
    provider: ClientProvider;
    language: string;
}

export default function BatchProcessor({ framework, domainId, provider, language }: BatchProcessorProps) {
    const [open, setOpen] = useState(false);
    const [rawInput, setRawInput] = useState('');
    const [results, setResults] = useState<BatchResult[]>([]);
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const stopRef = useRef(false);

    const intents = rawInput.split('\n').map(s => s.trim()).filter(Boolean);

    const run = async () => {
        if (!intents.length) return;
        stopRef.current = false;
        setRunning(true);
        setProgress(0);
        const out: BatchResult[] = intents.map(i => ({ intent: i, masterPrompt: '', status: 'pending' }));
        setResults([...out]);

        for (let i = 0; i < intents.length; i++) {
            if (stopRef.current) break;
            try {
                const { response } = await generateMasterPromptUnified(provider, {
                    intent: intents[i], framework, domainId, useSearch: false,
                    thinkingMode: false, language: language as any, localizedRules: '',
                });
                out[i] = { ...out[i], masterPrompt: response.masterPrompt, status: 'ok' };
            } catch (e: any) {
                out[i] = { ...out[i], status: 'error', error: e.message };
            }
            setResults([...out]);
            setProgress(i + 1);
        }
        setRunning(false);
    };

    const exportJSON = () => {
        const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `batch-${Date.now()}.json`; a.click();
        URL.revokeObjectURL(url);
    };

    const exportCSV = () => {
        const rows = [['intent', 'masterPrompt', 'status'].join(','),
        ...results.map(r => [JSON.stringify(r.intent), JSON.stringify(r.masterPrompt), r.status].join(','))];
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `batch-${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="glass-card p-4 space-y-3">
            <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-base">📦</span>
                    <h3 className="font-mono text-[10px] font-bold text-gray-300 uppercase tracking-wider">Toplu İşlem (Batch)</h3>
                </div>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="space-y-3 animate-in fade-in duration-200">
                    <div>
                        <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">
                            Her satıra bir intent yazın ({intents.length} adet)
                        </label>
                        <textarea value={rawInput} onChange={e => setRawInput(e.target.value)} rows={5}
                            placeholder={"Bir React hook yaz\nSQL sorgu optimize et\nPython decorator açıkla"}
                            className="w-full mt-1 bg-cyber-dark/60 border border-cyber-border/40 rounded-lg p-3 font-mono text-[10px] text-gray-300 placeholder-gray-700 focus:outline-none focus:border-cyber-primary/40 resize-none" />
                    </div>

                    <div className="flex items-center gap-2">
                        <button type="button" onClick={run} disabled={running || !intents.length}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyber-primary/30 bg-cyber-primary/10 text-cyber-primary font-mono text-[9px] uppercase tracking-wider hover:bg-cyber-primary/20 transition-all disabled:opacity-50">
                            {running ? `${progress}/${intents.length} işleniyor...` : `⚡ ${intents.length} Prompt Üret`}
                        </button>
                        {running && (
                            <button type="button" onClick={() => { stopRef.current = true; setRunning(false); }}
                                className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 font-mono text-[9px] uppercase">
                                ■ Durdur
                            </button>
                        )}
                        {results.filter(r => r.status === 'ok').length > 0 && !running && (
                            <>
                                <button type="button" onClick={exportJSON} className="px-2.5 py-1.5 rounded-lg border border-cyber-border/40 text-gray-500 hover:text-gray-300 font-mono text-[9px] uppercase">JSON</button>
                                <button type="button" onClick={exportCSV} className="px-2.5 py-1.5 rounded-lg border border-cyber-border/40 text-gray-500 hover:text-gray-300 font-mono text-[9px] uppercase">CSV</button>
                            </>
                        )}
                    </div>

                    {running && (
                        <div className="h-1 bg-cyber-border/30 rounded-full overflow-hidden">
                            <div className="h-full bg-cyber-primary/60 rounded-full transition-all duration-300"
                                style={{ width: `${(progress / intents.length) * 100}%` }} />
                        </div>
                    )}

                    {results.length > 0 && (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {results.map((r, i) => (
                                <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border text-[9px] font-mono ${r.status === 'ok' ? 'border-cyber-success/20 bg-cyber-success/5' :
                                        r.status === 'error' ? 'border-red-500/20 bg-red-500/5' : 'border-cyber-border/20'
                                    }`}>
                                    <span className={r.status === 'ok' ? 'text-cyber-success' : r.status === 'error' ? 'text-red-400' : 'text-gray-600'}>
                                        {r.status === 'ok' ? '✓' : r.status === 'error' ? '✗' : '○'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-gray-400 truncate">{r.intent}</div>
                                        {r.status === 'ok' && <div className="text-gray-600 truncate mt-0.5">{r.masterPrompt.slice(0, 80)}…</div>}
                                        {r.status === 'error' && <div className="text-red-400/70">{r.error}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
