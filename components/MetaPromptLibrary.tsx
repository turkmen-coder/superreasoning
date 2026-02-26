/**
 * Meta-Prompt Library — Vault-style archive UI.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE, type StoredPromptItem } from '../services/apiClient';

const PAGE_SIZE = 18;

interface Props {
  onUsePrompt?: (prompt: StoredPromptItem) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* ignore */ }
  };
  return (
    <button onClick={copy}
      className={`p-1.5 rounded-lg border transition-all ${done ? 'text-cyber-success border-cyber-success/30 bg-cyber-success/10' : 'text-gray-600 border-white/8 hover:text-white hover:border-white/20'}`}>
      {done
        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
        : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
    </button>
  );
}

// ── Prompt Card ───────────────────────────────────────────────────────────────
function PromptCard({ prompt, onUsePrompt }: { prompt: StoredPromptItem; onUsePrompt?: (p: StoredPromptItem) => void }) {
  const [expanded, setExpanded] = useState(false);
  const meta = prompt.meta as Record<string, string> | undefined;
  const provider = meta?.provider ?? '';
  const color = providerColor(provider);
  const dot = sourceDot(prompt.id);
  const src = sourceLabel(prompt.id);

  return (
    <div
      className={`group relative rounded-2xl border bg-black/20 transition-all duration-200 flex flex-col overflow-hidden ${
        expanded ? 'border-white/15' : 'border-white/6 hover:border-white/12'
      }`}
    >
      {/* Accent line top */}
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${color}60 0%, transparent 60%)` }} />

      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* Source dot + badges */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: dot }} />
            <span className="font-mono text-[8px] uppercase tracking-widest flex-shrink-0" style={{ color: dot }}>{src}</span>
            {provider && (
              <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ color, background: color + '18', border: `1px solid ${color}30` }}>
                {provider}
              </span>
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <CopyBtn text={prompt.masterPrompt} />
            <svg className={`w-3.5 h-3.5 text-gray-700 transition-transform ${expanded ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-mono text-[12px] font-semibold text-white leading-snug mb-1.5 group-hover:text-cyber-primary transition-colors">
          {trunc(prompt.name || 'Untitled', 60)}
        </h3>

        {/* Preview */}
        <p className="font-mono text-[10px] text-gray-600 leading-relaxed line-clamp-2">
          {trunc(prompt.masterPrompt, 120)}
        </p>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
          <pre className="font-mono text-[10px] text-gray-300 whitespace-pre-wrap leading-relaxed bg-black/30 rounded-xl p-3.5 border border-white/5 max-h-64 overflow-y-auto">
            {prompt.masterPrompt}
          </pre>
          {onUsePrompt && (
            <button onClick={(e) => { e.stopPropagation(); onUsePrompt(prompt); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-accent/10 text-cyber-accent font-mono text-[10px] border border-cyber-accent/20 hover:bg-cyber-accent/20 transition-all">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Kullan
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MetaPromptLibrary({ onUsePrompt }: Props) {
  const { t, language } = useTranslation();
  const tr = language === 'tr';

  const [prompts, setPrompts] = useState<StoredPromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [page, setPage] = useState(0);

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
    if (selectedSource !== 'all') list = list.filter(p => sourceLabel(p.id) === selectedSource);
    if (selectedProvider !== 'all') list = list.filter(p => (p.meta as Record<string,string>)?.provider === selectedProvider);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        p.masterPrompt.toLowerCase().includes(q) ||
        ((p.meta as Record<string,string>)?.provider || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [prompts, selectedSource, selectedProvider, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  useEffect(() => { setPage(0); }, [search, selectedSource, selectedProvider]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border border-white/5" />
          <div className="absolute inset-0 rounded-full border-t border-cyber-primary animate-spin" />
          <div className="absolute inset-2 rounded-full border border-white/5" />
          <div className="absolute inset-2 rounded-full border-b border-cyber-accent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
        </div>
        <span className="font-mono text-[9px] text-gray-700 uppercase tracking-widest">
          {tr ? 'Arşiv yükleniyor' : 'Loading archive'}
        </span>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
      <div className="w-12 h-12 rounded-2xl bg-cyber-secondary/10 flex items-center justify-center border border-cyber-secondary/20">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff003c" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="font-mono text-[11px] text-gray-500">{error}</p>
      <button onClick={loadPrompts} className="px-4 py-2 rounded-xl bg-cyber-primary/10 text-cyber-primary font-mono text-[10px] border border-cyber-primary/20 hover:bg-cyber-primary/20 transition-colors">
        {tr ? 'Tekrar Dene' : 'Retry'}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Hero Banner ── */}
      <div className="px-6 pt-6 pb-5">
        <div className="relative rounded-2xl overflow-hidden border border-white/6 bg-black/20 p-6">
          {/* Background glow */}
          <div className="absolute -top-8 -left-8 w-48 h-48 rounded-full bg-cyber-primary/8 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-48 h-48 rounded-full bg-cyber-accent/8 blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-between gap-4">
            <div>
              {/* Stat row */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyber-primary animate-pulse" />
                  <span className="font-mono text-[9px] text-cyber-primary uppercase tracking-widest">
                    {filtered.length.toLocaleString()} / {prompts.length.toLocaleString()} {tr ? 'prompt' : 'prompts'}
                  </span>
                </div>
                <span className="w-px h-3 bg-white/10" />
                <div className="flex items-center gap-1.5">
                  {sources.map(src => (
                    <span key={src} className="font-mono text-[9px] text-gray-600">
                      {src}: {prompts.filter(p => sourceLabel(p.id) === src).length}
                    </span>
                  ))}
                </div>
              </div>

              <h1 className="font-mono text-xl font-bold text-white mb-1">
                {t.ui.metaPromptLibTitle}
              </h1>
              <p className="font-mono text-[11px] text-gray-500">
                {t.ui.metaPromptLibSubtitle}
              </p>
            </div>

            {/* Icon cluster */}
            <div className="flex-shrink-0 hidden md:grid grid-cols-3 gap-1.5 opacity-40">
              {['#06e8f9','#9d00ff','#ff003c','#d97706','#22c55e','#3b82f6','#f97316','#ec4899','#8b5cf6'].map((c, i) => (
                <div key={i} className="w-6 h-6 rounded-lg" style={{ background: c + '20', border: `1px solid ${c}30` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="px-6 pb-4 flex flex-col gap-2.5">
        {/* Search row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t.ui.metaPromptLibSearch}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white/4 border border-white/8 font-mono text-[11px] text-white placeholder-gray-700 focus:outline-none focus:border-cyber-primary/40 transition-colors" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-white/4 border border-white/8 font-mono text-[10px] text-gray-300 focus:outline-none focus:border-cyber-primary/40 transition-colors">
            <option value="all">{tr ? 'Tüm Sağlayıcılar' : 'All Providers'}</option>
            {providers.map(pv => <option key={pv} value={pv}>{pv}</option>)}
          </select>

          <button onClick={loadPrompts} className="p-2.5 rounded-xl bg-white/4 border border-white/8 text-gray-600 hover:text-cyber-primary hover:border-cyber-primary/30 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>

        {/* Source + page nav row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {['all', ...sources].map(src => (
              <button key={src} onClick={() => setSelectedSource(src)}
                className={`px-3 py-1.5 rounded-lg font-mono text-[9px] uppercase tracking-wider border transition-all ${
                  selectedSource === src
                    ? 'bg-cyber-primary/15 text-cyber-primary border-cyber-primary/30'
                    : 'text-gray-600 border-white/6 hover:text-gray-300 hover:border-white/15'
                }`}>
                {src === 'all' ? (tr ? 'Tümü' : 'All') : src}
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] text-gray-700">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1 rounded text-gray-700 hover:text-white disabled:opacity-20 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-1 rounded text-gray-700 hover:text-white disabled:opacity-20 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 px-6 pb-6">
        {paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/6 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <p className="font-mono text-[11px] text-gray-600">{tr ? 'Sonuç bulunamadı' : 'No results found'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {paged.map(p => (
              <PromptCard key={p.id} prompt={p} onUsePrompt={onUsePrompt} />
            ))}
          </div>
        )}

        {/* Page dots */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-8">
            {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
              const n = totalPages <= 9 ? i : page < 4 ? i : page > totalPages - 5 ? totalPages - 9 + i : page - 4 + i;
              return (
                <button key={n} onClick={() => setPage(n)}
                  className={`rounded-full transition-all ${n === page ? 'w-5 h-1.5 bg-cyber-primary' : 'w-1.5 h-1.5 bg-white/12 hover:bg-white/30'}`} />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
