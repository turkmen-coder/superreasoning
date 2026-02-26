import React, { useState } from 'react';
import { generateMasterPromptUnified, type ClientProvider } from '../../services/unifiedProviderService';
import { Framework } from '../types';

interface FewShotGeneratorProps {
    masterPrompt: string;
    domainId: string;
    framework: Framework;
    language: string;
    provider: ClientProvider;
}

interface Example { input: string; output: string }

export default function FewShotGenerator({ masterPrompt, domainId, framework, language, provider }: FewShotGeneratorProps) {
    const [examples, setExamples] = useState<Example[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const generate = async () => {
        setLoading(true); setError(null);
        try {
            const intent = language === 'tr'
                ? `Aşağıdaki prompt için 3 adet few-shot örnek oluştur. Her örnek "INPUT:" ve "OUTPUT:" ile başlamalı. Sadece örnekleri ver, başka açıklama yapma.\n\nPrompt:\n${masterPrompt.slice(0, 1000)}`
                : `Generate 3 few-shot examples for the following prompt. Each example must start with "INPUT:" and "OUTPUT:". Only output the examples, no extra commentary.\n\nPrompt:\n${masterPrompt.slice(0, 1000)}`;

            const { response } = await generateMasterPromptUnified(provider, {
                intent, framework, domainId, useSearch: false, thinkingMode: false,
                language: language as any, localizedRules: '',
            });

            const raw = response.masterPrompt || '';
            const parsed: Example[] = [];
            const blocks = raw.split(/(?=INPUT:)/i);
            for (const block of blocks) {
                const inputMatch = block.match(/INPUT:\s*([\s\S]*?)(?=OUTPUT:|$)/i);
                const outputMatch = block.match(/OUTPUT:\s*([\s\S]*?)$/i);
                if (inputMatch && outputMatch) {
                    parsed.push({ input: inputMatch[1].trim(), output: outputMatch[1].trim() });
                }
            }
            setExamples(parsed.length > 0 ? parsed : [{ input: 'Örnek oluşturulamadı', output: raw.slice(0, 500) }]);
            setOpen(true);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const asText = examples.map((ex, i) => `Example ${i + 1}:\nINPUT: ${ex.input}\nOUTPUT: ${ex.output}`).join('\n\n---\n\n');

    const copyAll = async () => {
        await navigator.clipboard.writeText(asText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-base">🎯</span>
                    <h3 className="font-mono text-[10px] font-bold text-gray-300 uppercase tracking-wider">Few-Shot Örnek Üreteci</h3>
                </div>
                <div className="flex items-center gap-2">
                    {examples.length > 0 && (
                        <button type="button" onClick={copyAll}
                            className={`font-mono text-[9px] uppercase tracking-wider transition-colors ${copied ? 'text-cyber-success' : 'text-gray-600 hover:text-cyber-primary'}`}>
                            {copied ? '✓ Kopyalandı' : 'Tümünü Kopyala'}
                        </button>
                    )}
                    <button type="button" onClick={generate} disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyber-primary/30 bg-cyber-primary/10 text-cyber-primary font-mono text-[9px] uppercase tracking-wider hover:bg-cyber-primary/20 transition-all disabled:opacity-50">
                        {loading ? (
                            <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Üretiyor...</>
                        ) : '⚡ 3 Örnek Üret'}
                    </button>
                </div>
            </div>

            {error && <p className="font-mono text-[9px] text-red-400">{error}</p>}

            {open && examples.length > 0 && (
                <div className="space-y-3 animate-in fade-in duration-200">
                    {examples.map((ex, i) => (
                        <div key={i} className="space-y-1.5 p-3 rounded-lg bg-cyber-dark/60 border border-cyber-border/30">
                            <div className="font-mono text-[8px] text-cyber-primary/70 uppercase font-bold">Örnek {i + 1}</div>
                            <div>
                                <span className="font-mono text-[8px] text-gray-500 uppercase">INPUT</span>
                                <p className="font-mono text-[9px] text-gray-300 mt-0.5 whitespace-pre-wrap">{ex.input}</p>
                            </div>
                            <div className="border-t border-cyber-border/20 pt-1.5">
                                <span className="font-mono text-[8px] text-gray-500 uppercase">OUTPUT</span>
                                <p className="font-mono text-[9px] text-gray-400 mt-0.5 whitespace-pre-wrap line-clamp-4">{ex.output}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
