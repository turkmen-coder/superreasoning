/**
 * Regression Panel — Regression test runner ve sonuç dashboard.
 */
import { useState, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '../services/apiClient';
import type { RegressionRun, RegressionResult, RegressionRunSummary } from '../types/regression';

interface Props {
  promptId: string;
  version: string;
}

export default function RegressionPanel({ promptId, version }: Props) {
  const { language } = useTranslation();
  const t = language === 'tr';
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<RegressionRun | null>(null);
  const [results, setResults] = useState<RegressionResult[]>([]);
  const [error, setError] = useState('');

  // Config
  const [judgeThreshold, setJudgeThreshold] = useState(60);
  const [lintMustPass, setLintMustPass] = useState(true);
  const [contractMustPass, setContractMustPass] = useState(true);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setError('');
    setRun(null);
    setResults([]);
    try {
      const headers = { ...(await getAuthHeaders()), 'Content-Type': 'application/json' };
      const res = await fetch(`${API_BASE}/prompts/${promptId}/versions/${version}/test`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          triggerType: 'manual',
          config: { judgeThreshold, lintMustPass, contractMustPass },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRun(data.run);
      setResults(data.results ?? []);
    } catch (e: any) {
      setError(e.message || 'Regression run failed');
    } finally {
      setRunning(false);
    }
  }, [promptId, version, judgeThreshold, lintMustPass, contractMustPass]);

  // Load last results
  const loadLastResults = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/prompts/${promptId}/versions/${version}/test-results`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRun(data.run);
        setResults(data.results ?? []);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load results');
    }
  }, [promptId, version]);

  const summary = run?.summary as RegressionRunSummary | null;
  const gateResults = summary?.gateResults;

  const statusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-emerald-400';
      case 'failed': return 'text-red-400';
      case 'skipped': return 'text-gray-500';
      case 'error': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const statusBg = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-emerald-500/10 border-emerald-500/30';
      case 'failed': return 'bg-red-500/10 border-red-500/30';
      default: return 'bg-gray-500/10 border-gray-500/30';
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 glass-card flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.5">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span className="font-display text-xs font-bold text-gray-300 uppercase tracking-wider">
            {t ? 'Regresyon Testi' : 'Regression Testing'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadLastResults}
            className="font-mono text-[9px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            {t ? 'Son Sonuc' : 'Last Result'}
          </button>
        </div>
      </div>

      <div className="p-4 bg-glass-bg border-t border-purple-500/10 space-y-4">
        {/* Config */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block mb-1">
              Judge Threshold
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={judgeThreshold}
              onChange={(e) => setJudgeThreshold(parseInt(e.target.value) || 60)}
              className="w-full glass-card px-2 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer self-end pb-1.5">
            <input
              type="checkbox"
              checked={lintMustPass}
              onChange={(e) => setLintMustPass(e.target.checked)}
              className="rounded border-glass-border bg-cyber-dark text-purple-500"
            />
            <span className="font-mono text-[10px] text-gray-400">Lint Must Pass</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer self-end pb-1.5">
            <input
              type="checkbox"
              checked={contractMustPass}
              onChange={(e) => setContractMustPass(e.target.checked)}
              className="rounded border-glass-border bg-cyber-dark text-purple-500"
            />
            <span className="font-mono text-[10px] text-gray-400">Contract Must Pass</span>
          </label>
        </div>

        {/* Run Button */}
        <button
          type="button"
          onClick={handleRun}
          disabled={running || !promptId || !version}
          className={`w-full py-3 rounded-lg font-mono text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2
            ${running
              ? 'bg-purple-500/20 text-purple-400/60 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] active:scale-[0.99]'
            }`}
        >
          {running ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t ? 'CALISTIRILIYOR...' : 'RUNNING...'}
            </>
          ) : (
            <>{t ? 'REGRESYON CALISTIR' : 'RUN REGRESSION'}</>
          )}
        </button>

        {error && <p className="text-red-400 text-[10px] font-mono">{error}</p>}

        {/* Overall Banner */}
        {run && (
          <div className={`p-3 rounded-lg border ${statusBg(run.status)}`}>
            <div className="flex items-center justify-between">
              <span className={`font-mono text-sm font-bold uppercase ${statusColor(run.status)}`}>
                {run.status.toUpperCase()}
              </span>
              {summary && (
                <span className="font-mono text-[10px] text-gray-400">
                  {summary.passed}/{summary.totalTests} passed — Score: {summary.overallScore}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Gate Results Grid */}
        {gateResults && (
          <div className="grid grid-cols-4 gap-2">
            {/* Judge */}
            <div className={`p-2.5 rounded-lg border ${gateResults.judge.passed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
              <div className="font-mono text-[8px] text-gray-500 uppercase tracking-wider mb-1">Judge</div>
              <div className={`font-mono text-lg font-bold ${gateResults.judge.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                {gateResults.judge.score}
              </div>
              <div className={`font-mono text-[8px] uppercase ${gateResults.judge.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                {gateResults.judge.passed ? 'PASS' : 'FAIL'}
              </div>
            </div>
            {/* Lint */}
            <div className={`p-2.5 rounded-lg border ${gateResults.lint.passed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
              <div className="font-mono text-[8px] text-gray-500 uppercase tracking-wider mb-1">Lint</div>
              <div className={`font-mono text-lg font-bold ${gateResults.lint.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                {gateResults.lint.errors}E/{gateResults.lint.warnings}W
              </div>
              <div className={`font-mono text-[8px] uppercase ${gateResults.lint.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                {gateResults.lint.passed ? 'PASS' : 'FAIL'}
              </div>
            </div>
            {/* Contract */}
            <div className={`p-2.5 rounded-lg border ${gateResults.contract.passed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
              <div className="font-mono text-[8px] text-gray-500 uppercase tracking-wider mb-1">Contract</div>
              <div className={`font-mono text-lg font-bold ${gateResults.contract.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                {gateResults.contract.score}%
              </div>
              <div className={`font-mono text-[8px] uppercase ${gateResults.contract.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                {gateResults.contract.passed ? 'PASS' : 'FAIL'}
              </div>
            </div>
            {/* Budget */}
            <div className={`p-2.5 rounded-lg border ${gateResults.budget.passed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
              <div className="font-mono text-[8px] text-gray-500 uppercase tracking-wider mb-1">Budget</div>
              <div className={`font-mono text-lg font-bold ${gateResults.budget.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                ${gateResults.budget.costUsd.toFixed(4)}
              </div>
              <div className={`font-mono text-[8px] uppercase ${gateResults.budget.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                {gateResults.budget.passed ? 'PASS' : 'FAIL'}
              </div>
            </div>
          </div>
        )}

        {/* Test Results Table */}
        {results.length > 0 && (
          <div className="space-y-1">
            <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block">
              {t ? 'Test Sonuclari' : 'Test Results'}
            </span>
            {results.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-3 py-1.5 bg-cyber-dark/40 border border-glass-border/10 rounded text-[10px] font-mono">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold ${statusColor(r.status)}`}>
                    {r.status}
                  </span>
                  <span className="text-gray-300">{r.testType.replace(/_/g, ' ')}</span>
                  {(r.details as any)?.testName && (
                    <span className="text-gray-500">— {(r.details as any).testName}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {r.score != null && <span className="text-gray-400">{r.score}%</span>}
                  {r.durationMs != null && <span className="text-gray-600">{r.durationMs}ms</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
