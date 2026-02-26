import React, { useMemo } from 'react';

interface PromptDiffViewerProps {
    left: string;
    right: string;
    leftLabel?: string;
    rightLabel?: string;
    onClose: () => void;
}

type DiffLine = { type: 'same' | 'add' | 'remove'; text: string };

function computeDiff(a: string, b: string): { left: DiffLine[]; right: DiffLine[] } {
    const aLines = a.split('\n');
    const bLines = b.split('\n');
    const left: DiffLine[] = [];
    const right: DiffLine[] = [];

    const maxLen = Math.max(aLines.length, bLines.length);
    for (let i = 0; i < maxLen; i++) {
        const al = aLines[i];
        const bl = bLines[i];
        if (al === bl) {
            left.push({ type: 'same', text: al ?? '' });
            right.push({ type: 'same', text: bl ?? '' });
        } else {
            left.push({ type: al !== undefined ? 'remove' : 'same', text: al ?? '' });
            right.push({ type: bl !== undefined ? 'add' : 'same', text: bl ?? '' });
        }
    }
    return { left, right };
}

const LINE_COLORS = {
    same: 'text-gray-400',
    add: 'bg-green-500/10 text-green-300 border-l-2 border-green-500/50',
    remove: 'bg-red-500/10 text-red-300 border-l-2 border-red-500/50',
};

export default function PromptDiffViewer({ left, right, leftLabel = 'Önceki', rightLabel = 'Sonraki', onClose }: PromptDiffViewerProps) {
    const diff = useMemo(() => computeDiff(left, right), [left, right]);

    const addCount = diff.right.filter(l => l.type === 'add').length;
    const removeCount = diff.left.filter(l => l.type === 'remove').length;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col glass-card overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-cyber-border/30 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Prompt Karşılaştırma</h2>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/30 font-mono text-[9px] text-green-400">+{addCount} eklendi</span>
                            <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 font-mono text-[9px] text-red-400">-{removeCount} silindi</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-200 transition-colors text-lg">✕</button>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-2 border-b border-cyber-border/30 flex-shrink-0">
                    <div className="px-4 py-2 font-mono text-[10px] text-gray-500 uppercase tracking-wider border-r border-cyber-border/30">{leftLabel}</div>
                    <div className="px-4 py-2 font-mono text-[10px] text-gray-500 uppercase tracking-wider">{rightLabel}</div>
                </div>

                {/* Diff body */}
                <div className="flex-1 overflow-y-auto grid grid-cols-2 divide-x divide-cyber-border/30">
                    {/* Left */}
                    <div className="font-mono text-[10px] leading-relaxed">
                        {diff.left.map((line, i) => (
                            <div key={i} className={`px-4 py-0.5 whitespace-pre-wrap ${LINE_COLORS[line.type]}`}>
                                {line.text || '\u00A0'}
                            </div>
                        ))}
                    </div>
                    {/* Right */}
                    <div className="font-mono text-[10px] leading-relaxed">
                        {diff.right.map((line, i) => (
                            <div key={i} className={`px-4 py-0.5 whitespace-pre-wrap ${LINE_COLORS[line.type]}`}>
                                {line.text || '\u00A0'}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
