import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { TEMPLATES, TemplateItem } from '../data/templates';

interface TemplateSelectorProps {
  onSelect: (template: TemplateItem) => void;
  className?: string;
}

/* ────── Domain → emoji map ────── */
const DOMAIN_ICONS: Record<string, string> = {
  auto: '⚡', general: '🧩', frontend: '🎨', backend: '⚙️',
  architecture: '🏛️', analysis: '📊', 'image-video': '🎬', testing: '🧪',
  'ui-design': '🖌️', 'ml-ai': '🤖', 'devops-sre': '🚀', 'mobile-dev': '📱',
  cybersecurity: '🔒', 'data-engineering': '🗄️', 'nlp-llm': '💬',
  'cloud-native': '☁️', fintech: '💳', 'saas-product': '🌐',
  'blockchain-web3': '⛓️', 'api-integration': '🔌', 'ecommerce-growth': '🛒',
  accessibility: '♿', 'game-dev': '🎮', healthcare: '🏥', 'content-marketing': '✍️',
};

/* ────── Unique domain categories ────── */
const ALL_DOMAINS = ['all', ...Array.from(new Set(TEMPLATES.map(t => t.domainId)))];

/* ────── localStorage helpers ────── */
const FAVS_KEY = 'sr_template_favs';
const RECENT_KEY = 'sr_template_recent';

function loadFavs(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(FAVS_KEY) || '[]')); } catch { return new Set(); }
}
function saveFavs(s: Set<string>) { localStorage.setItem(FAVS_KEY, JSON.stringify([...s])); }
function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function saveRecent(ids: string[]) { localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, 5))); }

