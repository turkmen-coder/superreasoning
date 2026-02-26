import React, { useState } from 'react';

interface ExportButtonProps {
    masterPrompt: string;
    reasoning?: string;
    framework?: string;
    domainId?: string;
}

type ExportFormat = 'md' | 'txt' | 'json';

export default function ExportButton({ masterPrompt, reasoning, framework, domainId }: ExportButtonProps) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const doExport = (format: ExportFormat) => {
        let content = '';
        let filename = `prompt-${Date.now()}`;
        let mimeType = 'text/plain';

        if (format === 'md') {
            content = `# Generated Prompt\n\n**Framework:** ${framework || 'Universal'}  \n**Domain:** ${domainId || 'General'}  \n**Date:** ${new Date().toLocaleString('tr-TR')}\n\n---\n\n${masterPrompt}${reasoning ? `\n\n## Reasoning\n\n${reasoning}` : ''}`;
            filename += '.md';
            mimeType = 'text/markdown';
        } else if (format === 'txt') {
            content = masterPrompt + (reasoning ? '\n\n---REASONING---\n\n' + reasoning : '');
            filename += '.txt';
        } else if (format === 'json') {
            content = JSON.stringify({ masterPrompt, reasoning, framework, domainId, exportedAt: new Date().toISOString() }, null, 2);
            filename += '.json';
            mimeType = 'application/json';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        setOpen(false);
    };

    const doCopy = async () => {
        await navigator.clipboard.writeText(masterPrompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative flex items-center gap-2">
            {/* Copy button */}
            <button
                type="button"
                onClick={doCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-[10px] uppercase tracking-wider transition-all duration-200 ${copied
                        ? 'border-cyber-success/60 bg-cyber-success/10 text-cyber-success'
                        : 'border-cyber-border/50 text-gray-400 hover:border-cyber-primary/50 hover:text-cyber-primary'
                    }`}
            >
                {copied ? (
                    <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg> Kopyalandı!</>
                ) : (
                    <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg> Kopyala</>
                )}
            </button>

            {/* Export dropdown */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyber-border/50 text-gray-400 hover:border-cyber-primary/50 hover:text-cyber-primary font-mono text-[10px] uppercase tracking-wider transition-all duration-200"
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    İndir
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </button>

                {open && (
                    <div className="absolute right-0 top-full mt-1 w-36 glass-card py-1 z-50 border border-cyber-border/40 rounded-lg overflow-hidden">
                        {(['md', 'txt', 'json'] as ExportFormat[]).map((fmt) => (
                            <button
                                key={fmt}
                                type="button"
                                onClick={() => doExport(fmt)}
                                className="w-full text-left px-3 py-2 font-mono text-[10px] text-gray-400 hover:text-cyber-primary hover:bg-cyber-primary/5 transition-colors flex items-center gap-2"
                            >
                                <span className="text-cyber-primary/60">.{fmt}</span>
                                {fmt === 'md' ? 'Markdown' : fmt === 'txt' ? 'Düz metin' : 'JSON'}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
