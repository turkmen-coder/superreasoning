/**
 * Regression Report — Detayli expandable test raporu.
 */
import { useState, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '../services/apiClient';
import type { RegressionResult } from '../types/regression';

interface Props {
  promptId: string;
}

interface RunHistoryItem {
  id: string;
  version: string;
  triggerType: string;
  status: string;
  summary: any;
  startedAt: string;
  completedAt: string;
  createdAt: string;
}

export default function RegressionReport({ promptId }: Props) {
  const { language } = useTranslation();
  const t = language === 'tr';
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<RunHistoryItem[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [runResults, setRunResults] = useState<RegressionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/prompts/${promptId}/regression-history`, { headers });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.runs ?? []);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load history');
    }
    setLoading(false);
  }, [promptId]);

  const loadRunDetails = useCallback(async (runId: string) => {
    setSelectedRun(runId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/regression-runs/${runId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRunResults(data.results ?? []);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load run details');
    }
  }, []);

  const handleToggle = () => {
    if (!expanded) loadHistory();
    setExpanded(!expanded);
  };

  const exportJSON = () => {
    const data = { run: history.find(h => h.id === selectedRun), results: runResults };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regression-report-${selectedRun?.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusColor = (s: string) => {
    if (s === 'passed') return 'text-emerald-400';
    if (s === 'failed') return 'text-red-400';
    if (s === 'error') return 'text-orange-400';
    return 'text-gray-500';
  };

  return (
    <div className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-glass-bg hover:bg-[#0e0e1a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
            <path d="M9 17H5a2 2 0 0 0-2 2 2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm12-2h-4a2 2 0 0 0-2 2 2 2 0 0 0 2 2h2a2 2 0 0 0 2-2z" />
            <polyline points="12 12 12 3" />
            <path d="M16 6l-4-4-4 4" />
          </svg>
          <span className="font-display text-xs font-bold text-gray-300 uppercase tracking-wider">
            {t ? 'Regresyon Raporu' : 'Regression Report'}
          </span>
          {history.length > 0 && (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {history.length} runs
            </span>
          )}
        </div>
        <span className="text-gray-500 text-xs">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="p-4 bg-glass-bg border-t border-indigo-500/10 space-y-3">
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-[10px] font-mono">
              {error}
            </div>
          )}
          {loading ? (
            <p className="font-mono text-[10px] text-gray-500 animate-pulse">Loading...</p>
          ) : history.length === 0 ? (
            <p className="font-mono text-[10px] text-gray-500">
              {t ? 'Henuz regresyon calistirilmadi.' : 'No regression runs yet.'}
            </p>
          ) : (
            <>
              {/* Run History */}
              <div className="space-y-1">
                {history.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => loadRunDetails(run.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded border text-[10px] font-mono transition-colors ${
                      selectedRun === run.id
                        ? 'border-indigo-500/40 bg-indigo-500/10'
                        : 'border-glass-border/10 bg-cyber-dark/40 hover:bg-cyber-dark/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-bold uppercase ${statusColor(run.status)}`}>
                        {run.status}
                      </span>
                      <span className="text-gray-400">v{run.version}</span>
                      <span className="text-gray-600">{run.triggerType}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      {run.summary && <span>{run.summary.passed}/{run.summary.totalTests}</span>}
                      <span>{new Date(run.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Run Detail */}
              {selectedRun && runResults.length > 0 && (
                <div className="pt-3 border-t border-glass-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">
                      {t ? 'Detayli Sonuclar' : 'Detailed Results'}
                    </span>
                    <button
                      type="button"
                      onClick={exportJSON}
                      className="font-mono text-[9px] text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Export JSON
                    </button>
                  </div>

                  {runResults.map((r) => (
                    <details key={r.id} className="group">
                      <summary className="flex items-center justify-between px-3 py-2 bg-cyber-dark/40 border border-glass-border/10 rounded cursor-pointer hover:bg-cyber-dark/60 text-[10px] font-mono">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold uppercase ${statusColor(r.status)}`}>{r.status}</span>
                          <span className="text-gray-300">{r.testType.replace(/_/g, ' ')}</span>
                          {(r.details as any)?.testName && (
                            <span className="text-gray-500">— {(r.details as any).testName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {r.score != null && <span className="text-gray-400">{r.score}%</span>}
                          {r.durationMs != null && <span className="text-gray-600">{r.durationMs}ms</span>}
                        </div>
                      </summary>
                      <div className="mt-1 px-3 py-2 bg-[#060610] border border-glass-border/10 rounded text-[9px] font-mono space-y-1">
                        {r.expected && (
                          <div>
                            <span className="text-gray-500">Expected: </span>
                            <span className="text-emerald-400/80">{r.expected}</span>
                          </div>
                        )}
                        {r.actualOutput && (
                          <div>
                            <span className="text-gray-500">Actual: </span>
                            <span className="text-cyan-400/80">{r.actualOutput.slice(0, 300)}</span>
                          </div>
                        )}
                        <div className="text-gray-600">
                          {JSON.stringify(r.details, null, 2).slice(0, 500)}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