/* ────── Component ────── */
const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelect, className = '' }) => {
  const { t, language } = useTranslation();
  const isTr = language === 'tr';

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('all');
  const [favs, setFavs] = useState<Set<string>>(loadFavs);
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  /* ── Filter logic ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return TEMPLATES.filter(tpl => {
      if (domain !== 'all' && tpl.domainId !== domain) return false;
      if (!q) return true;
      const name = isTr ? tpl.name : tpl.nameEn;
      const desc = isTr ? tpl.description : tpl.descriptionEn;
      return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q) || tpl.domainId.includes(q) || String(tpl.framework).toLowerCase().includes(q);
    });
  }, [search, domain, isTr]);

  /* ── Recent templates (full items) ── */
  const recentTemplates = useMemo(() =>
    recent.map(id => TEMPLATES.find(t => t.id === id)).filter(Boolean) as TemplateItem[],
    [recent]);

  /* ── Handlers ── */
  const handleSelect = useCallback((tpl: TemplateItem) => {
    onSelect(tpl);
    const next = [tpl.id, ...recent.filter(id => id !== tpl.id)];
    setRecent(next); saveRecent(next);
    setOpen(false); setSearch(''); setDomain('all');
  }, [onSelect, recent]);

  const toggleFav = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveFavs(next); return next;
    });
  }, []);

  /* ── Hovered template ── */
  const hovered = hoveredId ? TEMPLATES.find(t => t.id === hoveredId) : null;

  return (
    <div className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border font-mono text-[10px] uppercase tracking-wider transition-all ${open ? 'border-cyber-primary/60 bg-cyber-primary/10 text-cyber-primary' : 'border-cyber-border/40 text-gray-500 hover:border-cyber-border/70 hover:text-gray-300'
          }`}
      >
        <div className="flex items-center gap-2">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
          <span>{t.ui.templateLabel}</span>
          {recent.length > 0 && <span className="px-1 py-0.5 rounded bg-cyber-primary/15 text-cyber-primary/80 text-[8px]">📋 {recent.length} son</span>}
          {favs.size > 0 && <span className="px-1 py-0.5 rounded bg-yellow-500/15 text-yellow-400/80 text-[8px]">⭐ {favs.size}</span>}
        </div>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 glass-card border border-cyber-border/40 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search + domain filter */}
          <div className="p-3 border-b border-cyber-border/20 space-y-2">
            <div className="relative">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ara... (design, backend, react...)"
                className="w-full pl-7 pr-3 py-1.5 bg-cyber-dark/60 border border-cyber-border/30 rounded-lg font-mono text-[10px] text-gray-300 placeholder-gray-700 focus:outline-none focus:border-cyber-primary/40" />
            </div>
            {/* Domain tabs - scrollable */}
            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {ALL_DOMAINS.slice(0, 12).map(d => (
                <button key={d} type="button" onClick={() => setDomain(d)}
                  className={`flex-shrink-0 px-2 py-0.5 rounded-md font-mono text-[8px] uppercase tracking-wider transition-all ${domain === d ? 'bg-cyber-primary/20 border border-cyber-primary/50 text-cyber-primary' : 'border border-cyber-border/30 text-gray-600 hover:text-gray-400'
                    }`}>
                  {d === 'all' ? '🌐 Tümü' : `${DOMAIN_ICONS[d] || '📌'} ${d}`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex max-h-[60vh] overflow-hidden">
            {/* Template list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {/* Recent */}
              {!search && domain === 'all' && recentTemplates.length > 0 && (
                <div>
                  <div className="font-mono text-[8px] text-gray-600 uppercase tracking-wider px-1 mb-1">📋 Son Kullanılanlar</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {recentTemplates.map(tpl => (
                      <TemplateCard key={tpl.id} tpl={tpl} isTr={isTr} fav={favs.has(tpl.id)}
                        hovered={hoveredId === tpl.id} onHover={setHoveredId}
                        onSelect={handleSelect} onToggleFav={toggleFav} badge="recent" />
                    ))}
                  </div>
                </div>
              )}

              {/* Favorites */}
              {!search && domain === 'all' && favs.size > 0 && (
                <div>
                  <div className="font-mono text-[8px] text-gray-600 uppercase tracking-wider px-1 mb-1">⭐ Favoriler</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TEMPLATES.filter(t => favs.has(t.id)).map(tpl => (
                      <TemplateCard key={tpl.id} tpl={tpl} isTr={isTr} fav={true}
                        hovered={hoveredId === tpl.id} onHover={setHoveredId}
                        onSelect={handleSelect} onToggleFav={toggleFav} />
                    ))}
                  </div>
                </div>
              )}

              {/* All / filtered */}
              <div>
                {(search || domain !== 'all' || recentTemplates.length > 0 || favs.size > 0) && (
                  <div className="font-mono text-[8px] text-gray-600 uppercase tracking-wider px-1 mb-1">
                    {search ? `🔍 "${search}" — ${filtered.length} sonuç` : domain !== 'all' ? `${DOMAIN_ICONS[domain] || '📌'} ${domain}` : '📑 Tümü'}
                  </div>
                )}
                {filtered.length === 0 ? (
                  <div className="py-8 text-center font-mono text-[10px] text-gray-600">Sonuç bulunamadı</div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {filtered.map(tpl => (
                      <TemplateCard key={tpl.id} tpl={tpl} isTr={isTr} fav={favs.has(tpl.id)}
                        hovered={hoveredId === tpl.id} onHover={setHoveredId}
                        onSelect={handleSelect} onToggleFav={toggleFav} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Preview pane */}
            {hovered && (
              <div className="w-64 flex-shrink-0 border-l border-cyber-border/20 p-4 overflow-y-auto bg-cyber-dark/30">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">{DOMAIN_ICONS[hovered.domainId] || '📌'}</span>
                    <div>
                      <div className="font-mono text-[10px] font-bold text-white">{isTr ? hovered.name : hovered.nameEn}</div>
                      <div className="font-mono text-[8px] text-cyber-primary/70 mt-0.5">{hovered.framework}</div>
                    </div>
                  </div>
                  <p className="font-mono text-[9px] text-gray-500 leading-relaxed">
                    {isTr ? hovered.description : hovered.descriptionEn}
                  </p>
                  <div>
                    <div className="font-mono text-[8px] text-gray-600 uppercase mb-1">Intent Preview</div>
                    <p className="font-mono text-[9px] text-gray-400 leading-relaxed line-clamp-6">
                      {isTr ? hovered.intentTr : hovered.intentEn}
                    </p>
                  </div>
                  <button type="button" onClick={() => { const t = TEMPLATES.find(x => x.id === hovered.id); if (t) handleSelect(t); }}
                    className="w-full py-2 rounded-lg bg-cyber-primary/20 border border-cyber-primary/40 text-cyber-primary font-mono text-[9px] uppercase tracking-wider hover:bg-cyber-primary/30 transition-all">
                    ⚡ Yükle
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-cyber-border/20">
            <span className="font-mono text-[8px] text-gray-700">{TEMPLATES.length} şablon • hover = önizleme • ⭐ = favorile</span>
            <button type="button" onClick={() => setOpen(false)} className="font-mono text-[9px] text-gray-600 hover:text-gray-300 transition-colors">Kapat ✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ────── Template Card ────── */
interface CardProps {
  tpl: TemplateItem; isTr: boolean; fav: boolean; hovered: boolean;
  badge?: 'recent';
  onHover: (id: string | null) => void;
  onSelect: (tpl: TemplateItem) => void;
  onToggleFav: (id: string, e: React.MouseEvent) => void;
}

const TemplateCard: React.FC<CardProps> = ({ tpl, isTr, fav, hovered, badge, onHover, onSelect, onToggleFav }) => (
  <button
    type="button"
    onClick={() => onSelect(tpl)}
    onMouseEnter={() => onHover(tpl.id)}
    onMouseLeave={() => onHover(null)}
    className={`relative w-full text-left p-2.5 rounded-lg border transition-all duration-150 group ${hovered ? 'border-cyber-primary/60 bg-cyber-primary/10' : 'border-cyber-border/30 hover:border-cyber-border/60 bg-cyber-dark/20 hover:bg-cyber-dark/40'
      }`}
  >
    <div className="flex items-start justify-between gap-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-base flex-shrink-0">{DOMAIN_ICONS[tpl.domainId] || '📌'}</span>
        <span className="font-mono text-[9px] font-bold text-gray-300 truncate">
          {isTr ? tpl.name : tpl.nameEn}
        </span>
      </div>
      <button
        type="button"
        onClick={(e) => onToggleFav(tpl.id, e)}
        className={`flex-shrink-0 text-[11px] transition-opacity ${fav ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'} ${fav ? 'text-yellow-400' : 'text-gray-500'}`}
        title={fav ? 'Favoriden kaldır' : 'Favoriye ekle'}
      >
        {fav ? '⭐' : '☆'}
      </button>
    </div>
    <div className="flex items-center gap-1 mt-1.5">
      <span className="px-1 py-0.5 rounded bg-cyber-border/30 font-mono text-[7px] text-gray-600 uppercase">{tpl.framework}</span>
      {badge === 'recent' && <span className="px-1 py-0.5 rounded bg-cyber-primary/10 font-mono text-[7px] text-cyber-primary/60">son</span>}
    </div>
  </button>
);

export default TemplateSelector;
