/**
 * AILabWorkbench — AI Agent Lab with OpenAI Agents SDK prompt library agent.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders } from '../services/apiClient';
import { Icon } from './ui';

const _apiUrl = (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_API_BASE_URL || '';
const API_BASE = _apiUrl || '/api/v1';
const AUTO_REFRESH_SECONDS = 15;

interface AgentMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  enrichedPrompt?: string;
}

interface AgentStatus {
  ready: boolean;
  sdk: string;
  model: string;
  tools: string[];
  promptsLoaded: boolean;
  promptCount: number;
  targetPromptCount?: number;
  indexedPromptCount?: number;
  vectorIndexedCount?: number;
  coveragePercent?: number;
  categories: string[];
}

interface AnalyticsSnapshot {
  totalGenerations: number;
  overallSuccessRate: number;
  overallEditRate: number;
  avgLatencyMs: number;
  topDomains: Array<{ domain: string; successRate: number; count: number }>;
  topFrameworks: Array<{ framework: string; editRate: number; count: number }>;
  topProviders: Array<{ provider: string; successRate: number; count: number }>;
}

interface AILabWorkbenchProps {
  currentPrompt?: string;
  domainId?: string;
  framework?: string;
  analyticsSnapshot?: AnalyticsSnapshot;
  onApplyEnrichedPrompt?: (enriched: string) => void;
}

const AILabWorkbench: React.FC<AILabWorkbenchProps> = ({
  currentPrompt,
  domainId,
  framework,
  analyticsSnapshot,
  onApplyEnrichedPrompt,
}) => {
  const { language } = useTranslation();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedInfo, setSeedInfo] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(AUTO_REFRESH_SECONDS);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const buildHeaders = useCallback(async () => {
    const auth = await getAuthHeaders();
    return { 'Content-Type': 'application/json', ...auth };
  }, []);

  const refreshStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const hdrs = await buildHeaders();
      const res = await fetch(`${API_BASE}/agent/status`, { headers: hdrs });
      const data = await res.json();
      setStatus(data);
      setLastRefreshedAt(Date.now());
      setRefreshCountdown(AUTO_REFRESH_SECONDS);
    } catch {
      // ignore status fetch errors in UI
    } finally {
      setStatusLoading(false);
    }
  }, [buildHeaders]);

  // Fetch agent status on mount
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Auto refresh status countdown
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const timer = window.setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          void refreshStatus();
          return AUTO_REFRESH_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [refreshStatus, autoRefreshEnabled]);

  useEffect(() => {
    if (!autoRefreshEnabled) {
      setRefreshCountdown(AUTO_REFRESH_SECONDS);
    }
  }, [autoRefreshEnabled]);

  const handleSeedVectors = useCallback(async () => {
    setSeeding(true);
    setSeedInfo(null);
    try {
      const hdrs = await buildHeaders();
      const res = await fetch(`${API_BASE}/prompts/seed-vectors`, {
        method: 'POST',
        headers: hdrs,
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = typeof data?.error === 'string' ? data.error : (language === 'tr' ? 'Seed başarısız' : 'Seed failed');
        setSeedInfo(errMsg);
      } else {
        const upserted = typeof data?.vectorsUpserted === 'number' ? data.vectorsUpserted : 0;
        setSeedInfo(language === 'tr' ? `${upserted} vektör yüklendi` : `${upserted} vectors seeded`);
        await refreshStatus();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (language === 'tr' ? 'Seed hatası' : 'Seeding error');
      setSeedInfo(msg);
    } finally {
      setSeeding(false);
    }
  }, [buildHeaders, language, refreshStatus]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMsg: AgentMessage = { role: 'user', content: query.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const hdrs = await buildHeaders();
      const res = await fetch(`${API_BASE}/agent/run`, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({
          query: userMsg.content,
          language,
          context: {
            currentPrompt,
            domainId,
            framework,
            analyticsSnapshot,
          },
        }),
      });

      let data: Record<string, unknown> = {};
      try {
        const text = await res.text();
        data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        data = { error: language === 'tr' ? 'Sunucu yanıtı geçersiz' : 'Invalid server response' };
      }

      if (!res.ok) {
        const errMsg = typeof data.error === 'string'
          ? data.error
          : typeof data.message === 'string'
          ? data.message
          : language === 'tr' ? 'Agent başarısız oldu' : 'Agent failed';
        setMessages((prev) => [
          ...prev,
          { role: 'agent', content: `Error: ${errMsg}`, timestamp: Date.now() },
        ]);
      } else {
        const answer = typeof data.answer === 'string' && data.answer.trim()
          ? data.answer
          : language === 'tr' ? 'Yanıt alınamadı.' : 'No response received.';
        setMessages((prev) => [
          ...prev,
          {
            role: 'agent',
            content: answer,
            timestamp: Date.now(),
            enrichedPrompt: typeof data.enrichedPrompt === 'string' ? data.enrichedPrompt : undefined,
          },
        ]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        { role: 'agent', content: `Connection error: ${msg}`, timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickQueries = language === 'tr'
    ? [
        ...(currentPrompt
          ? ['Mevcut promptu prompt kutuphanesi ve analitik rapora gore zenginlestir']
          : []),
        'Hallucination azaltan promptlar',
        'Akademik yazi icin en iyi promptlar',
        'Veri analizi promptlari',
        'Hangi kategoriler var?',
        'Kod review icin prompt oner',
        'API tasarimi icin best practice promptlar',
        'Chain of Thought ornekleri goster',
        'Guvenlik testi icin prompt sablonu',
        'RAG pipeline promptlari',
        'Prompt injection onleme teknikleri',
      ]
    : [
        ...(currentPrompt
          ? ['Enrich my current prompt using prompt library and analytics']
          : []),
        'Prompts for reducing hallucination',
        'Best prompts for academic writing',
        'Data analysis prompts',
        'What categories are available?',
        'Suggest prompts for code review',
        'Best practice prompts for API design',
        'Show Chain of Thought examples',
        'Prompt template for security testing',
        'RAG pipeline prompts',
        'Prompt injection prevention techniques',
      ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyber-primary/20 via-purple-500/20 to-blue-500/20 border border-cyber-primary/30 flex items-center justify-center">
          <Icon name="layers" size={18} className="text-cyber-primary" />
        </div>
        <div>
          <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider">
            AI Agent Lab
          </h2>
          <p className="font-mono text-[9px] text-gray-500">
            {language === 'tr' ? 'OpenAI Agents SDK — Prompt Kütüphanesi Agent' : 'OpenAI Agents SDK — Prompt Library Agent'}
          </p>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-2 px-3 py-2 glass-card">
        <div className={`w-2 h-2 rounded-full ${status?.ready ? 'bg-green-400' : statusLoading ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
        <span className="font-mono text-[10px] text-gray-400">
          {statusLoading
            ? (language === 'tr' ? 'Agent kontrol ediliyor...' : 'Checking agent...')
            : status?.ready
            ? `${status.model} | ${status.indexedPromptCount ?? status.promptCount}/${status.targetPromptCount ?? status.promptCount} prompts | vec:${status.vectorIndexedCount ?? 0} | ${status.coveragePercent ?? 0}% | ${status.tools.length} tools`
            : (language === 'tr' ? 'Agent kullanılamaz' : 'Agent unavailable')}
        </span>
        <button
          type="button"
          onClick={refreshStatus}
          disabled={statusLoading}
          className="ml-auto font-mono text-[9px] px-2 py-1 rounded border border-cyber-primary/30 text-cyber-primary/80 hover:bg-cyber-primary/10 transition-colors disabled:opacity-40"
        >
          {language === 'tr' ? 'Yenile' : 'Refresh'}
        </button>
        <button
          type="button"
          onClick={() => setAutoRefreshEnabled((v) => !v)}
          className={`font-mono text-[9px] px-2 py-1 rounded border transition-colors ${
            autoRefreshEnabled
              ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
              : 'border-gray-500/40 text-gray-400 bg-gray-500/10'
          }`}
        >
          {autoRefreshEnabled
            ? (language === 'tr' ? 'Auto: Açık' : 'Auto: On')
            : (language === 'tr' ? 'Auto: Kapalı' : 'Auto: Off')}
        </button>
        {autoRefreshEnabled && (
          <span className="font-mono text-[9px] text-gray-500">
            {language === 'tr' ? `${refreshCountdown}s sonra` : `in ${refreshCountdown}s`}
          </span>
        )}
      </div>

      {lastRefreshedAt && (
        <div className="px-1">
          <span className="font-mono text-[9px] text-gray-600">
            {language === 'tr' ? 'Son yenileme:' : 'Last refresh:'} {new Date(lastRefreshedAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Index Coverage Card */}
      {status?.ready && (
        <div className="glass-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">
              {language === 'tr' ? 'Index Coverage' : 'Index Coverage'}
            </span>
            <span className="font-mono text-[10px] text-cyber-primary">
              {status.coveragePercent ?? 0}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyber-primary to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, status.coveragePercent ?? 0))}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
            <div className="text-gray-400">target: <span className="text-gray-200">{status.targetPromptCount ?? status.promptCount}</span></div>
            <div className="text-gray-400">indexed: <span className="text-gray-200">{status.indexedPromptCount ?? status.promptCount}</span></div>
            <div className="text-gray-400">vector: <span className="text-gray-200">{status.vectorIndexedCount ?? 0}</span></div>
          </div>

          {(status.coveragePercent ?? 0) < 100 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSeedVectors}
                disabled={seeding}
                className="font-mono text-[10px] font-bold px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
              >
                {seeding
                  ? (language === 'tr' ? 'Seeding...' : 'Seeding...')
                  : (language === 'tr' ? 'Seed Vectors' : 'Seed Vectors')}
              </button>
              {seedInfo && <span className="font-mono text-[10px] text-gray-400">{seedInfo}</span>}
            </div>
          )}

          {(status.coveragePercent ?? 0) >= 100 && (
            <div className="pt-1">
              <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                ✓ {language === 'tr' ? 'Index hedefe ulaştı' : 'Index target reached'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Context Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="px-3 py-2 glass-card">
          <p className="font-mono text-[9px] text-gray-600 uppercase tracking-wider">
            {language === 'tr' ? 'Prompt Bağlamı' : 'Prompt Context'}
          </p>
          <p className="font-mono text-[10px] text-gray-400 mt-1">
            {currentPrompt
              ? (language === 'tr' ? 'Mevcut prompt bağlı' : 'Current prompt connected')
              : (language === 'tr' ? 'Mevcut prompt yok' : 'No current prompt')}
          </p>
        </div>
        <div className="px-3 py-2 glass-card">
          <p className="font-mono text-[9px] text-gray-600 uppercase tracking-wider">
            {language === 'tr' ? 'Domain / Framework' : 'Domain / Framework'}
          </p>
          <p className="font-mono text-[10px] text-gray-400 mt-1">
            {(domainId || '—')} / {(framework || '—')}
          </p>
        </div>
        <div className="px-3 py-2 glass-card">
          <p className="font-mono text-[9px] text-gray-600 uppercase tracking-wider">
            {language === 'tr' ? 'Analitik' : 'Analytics'}
          </p>
          <p className="font-mono text-[10px] text-gray-400 mt-1">
            {analyticsSnapshot
              ? `${analyticsSnapshot.totalGenerations} ${language === 'tr' ? 'üretim' : 'generations'} • ${analyticsSnapshot.overallSuccessRate}% ${language === 'tr' ? 'başarı' : 'success'}`
              : (language === 'tr' ? 'Analitik bağlanmadı' : 'Analytics not connected')}
          </p>
        </div>
      </div>

      {/* Quick Queries */}
      {messages.length === 0 && (
        <div className="space-y-2">
          <p className="font-display text-[10px] text-gray-500 uppercase tracking-wider">
            {language === 'tr' ? 'Hızlı Sorular' : 'Quick Queries'}
          </p>
          <div className="flex flex-wrap gap-2">
            {quickQueries.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => { setQuery(q); }}
                className="font-mono text-[10px] px-3 py-1.5 rounded-md bg-cyber-primary/10 text-cyber-primary/80 border border-cyber-primary/20 hover:bg-cyber-primary/20 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Count */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] text-gray-600">
            {messages.length} {language === 'tr' ? 'mesaj' : 'messages'}
          </span>
          <button
            type="button"
            onClick={() => setMessages([])}
            className="font-mono text-[9px] text-gray-600 hover:text-gray-400 transition-colors"
          >
            {language === 'tr' ? 'Temizle' : 'Clear'}
          </button>
        </div>
      )}

      {/* Chat Messages */}
      <div className="min-h-[200px] max-h-[400px] overflow-y-auto space-y-3 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 font-mono text-[11px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyber-primary/15 text-cyber-primary border border-cyber-primary/20'
                  : 'bg-glass-bg text-gray-300 border border-cyber-primary/20 shadow-[0_0_8px_rgba(6,232,249,0.06)]'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              {msg.role === 'agent' && msg.enrichedPrompt && onApplyEnrichedPrompt && (
                <div className="mt-3 pt-2 border-t border-glass-border">
                  <button
                    type="button"
                    onClick={() => onApplyEnrichedPrompt(msg.enrichedPrompt!)}
                    className="font-mono text-[10px] font-bold px-3 py-1.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition-colors uppercase tracking-wider"
                  >
                    {language === 'tr' ? "Dashboard'a uygula" : 'Apply to Dashboard'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="glass-card px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyber-primary animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-cyber-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-cyber-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
                <span className="font-mono text-[10px] text-gray-500 ml-1">
                  {language === 'tr' ? 'Agent düşünüyor...' : 'Agent thinking...'}
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={language === 'tr' ? 'Prompt kütüphanesinde ara...' : 'Search the prompt library...'}
          disabled={loading}
          className="flex-1 font-mono text-[11px] px-3 py-2.5 glass-input placeholder-gray-600 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="font-mono text-[10px] font-bold px-4 py-2.5 rounded-lg bg-cyber-primary/20 text-cyber-primary border border-cyber-primary/40 hover:bg-cyber-primary/30 transition-colors uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {loading
            ? (language === 'tr' ? 'Çalışıyor...' : 'Running...')
            : (language === 'tr' ? 'Sor' : 'Ask')}
        </button>
      </form>
    </div>
  );
};

export default AILabWorkbench;
