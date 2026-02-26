/**
 * Test Case Manager — Golden test case CRUD yönetimi.
 */
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '../services/apiClient';
import type { PromptTestCase, MatchMode } from '../types/regression';

interface Props {
  promptId: string;
}

const MATCH_MODES: { value: MatchMode; label: string }[] = [
  { value: 'contains', label: 'Contains' },
  { value: 'exact', label: 'Exact Match' },
  { value: 'regex', label: 'Regex' },
  { value: 'semantic', label: 'Semantic' },
  { value: 'contract', label: 'Contract Rules' },
];

export default function TestCaseManager({ promptId }: Props) {
  const { language } = useTranslation();
  const t = language === 'tr';
  const [expanded, setExpanded] = useState(false);
  const [testCases, setTestCases] = useState<PromptTestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state (create + edit)
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formMatchMode, setFormMatchMode] = useState<MatchMode>('contains');
  const [formExpected, setFormExpected] = useState('');
  const [formInputVars, setFormInputVars] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formPriority, setFormPriority] = useState(0);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditId(null);
    setFormName('');
    setFormMatchMode('contains');
    setFormExpected('');
    setFormInputVars('');
    setFormTags('');
    setFormPriority(0);
  };

  const loadTestCases = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/prompts/${promptId}/test-cases`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTestCases(data.testCases ?? []);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Error ${res.status}`);
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    }
    setLoading(false);
  }, [promptId]);

  useEffect(() => {
    if (expanded && promptId) loadTestCases();
  }, [expanded, promptId, loadTestCases]);

  const handleSave = useCallback(async () => {
    if (!formName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const headers = { ...(await getAuthHeaders()), 'Content-Type': 'application/json' };
      let inputVars = {};
      try { inputVars = formInputVars ? JSON.parse(formInputVars) : {}; } catch {
        setError(t ? 'Gecersiz JSON' : 'Invalid JSON in input vars');
        setSaving(false);
        return;
      }

      const body = {
        name: formName,
        matchMode: formMatchMode,
        expectedOutput: formExpected || undefined,
        inputVars,
        tags: formTags ? formTags.split(',').map(s => s.trim()).filter(Boolean) : [],
        priority: formPriority,
      };

      const isEdit = !!editId;
      const url = isEdit
        ? `${API_BASE}/prompts/${promptId}/test-cases/${editId}`
        : `${API_BASE}/prompts/${promptId}/test-cases`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (res.ok) {
        setShowForm(false);
        resetForm();
        await loadTestCases();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Error ${res.status}`);
      }
    } catch (e: any) {
      setError(e.message || 'Save failed');
    }
    setSaving(false);
  }, [promptId, editId, formName, formMatchMode, formExpected, formInputVars, formTags, formPriority, loadTestCases, t]);

  const handleEdit = (tc: PromptTestCase) => {
    setEditId(tc.id);
    setFormName(tc.name);
    setFormMatchMode(tc.matchMode);
    setFormExpected(tc.expectedOutput ?? '');
    setFormInputVars(tc.inputVars && Object.keys(tc.inputVars).length > 0 ? JSON.stringify(tc.inputVars) : '');
    setFormTags(tc.tags?.join(', ') ?? '');
    setFormPriority(tc.priority ?? 0);
    setShowForm(true);
  };

  const handleDelete = useCallback(async (tcId: string) => {
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/prompts/${promptId}/test-cases/${tcId}`, { method: 'DELETE', headers });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Delete failed: ${res.status}`);
      }
      await loadTestCases();
    } catch (e: any) {
      setError(e.message || 'Delete failed');
    }
  }, [promptId, loadTestCases]);

  return (
    <div className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-glass-bg hover:bg-[#0e0e1a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span className="font-display text-xs font-bold text-gray-300 uppercase tracking-wider">
            {t ? 'Test Durumlari' : 'Test Cases'}
          </span>
          {testCases.length > 0 && (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {testCases.length}
            </span>
          )}
        </div>
        <span className="text-gray-500 text-xs">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="p-4 bg-glass-bg border-t border-amber-500/10 space-y-3">
          {/* Error Banner */}
          {error && (
            <div className="px-3 py-2 rounded bg-red-500/10 border border-red-500/30 font-mono text-[10px] text-red-400 flex justify-between items-center">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} className="text-red-500/60 hover:text-red-400 ml-2">x</button>
            </div>
          )}

          {/* Test Case List */}
          {loading ? (
            <p className="font-mono text-[10px] text-gray-500 animate-pulse">Loading...</p>
          ) : testCases.length === 0 ? (
            <p className="font-mono text-[10px] text-gray-500">
              {t ? 'Henuz test durumu yok.' : 'No test cases yet.'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {testCases.map((tc) => (
                <div key={tc.id} className="flex items-center justify-between px-3 py-2 bg-cyber-dark/60 border border-glass-border rounded">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-gray-200 truncate">{tc.name}</span>
                      <span className="font-mono text-[8px] px-1 py-0.5 rounded bg-gray-700/50 text-gray-400 uppercase">{tc.matchMode}</span>
                      {tc.tags?.map((tag, i) => (
                        <span key={i} className="font-mono text-[8px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400">{tag}</span>
                      ))}
                    </div>
                    {tc.expectedOutput && (
                      <p className="font-mono text-[9px] text-gray-500 mt-0.5 truncate">{tc.expectedOutput.slice(0, 80)}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 ml-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(tc)}
                      className="text-cyan-500/60 hover:text-cyan-400 text-[10px] font-mono"
                    >
                      {t ? 'Duzenle' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tc.id)}
                      className="text-red-500/60 hover:text-red-400 text-[10px] font-mono"
                    >
                      {t ? 'Sil' : 'Del'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add / Edit Form */}
          {!showForm ? (
            <button
              type="button"
              onClick={() => { resetForm(); setShowForm(true); }}
              className="w-full py-2 rounded-lg border border-dashed border-amber-500/30 text-amber-400 font-mono text-[10px] uppercase tracking-wider hover:bg-amber-500/5 transition-colors"
            >
              + {t ? 'Test Durumu Ekle' : 'Add Test Case'}
            </button>
          ) : (
            <div className="p-3 border border-amber-500/20 rounded-lg bg-amber-500/5 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[9px] text-amber-400 uppercase tracking-wider">
                  {editId ? (t ? 'Test Duzenle' : 'Edit Test Case') : (t ? 'Yeni Test' : 'New Test Case')}
                </span>
              </div>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t ? 'Test adi' : 'Test name'}
                className="w-full glass-card px-3 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-amber-500/50"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={formMatchMode}
                  onChange={(e) => setFormMatchMode(e.target.value as MatchMode)}
                  className="glass-card px-2 py-1.5 text-[10px] font-mono text-gray-200 focus:outline-none"
                >
                  {MATCH_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <input
                  type="number"
                  value={formPriority}
                  onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)}
                  placeholder="Priority"
                  className="glass-card px-2 py-1.5 text-[10px] font-mono text-gray-200 focus:outline-none"
                />
              </div>
              <textarea
                value={formExpected}
                onChange={(e) => setFormExpected(e.target.value)}
                placeholder={t ? 'Beklenen cikti (opsiyonel)' : 'Expected output (optional)'}
                rows={3}
                className="w-full glass-card px-3 py-1.5 text-[10px] font-mono text-gray-200 focus:outline-none resize-none"
              />
              <input
                type="text"
                value={formInputVars}
                onChange={(e) => setFormInputVars(e.target.value)}
                placeholder={t ? 'Girdi degiskenleri (JSON)' : 'Input vars (JSON): {"userMessage": "hello"}'}
                className="w-full glass-card px-3 py-1.5 text-[10px] font-mono text-gray-200 focus:outline-none"
              />
              <input
                type="text"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder={t ? 'Etiketler (virgulle)' : 'Tags (comma-separated)'}
                className="w-full glass-card px-3 py-1.5 text-[10px] font-mono text-gray-200 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !formName.trim()}
                  className="px-4 py-1.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono text-[10px] uppercase tracking-wider hover:bg-amber-500/30 disabled:opacity-50"
                >
                  {saving ? '...' : editId ? (t ? 'Guncelle' : 'Update') : (t ? 'Kaydet' : 'Save')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-4 py-1.5 rounded border border-glass-border text-gray-500 font-mono text-[10px] uppercase hover:text-gray-300"
                >
                  {t ? 'Iptal' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
