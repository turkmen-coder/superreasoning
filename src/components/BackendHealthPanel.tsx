import React, { useState, useEffect } from 'react';

interface EndpointStatus {
    name: string;
    url: string;
    status: 'ok' | 'error' | 'loading';
    latency?: number;
}

const ENDPOINTS: Omit<EndpointStatus, 'status'>[] = [
    { name: 'API Health', url: '/v1/health' },
    { name: 'Prompts', url: '/v1/prompts' },
    { name: 'Vector Stats', url: '/v1/prompts/vector-stats' },
];

export default function BackendHealthPanel() {
    const [statuses, setStatuses] = useState<EndpointStatus[]>(
        ENDPOINTS.map(e => ({ ...e, status: 'loading' }))
    );
    const [lastCheck, setLastCheck] = useState<Date | null>(null);

    const checkAll = async () => {
        setStatuses(ENDPOINTS.map(e => ({ ...e, status: 'loading' })));
        const results = await Promise.all(
            ENDPOINTS.map(async (ep) => {
                const t0 = Date.now();
                try {
                    const res = await fetch(`http://localhost:4000${ep.url}`, { signal: AbortSignal.timeout(4000) });
                    return { ...ep, status: res.ok ? 'ok' as const : 'error' as const, latency: Date.now() - t0 };
                } catch {
                    return { ...ep, status: 'error' as const, latency: Date.now() - t0 };
                }
            })
        );
        setStatuses(results);
        setLastCheck(new Date());
    };

    useEffect(() => { checkAll(); }, []);

    const allOk = statuses.every(s => s.status === 'ok');

    return (
        <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${allOk ? 'bg-cyber-success animate-pulse' : 'bg-red-400'}`} />
                    <h3 className="font-mono text-xs font-bold text-gray-300 uppercase tracking-wider">
                        Servis Durumu
                    </h3>
                </div>
                <button onClick={checkAll} className="font-mono text-[9px] text-gray-600 hover:text-cyber-primary transition-colors uppercase tracking-wider flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                    Yenile
                </button>
            </div>

            <div className="space-y-2">
                {statuses.map((ep) => (
                    <div key={ep.name} className="flex items-center justify-between py-1.5 border-b border-cyber-border/20 last:border-0">
                        <span className="font-mono text-[10px] text-gray-400">{ep.name}</span>
                        <div className="flex items-center gap-2">
                            {ep.latency !== undefined && (
                                <span className="font-mono text-[9px] text-gray-600">{ep.latency}ms</span>
                            )}
                            <span className={`font-mono text-[9px] font-bold uppercase ${ep.status === 'ok' ? 'text-cyber-success' :
                                    ep.status === 'error' ? 'text-red-400' : 'text-gray-600'
                                }`}>
                                {ep.status === 'loading' ? '...' : ep.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {lastCheck && (
                <p className="font-mono text-[9px] text-gray-700">
                    Son kontrol: {lastCheck.toLocaleTimeString('tr-TR')}
                </p>
            )}
        </div>
    );
}
