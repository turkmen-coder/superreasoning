/**
 * Prompt Version History & Diff Viewer — v3.2
 * Prompt'ların tüm versiyonlarını listeler, iki versiyon arasında diff gösterir.
 */
import { useState, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '../services/apiClient';
import { getVersionHistoryViaBrain } from '../services/brainClient';

interface VersionItem {
  id: string;
  version: string;
  name?: string;
  masterPrompt: string;
  reasoning?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

interface DiffChange {
  line: number;
  type: 'added' | 'removed' | 'changed' | 'unchanged';
  old?: string;
  new?: string;
  content?: string;
}

interface DiffResult {
  from: { version: string; createdAt: string; meta?: Record<string, unknown> };
  to: { version: string; createdAt: string; meta?: Record<string, unknown> };
  changes: DiffChange[];
  stats: { added: number; removed: number; changed: number; unchanged: number };
}

interface Props {
  promptId: string;
  agentMode?: boolean;
  onRestore?: (version: VersionItem) => void;
}

export default function VersionHistoryPanel({ promptId, agentMode = false, onRestore }: Props) {
  const { language } = useTranslation();
  const t = language === 'tr';
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [selectedV1, setSelectedV1] = useState('');
  const [selectedV2, setSelectedV2] = useState('');
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [showFull, setShowFull] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    if (versions.length > 0) { setExpanded(!expanded); return; }
    setLoading(true);
    setError('');
    try {
      let loaded: VersionItem[] = [];

      if (agentMode) {
        const brainData = await getVersionHistoryViaBrain({
          promptId,
          language: t ? 'tr' : 'en',
        });
        loaded = (brainData.versions || []) as VersionItem[];
      } else {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/prompts/${encodeURIComponent(promptId)}/versions`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        loaded = (data.versions || []) as VersionItem[];
      }

      setVersions(loaded);
      setExpanded(true);
      if (loaded.length >= 2) {
        setSelectedV1(loaded[1].version);
        setSelectedV2(loaded[0].version);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [promptId, versions.length, expanded, agentMode, t]);

  const loadDiff = useCallback(async () => {
    if (!selectedV1 || !selectedV2 || selectedV1 === selectedV2) return;
    setDiffLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_BASE}/prompts/${encodeURIComponent(promptId)}/diff?v1=${encodeURIComponent(selectedV1)}&v2=${encodeURIComponent(selectedV2)}`,
        { headers }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Diff failed');
      setDiff(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDiffLoading(false);
    }
  }, [promptId, selectedV1, selectedV2]);

  const exportDiff = useCallback(async (format: 'mermaid' | 'html') => {
    if (!selectedV1 || !selectedV2 || selectedV1 === selectedV2) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_BASE}/prompts/${encodeURIComponent(promptId)}/diff/export?format=${format}&v1=${encodeURIComponent(selectedV1)}&v2=${encodeURIComponent(selectedV2)}`,
        { headers }
      );
      if (!res.ok) throw new Error(await res.text() || 'Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
    } catch (e: any) {
      setError(e.message);
    }
  }, [promptId, selectedV1, selectedV2]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(t ? 'tr-TR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

  return (
    <div className="glass-card overflow-hidden" role="region" aria-label={t ? 'Versiyon Geçmişi' : 'Version History'}>
      {/* Header */}
      <button
        type="button"
        onClick={loadVersions}
        className="w-full flex items-center justify-between p-3 hover:bg-cyber-dark/30 transition-colors text-left"
        aria-expanded={expanded}
      >
        <h3 className="text-xs font-display font-bold uppercase tracking-wider text-gray-300">
          {t ? 'VERSİYON GEÇMİŞİ' : 'VERSION HISTORY'}
        </h3>
        <div className="flex items-center gap-2">
          {agentMode && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              AGENT
            </span>
          )}
          {versions.length > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-primary/20 text-cyber-primary">
              {versions.length} {t ? 'versiyon' : 'versions'}
            </span>
          )}
          {loading && <span className="text-[10px] font-mono text-gray-500 animate-pulse">...</span>}
          <span className="text-gray-500 text-xs">{expanded ? '▼' : '▶'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-glass-border p-3 space-y-3">
          {error && <p className="text-red-400 text-xs font-mono">{error}</p>}

          {/* Version list */}
          {versions.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {versions.map((v, i) => (
                <div
                  key={`${v.version}-${i}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-cyber-dark/40 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-mono font-bold ${i === 0 ? 'text-cyber-success' : 'text-gray-400'}`}>
                      v{v.version}
                    </span>
                    {i === 0 && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyber-success/20 text-cyber-success">
                        {t ? 'GÜNCEL' : 'LATEST'}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-gray-600 truncate">
                      {formatDate(v.createdAt)}
                    </span>
                    {!!v.meta?.framework && (
                      <span className="text-[9px] font-mono text-gray-600">{String(v.meta.framework)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setShowFull(showFull === v.version ? null : v.version)}
                      className="text-[9px] font-mono px-2 py-0.5 border border-glass-border rounded hover:border-cyber-primary/50 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showFull === v.version ? (t ? 'Gizle' : 'Hide') : (t ? 'Göster' : 'View')}
                    </button>
                    {onRestore && i > 0 && (
                      <button
                        onClick={() => onRestore(v)}
                        className="text-[9px] font-mono px-2 py-0.5 border border-amber-500/30 rounded hover:border-amber-500/60 text-amber-500/70 hover:text-amber-400 transition-colors"
                      >
                        {t ? 'Geri Yükle' : 'Restore'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full view of selected version */}
          {showFull && versions.find(v => v.version === showFull) && (
            <div className="border border-glass-border rounded p-2 bg-cyber-dark/40 max-h-64 overflow-y-auto">
              <pre className="text-[10px] font-mono text-gray-300 whitespace-pre-wrap">
                {versions.find(v => v.version === showFull)!.masterPrompt}
              </pre>
            </div>
          )}

          {/* Diff controls */}
          {versions.length >= 2 && (
            <div className="border-t border-glass-border pt-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-gray-500 uppercase">{t ? 'Karşılaştır:' : 'Compare:'}</span>
                <select
                  value={selectedV1}
                  onChange={(e) => { setSelectedV1(e.target.value); setDiff(null); }}
                  className="text-[10px] font-mono glass-card px-2 py-1 text-gray-300"
                >
                  {versions.map(v => (
                    <option key={v.version} value={v.version}>v{v.version}</option>
                  ))}
                </select>
                <span className="text-gray-600 text-xs">→</span>
                <select
                  value={selectedV2}
                  onChange={(e) => { setSelectedV2(e.target.value); setDiff(null); }}
                  className="text-[10px] font-mono glass-card px-2 py-1 text-gray-300"
                >
                  {versions.map(v => (
                    <option key={v.version} value={v.version}>v{v.version}</option>
                  ))}
                </select>
                <button
                  onClick={loadDiff}
                  disabled={diffLoading || selectedV1 === selectedV2}
                  className="text-[10px] font-mono font-bold px-3 py-1 rounded bg-cyber-primary/20 text-cyber-primary hover:bg-cyber-primary/30 disabled:opacity-40 transition-colors"
                >
                  {diffLoading ? '...' : 'DIFF'}
                </button>
                {selectedV1 && selectedV2 && selectedV1 !== selectedV2 && (
                  <>
                    <button
                      type="button"
                      onClick={() => exportDiff('mermaid')}
                      className="text-[10px] font-mono px-2 py-1 rounded bg-cyber-gray/20 text-cyber-primary/80 hover:bg-cyber-primary/20 transition-colors"
                    >
                      Mermaid
                    </button>
                    <button
                      type="button"
                      onClick={() => exportDiff('html')}
                      className="text-[10px] font-mono px-2 py-1 rounded bg-cyber-gray/20 text-cyber-primary/80 hover:bg-cyber-primary/20 transition-colors"
                    >
                      HTML
                    </button>
                  </>
                )}
              </div>

              {/* Diff result */}
              {diff && (
                <div className="mt-2 space-y-2">
                  {/* Stats bar */}
                  <div className="flex items-center gap-3 text-[10px] font-mono">
                    <span className="text-cyber-success">+{diff.stats.added}</span>
                    <span className="text-red-400">-{diff.stats.removed}</span>
                    <span className="text-amber-400">~{diff.stats.changed}</span>
                    <span className="text-gray-600">={diff.stats.unchanged}</span>
                    <span className="text-gray-500">
                      v{diff.from.version} → v{diff.to.version}
                    </span>
                  </div>

                  {/* Diff view */}
                  <div className="border border-glass-border rounded overflow-hidden max-h-80 overflow-y-auto">
                    {diff.changes
                      .filter(c => c.type !== 'unchanged')
                      .map((c, i) => (
                        <div key={i} className={`px-2 py-0.5 text-[10px] font-mono border-b border-glass-border/10 ${
                          c.type === 'added' ? 'bg-green-900/20 text-green-300' :
                          c.type === 'removed' ? 'bg-red-900/20 text-red-300' :
                          'bg-amber-900/10 text-amber-300'
                        }`}>
                          <span className="text-gray-600 mr-2 select-none">{c.line}</span>
                          {c.type === 'added' && <span>+ {c.new}</span>}
                          {c.type === 'removed' && <span>- {c.old}</span>}
                          {c.type === 'changed' && (
                            <span>
                              <span className="line-through text-red-400/60 mr-1">{c.old}</span>
                              → <span className="text-green-300">{c.new}</span>
                            </span>
                          )}
                        </div>
                      ))}
                    {diff.changes.every(c => c.type === 'unchanged') && (
                      <p className="p-2 text-gray-500 text-[10px] font-mono text-center">
                        {t ? 'Değişiklik yok' : 'No changes'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {versions.length === 0 && !loading && (
            <p className="text-gray-600 text-[10px] font-mono text-center py-4">
              {t ? 'Henüz kayıtlı versiyon yok' : 'No saved versions yet'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
