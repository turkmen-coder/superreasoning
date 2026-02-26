import React, { useState } from 'react';

// Yaklaşık fiyatlar (USD per 1M token) — Mart 2025 ortalama
const PROVIDER_COSTS: Record<string, { name: string; inputPer1M: number; outputPer1M: number; note?: string }> = {
    openai: { name: 'OpenAI GPT-4o', inputPer1M: 5.00, outputPer1M: 15.00 },
    openai_mini: { name: 'OpenAI GPT-4o mini', inputPer1M: 0.15, outputPer1M: 0.60 },
    claude: { name: 'Claude Sonnet 3.5', inputPer1M: 3.00, outputPer1M: 15.00 },
    gemini: { name: 'Gemini 1.5 Pro', inputPer1M: 1.25, outputPer1M: 5.00 },
    gemini_flash: { name: 'Gemini 1.5 Flash', inputPer1M: 0.075, outputPer1M: 0.30 },
    deepseek: { name: 'DeepSeek V3', inputPer1M: 0.14, outputPer1M: 0.28 },
    groq: { name: 'Groq Llama3 70B', inputPer1M: 0.59, outputPer1M: 0.79 },
    groq_free: { name: 'Groq (Ücretsiz tier)', inputPer1M: 0, outputPer1M: 0, note: 'Rate limited' },
};

export default function ProviderCostCalculator() {
    const [inputTokens, setInputTokens] = useState(500);
    const [outputTokens, setOutputTokens] = useState(1500);
    const [dailyRequests, setDailyRequests] = useState(50);

    const calcCost = (p: typeof PROVIDER_COSTS[string]) => {
        const perRequest = (inputTokens * p.inputPer1M + outputTokens * p.outputPer1M) / 1_000_000;
        return { perRequest, daily: perRequest * dailyRequests, monthly: perRequest * dailyRequests * 30 };
    };

    const sorted = Object.entries(PROVIDER_COSTS)
        .map(([id, p]) => ({ id, ...p, ...calcCost(p) }))
        .sort((a, b) => a.monthly - b.monthly);

    return (
        <div className="glass-card p-5 space-y-5">
            <h3 className="font-mono text-xs font-bold text-gray-300 uppercase tracking-wider">
                💰 Provider Maliyet Hesaplayıcı
            </h3>

            {/* Inputs */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Input Token', value: inputTokens, set: setInputTokens, step: 100 },
                    { label: 'Output Token', value: outputTokens, set: setOutputTokens, step: 100 },
                    { label: 'Günlük İstek', value: dailyRequests, set: setDailyRequests, step: 10 },
                ].map(({ label, value, set, step }) => (
                    <div key={label}>
                        <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">{label}</label>
                        <input
                            type="number"
                            value={value}
                            onChange={e => set(Math.max(1, Number(e.target.value)))}
                            step={step}
                            className="w-full bg-cyber-dark border border-cyber-border/40 rounded px-2 py-1.5 font-mono text-xs text-gray-200 focus:outline-none focus:border-cyber-primary/40 mt-1"
                        />
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-cyber-border/30">
                            {['Model', 'İstek Başı', 'Günlük', 'Aylık'].map(h => (
                                <th key={h} className="py-2 text-left font-mono text-[9px] text-gray-500 uppercase tracking-wider pr-4">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((p, i) => (
                            <tr key={p.id} className={`border-b border-cyber-border/20 ${i === 0 ? 'bg-cyber-success/5' : ''}`}>
                                <td className="py-2 pr-4">
                                    <div className="font-mono text-[10px] text-gray-300">{p.name}</div>
                                    {p.note && <div className="font-mono text-[8px] text-gray-600">{p.note}</div>}
                                    {i === 0 && <div className="font-mono text-[8px] text-cyber-success">✓ En ucuz</div>}
                                </td>
                                <td className="py-2 pr-4 font-mono text-[10px] text-gray-400">${p.perRequest.toFixed(4)}</td>
                                <td className="py-2 pr-4 font-mono text-[10px] text-gray-400">${p.daily.toFixed(3)}</td>
                                <td className={`py-2 font-mono text-[10px] font-bold ${p.monthly === 0 ? 'text-cyber-success' : 'text-gray-300'}`}>
                                    {p.monthly === 0 ? 'Ücretsiz' : `$${p.monthly.toFixed(2)}`}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="font-mono text-[8px] text-gray-700">* Yaklaşık fiyatlar, gerçek kullanım farklılık gösterebilir.</p>
        </div>
    );
}
