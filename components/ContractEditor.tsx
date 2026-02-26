/**
 * Contract Editor — Output kontrat tanımlama ve doğrulama paneli.
 * Collapsible panel following BenchmarkPanel pattern.
 */
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '../services/apiClient';
import type { ContractRule, ContractValidationResult, PromptContract } from '../types/regression';

interface Props {
  promptId: string;
  masterPrompt?: string;
}

const DEFAULT_RULES: ContractRule = {};

export default function ContractEditor({ promptId, masterPrompt }: Props) {
  const { language } = useTranslation();
  const t = language === 'tr';
  const [expanded, setExpanded] = useState(false);
  const [contracts, setContracts] = useState<PromptContract[]>([]);
  const [rules, setRules] = useState<ContractRule>(DEFAULT_RULES);
  const [contractName, setContractName] = useState('default');
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ContractValidationResult | null>(null);
  const [error, setError] = useState('');
  const [formJsonSchema, setFormJsonSchema] = useState('');

  // Load contracts
  const loadContracts = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/prompts/${promptId}/contracts`, { headers });
      if (res.ok) {
        const data = await res.json();
        setContracts(data.contracts ?? []);
        if (data.contracts?.length > 0) {
          setRules(data.contracts[0].rules);
          setContractName(data.contracts[0].name);
          setFormJsonSchema(data.contracts[0].rules.jsonSchema ? JSON.stringify(data.contracts[0].rules.jsonSchema, null, 2) : '');
        }
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load contracts');
    }
  }, [promptId]);

  useEffect(() => {
    if (expanded && promptId) loadContracts();
  }, [expanded, promptId, loadContracts]);

  // Save contract
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      const headers = { ...(await getAuthHeaders()), 'Content-Type': 'application/json' };
      const payload: ContractRule = { ...rules };
      
      // Parse and add JSON schema if provided
      if (formJsonSchema.trim()) {
        try {
          payload.jsonSchema = JSON.parse(formJsonSchema);
        } catch (parseErr: any) {
          setError(`Invalid JSON Schema: ${parseErr.message}`);
          setSaving(false);
          return;
        }
      }
      
      const res = await fetch(`${API_BASE}/prompts/${promptId}/contracts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: contractName, rules: payload }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadContracts();
    } catch (e: any) {
      setError(e.message || 'Failed to save contract');
    } finally {
      setSaving(false);
    }
  }, [promptId, contractName, rules, formJsonSchema, loadContracts]);

  // Validate Now
  const handleValidate = useCallback(async () => {
    if (!masterPrompt) return;
    setValidating(true);
    setValidationResult(null);
    try {
      const headers = { ...(await getAuthHeaders()), 'Content-Type': 'application/json' };
      const res = await fetch(`${API_BASE}/prompts/${promptId}/contracts/validate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ output: masterPrompt, rules }),
      });
      if (res.ok) setValidationResult(await res.json());
      else {
        const errorText = await res.text();
        setError(errorText || 'Validation failed');
      }
    } catch (e: any) {
      setError(e.message || 'Validation request failed');
    }
    setValidating(false);
  }, [masterPrompt, promptId, rules]);

  // Rule updaters
  const updateMinLength = (v: string) => setRules(r => ({ ...r, minLength: v ? parseInt(v) : undefined }));
  const updateMaxLength = (v: string) => setRules(r => ({ ...r, maxLength: v ? parseInt(v) : undefined }));
  const updateRequiredKeywords = (v: string) => setRules(r => ({ ...r, requiredKeywords: v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined }));
  const updateForbiddenKeywords = (v: string) => setRules(r => ({ ...r, forbiddenKeywords: v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined }));
  const addRegexPattern = () => setRules(r => ({ ...r, regexPatterns: [...(r.regexPatterns ?? []), { pattern: '', label: '' }] }));
  const updateRegex = (idx: number, field: 'pattern' | 'label', val: string) => {
    setRules(r => {
      const patterns = [...(r.regexPatterns ?? [])];
      patterns[idx] = { ...patterns[idx], [field]: val };
      return { ...r, regexPatterns: patterns };
    });
  };
  const removeRegex = (idx: number) => {
    setRules(r => ({ ...r, regexPatterns: (r.regexPatterns ?? []).filter((_, i) => i !== idx) }));
  };
  const addSection = () => setRules(r => ({ ...r, requiredSections: [...(r.requiredSections ?? []), { heading: '' }] }));
  const updateSection = (idx: number, field: 'heading' | 'minWords', val: string) => {
    setRules(r => {
      const sections = [...(r.requiredSections ?? [])];
      if (field === 'minWords') sections[idx] = { ...sections[idx], minWords: val ? parseInt(val) : undefined };
      else sections[idx] = { ...sections[idx], [field]: val };
      return { ...r, requiredSections: sections };
    });
  };
  const removeSection = (idx: number) => {
    setRules(r => ({ ...r, requiredSections: (r.requiredSections ?? []).filter((_, i) => i !== idx) }));
  };

  return (
    <div className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-glass-bg hover:bg-[#0e0e1a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06e8f9" strokeWidth="1.5">
            <path d="M9 12l2 2 4-4" />
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
          </svg>
          <span className="font-display text-xs font-bold text-gray-300 uppercase tracking-wider">
            {t ? 'Cikti Kontratlari' : 'Output Contracts'}
          </span>
          {contracts.length > 0 && (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {contracts.length}
            </span>
          )}
        </div>
        <span className="text-gray-500 text-xs">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="p-4 bg-glass-bg border-t border-cyan-500/10 space-y-4">
          {/* Error Banner */}
          {error && (
            <div className="px-3 py-2 rounded bg-red-500/10 border border-red-500/30 font-mono text-[10px] text-red-400 flex justify-between items-center">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} className="text-red-500/60 hover:text-red-400 ml-2">x</button>
            </div>
          )}

          {/* Contract Name */}
          <div className="flex gap-2 items-center">
            <label className="font-mono text-[10px] text-gray-500 uppercase tracking-wider w-24 shrink-0">
              {t ? 'Kontrat Adi' : 'Contract Name'}
            </label>
            <input
              type="text"
              value={contractName}
              onChange={(e) => setContractName(e.target.value)}
              className="flex-1 glass-card px-3 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Min/Max Length */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Min Length</label>
              <input
                type="number"
                value={rules.minLength ?? ''}
                onChange={(e) => updateMinLength(e.target.value)}
                placeholder="0"
                className="w-full glass-card px-3 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Max Length</label>
              <input
                type="number"
                value={rules.maxLength ?? ''}
                onChange={(e) => updateMaxLength(e.target.value)}
                placeholder="50000"
                className="w-full glass-card px-3 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {/* Required Keywords */}
          <div>
            <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block mb-1">
              {t ? 'Zorunlu Anahtar Kelimeler (virgülle ayirin)' : 'Required Keywords (comma-separated)'}
            </label>
            <input
              type="text"
              value={(rules.requiredKeywords ?? []).join(', ')}
              onChange={(e) => updateRequiredKeywords(e.target.value)}
              placeholder="e.g. security, authentication, API"
              className="w-full glass-card px-3 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Forbidden Keywords */}
          <div>
            <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block mb-1">
              {t ? 'Yasak Anahtar Kelimeler' : 'Forbidden Keywords (comma-separated)'}
            </label>
            <input
              type="text"
              value={(rules.forbiddenKeywords ?? []).join(', ')}
              onChange={(e) => updateForbiddenKeywords(e.target.value)}
              placeholder="e.g. TODO, FIXME, hack"
              className="w-full glass-card px-3 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Regex Patterns */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">
                {t ? 'Regex Desenleri' : 'Regex Patterns'}
              </label>
              <button type="button" onClick={addRegexPattern} className="text-[9px] font-mono text-cyan-400 hover:text-cyan-300">+ Add</button>
            </div>
            {(rules.regexPatterns ?? []).map((rp, idx) => (
              <div key={idx} className="flex gap-2 mb-1.5">
                <input
                  type="text"
                  value={rp.pattern}
                  onChange={(e) => updateRegex(idx, 'pattern', e.target.value)}
                  placeholder="regex pattern"
                  className="flex-1 glass-card px-2 py-1 text-[10px] font-mono text-gray-200 focus:outline-none focus:border-cyan-500/50"
                />
                <input
                  type="text"
                  value={rp.label ?? ''}
                  onChange={(e) => updateRegex(idx, 'label', e.target.value)}
                  placeholder="label"
                  className="w-28 glass-card px-2 py-1 text-[10px] font-mono text-gray-200 focus:outline-none focus:border-cyan-500/50"
                />
                <button type="button" onClick={() => removeRegex(idx)} className="text-red-500 hover:text-red-400 text-xs px-1">x</button>
              </div>
            ))}
          </div>

          {/* Required Sections */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">
                {t ? 'Zorunlu Bolumler' : 'Required Sections'}
              </label>
              <button type="button" onClick={addSection} className="text-[9px] font-mono text-cyan-400 hover:text-cyan-300">+ Add</button>
            </div>
            {(rules.requiredSections ?? []).map((sec, idx) => (
              <div key={idx} className="flex gap-2 mb-1.5">
                <input
                  type="text"
                  value={sec.heading}
                  onChange={(e) => updateSection(idx, 'heading', e.target.value)}
                  placeholder="Section heading"
                  className="flex-1 glass-card px-2 py-1 text-[10px] font-mono text-gray-200 focus:outline-none focus:border-cyan-500/50"
                />
                <input
                  type="number"
                  value={sec.minWords ?? ''}
                  onChange={(e) => updateSection(idx, 'minWords', e.target.value)}
                  placeholder="min words"
                  className="w-20 glass-card px-2 py-1 text-[10px] font-mono text-gray-200 focus:outline-none focus:border-cyan-500/50"
                />
                <button type="button" onClick={() => removeSection(idx)} className="text-red-500 hover:text-red-400 text-xs px-1">x</button>
              </div>
            ))}
          </div>

          {/* JSON Schema */}
          <div>
            <label className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block mb-1">
              {t ? 'JSON Şeması (isteğe bağlı)' : 'JSON Schema (optional)'}
            </label>
            <textarea
              value={formJsonSchema}
              onChange={(e) => setFormJsonSchema(e.target.value)}
              placeholder='{"type": "object", "properties": {...}}'
              rows={6}
              className="w-full glass-card px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500/50 resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-glass-border">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono text-[10px] uppercase tracking-wider hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
            >
              {saving ? (t ? 'Kaydediliyor...' : 'Saving...') : (t ? 'Kontrati Kaydet' : 'Save Contract')}
            </button>
            <button
              type="button"
              onClick={handleValidate}
              disabled={validating || !masterPrompt}
              className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] uppercase tracking-wider hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
            >
              {validating ? (t ? 'Dogrulaniyor...' : 'Validating...') : (t ? 'Simdi Dogrula' : 'Validate Now')}
            </button>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div className={`p-3 rounded-lg border ${validationResult.passed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-mono text-xs font-bold uppercase ${validationResult.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {validationResult.passed ? 'PASS' : 'FAIL'}
                </span>
                <span className="font-mono text-[10px] text-gray-400">
                  {validationResult.passedRules}/{validationResult.totalRules} rules — {validationResult.score}%
                </span>
              </div>
              {validationResult.violations.filter(v => !v.passed).map((v, i) => (
                <div key={i} className="text-[9px] font-mono text-red-300 py-0.5">
                  <span className="text-red-500">FAIL</span> {v.label}: expected {v.expected}, got {v.actual}
                </div>
              ))}
            </div>
          )}

          {/* Existing Contracts */}
          {contracts.length > 0 && (
            <div className="pt-2 border-t border-glass-border">
              <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block mb-1">
                {t ? 'Kayitli Kontratlar' : 'Saved Contracts'}
              </span>
              {contracts.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => { 
                      setRules(c.rules); 
                      setContractName(c.name);
                      setFormJsonSchema(c.rules.jsonSchema ? JSON.stringify(c.rules.jsonSchema, null, 2) : '');
                    }}
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    {c.name}
                  </button>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] ${c.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-500'}`}>
                    {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
