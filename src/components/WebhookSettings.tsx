import React, { useState } from 'react';

export interface WebhookConfig {
    enabled: boolean;
    url: string;
    secret: string;
    onEvents: ('generate' | 'copy' | 'export')[];
}

const DEFAULT_CONFIG: WebhookConfig = { enabled: false, url: '', secret: '', onEvents: ['generate'] };
const STORAGE_KEY = 'sr_webhook_config';

function loadConfig(): WebhookConfig {
    try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
    catch { return DEFAULT_CONFIG; }
}

let _webhookConfig = loadConfig();

export function getWebhookConfig(): WebhookConfig { return _webhookConfig; }

export async function triggerWebhook(event: WebhookConfig['onEvents'][number], payload: Record<string, unknown>) {
    const cfg = getWebhookConfig();
    if (!cfg.enabled || !cfg.url || !cfg.onEvents.includes(event)) return;
    try {
        await fetch(cfg.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(cfg.secret ? { 'X-SR-Secret': cfg.secret } : {}) },
            body: JSON.stringify({ event, timestamp: new Date().toISOString(), ...payload }),
        });
    } catch { /* fire and forget */ }
}

interface WebhookSettingsProps {
    language: string;
}

const EVENT_LABELS = { generate: '🚀 Prompt Üretimi', copy: '📋 Kopyalama', export: '💾 Export' };

export default function WebhookSettings({ language }: WebhookSettingsProps) {
    const [cfg, setCfg] = useState<WebhookConfig>(loadConfig);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null);

    const save = (newCfg: WebhookConfig) => {
        setCfg(newCfg);
        _webhookConfig = newCfg;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newCfg));
    };

    const test = async () => {
        if (!cfg.url) return;
        setTesting(true); setTestResult(null);
        try {
            await fetch(cfg.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'test', timestamp: new Date().toISOString(), message: 'SuperReasoning webhook test' }) });
            setTestResult('ok');
        } catch { setTestResult('error'); }
        setTesting(false);
    };

    return (
        <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm">🔗</span>
                    <h3 className="font-mono text-xs font-bold text-gray-300 uppercase tracking-wider">
                        Webhook / Zapier
                    </h3>
                </div>
                <div onClick={() => save({ ...cfg, enabled: !cfg.enabled })}
                    className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${cfg.enabled ? 'bg-cyber-primary/70' : 'bg-cyber-border/60'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${cfg.enabled ? 'translate-x-4' : ''}`} />
                </div>
            </div>

            {cfg.enabled && (
                <div className="space-y-3 animate-in fade-in duration-200">
                    <div>
                        <label className="font-mono text-[9px] text-gray-500 uppercase">Endpoint URL</label>
                        <div className="flex gap-2 mt-1">
                            <input type="url" value={cfg.url} placeholder="https://hooks.zapier.com/..." onChange={e => save({ ...cfg, url: e.target.value })}
                                className="flex-1 bg-cyber-dark border border-cyber-border/40 rounded px-2.5 py-1.5 font-mono text-[10px] text-gray-200 placeholder-gray-700 focus:outline-none focus:border-cyber-primary/40" />
                            <button type="button" onClick={test} disabled={!cfg.url || testing}
                                className={`px-3 py-1.5 rounded border font-mono text-[9px] uppercase transition-colors disabled:opacity-40 ${testResult === 'ok' ? 'border-cyber-success/60 text-cyber-success' :
                                        testResult === 'error' ? 'border-red-500/60 text-red-400' :
                                            'border-cyber-border/40 text-gray-500 hover:text-gray-300'}`}>
                                {testing ? '...' : testResult === 'ok' ? '✓ OK' : testResult === 'error' ? '✗ Hata' : 'Test'}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="font-mono text-[9px] text-gray-500 uppercase">Secret Key (opsiyonel)</label>
                        <input type="password" value={cfg.secret} placeholder="X-SR-Secret header" onChange={e => save({ ...cfg, secret: e.target.value })}
                            className="w-full mt-1 bg-cyber-dark border border-cyber-border/40 rounded px-2.5 py-1.5 font-mono text-[10px] text-gray-200 placeholder-gray-700 focus:outline-none focus:border-cyber-primary/40" />
                    </div>
                    <div>
                        <label className="font-mono text-[9px] text-gray-500 uppercase">Tetikleyiciler</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {(Object.entries(EVENT_LABELS) as [keyof typeof EVENT_LABELS, string][]).map(([ev, label]) => (
                                <button key={ev} type="button" onClick={() => {
                                    const evs = cfg.onEvents.includes(ev) ? cfg.onEvents.filter(e => e !== ev) : [...cfg.onEvents, ev];
                                    save({ ...cfg, onEvents: evs });
                                }} className={`px-2 py-1 rounded border font-mono text-[9px] transition-all ${cfg.onEvents.includes(ev) ? 'border-cyber-primary/60 bg-cyber-primary/10 text-cyber-primary' : 'border-cyber-border/40 text-gray-600 hover:text-gray-400'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <p className="font-mono text-[8px] text-gray-700">Payload: {"{ event, timestamp, masterPrompt, framework, domainId }"}</p>
                </div>
            )}
        </div>
    );
}
