/**
 * Prompt CI/CD Inline — Integrated CI/CD pipeline below prompt output.
 * Two phases: pre-save (quality gates + client-side contract check) and
 * post-save (full pipeline with VersionLifecycleBar, ContractEditor, etc.).
 */
import { useState, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '../services/apiClient';
import { validateContract } from '../services/contractValidator';
import VersionLifecycleBar from './VersionLifecycleBar';
import ContractEditor from './ContractEditor';
import TestCaseManager from './TestCaseManager';
import RegressionPanel from './RegressionPanel';
import RegressionReport from './RegressionReport';
import type { ContractRule, ContractValidationResult } from '../types/regression';
import type { JudgeResult } from '../services/judgeEnsemble';
import type { LintResult } from '../services/promptLint';
import type { BudgetAnalysis } from '../services/budgetOptimizer';

interface Props {
  masterPrompt: string;
  reasoning: string;
  intent: string;
  domainId: string;
  framework: string;
  provider: string;
  language: string;
  agentMode?: boolean;
  judgeResult: JudgeResult | null;
  lintResult: LintResult | null;
  budgetAnalysis: BudgetAnalysis | null;
}

type PipelineTab = 'contracts' | 'tests' | 'regression' | 'report';

export default function PromptCICDInline({
  masterPrompt,
  reasoning,
  intent,
  domainId,
  framework,
  provider,
  agentMode = false,
  judgeResult,
  lintResult,
  budgetAnalysis,
}: Props) {
  const { language } = useTranslation();
  const t = language === 'tr';

  const [expanded, setExpanded] = useState(false);

  // Save state
  const [promptId, setPromptId] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [promptName, setPromptName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Quick contract check (client-side, pre-save)
  const [localRules, setLocalRules] = useState<ContractRule>({});
  const [localValidation, setLocalValidation] = useState<ContractValidationResult | null>(null);

  // Post-save tabs
  const [activeTab, setActiveTab] = useState<PipelineTab>('contracts');

  // Derive default name from intent
  const defaultName = intent.slice(0, 60).trim() || 'Untitled Prompt';

  // ── Quality gate badges ────────────────────────────────────────
  const judgeScore = judgeResult?.totalScore ?? null;
  const lintPass = lintResult ? lintResult.totalErrors === 0 : null;
  const budgetCost = budgetAnalysis?.estimatedCost?.totalCostUsd ?? null;
  const contractScore = localValidation?.score ?? null;

  // ── Client-side contract validation ────────────────────────────
  const handleQuickValidate = useCallback(() => {
    const hasRules =
      localRules.minLength != null ||
      localRules.maxLength != null ||
      (localRules.requiredKeywords && localRules.requiredKeywords.length > 0) ||
      (localRules.forbiddenKeywords && localRules.forbiddenKeywords.length > 0);

    if (!hasRules) return;
    const result = validateContract(masterPrompt, localRules);
    setLocalValidation(result);
  }, [masterPrompt, localRules]);

  // ── Save prompt & start pipeline ──────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError('');
    try {
      const headers = { ...(await getAuthHeaders()), 'Content-Type': 'application/json' };
      const res = await fetch(`${API_BASE}/prompts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: promptName || defaultName,
          masterPrompt,
          reasoning,
          domainId,
          framework,
          provider,
          source: 'dashboard',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPromptId(data.id);
      setVersion(data.version || '1');
    } catch (e: any) {
      setSaveError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [promptName, defaultName, masterPrompt, reasoning, domainId, framework, provider]);

  // ── Quick rule updaters ────────────────────────────────────────
  const updateLocalMinLength = (v: string) =>
    setLocalRules((r) => ({ ...r, minLength: v ? parseInt(v) : undefined }));
  const updateLocalMaxLength = (v: string) =>
    setLocalRules((r) => ({ ...r, maxLength: v ? parseInt(v) : undefined }));
  const updateLocalRequiredKw = (v: string) =>
    setLocalRules((r) => ({
      ...r,
      requiredKeywords: v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    }));
  const updateLocalForbiddenKw = (v: string) =>
    setLocalRules((r) => ({
      ...r,
      forbiddenKeywords: v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    }));

  // ── Badge helper ──────────────────────────────────────────────
  const Badge = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <span
      className={`px-2 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${color}`}
    >
      {label}: {value}
    </span>
  );

  const saved = !!promptId;

  return (
    <div className="border border-purple-500/20 rounded-lg overflow-hidden">
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#0c0c18] hover:bg-[#0e0e1a] transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="url(#cicd-inline-grad)"
            strokeWidth="1.5"
          >
            <defs>
              <linearGradient id="cicd-inline-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#00f0ff" />
              </linearGradient>
            </defs>
            <path d="M9 12l2 2 4-4" />
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
          </svg>
          <span className="font-mono text-xs font-bold text-gray-300 uppercase tracking-wider">
            {t ? 'CI/CD Pipeline' : 'CI/CD Pipeline'}
          </span>
          {agentMode && (
            <span className="px-2 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              AGENT
            </span>
          )}

          {/* Quality badges */}
          {judgeScore !== null && (
            <Badge
              label="Judge"
              value={`${judgeScore}`}
              color={
                judgeScore >= 70
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : judgeScore >= 40
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
              }
            />
          )}
          {lintPass !== null && (
            <Badge
              label="Lint"
              value={lintPass ? 'PASS' : `${lintResult!.totalErrors}E`}
              color={
                lintPass
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }
            />
          )}
          {budgetCost !== null && (
            <Badge
              label="Budget"
              value={`$${budgetCost.toFixed(4)}`}
              color="bg-blue-500/10 text-blue-400 border-blue-500/20"
            />
          )}
          {contractScore !== null && (
            <Badge
              label="Contract"
              value={`${contractScore}%`}
              color={
                localValidation!.passed
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }
            />
          )}
          {saved && (
            <span className="px-2 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-wider border bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
              v{version}
            </span>
          )}
        </div>
        <span className="text-gray-500 text-xs">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="p-4 bg-[#080812] border-t border-purple-500/10 space-y-5">
          {/* ═══ PHASE 1: Pre-save — Quality Gates + Quick Contract Check ═══ */}
          {!saved && (
            <>
              {/* Quality Gates Summary */}
              <div>
                <h4 className="font-mono text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                  {t ? 'Kalite Kapilari Ozeti' : 'Quality Gates Summary'}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div
                    className={`p-2.5 rounded-lg border ${
                      judgeScore !== null && judgeScore >= 60
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : judgeScore !== null
                          ? 'border-red-500/20 bg-red-500/5'
                          : 'border-cyber-border/20 bg-cyber-dark/30'
                    }`}
                  >
                    <div className="font-mono text-[8px] text-gray-500 uppercase tracking-wider mb-1">
                      Judge
                    </div>
                    <div
                      className={`font-mono text-lg font-bold ${
                        judgeScore !== null && judgeScore >= 60
                          ? 'text-emerald-400'
                          : judgeScore !== null
                            ? 'text-red-400'
                            : 'text-gray-600'
                      }`}
                    >
                      {judgeScore ?? '--'}
                    </div>
                  </div>
                  <div
                    className={`p-2.5 rounded-lg border ${
                      lintPass === true
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : lintPass === false
                          ? 'border-red-500/20 bg-red-500/5'
                          : 'border-cyber-border/20 bg-cyber-dark/30'
                    }`}
                  >
                    <div className="font-mono text-[8px] text-gray-500 uppercase tracking-wider mb-1">
                      Lint
                    </div>
                    <div
                      className={`font-mono text-lg font-bold ${
                        lintPass === true
                          ? 'text-emerald-400'
                          : lintPass === false
                            ? 'text-red-400'
                            : 'text-gray-600'
                      }`}
                    >
                      {lintPass === true ? 'PASS' : lintPass === false ? `${lintResult?.totalErrors ?? 0}E` : '--'}
                    </div>
                  </div>
                  <div
                    className={`p-2.5 rounded-lg border ${
                      budgetCost !== null
                        ? 'border-blue-500/20 bg-blue-500/5'
                        : 'border-cyber-border/20 bg-cyber-dark/30'
                    }`}
                  >
                    <div className="font-mono text-[8px] text-gray-500 uppercase tracking-wider mb-1">
                      Budget
                    </div>
                    <div
                      className={`font-mono text-lg font-bold ${
                        budgetCost !== null ? 'text-blue-400' : 'text-gray-600'
                      }`}
                    >
                      {budgetCost !== null ? `$${budgetCost.toFixed(4)}` : '--'}
                    </div>
                  </div>
                  <div
                    className={`p-2.5 rounded-lg border ${
                      contractScore !== null && localValidation!.passed
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : contractScore !== null
                          ? 'border-red-500/20 bg-red-500/5'
                          : 'border-cyber-border/20 bg-cyber-dark/30'
                    }`}
                  >
                    <div className="font-mono text-[8px] text-gray-500 uppercase tracking-wider mb-1">
                      Contract
                    </div>
                    <div
                      className={`font-mono text-lg font-bold ${
                        contractScore !== null && localValidation!.passed
                          ? 'text-emerald-400'
                          : contractScore !== null
                            ? 'text-red-400'
                            : 'text-gray-600'
                      }`}
                    >
                      {contractScore !== null ? `${contractScore}%` : '--'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Contract Check */}
              <div className="p-3 border border-cyan-500/10 rounded-lg bg-cyan-500/5 space-y-3">
                <h4 className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider font-bold">
                  {t ? 'Hizli Kontrat Kontrolu' : 'Quick Contract Check'}
                </h4>
                <p className="font-mono text-[9px] text-gray-500">
                  {t
                    ? 'Kaydetmeden once istemci tarafinda kontrat dogrulama. API gerekmez.'
                    : 'Client-side contract validation before saving. No API needed.'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block mb-1">
                      Min Length
                    </label>
                    <input
                      type="number"
                      value={localRules.minLength ?? ''}
                      onChange={(e) => updateLocalMinLength(e.target.value)}
                      placeholder="0"
                      className="w-full bg-cyber-dark border border-cyber-border/40 rounded px-2 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block mb-1">
                      Max Length
                    </label>
                    <input
                      type="number"
                      value={localRules.maxLength ?? ''}
                      onChange={(e) => updateLocalMaxLength(e.target.value)}
                      placeholder="50000"
                      className="w-full bg-cyber-dark border border-cyber-border/40 rounded px-2 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block mb-1">
                    {t ? 'Zorunlu Anahtar Kelimeler' : 'Required Keywords'} (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={(localRules.requiredKeywords ?? []).join(', ')}
                    onChange={(e) => updateLocalRequiredKw(e.target.value)}
                    placeholder="e.g. security, API"
                    className="w-full bg-cyber-dark border border-cyber-border/40 rounded px-2 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block mb-1">
                    {t ? 'Yasak Anahtar Kelimeler' : 'Forbidden Keywords'} (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={(localRules.forbiddenKeywords ?? []).join(', ')}
                    onChange={(e) => updateLocalForbiddenKw(e.target.value)}
                    placeholder="e.g. TODO, FIXME"
                    className="w-full bg-cyber-dark border border-cyber-border/40 rounded px-2 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleQuickValidate}
                  className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono text-[10px] uppercase tracking-wider hover:bg-cyan-500/30 transition-colors"
                >
                  {t ? 'Simdi Dogrula' : 'Validate Now'}
                </button>

                {/* Quick validation result */}
                {localValidation && (
                  <div
                    className={`p-3 rounded-lg border ${
                      localValidation.passed
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-red-500/30 bg-red-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`font-mono text-xs font-bold uppercase ${
                          localValidation.passed ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {localValidation.passed ? 'PASS' : 'FAIL'}
                      </span>
                      <span className="font-mono text-[10px] text-gray-400">
                        {localValidation.passedRules}/{localValidation.totalRules} rules —{' '}
                        {localValidation.score}%
                      </span>
                    </div>
                    {localValidation.violations
                      .filter((v) => !v.passed)
                      .map((v, i) => (
                        <div key={i} className="text-[9px] font-mono text-red-300 py-0.5">
                          <span className="text-red-500">FAIL</span> {v.label}: expected {v.expected},
                          got {v.actual}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Save & Version */}
              <div className="p-3 border border-purple-500/10 rounded-lg bg-purple-500/5 space-y-3">
                <h4 className="font-mono text-[10px] text-purple-400 uppercase tracking-wider font-bold">
                  {t ? 'Kaydet & Pipeline Baslat' : 'Save & Start Pipeline'}
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promptName}
                    onChange={(e) => setPromptName(e.target.value)}
                    placeholder={defaultName}
                    className="flex-1 bg-cyber-dark border border-cyber-border/40 rounded px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-purple-500/50"
                  />
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className={`px-5 py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
                      saving
                        ? 'bg-purple-500/20 text-purple-400/60 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] active:scale-[0.99]'
                    }`}
                  >
                    {saving
                      ? t
                        ? 'Kaydediliyor...'
                        : 'Saving...'
                      : t
                        ? 'Kaydet & Baslat'
                        : 'Save & Start'}
                  </button>
                </div>
                {saveError && (
                  <p className="text-red-400 text-[10px] font-mono">{saveError}</p>
                )}
              </div>
            </>
          )}

          {/* ═══ PHASE 2: Post-save — Full Pipeline ═══ */}
          {saved && promptId && version && (
            <>
              {/* Version Lifecycle Bar */}
              <VersionLifecycleBar promptId={promptId} version={version} />

              {/* Tab navigation */}
              <div className="flex gap-1 bg-[#0c0c18] rounded-lg p-1 border border-cyber-border/20">
                {(
                  [
                    { key: 'contracts' as PipelineTab, label: t ? 'Kontratlar' : 'Contracts', active: 'bg-cyan-500/10 text-cyan-400' },
                    { key: 'tests' as PipelineTab, label: t ? 'Test Durumlari' : 'Test Cases', active: 'bg-amber-500/10 text-amber-400' },
                    { key: 'regression' as PipelineTab, label: t ? 'Regresyon' : 'Regression', active: 'bg-purple-500/10 text-purple-400' },
                    { key: 'report' as PipelineTab, label: t ? 'Rapor' : 'Report', active: 'bg-indigo-500/10 text-indigo-400' },
                  ]
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider transition-colors ${
                      activeTab === tab.key
                        ? tab.active
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="space-y-4">
                {activeTab === 'contracts' && (
                  <ContractEditor promptId={promptId} masterPrompt={masterPrompt} />
                )}
                {activeTab === 'tests' && <TestCaseManager promptId={promptId} />}
                {activeTab === 'regression' && (
                  <RegressionPanel promptId={promptId} version={version} />
                )}
                {activeTab === 'report' && <RegressionReport promptId={promptId} />}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
