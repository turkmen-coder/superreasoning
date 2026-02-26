/**
 * Custom Domain & Framework Builder — v3.2
 * Kullanıcılar kendi domain kuralları ve framework'lerini tanımlayabilir.
 */
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '../services/apiClient';

interface CustomDomain {
  id: string;
  domain_id: string;
  name: string;
  icon: string;
  description: string;
  context_rules: string;
  is_public: boolean;
  created_at: string;
}

interface CustomFramework {
  id: string;
  framework_id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  focus: string;
  template: string;
  is_public: boolean;
  created_at: string;
}

type TabType = 'domains' | 'frameworks';

interface Props {
  onDomainCreated?: (domain: CustomDomain) => void;
  onFrameworkCreated?: (framework: CustomFramework) => void;
}

const EMOJI_LIST = ['🔧', '🎯', '🚀', '💡', '🔬', '📐', '🛡️', '⚡', '🎨', '📊', '🤖', '🌐', '💎', '🔥', '🧪', '📋'];

export default function CustomBuilderPanel({ onDomainCreated, onFrameworkCreated }: Props) {
  const { language } = useTranslation();
  const t = language === 'tr';
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<TabType>('domains');
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [frameworks, setFrameworks] = useState<CustomFramework[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Domain form
  const [dId, setDId] = useState('');
  const [dName, setDName] = useState('');
  const [dIcon, setDIcon] = useState('🔧');
  const [dDesc, setDDesc] = useState('');
  const [dRules, setDRules] = useState('');

  // Framework form
  const [fId, setFId] = useState('');
  const [fName, setFName] = useState('');
  const [fIcon, setFIcon] = useState('🔧');
  const [fDesc, setFDesc] = useState('');
  const [fFocus, setFFocus] = useState('');
  const [fTemplate, setFTemplate] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [dRes, fRes] = await Promise.all([
        fetch(`${API_BASE}/domains/custom`, { headers }),
        fetch(`${API_BASE}/frameworks/custom`, { headers }),
      ]);
      const dData = await dRes.json();
      const fData = await fRes.json();
      setDomains(dData.domains || []);
      setFrameworks(fData.frameworks || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (expanded && domains.length === 0 && frameworks.length === 0) loadData();
  }, [expanded, loadData, domains.length, frameworks.length]);

  const saveDomain = async () => {
    if (!dId || !dName || !dRules) {
      setError(t ? 'ID, Ad ve Kurallar zorunlu' : 'ID, Name and Rules are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const headers = { ...(await getAuthHeaders()), 'Content-Type': 'application/json' };
      const res = await fetch(`${API_BASE}/domains/custom`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ domain_id: dId, name: dName, icon: dIcon, description: dDesc, context_rules: dRules }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setDomains(prev => [data, ...prev.filter(d => d.domain_id !== data.domain_id)]);
      setSuccess(t ? 'Domain kaydedildi!' : 'Domain saved!');
      setDId(''); setDName(''); setDDesc(''); setDRules('');
      onDomainCreated?.(data);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  };

  const saveFramework = async () => {
    if (!fId || !fName || !fTemplate) {
      setError(t ? 'ID, Ad ve Şablon zorunlu' : 'ID, Name and Template are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const headers = { ...(await getAuthHeaders()), 'Content-Type': 'application/json' };
      const res = await fetch(`${API_BASE}/frameworks/custom`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ framework_id: fId, name: fName, icon: fIcon, description: fDesc, focus: fFocus, template: fTemplate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setFrameworks(prev => [data, ...prev.filter(f => f.framework_id !== data.framework_id)]);
      setSuccess(t ? 'Framework kaydedildi!' : 'Framework saved!');
      setFId(''); setFName(''); setFDesc(''); setFFocus(''); setFTemplate('');
      onFrameworkCreated?.(data);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  };

  const deleteDomain = async (domainId: string) => {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE}/domains/custom/${encodeURIComponent(domainId)}`, { method: 'DELETE', headers });
    setDomains(prev => prev.filter(d => d.domain_id !== domainId));
  };

  const deleteFramework = async (frameworkId: string) => {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE}/frameworks/custom/${encodeURIComponent(frameworkId)}`, { method: 'DELETE', headers });
    setFrameworks(prev => prev.filter(f => f.framework_id !== frameworkId));
  };

  return (
    <div className="glass-card overflow-hidden" role="region" aria-label={t ? 'Özel Yapıcı' : 'Custom Builder'}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-cyber-dark/30 transition-colors text-left"
        aria-expanded={expanded}
      >
        <h3 className="text-xs font-display font-bold uppercase tracking-wider text-gray-300">
          🔧 {t ? 'ÖZEL DOMAIN / FRAMEWORK OLUŞTURUCU' : 'CUSTOM DOMAIN / FRAMEWORK BUILDER'}
        </h3>
        <div className="flex items-center gap-2">
          {(domains.length + frameworks.length) > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-accent/20 text-cyber-accent">
              {domains.length + frameworks.length}
            </span>
          )}
          <span className="text-gray-500 text-xs">{expanded ? '▼' : '▶'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-glass-border p-3 space-y-3">
          {/* Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setTab('domains')}
              className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded transition-colors ${
                tab === 'domains' ? 'bg-cyber-primary/20 text-cyber-primary border border-cyber-primary/40'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}
            >
              {t ? 'DOMAINLER' : 'DOMAINS'} ({domains.length})
            </button>
            <button
              onClick={() => setTab('frameworks')}
              className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded transition-colors ${
                tab === 'frameworks' ? 'bg-cyber-secondary/20 text-cyber-secondary border border-cyber-secondary/40'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}
            >
              {t ? 'FRAMEWORKLER' : 'FRAMEWORKS'} ({frameworks.length})
            </button>
          </div>

          {error && <p className="text-red-400 text-[10px] font-mono">{error}</p>}
          {success && <p className="text-cyber-success text-[10px] font-mono">{success}</p>}

          {/* Domain Tab */}
          {tab === 'domains' && (
            <div className="space-y-3">
              {/* Existing domains */}
              {domains.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {domains.map(d => (
                    <div key={d.domain_id} className="flex items-center justify-between p-2 rounded bg-cyber-dark/30 group">
                      <div className="flex items-center gap-2">
                        <span>{d.icon}</span>
                        <span className="text-xs font-mono text-gray-300">{d.name}</span>
                        <span className="text-[9px] font-mono text-gray-600">{d.domain_id}</span>
                      </div>
                      <button
                        onClick={() => deleteDomain(d.domain_id)}
                        className="text-[9px] font-mono text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* New domain form */}
              <div className="border border-glass-border rounded p-2 space-y-2">
                <p className="text-[10px] font-mono font-bold text-gray-400 uppercase">
                  {t ? 'Yeni Domain' : 'New Domain'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input value={dId} onChange={e => setDId(e.target.value)} placeholder={t ? 'Domain ID (ör: devops)' : 'Domain ID (e.g. devops)'}
                    className="text-[10px] font-mono glass-card px-2 py-1.5 text-gray-300 placeholder:text-gray-600" />
                  <input value={dName} onChange={e => setDName(e.target.value)} placeholder={t ? 'Görünen Ad' : 'Display Name'}
                    className="text-[10px] font-mono glass-card px-2 py-1.5 text-gray-300 placeholder:text-gray-600" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-500">{t ? 'İkon:' : 'Icon:'}</span>
                  <div className="flex gap-0.5 flex-wrap">
                    {EMOJI_LIST.map(e => (
                      <button key={e} onClick={() => setDIcon(e)}
                        className={`text-sm p-0.5 rounded ${dIcon === e ? 'bg-cyber-primary/30 ring-1 ring-cyber-primary/50' : 'hover:bg-cyber-dark/50'}`}
                      >{e}</button>
                    ))}
                  </div>
                </div>
                <input value={dDesc} onChange={e => setDDesc(e.target.value)} placeholder={t ? 'Açıklama' : 'Description'}
                  className="w-full text-[10px] font-mono glass-card px-2 py-1.5 text-gray-300 placeholder:text-gray-600" />
                <textarea value={dRules} onChange={e => setDRules(e.target.value)}
                  placeholder={t ? 'Context Kuralları (prompt üretimine enjekte edilir)...' : 'Context Rules (injected into prompt generation)...'}
                  rows={4}
                  className="w-full text-[10px] font-mono glass-card px-2 py-1.5 text-gray-300 placeholder:text-gray-600 resize-none" />
                <button onClick={saveDomain} disabled={saving}
                  className="w-full text-[10px] font-mono font-bold py-2 rounded bg-cyber-primary/20 text-cyber-primary hover:bg-cyber-primary/30 border border-cyber-primary/30 disabled:opacity-40 transition-colors">
                  {saving ? '...' : (t ? 'DOMAIN KAYDET' : 'SAVE DOMAIN')}
                </button>
              </div>
            </div>
          )}

          {/* Framework Tab */}
          {tab === 'frameworks' && (
            <div className="space-y-3">
              {/* Existing frameworks */}
              {frameworks.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {frameworks.map(f => (
                    <div key={f.framework_id} className="flex items-center justify-between p-2 rounded bg-cyber-dark/30 group">
                      <div className="flex items-center gap-2">
                        <span>{f.icon}</span>
                        <span className="text-xs font-mono text-gray-300">{f.name}</span>
                        <span className="text-[9px] font-mono text-gray-600">{f.framework_id}</span>
                        {f.focus && <span className="text-[9px] font-mono text-gray-500">— {f.focus}</span>}
                      </div>
                      <button
                        onClick={() => deleteFramework(f.framework_id)}
                        className="text-[9px] font-mono text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* New framework form */}
              <div className="border border-glass-border rounded p-2 space-y-2">
                <p className="text-[10px] font-mono font-bold text-gray-400 uppercase">
                  {t ? 'Yeni Framework' : 'New Framework'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input value={fId} onChange={e => setFId(e.target.value)} placeholder={t ? 'Framework ID (ör: MATRIX)' : 'Framework ID (e.g. MATRIX)'}
                    className="text-[10px] font-mono glass-card px-2 py-1.5 text-gray-300 placeholder:text-gray-600" />
                  <input value={fName} onChange={e => setFName(e.target.value)} placeholder={t ? 'Görünen Ad' : 'Display Name'}
                    className="text-[10px] font-mono glass-card px-2 py-1.5 text-gray-300 placeholder:text-gray-600" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={fFocus} onChange={e => setFFocus(e.target.value)} placeholder={t ? 'Odak (ör: Veri & Analitik)' : 'Focus (e.g. Data & Analytics)'}
                    className="text-[10px] font-mono glass-card px-2 py-1.5 text-gray-300 placeholder:text-gray-600" />
                  <input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder={t ? 'Açıklama' : 'Description'}
                    className="text-[10px] font-mono glass-card px-2 py-1.5 text-gray-300 placeholder:text-gray-600" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-500">{t ? 'İkon:' : 'Icon:'}</span>
                  <div className="flex gap-0.5 flex-wrap">
                    {EMOJI_LIST.map(e => (
                      <button key={e} onClick={() => setFIcon(e)}
                        className={`text-sm p-0.5 rounded ${fIcon === e ? 'bg-cyber-secondary/30 ring-1 ring-cyber-secondary/50' : 'hover:bg-cyber-dark/50'}`}
                      >{e}</button>
                    ))}
                  </div>
                </div>
                <textarea value={fTemplate} onChange={e => setFTemplate(e.target.value)}
                  placeholder={t
                    ? 'Framework Şablonu:\nBu framework, prompt üretiminde aşağıdaki yapıyı takip eder:\n1. [Adım 1 açıklaması]\n2. [Adım 2 açıklaması]\n...'
                    : 'Framework Template:\nThis framework follows the structure below for prompt generation:\n1. [Step 1 description]\n2. [Step 2 description]\n...'}
                  rows={5}
                  className="w-full text-[10px] font-mono glass-card px-2 py-1.5 text-gray-300 placeholder:text-gray-600 resize-none" />
                <button onClick={saveFramework} disabled={saving}
                  className="w-full text-[10px] font-mono font-bold py-2 rounded bg-cyber-secondary/20 text-cyber-secondary hover:bg-cyber-secondary/30 border border-cyber-secondary/30 disabled:opacity-40 transition-colors">
                  {saving ? '...' : (t ? 'FRAMEWORK KAYDET' : 'SAVE FRAMEWORK')}
                </button>
              </div>
            </div>
          )}

          {loading && (
            <p className="text-gray-600 text-[10px] font-mono text-center animate-pulse py-2">
              {t ? 'Yükleniyor...' : 'Loading...'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
