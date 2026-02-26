import React, { useState } from 'react';

interface SystemPromptEditorProps {
    value: string;
    onChange: (v: string) => void;
    language: string;
}

const PRESETS = [
    { label: 'Uzman AI', value: 'Sen bir uzman AI mühendisi ve prompt tasarımcısısın. Her zaman yapılandırılmış, net ve etkili çıktılar üretirsin.' },
    { label: 'Türkçe Odak', value: 'Her zaman Türkçe yanıt ver. Teknik terimleri de Türkçe açıklarken İngilizce karşılığını parantez içinde belirt.' },
    { label: 'Kısa & Net', value: 'Yanıtlarını mümkün olduğunca kısa ve net tut. Gereksiz açıklama yapma, direkt sonuca git.' },
    { label: 'CoT Zorunlu', value: 'Her yanıt öncesinde <thinking> bloğu içinde adım adım düşünme sürecini göster, sonra sonucu ver.' },
];

export default function SystemPromptEditor({ value, onChange, language }: SystemPromptEditorProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="glass-card p-5 space-y-4">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full transition-colors ${value ? 'bg-cyber-primary animate-pulse' : 'bg-gray-600'}`} />
                    <h3 className="font-mono text-xs font-bold text-gray-300 uppercase tracking-wider">
                        {language === 'tr' ? 'Sistem Promptu' : 'System Prompt'}
                    </h3>
                    {value && <span className="font-mono text-[8px] text-cyber-primary/70 bg-cyber-primary/10 px-1.5 py-0.5 rounded">Aktif</span>}
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="flex flex-wrap gap-1.5">
                        {PRESETS.map((p) => (
                            <button
                                key={p.label}
                                type="button"
                                onClick={() => onChange(p.value)}
                                className="px-2 py-1 rounded border border-cyber-border/40 font-mono text-[9px] text-gray-500 hover:border-cyber-primary/40 hover:text-cyber-primary transition-colors"
                            >
                                {p.label}
                            </button>
                        ))}
                        {value && (
                            <button
                                type="button"
                                onClick={() => onChange('')}
                                className="px-2 py-1 rounded border border-red-500/30 font-mono text-[9px] text-red-400/70 hover:text-red-400 transition-colors"
                            >
                                Sıfırla
                            </button>
                        )}
                    </div>
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={language === 'tr' ? 'Sistem promptunu buraya yaz...' : 'Write your system prompt here...'}
                        rows={4}
                        className="w-full bg-cyber-dark/60 border border-cyber-border/40 rounded-lg p-3 font-mono text-xs text-gray-300 placeholder-gray-700 focus:outline-none focus:border-cyber-primary/40 resize-none transition-colors"
                    />
                    <p className="font-mono text-[9px] text-gray-700">
                        {language === 'tr'
                            ? '* Her generate çağrısında bu sistem promptu AI\'a iletilir'
                            : '* This system prompt is sent to AI on every generate call'}
                    </p>
                </div>
            )}
        </div>
    );
}
