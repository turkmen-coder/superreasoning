/**
 * Version Lifecycle Bar — Pipeline visualization: DRAFT → TESTING → STAGING → PRODUCTION
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '../services/apiClient';
import type { VersionStatus, VersionLifecycleInfo, PromoteResult } from '../types/regression';

const STAGES: { status: VersionStatus; label: string; labelTr: string; color: string }[] = [
  { status: 'draft', label: 'DRAFT', labelTr: 'TASLAK', color: 'gray' },
  { status: 'testing', label: 'TESTING', labelTr: 'TEST', color: 'amber' },
  { status: 'staging', label: 'STAGING', labelTr: 'HAZIRLAMA', color: 'blue' },
  { status: 'production', label: 'PRODUCTION', labelTr: 'URETIM', color: 'emerald' },
];

interface Props {
  promptId: string;
  version: string;
  onStatusChange?: (newStatus: VersionStatus) => void;
}

export default function VersionLifecycleBar({ promptId, version, onStatusChange }: Props) {
  const { language } = useTranslation();
  const t = language === 'tr';
  const [lifecycle, setLifecycle] = useState<VersionLifecycleInfo | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState<PromoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadStatus = useCallback(async () => {
    if (!promptId || !version) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/prompts/${promptId}/versions/${version}/status`, { headers });
      if (res.ok) setLifecycle(await res.json());
    } catch (e: any) {
      setError(e.message || 'Failed to load status');
    }
    setLoading(false);
  }, [promptId, version]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handlePromote = useCallback(async (targetStatus: VersionStatus) => {
    setPromoting(true);
    setPromoteResult(null);
    try {
      const headers = { ...(await getAuthHeaders()), 'Content-Type': 'application/json' };
      const res = await fetch(`${API_BASE}/prompts/${promptId}/versions/${version}/promote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetStatus }),
      });
      const result: PromoteResult = await res.json();
      setPromoteResult(result);
      if (result.success) {
        await loadStatus();
        onStatusChange?.(result.newStatus);
      }
    } catch (e: any) {
      setError(e.message || 'Promote failed');
    }
    setPromoting(false);
  }, [promptId, version, loadStatus, onStatusChange]);

  const handleArchive = useCallback(() => handlePromote('archived'), [handlePromote]);

  const currentIdx = lifecycle ? STAGES.findIndex(s => s.status === lifecycle.status) : 0;
  const nextStage = currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null;

  const stageColorClasses = (color: string, active: boolean, completed: boolean) => {
    if (active) {
      const map: Record<string, string> = {
        gray: 'border-gray-400 bg-gray-400/10 text-gray-300',
        amber: 'border-amber-400 bg-amber-400/10 text-amber-300',
        blue: 'border-blue-400 bg-blue-400/10 text-blue-300',
        emerald: 'border-emerald-400 bg-emerald-400/10 text-emerald-300',
      };
      return map[color] || map.gray;
    }
    if (completed) return 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500/60';
    return 'border-glass-border bg-cyber-dark/30 text-gray-600';
  };

  if (loading && !lifecycle) {
    return (
      <div className="h-16 glass-card animate-pulse flex items-center justify-center">
        <span className="font-mono text-[10px] text-gray-500">Loading lifecycle...</span>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      {/* Pipeline Steps */}
      <div className="flex items-center gap-1">
        {STAGES.map((stage, idx) => {
          const isActive = lifecycle?.status === stage.status;
          const isCompleted = idx < currentIdx;
          const gate = lifecycle?.gates;

          return (
            <React.Fragment key={stage.status}>
              {idx > 0 && (
                <div className={`flex-shrink-0 w-8 h-0.5 ${isCompleted || isActive ? 'bg-emerald-500/40' : 'bg-cyber-border/20'}`} />
              )}
              <div className="relative group flex-1">
                <div className={`flex flex-col items-center py-2.5 px-2 rounded-lg border transition-all ${stageColorClasses(stage.color, isActive, isCompleted)}`}>
                  {/* Status indicator */}
                  <div className={`w-3 h-3 rounded-full mb-1.5 ${
                    isActive ? 'bg-current animate-pulse' :
                    isCompleted ? 'bg-emerald-500/50' : 'bg-gray-700'
                  }`} />
                  <span className="font-display text-[9px] font-bold uppercase tracking-wider">
                    {t ? stage.labelTr : stage.label}
                  </span>
                  {isActive && (
                    <span className="font-mono text-[7px] mt-0.5 opacity-60">CURRENT</span>
                  )}
                </div>

                {/* Gate tooltip on hover */}
                {isActive && gate && (
                  <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block w-40">
                    <div className="bg-glass-bg border border-glass-border rounded-lg p-2 shadow-xl text-[8px] font-mono space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Lint</span>
                        <span className={gate.lint.passed ? 'text-emerald-400' : 'text-red-400'}>{gate.lint.passed ? 'PASS' : 'FAIL'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Judge</span>
                        <span className={gate.judge.passed ? 'text-emerald-400' : 'text-red-400'}>{gate.judge.score}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Contract</span>
                        <span className={gate.contract.passed ? 'text-emerald-400' : 'text-red-400'}>
                          {gate.contract.checked ? `${gate.contract.score}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Regression</span>
                        <span className={gate.regression.passed ? 'text-emerald-400' : gate.regression.checked ? 'text-red-400' : 'text-gray-600'}>
                          {gate.regression.checked ? (gate.regression.passed ? 'PASS' : 'FAIL') : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Promote Actions */}

      {error && (
        <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-[10px] font-mono">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-glass-border/10">
        <div className="flex items-center gap-2">
          {nextStage && lifecycle?.status !== 'archived' && (
            <button
              type="button"
              onClick={() => handlePromote(nextStage.status)}
              disabled={promoting}
              className="px-4 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono text-[10px] uppercase tracking-wider hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
            >
              {promoting ? '...' : `${t ? 'Terfi Et' : 'Promote'}: ${t ? nextStage.labelTr : nextStage.label}`}
            </button>
          )}
          {lifecycle?.status !== 'archived' && lifecycle?.status !== 'draft' && (
            <button
              type="button"
              onClick={handleArchive}
              disabled={promoting}
              className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400/60 font-mono text-[9px] uppercase tracking-wider hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {t ? 'Arsivle' : 'Archive'}
            </button>
          )}
        </div>

        {lifecycle && (
          <span className="font-mono text-[9px] text-gray-600">
            v{lifecycle.version} — {lifecycle.status.toUpperCase()}
            {lifecycle.promotedAt && ` — ${new Date(lifecycle.promotedAt).toLocaleDateString()}`}
          </span>
        )}
      </div>

      {/* Promote Result */}
      {promoteResult && (
        <div className={`mt-2 px-3 py-2 rounded text-[10px] font-mono border ${
          promoteResult.success ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-red-500/20 bg-red-500/5 text-red-400'
        }`}>
          {promoteResult.message}
        </div>
      )}
    </div>
  );
}
