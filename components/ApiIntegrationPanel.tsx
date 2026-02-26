/**
 * API & SaaS entegrasyonu — Key doğrula, kaydedilen promptları listele.
 * Backend (npm run api) çalışırken /api/v1 proxy ile kullanılır.
 */

import { useState } from 'react';
import {
  validateApiKey,
  listPromptsFromApi,
  apiHealth,
} from '../services/apiClient';

interface ApiIntegrationPanelProps {
  /** Varsayılan API key (örn. VITE_API_KEY) */
  defaultApiKey?: string;
  /** Dil: tr | en */
  language: 'tr' | 'en';
}

const t = {
  tr: {
    title: 'API & SaaS',
    validate: 'API Key doğrula',
    listPrompts: 'Kaydedilen promptları getir',
    keyPlaceholder: 'API key (x-api-key)',
    valid: 'Geçerli',
    invalid: 'Geçersiz',
    mode: 'Mod',
    plan: 'Plan',
    orgId: 'Org ID',
    promptsCount: 'Prompt sayısı',
    healthOk: 'API erişilebilir',
    healthFail: 'API yanıt vermiyor (npm run api çalışıyor mu?)',
    loading: 'Kontrol ediliyor…',
    error: 'Hata',
    failedToFetch: 'API\'ye bağlanılamadı. Başka bir terminalde "npm run api" çalıştırın (port 4000).',
  },
  en: {
    title: 'API & SaaS',
    validate: 'Validate API key',
    listPrompts: 'Load saved prompts',
    keyPlaceholder: 'API key (x-api-key)',
    valid: 'Valid',
    invalid: 'Invalid',
    mode: 'Mode',
    plan: 'Plan',
    orgId: 'Org ID',
    promptsCount: 'Prompt count',
    healthOk: 'API reachable',
    healthFail: 'API not responding (is npm run api running?)',
    loading: 'Checking…',
    error: 'Error',
    failedToFetch: 'Cannot reach API. Run "npm run api" in another terminal (port 4000).',
  },
};

export default function ApiIntegrationPanel({ defaultApiKey = '', language }: ApiIntegrationPanelProps) {
  const [apiKey, setApiKey] = useState(defaultApiKey || '');
  const [validateResult, setValidateResult] = useState<{ valid: boolean; mode?: string; plan?: string; orgId?: string } | null>(null);
  const [prompts, setPrompts] = useState<{ id: string; version: string; name?: string }[]>([]);
  const [health, setHealth] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lang = t[language];

  const handleHealth = async () => {
    setLoading(true);
    setError(null);
    const r = await apiHealth();
    setHealth(r.ok);
    setLoading(false);
  };

  const handleValidate = async () => {
    if (!apiKey.trim()) {
      setError(language === 'tr' ? 'API key girin.' : 'Enter API key.');
      return;
    }
    setLoading(true);
    setError(null);
    setValidateResult(null);
    const r = await validateApiKey(apiKey.trim());
    setLoading(false);
    if (r.ok && r.data) {
      setValidateResult({
        valid: r.data.valid,
        mode: r.data.mode,
        plan: r.data.plan,
        orgId: r.data.orgId,
      });
    } else {
      setValidateResult({ valid: false });
      const err = r.error || undefined || null;
      const isNetwork = err && (String(err).includes('fetch') || String(err).toLowerCase().includes('network'));
      setError(isNetwork ? (language === 'tr' ? lang.failedToFetch : (t.en as typeof lang).failedToFetch) : err);
    }
  };

  const handleListPrompts = async () => {
    if (!apiKey.trim()) {
      setError(language === 'tr' ? 'API key girin.' : 'Enter API key.');
      return;
    }
    setLoading(true);
    setError(null);
    setPrompts([]);
    const r = await listPromptsFromApi(apiKey.trim());
    setLoading(false);
    if (r.ok && r.prompts) {
      setPrompts(r.prompts.map((p) => ({ id: p.id, version: p.version, name: p.name })));
    } else {
      const err = r.error || undefined || null;
      const isNetwork = err && (String(err).includes('fetch') || String(err).toLowerCase().includes('network'));
      setError(isNetwork ? (language === 'tr' ? lang.failedToFetch : t.en.failedToFetch) : err);
    }
  };

  return (
    <section className="border border-glass-border rounded-lg p-4 bg-cyber-dark/20" aria-labelledby="api-panel-heading">
      <h2 id="api-panel-heading" className="text-xs font-mono text-cyber-primary uppercase tracking-wider mb-3">
        {lang.title}
      </h2>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={lang.keyPlaceholder}
            className="flex-1 min-w-[180px] px-3 py-1.5 rounded border border-glass-border bg-cyber-dark text-sm font-mono placeholder-gray-500 focus-visible:ring-2 focus-visible:ring-cyber-primary focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-black"
            aria-label={lang.keyPlaceholder}
          />
          <button
            type="button"
            onClick={handleHealth}
            disabled={loading}
            className="px-3 py-1.5 rounded border border-glass-border text-xs font-mono uppercase hover:bg-cyber-primary/10 focus-visible:ring-2 focus-visible:ring-cyber-primary"
          >
            {health === true ? '✓' : health === false ? '✗' : '?'} Health
          </button>
          <button
            type="button"
            onClick={handleValidate}
            disabled={loading || !apiKey.trim()}
            className="px-3 py-1.5 rounded border border-cyber-primary/50 text-xs font-mono uppercase text-cyber-primary hover:bg-cyber-primary/10 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cyber-primary"
          >
            {lang.validate}
          </button>
          <button
            type="button"
            onClick={handleListPrompts}
            disabled={loading || !apiKey.trim()}
            className="px-3 py-1.5 rounded border border-glass-border text-xs font-mono uppercase hover:bg-cyber-primary/10 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cyber-primary"
          >
            {lang.listPrompts}
          </button>
        </div>
        {loading && <p className="text-xs text-gray-400">{lang.loading}</p>}
        {error && <p className="text-xs text-cyber-secondary">{lang.error}: {error}</p>}
        {validateResult !== null && (
          <div className="text-xs font-mono text-gray-300">
            <span className={validateResult.valid ? 'text-cyber-success' : 'text-cyber-secondary'}>
              {validateResult.valid ? lang.valid : lang.invalid}
            </span>
            {validateResult.mode && ` · ${lang.mode}: ${validateResult.mode}`}
            {validateResult.plan && ` · ${lang.plan}: ${validateResult.plan}`}
            {validateResult.orgId && ` · ${lang.orgId}: ${validateResult.orgId}`}
          </div>
        )}
        {prompts.length > 0 && (
          <p className="text-xs text-gray-400">
            {lang.promptsCount}: {prompts.length}
            {prompts.slice(0, 3).map((p) => (
              <span key={`${p.id}@${p.version}`} className="ml-1 font-mono"> {p.id}@{p.version}</span>
            ))}
            {prompts.length > 3 && ' …'}
          </p>
        )}
        {health !== null && (
          <p className="text-xs text-gray-500">
            {health ? lang.healthOk : lang.healthFail}
          </p>
        )}
      </div>
    </section>
  );
}
