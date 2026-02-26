import React, { useState } from 'react';
import { type ClientProvider, getProviderLabel } from '../../services/unifiedProviderService';
import { OPENROUTER_MODELS } from '../../data/openRouterModels';
import { useApiKeys } from '../hooks/useApiKeys';

interface SettingsPageProps {
    provider: ClientProvider;
    onProviderChange: (p: ClientProvider) => void;
    claudeModel: 'sonnet' | 'opus';
    onClaudeModelChange: (m: 'sonnet' | 'opus') => void;
    openRouterModel: string;
    onOpenRouterModelChange: (m: string) => void;
    thinkingMode: boolean;
    onThinkingModeChange: (v: boolean) => void;
    useSearch: boolean;
    onUseSearchChange: (v: boolean) => void;
    autoEnrich: boolean;
    onAutoEnrichChange: (v: boolean) => void;
    telemetryConsent: boolean;
    onTelemetryConsentChange: (v: boolean) => void;
    language: 'tr' | 'en';
}

const PROVIDERS: ClientProvider[] = [
    'auto', 'groq', 'gemini', 'openai', 'claude', 'deepseek', 'openrouter', 'huggingface', 'ollama'
];

const API_KEY_FIELDS = [
    { provider: 'gemini' as const, label: 'Google Gemini', placeholder: 'AIza...' },
    { provider: 'openai' as const, label: 'OpenAI', placeholder: 'sk-...' },
    { provider: 'anthropic' as const, label: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
    { provider: 'groq' as const, label: 'Groq', placeholder: 'gsk_...' },
    { provider: 'deepseek' as const, label: 'DeepSeek', placeholder: 'sk-...' },
    { provider: 'openrouter' as const, label: 'OpenRouter', placeholder: 'sk-or-...' },
    { provider: 'huggingface' as const, label: 'HuggingFace', placeholder: 'hf_...' },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div
            onClick={() => onChange(!value)}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0 ${value ? 'bg-cyber-primary/70' : 'bg-cyber-border/60'}`}
        >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${value ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
    );
}

export default function SettingsPage({
    provider, onProviderChange,
    claudeModel, onClaudeModelChange,
    openRouterModel, onOpenRouterModelChange,
    thinkingMode, onThinkingModeChange,
    useSearch, onUseSearchChange,
    autoEnrich, onAutoEnrichChange,
    telemetryConsent, onTelemetryConsentChange,
    language,
}: SettingsPageProps) {
    const { keys, setKey } = useApiKeys();
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
    const toggleShow = (k: string) => setShowKeys(prev => ({ ...prev, [k]: !prev[k] }));

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                    {language === 'tr' ? 'Ayarlar' : 'Settings'}
                </h1>
                <p className="font-mono text-[10px] text-gray-500 mt-1">
                    {language === 'tr' ? 'AI motoru, model ve davranış tercihleri' : 'AI engine, model and behavior preferences'}
                </p>
            </div>

            {/* API Key Yönetimi */}
            <div className="glass-card p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06e8f9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
                    </svg>
                    <h2 className="font-mono text-xs font-bold text-gray-300 uppercase tracking-wider">
                        {language === 'tr' ? 'API Key Yönetimi' : 'API Key Management'}
                    </h2>
                </div>
                <p className="font-mono text-[9px] text-gray-600">
                    {language === 'tr' ? 'Keyler tarayıcınızda localStorage\'da şifresiz saklanır.' : 'Keys are stored in your browser\'s localStorage without encryption.'}
                </p>
                <div className="grid grid-cols-1 gap-3">
                    {API_KEY_FIELDS.map(({ provider: p, label, placeholder }) => (
                        <div key={p} className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-gray-500 w-36 flex-shrink-0">{label}</span>
                            <div className="flex-1 relative">
                                <input
                                    type={showKeys[p] ? 'text' : 'password'}
                                    value={keys[p] || ''}
                                    onChange={(e) => setKey(p, e.target.value)}
                                    placeholder={placeholder}
                                    className="w-full bg-cyber-dark/60 border border-cyber-border/40 rounded-lg px-3 py-1.5 font-mono text-[10px] text-gray-200 placeholder-gray-700 focus:outline-none focus:border-cyber-primary/40 pr-8"
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleShow(p)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
                                >
                                    {showKeys[p] ? (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                    ) : (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                    )}
                                </button>
                            </div>
                            {keys[p] && <span className="text-cyber-success text-[10px]">✓</span>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Provider Seçimi */}
            <div className="glass-card p-5 space-y-4">
                <h2 className="font-mono text-xs font-bold text-gray-300 uppercase tracking-wider">
                    {language === 'tr' ? 'AI Motoru' : 'AI Engine'}
                </h2>
                <div className="flex flex-wrap gap-2">
                    {PROVIDERS.map((p) => (
                        <button
                            key={p} type="button" onClick={() => onProviderChange(p)}
                            className={`px-3 py-1.5 rounded-lg border font-mono text-[10px] uppercase tracking-wider transition-all ${provider === p ? 'border-cyber-primary bg-cyber-primary/10 text-cyber-primary' : 'border-cyber-border/50 bg-cyber-dark text-gray-500 hover:border-gray-500 hover:text-gray-300'}`}
                        >
                            {p === 'auto' ? (language === 'tr' ? '⚡ Otomatik' : '⚡ Auto') : getProviderLabel(p, claudeModel)}
                        </button>
                    ))}
                </div>

                {provider === 'claude' && (
                    <div className="flex gap-2">
                        {(['sonnet', 'opus'] as const).map((m) => (
                            <button key={m} type="button" onClick={() => onClaudeModelChange(m)}
                                className={`px-3 py-1.5 rounded-lg border font-mono text-[10px] uppercase transition-all ${claudeModel === m ? 'border-cyber-primary/60 bg-cyber-primary/10 text-cyber-primary' : 'border-cyber-border/50 text-gray-500 hover:text-gray-300'}`}>
                                {m === 'opus' ? 'Opus 4.6' : 'Sonnet'}
                            </button>
                        ))}
                    </div>
                )}
                {provider === 'openrouter' && (
                    <select value={openRouterModel} onChange={(e) => onOpenRouterModelChange(e.target.value)}
                        className="w-full bg-cyber-dark border border-cyber-border/50 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyber-primary">
                        {OPENROUTER_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                )}
                {(provider === 'gemini' || provider === 'claude') && (
                    <div className="flex gap-2">
                        <button type="button" onClick={() => onThinkingModeChange(!thinkingMode)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-[10px] uppercase transition-all ${thinkingMode ? 'border-cyber-accent/60 bg-cyber-accent/10 text-cyber-accent' : 'border-cyber-border/50 text-gray-500 hover:text-gray-300'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${thinkingMode ? 'bg-cyber-accent animate-pulse' : 'bg-gray-600'}`} />
                            Thinking
                        </button>
                        <button type="button" onClick={() => onUseSearchChange(!useSearch)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-[10px] uppercase transition-all ${useSearch ? 'border-cyber-success/60 bg-cyber-success/10 text-cyber-success' : 'border-cyber-border/50 text-gray-500 hover:text-gray-300'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${useSearch ? 'bg-cyber-success animate-pulse' : 'bg-gray-600'}`} />
                            Web Search
                        </button>
                    </div>
                )}
            </div>

            {/* Davranış */}
            <div className="glass-card p-5 space-y-4">
                <h2 className="font-mono text-xs font-bold text-gray-300 uppercase tracking-wider">
                    {language === 'tr' ? 'Davranış' : 'Behavior'}
                </h2>
                {[
                    { label: language === 'tr' ? 'Otomatik Zenginleştirme' : 'Auto-Enrichment', desc: language === 'tr' ? '1040+ promptlu kütüphaneden otomatik zenginleştir' : 'Auto-enrich from 1040+ prompt library', value: autoEnrich, onChange: onAutoEnrichChange },
                    { label: language === 'tr' ? 'Telemetri' : 'Telemetry', desc: language === 'tr' ? 'Anonim kullanım metriklerini paylaş' : 'Share anonymous usage metrics', value: telemetryConsent, onChange: onTelemetryConsentChange },
                ].map(({ label, desc, value, onChange }, i) => (
                    <React.Fragment key={label}>
                        {i > 0 && <div className="border-t border-cyber-border/30" />}
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="font-mono text-[11px] text-gray-300 font-bold uppercase tracking-wider">{label}</span>
                                <p className="font-mono text-[9px] text-gray-600 mt-0.5">{desc}</p>
                            </div>
                            <Toggle value={value} onChange={onChange} />
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}
