/**
 * Prompt Library — Vault-style archive UI.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE, type StoredPromptItem } from '../services/apiClient';

const PAGE_SIZE = 20;

interface Props {
  onUsePrompt?: (prompt: StoredPromptItem) => void;
}

interface LangExtractResponse {
  enabled: boolean;
  model: string;
  keywords: string[];
  summary: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const PROVIDER_COLORS: Record<string, string> = {
  openai: '#06e8f9', anthropic: '#d97706', google: '#22c55e',
  perplexity: '#a855f7', xai: '#f59e0b', cursor: '#3b82f6',
  windsurf: '#06b6d4', devin: '#ec4899', replit: '#f97316',
  lovable: '#e11d48', manus: '#8b5cf6', default: '#6b7280',
};

function providerColor(name: string): string {
  const key = (name || '').toLowerCase().split(' ')[0];
  return PROVIDER_COLORS[key] ?? PROVIDER_COLORS.default;
}

function sourceLabel(id: string): string {
  if (id.startsWith('spl-')) return 'Leaks';
  if (id.startsWith('spat-')) return 'AI Tools';
  return 'Custom';
}

function sourceDot(id: string): string {
  if (id.startsWith('spl-')) return '#ff003c';
  if (id.startsWith('spat-')) return '#9d00ff';
  return '#06e8f9';
}

function trunc(t: string, n: number): string {
  return t.length > n ? t.slice(0, n) + '…' : t;
}

// ── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ prompt, onClose, onUsePrompt, tr }: {
  prompt: StoredPromptItem;
  onClose: () => void;
  onUsePrompt?: (p: StoredPromptItem) => void;
  tr: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<LangExtractResponse | null>(null);
  const [analysisErr, setAnalysisErr] = useState('');
  const meta = prompt.meta as Record<string, string> | undefined;
  const color = providerColor(meta?.provider ?? '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.masterPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisErr('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/langextract/analyze`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt.masterPrompt, language: tr ? 'tr' : 'en' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setAnalysis({
        enabled: Boolean(data.enabled),
        model: String(data.model || ''),
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        summary: String(data.summary || ''),
      });
    } catch (e: unknown) {
      setAnalysisErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-white/5 flex-shrink-0">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sourceDot(prompt.id) }} />
            <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: sourceDot(prompt.id) }}>
              {sourceLabel(prompt.id)}
            </span>
            {meta?.provider && (
              <span className="font-mono text-[9px] px-2 py-0.5 rounded-full" style={{ color, background: color + '18', border: `1px solid ${color}30` }}>
                {meta.provider}
              </span>
            )}
          </div>
          <h2 className="font-mono text-sm font-bold text-white leading-snug">{prompt.name || 'Untitled'}</h2>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-colors flex-shrink-0 mt-0.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <pre className="font-mono text-[11px] text-gray-300 whitespace-pre-wrap leading-relaxed bg-black/25 rounded-xl p-4 border border-white/5">
          {prompt.masterPrompt}
        </pre>

        {prompt.reasoning && (
          <div className="rounded-lg p-3 border border-white/5 bg-white/2">
            <p className="font-mono text-[8px] uppercase tracking-widest text-gray-600 mb-1.5">{tr ? 'Kaynak' : 'Source'}</p>
            <p className="font-mono text-[10px] text-gray-500 leading-relaxed">{prompt.reasoning}</p>
          </div>
        )}

        {analysis && (
          <div className="rounded-xl p-3 border border-cyber-primary/20 bg-cyber-primary/5">
            <p className="font-mono text-[8px] uppercase tracking-widest text-cyber-primary mb-2">
              LangExtract{analysis.model ? ` · ${analysis.model}` : ''}
            </p>
            <div className="flex flex-wrap gap-1 mb-2">
              {analysis.keywords.slice(0, 12).map(kw => (
                <span key={kw} className="px-1.5 py-0.5 rounded bg-cyber-primary/10 text-cyber-primary font-mono text-[9px] border border-cyber-primary/20">{kw}</span>
              ))}
            </div>
            {analysis.summary && <p className="font-mono text-[10px] text-gray-400 leading-relaxed">{analysis.summary}</p>}
          </div>
        )}
        {analysisErr && <p className="font-mono text-[10px] text-cyber-secondary">{analysisErr}</p>}
      </div>

      {/* Actions */}
      <div className="px-5 py-3.5 border-t border-white/5 flex items-center gap-2 flex-wrap flex-shrink-0">
        <button onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] border transition-all ${
            copied
              ? 'bg-cyber-success/10 text-cyber-success border-cyber-success/30'
              : 'bg-cyber-primary/10 text-cyber-primary border-cyber-primary/20 hover:bg-cyber-primary/20'
          }`}>
          {copied
            ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>{tr ? 'Kopyalandı' : 'Copied'}</>
            : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>{tr ? 'Kopyala' : 'Copy'}</>}
        </button>
        {onUsePrompt && (
          <button onClick={() => onUsePrompt(prompt)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-accent/10 text-cyber-accent font-mono text-[10px] border border-cyber-accent/20 hover:bg-cyber-accent/20 transition-all">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            {tr ? 'Kullan' : 'Use'}
          </button>
        )}
        <button onClick={handleAnalyze} disabled={analyzing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 font-mono text-[10px] border border-white/8 hover:bg-white/10 disabled:opacity-50 transition-all">
          {analyzing ? (tr ? 'Analiz…' : 'Analyzing…') : 'LangExtract'}
        </button>
        <div className="flex-1" />
        <span className="font-mono text-[8px] text-gray-700">
          {new Date(prompt.createdAt).toLocaleDateString(tr ? 'tr-TR' : 'en-US')}
        </span>
      </div>
    </div>
  );
}

// ── Row item ──────────────────────────────────────────────────────────────────
function PromptRow({ prompt, active, onClick }: {
  prompt: StoredPromptItem;
  active: boolean;
  onClick: () => void;
}) {
  const meta = prompt.meta as Record<string, string> | undefined;
  const color = providerColor(meta?.provider ?? '');
  const dot = sourceDot(prompt.id);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-white/4 transition-all group ${
        active
          ? 'bg-white/6 border-l-2 border-l-cyber-primary'
          : 'hover:bg-white/3 border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: dot }} />
        <div className="flex-1 min-w-0">
          <p className={`font-mono text-[11px] font-medium truncate leading-snug ${active ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
            {prompt.name || 'Untitled'}
          </p>
          <p className="font-mono text-[9px] text-gray-600 mt-0.5 truncate leading-snug">
            {trunc(prompt.masterPrompt, 80)}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            {meta?.provider && (
              <span className="font-mono text-[8px] px-1.5 py-0.5 rounded" style={{ color, background: color + '15', border: `1px solid ${color}25` }}>
                {meta.provider}
              </span>
            )}
            <span className="font-mono text-[8px] text-gray-700 px-1.5 py-0.5 rounded bg-white/4">
              {sourceLabel(prompt.id)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PromptLibrary({ onUsePrompt }: Props) {
  const { language } = useTranslation();
  const tr = language === 'tr';

  const [prompts, setPrompts] = useState<StoredPromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [page, setPage] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  const loadPrompts = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/prompts`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setPrompts(data.prompts || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPrompts(); }, [loadPrompts]);

  const providers = useMemo(() => {
    const s = new Set<string>();
    prompts.forEach(p => { const v = (p.meta as Record<string,string>)?.provider; if (v) s.add(v); });
    return Array.from(s).sort();
  }, [prompts]);

  const sources = useMemo(() => {
    const s = new Set<string>();
    prompts.forEach(p => s.add(sourceLabel(p.id)));
    return Array.from(s).sort();
  }, [prompts]);

  const filtered = useMemo(() => {
    let list = prompts;
    if (selectedProvider !== 'all') list = list.filter(p => (p.meta as Record<string,string>)?.provider === selectedProvider);
    if (selectedSource !== 'all') list = list.filter(p => sourceLabel(p.id) === selectedSource);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        p.masterPrompt.toLowerCase().includes(q) ||
        ((p.meta as Record<string,string>)?.provider || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [prompts, selectedProvider, selectedSource, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  useEffect(() => { setPage(0); setActiveId(null); }, [search, selectedProvider, selectedSource]);

  const activePrompt = useMemo(() => prompts.find(p => p.id === activeId) ?? null, [prompts, activeId]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border border-white/5" />
          <div className="absolute inset-0 rounded-full border-t border-cyber-primary animate-spin" />
        </div>
        <span className="font-mono text-[9px] text-gray-700 uppercase tracking-widest">
          {tr ? 'Arşiv yükleniyor' : 'Loading archive'}
        </span>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-10 h-10 rounded-full bg-cyber-secondary/10 flex items-center justify-center border border-cyber-secondary/20">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff003c" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="font-mono text-[10px] text-gray-500">{error}</p>
      <button onClick={loadPrompts} className="px-4 py-1.5 rounded-lg bg-cyber-primary/10 text-cyber-primary font-mono text-[10px] border border-cyber-primary/20 hover:bg-cyber-primary/20 transition-colors">
        {tr ? 'Tekrar Dene' : 'Retry'}
      </button>
    </div>
  );

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tr ? 'Prompt ara…' : 'Search prompts…'}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/4 border border-white/8 font-mono text-[11px] text-white placeholder-gray-700 focus:outline-none focus:border-cyber-primary/40 transition-colors" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Source chips */}
        <div className="flex items-center gap-1">
          {['all', ...sources].map(src => (
            <button key={src} onClick={() => setSelectedSource(src)}
              className={`px-2.5 py-1.5 rounded-lg font-mono text-[9px] uppercase tracking-wider border transition-all ${
                selectedSource === src
                  ? 'bg-cyber-primary/15 text-cyber-primary border-cyber-primary/30'
                  : 'text-gray-600 border-white/6 hover:text-gray-300 hover:border-white/15'
              }`}>
              {src === 'all' ? (tr ? 'Tümü' : 'All') : src}
            </button>
          ))}
        </div>

        {/* Provider select */}
        <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-white/4 border border-white/8 font-mono text-[10px] text-gray-300 focus:outline-none focus:border-cyber-primary/40 transition-colors">
          <option value="all">{tr ? 'Tüm Sağlayıcılar' : 'All Providers'}</option>
          {providers.map(pv => <option key={pv} value={pv}>{pv}</option>)}
        </select>

        {/* Stats + refresh */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="font-mono text-[9px] text-gray-700 tabular-nums">
            {filtered.length} {tr ? 'prompt' : 'prompts'}
          </span>
          <button onClick={loadPrompts} className="p-1.5 rounded-lg text-gray-700 hover:text-cyber-primary hover:bg-white/5 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Body: list + detail ── */}
      <div className="flex gap-3" style={{ minHeight: '520px' }}>

        {/* List panel */}
        <div className={`flex flex-col rounded-2xl border border-white/6 bg-black/20 overflow-hidden transition-all ${activePrompt ? 'w-[42%]' : 'w-full'}`}>
          {/* List header */}
          <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between flex-shrink-0">
            <span className="font-mono text-[9px] uppercase tracking-widest text-gray-600">
              {tr ? 'Arşiv' : 'Archive'} · {tr ? 'Sayfa' : 'Page'} {page + 1}/{Math.max(1, totalPages)}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1 rounded text-gray-700 hover:text-white disabled:opacity-20 transition-colors">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-1 rounded text-gray-700 hover:text-white disabled:opacity-20 transition-colors">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto">
            {paged.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                <svg className="w-10 h-10 text-gray-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <p className="font-mono text-[10px] text-gray-700">{tr ? 'Sonuç yok' : 'No results'}</p>
              </div>
            ) : (
              paged.map(p => (
                <PromptRow key={p.id} prompt={p} active={activeId === p.id}
                  onClick={() => setActiveId(activeId === p.id ? null : p.id)} />
              ))
            )}
          </div>

          {/* Page dots */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 py-2.5 border-t border-white/5 flex-shrink-0">
              {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
                const n = totalPages <= 9 ? i : page < 4 ? i : page > totalPages - 5 ? totalPages - 9 + i : page - 4 + i;
                return (
                  <button key={n} onClick={() => setPage(n)}
                    className={`rounded-full transition-all ${n === page ? 'w-4 h-1.5 bg-cyber-primary' : 'w-1.5 h-1.5 bg-white/15 hover:bg-white/30'}`} />
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {activePrompt && (
          <div className="flex-1 rounded-2xl border border-white/6 bg-black/20 overflow-hidden">
            <DetailPanel prompt={activePrompt} onClose={() => setActiveId(null)}
              onUsePrompt={onUsePrompt} tr={tr} />
          </div>
        )}
      </div>
    </div>
  );
}
