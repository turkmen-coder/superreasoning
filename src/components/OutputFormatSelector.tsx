import React from 'react';

export type OutputFormat = 'auto' | 'markdown' | 'json' | 'numbered' | 'table' | 'code' | 'xml';

interface OutputFormatSelectorProps {
    value: OutputFormat;
    onChange: (f: OutputFormat) => void;
}

const FORMATS: { id: OutputFormat; icon: string; label: string; hint: string }[] = [
    { id: 'auto', icon: '⚡', label: 'Auto', hint: 'AI karar verir' },
    { id: 'markdown', icon: '📝', label: 'Markdown', hint: '# başlıklar, **bold**' },
    { id: 'json', icon: '{}', label: 'JSON', hint: 'Yapılandırılmış veri' },
    { id: 'numbered', icon: '🔢', label: 'Liste', hint: '1. 2. 3. maddeler' },
    { id: 'table', icon: '📊', label: 'Tablo', hint: 'Markdown tablosu' },
    { id: 'code', icon: '💻', label: 'Kod', hint: '```code``` blokları' },
    { id: 'xml', icon: '🏷', label: 'XML', hint: '<tag> yapısı' },
];

export function getFormatInstruction(format: OutputFormat): string {
    switch (format) {
        case 'markdown': return '\n\n[FORMAT: Respond using Markdown with headers, bold, and bullet points. Structure the output clearly.]';
        case 'json': return '\n\n[FORMAT: Respond ONLY with valid JSON. No prose, no markdown, only parseable JSON.]';
        case 'numbered': return '\n\n[FORMAT: Respond with a numbered list. Each item on its own line starting with a number.]';
        case 'table': return '\n\n[FORMAT: Respond using a Markdown table with headers and rows.]';
        case 'code': return '\n\n[FORMAT: Respond with code blocks using triple backticks with the language specified.]';
        case 'xml': return '\n\n[FORMAT: Respond using XML tags with proper nesting and attributes.]';
        default: return '';
    }
}

export default function OutputFormatSelector({ value, onChange }: OutputFormatSelectorProps) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {FORMATS.map((f) => (
                <button
                    key={f.id}
                    type="button"
                    onClick={() => onChange(f.id)}
                    title={f.hint}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md border font-mono text-[9px] uppercase tracking-wider transition-all ${value === f.id
                            ? 'border-cyber-primary/70 bg-cyber-primary/10 text-cyber-primary'
                            : 'border-cyber-border/40 text-gray-600 hover:border-cyber-border/70 hover:text-gray-400'
                        }`}
                >
                    <span className="text-xs">{f.icon}</span>
                    {f.label}
                </button>
            ))}
        </div>
    );
}
