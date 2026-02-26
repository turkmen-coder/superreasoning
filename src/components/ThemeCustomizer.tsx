import React, { useState } from 'react';

const ACCENTS = [
    { id: 'cyan', color: '#06e8f9', label: 'Siyan (Varsayılan)' },
    { id: 'purple', color: '#9d00ff', label: 'Mor' },
    { id: 'emerald', color: '#10b981', label: 'Zümrüt' },
    { id: 'orange', color: '#f97316', label: 'Turuncu' },
    { id: 'pink', color: '#ec4899', label: 'Pembe' },
    { id: 'gold', color: '#facc15', label: 'Altın' },
];

const STORAGE_KEY = 'sr_accent_color';

function loadAccent(): string {
    return localStorage.getItem(STORAGE_KEY) || '#06e8f9';
}

export function applyAccent(color: string) {
    document.documentElement.style.setProperty('--cyber-primary', color);
    // Derive a dimmer version for backgrounds
    document.documentElement.style.setProperty('--cyber-primary-dim', color + '22');
    localStorage.setItem(STORAGE_KEY, color);
}

// Apply on load
if (typeof document !== 'undefined') {
    const saved = loadAccent();
    if (saved !== '#06e8f9') applyAccent(saved);
}

export default function ThemeCustomizer() {
    const [activeColor, setActiveColor] = useState(loadAccent);
    const [customColor, setCustomColor] = useState('');
    const [open, setOpen] = useState(false);

    const apply = (color: string) => {
        applyAccent(color);
        setActiveColor(color);
    };

    return (
        <div className="glass-card p-4 space-y-3">
            <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: activeColor, boxShadow: `0 0 8px ${activeColor}66` }} />
                    <h3 className="font-mono text-[10px] font-bold text-gray-300 uppercase tracking-wider">Tema Rengi</h3>
                </div>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="flex flex-wrap gap-2">
                        {ACCENTS.map(a => (
                            <button key={a.id} type="button" onClick={() => apply(a.color)} title={a.label}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${activeColor === a.color ? 'scale-110 border-white/60' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: a.color, boxShadow: activeColor === a.color ? `0 0 10px ${a.color}` : 'none' }} />
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="font-mono text-[9px] text-gray-500 uppercase">Özel</label>
                        <input type="color" value={activeColor} onChange={e => { setCustomColor(e.target.value); apply(e.target.value); }}
                            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                        <span className="font-mono text-[9px] text-gray-600">{activeColor}</span>
                    </div>
                    <button type="button" onClick={() => apply('#06e8f9')}
                        className="font-mono text-[9px] text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-wider">
                        Varsayılana sıfırla
                    </button>
                </div>
            )}
        </div>
    );
}
