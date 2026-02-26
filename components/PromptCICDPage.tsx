/**
 * Prompt CI/CD Page — Container sayfası.
 * VersionLifecycleBar + ContractEditor + TestCaseManager + RegressionPanel + RegressionReport
 */
import { useState, useEffect } from 'react';
import { Icon } from './ui';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '../services/apiClient';
import VersionLifecycleBar from './VersionLifecycleBar';
import TestCaseManager from './TestCaseManager';
import RegressionPanel from './RegressionPanel';
import RegressionReport from './RegressionReport';

interface PromptItem {
  id: string;
  version: string;
  name?: string;
  masterPrompt: string;
  source?: 'dashboard' | 'imported' | 'api';
}

export default function PromptCICDPage() {
  const { language } = useTranslation();
  const t = language === 'tr';
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [versions, setVersions] = useState<{ version: string; createdAt: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'tests'>('tests');

  // Load prompts
  useEffect(() => {
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/prompts`, { headers });
        if (res.ok) {
          const data = await res.json();
          // Only show dashboard-created prompts; deduplicate by id
          const dashboardOnly = (data.prompts ?? []).filter(
            (p: PromptItem) => p.source === 'dashboard'
          );
          const seen = new Map<string, PromptItem>();
          for (const p of dashboardOnly) {
            if (!seen.has(p.id)) seen.set(p.id, p);
          }
          setPrompts(Array.from(seen.values()));
          if (seen.size > 0) {
            const first = Array.from(seen.values())[0];
            setSelectedPromptId((prev) => prev || first.id);
          }
        }
      } catch {} // eslint-disable-line no-empty
    })();
  }, []);

  // Load versions when prompt changes
  useEffect(() => {
    if (!selectedPromptId) return;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/prompts/${selectedPromptId}/versions`, { headers });
        if (res.ok) {
          const data = await res.json();
          const vers = (data.versions ?? []).map((v: { version: string; createdAt: string }) => ({ version: v.version, createdAt: v.createdAt }));
          setVersions(vers);
          if (vers.length > 0 && !selectedVersion) setSelectedVersion(vers[0].version);
        }
      } catch {} // eslint-disable-line no-empty
    })();
  }, [selectedPromptId, selectedVersion]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center">
          <Icon name="verified" size={20} className="text-purple-400" />
        </div>
        <div>
          <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider">
            Prompt CI/CD
          </h2>
          <p className="font-mono text-[10px] text-gray-500 mt-0.5">
            {t
              ? 'Test durumları, regresyon testi ve versiyon terfi pipeline'
              : 'Test cases, regression testing & version promotion pipeline'}
          </p>
        </div>
      </div>

      {/* Prompt & Version Selector */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block mb-1">
            {t ? 'Prompt Seç' : 'Select Prompt'}
          </label>
          <select
            value={selectedPromptId}
            onChange={(e) => { setSelectedPromptId(e.target.value); setSelectedVersion(''); }}
            className="w-full glass-input px-3 py-2 text-xs font-mono text-gray-200"
          >
            <option value="">{t ? '-- Prompt seç --' : '-- Select prompt --'}</option>
            {prompts.map(p => (
              <option key={p.id} value={p.id}>{p.name || p.id} (v{p.version})</option>
            ))}
          </select>
        </div>
        <div className="w-40">
          <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block mb-1">
            {t ? 'Versiyon' : 'Version'}
          </label>
          <select
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            className="w-full glass-input px-3 py-2 text-xs font-mono text-gray-200"
          >
            {versions.map(v => (
              <option key={v.version} value={v.version}>v{v.version}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedPromptId && selectedVersion && (
        <>
          {/* Lifecycle Pipeline */}
          <VersionLifecycleBar
            promptId={selectedPromptId}
            version={selectedVersion}
          />

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Test Cases */}
            <div className="space-y-4">
              <div className="flex gap-1 glass-card rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('tests')}
                  className={`flex-1 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider transition-colors ${
                    activeTab === 'tests' ? 'bg-amber-500/10 text-amber-400' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t ? 'Test Durumları' : 'Test Cases'}
                </button>
              </div>

              {activeTab === 'tests' && (
                <TestCaseManager promptId={selectedPromptId} />
              )}
            </div>

            {/* Right: Regression */}
            <div className="space-y-4">
              <RegressionPanel
                promptId={selectedPromptId}
                version={selectedVersion}
              />
              <RegressionReport promptId={selectedPromptId} />
            </div>
          </div>
        </>
      )}

      {!selectedPromptId && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
            <Icon name="check_circle" size={28} className="text-purple-500" />
          </div>
          <p className="font-mono text-xs text-gray-500">
            {t ? 'CI/CD pipeline başlatmak için bir prompt seçin.' : 'Select a prompt to start the CI/CD pipeline.'}
          </p>
        </div>
      )}
    </div>
  );
}
