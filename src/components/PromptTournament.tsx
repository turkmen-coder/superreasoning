import React, { useState } from 'react';
import { generateMasterPromptUnified, type ClientProvider } from '../../services/unifiedProviderService';
import { Framework } from '../../types';
import { judgePrompt } from '../../services/judgeEnsemble';
import ScoreBadge from './ScoreBadge';

const TOURNAMENT_FRAMEWORKS: Framework[] = [Framework.CHAIN, Framework.REACT, Framework.RISEN];

interface TournamentResult {
    framework: Framework;
    masterPrompt: string;
    score: number;
    latencyMs: number;
}

interface PromptTournamentProps {
    intent: string;
    domainId: string;
    provider: ClientProvider;
    language: string;
}

export default function PromptTournament({ intent, domainId, provider, language }: PromptTournamentProps) {
    const [results, setResults] = useState<TournamentResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [open, setOpen] = useState(false);

    const run = async () => {
        if (!intent.trim()) return;
        setLoading(true); setResults([]); setProgress(0); setOpen(true);

        const out: TournamentResult[] = [];
        for (let i = 0; i < TOURNAMENT_FRAMEWORKS.length; i++) {
            const fw = TOURNAMENT_FRAMEWORKS[i];
            const t0 = Date.now();
            try {
                const { response } = await generateMasterPromptUnified(provider, {
                    intent, framework: fw, domainId, useSearch: false, thinkingMode: false,
                    language: language as any, localizedRules: '',
                });
                const judged = judgePrompt(response.masterPrompt, { domainId, framework: fw, reasoning: response.reasoning });
                out.push({ framework: fw, masterPrompt: response.masterPrompt, score: judged.totalScore, latencyMs: Date.now() - t0 });
            } catch {
                out.push({ framework: fw, masterPrompt: '— Hata oluştu —', score: 0, latencyMs: Date.now() - t0 });
            }
            setProgress(i + 1);
        }

        out.sort((a, b) => b.score - a.score);
        setResults(out);
        setLoading(false);
    };

    const winner = results[0];

    return (
        <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-base">🏆</span>
                    <h3 className="font-mono text-[10px] font-bold text-gray-300 uppercase tracking-wider">Prompt Turnuvası</h3>
                    <span className="font-mono text-[8px] text-gray-600">COT vs REACT vs APE</span>
                </div>
                <button type="button" onClick={run} disabled={loading || !intent.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 font-mono text-[9px] uppercase tracking-wider hover:bg-yellow-500/20 transition-all disabled:opacity-50">
                    {loading
                        ? <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{progress}/{TOURNAMENT_FRAMEWORKS.length}</>
                        : '⚡ Turnuvayı Başlat'
                    }
                </button>
            </div>

            {loading && (
                <div className="space-y-1.5">
                    <div className="h-1.5 bg-cyber-border/30 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400/60 rounded-full transition-all duration-500" style={{ width: `${(progress / TOURNAMENT_FRAMEWORKS.length) * 100}%` }} />
                    </div>
                    <p className="font-mono text-[9px] text-gray-600">
                        {TOURNAMENT_FRAMEWORKS[progress - 1] ?? '...'} test ediliyor...
                    </p>
                </div>
            )}

            {open && results.length > 0 && (
                <div className="space-y-2 animate-in fade-in duration-200">
                    {winner && (
                        <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <span>🥇</span>
                                <span className="font-mono text-[10px] font-bold text-yellow-400">Kazanan: {winner.framework}</span>
                                <ScoreBadge score={winner.score} size="sm" showLabel={false} />
                            </div>
                            <p className="font-mono text-[9px] text-gray-400 line-clamp-3">{winner.masterPrompt}</p>
                        </div>
                    )}
                    <div className="space-y-1.5">
                        {results.map((r, i) => (
                            <div key={r.framework} className={`flex items-center gap-3 p-2.5 rounded-lg border ${i === 0 ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-cyber-border/20'}`}>
                                <span className="font-mono text-[10px] text-gray-500 w-4">{i + 1}.</span>
                                <span className="font-mono text-[10px] font-bold text-gray-300 w-16">{r.framework}</span>
                                <ScoreBadge score={r.score} size="sm" showLabel={false} />
                                <span className="font-mono text-[9px] text-gray-600 ml-auto">{r.latencyMs}ms</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
