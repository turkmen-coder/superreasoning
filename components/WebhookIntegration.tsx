/**
 * Webhook Integration — Configure webhooks for prompt generation events.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '../services/apiClient';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'inactive';
  lastTriggered?: string;
  lastStatus?: number;
  createdAt: string;
}

const EVENT_TYPES = [
  { id: 'prompt.created', labelTr: 'Prompt Oluşturuldu', labelEn: 'Prompt Created' },
  { id: 'prompt.completed', labelTr: 'Prompt Tamamlandı', labelEn: 'Prompt Completed' },
  { id: 'prompt.failed', labelTr: 'Prompt Başarısız', labelEn: 'Prompt Failed' },
  { id: 'prompt.version.created', labelTr: 'Versiyon Oluşturuldu', labelEn: 'Version Created' },
  { id: 'scheduledjob.completed', labelTr: 'Zamanlanmış Görev Tamamlandı', labelEn: 'Scheduled Job Completed' },
  { id: 'abtest.completed', labelTr: 'A/B Test Tamamlandı', labelEn: 'A/B Test Completed' },
];

const PRESET_INTEGRATIONS = [
  { name: 'Slack', url: 'https://hooks.slack.com/services/', events: ['prompt.completed'] },
  { name: 'Discord', url: 'https://discord.com/api/webhooks/', events: ['prompt.completed', 'prompt.failed'] },
  { name: 'Zapier', url: 'https://hooks.zapier.com/hooks/catch/', events: ['prompt.completed'] },
  { name: 'Make (Integromat)', url: 'https://hook.make.com/', events: ['prompt.completed'] },
  { name: 'n8n', url: 'https://your-n8n-instance.com/webhook/', events: ['prompt.completed'] },
];

export default function WebhookIntegration() {
  const { t, language } = useTranslation();

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret: '',
  });

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/webhooks`, { headers });
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
      }
    } catch (e) {
      console.error('Failed to load webhooks:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWebhooks(); }, [loadWebhooks]);

  const handleCreateWebhook = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/webhooks`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebhook),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewWebhook({ name: '', url: '', events: [], secret: '' });
        loadWebhooks();
      }
    } catch (e) {
      console.error('Failed to create webhook:', e);
    }
  };

  const handleToggleWebhook = async (id: string, status: 'active' | 'inactive') => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/webhooks/${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      loadWebhooks();
    } catch (e) {
      console.error('Failed to toggle webhook:', e);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm(t.ui.webhookDeleteConfirm)) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/webhooks/${id}`, { method: 'DELETE', headers });
      loadWebhooks();
    } catch (e) {
      console.error('Failed to delete webhook:', e);
    }
  };

  const handleTestWebhook = async (id: string) => {
    setTestingId(id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/webhooks/${id}/test`, { method: 'POST', headers });
      const data = await res.json();
      alert(res.ok
        ? t.ui.webhookTestSuccess
        : `${t.ui.webhookTestError}: ${data.error}`
      );
    } catch {
      alert(t.ui.webhookTestError);
    } finally {
      setTestingId(null);
    }
  };

  const toggleEvent = (eventId: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }));
  };

  const applyPreset = (preset: typeof PRESET_INTEGRATIONS[0]) => {
    setNewWebhook(prev => ({
      ...prev,
      url: preset.url,
      events: preset.events,
    }));
  };

  return (
    <div className="text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-cyber-primary font-display">
              {t.ui.webhookTitle}
            </h1>
            <p className="text-gray-400 mt-1">
              {t.ui.webhookDesc}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-cyber-primary text-black font-semibold rounded-lg hover:bg-cyber-primary/80 transition-colors"
          >
            + {t.ui.webhookNewBtn}
          </button>
        </div>

        {/* Webhooks List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-cyber-primary border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-12 glass-card">
            <p className="text-gray-400">{t.ui.webhookEmpty}</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-cyber-primary hover:underline"
            >
              {t.ui.webhookEmptyCreate}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map(webhook => (
              <div key={webhook.id} className="glass-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-white">{webhook.name}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        webhook.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {webhook.status === 'active' ? t.ui.webhookActive : t.ui.webhookInactive}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1 font-mono">{webhook.url}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {webhook.events.map(event => (
                        <span key={event} className="px-2 py-0.5 bg-cyber-primary/10 text-cyber-primary text-xs rounded">
                          {(() => { const et = EVENT_TYPES.find(e => e.id === event); return et ? (language === 'tr' ? et.labelTr : et.labelEn) : event; })()}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {webhook.lastTriggered && (
                        <span>{t.ui.webhookLastTriggered} {new Date(webhook.lastTriggered).toLocaleString()}</span>
                      )}
                      {webhook.lastStatus && (
                        <span className={webhook.lastStatus >= 200 && webhook.lastStatus < 300 ? 'text-green-400' : 'text-red-400'}>
                          {t.ui.webhookLastStatus} {webhook.lastStatus}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestWebhook(webhook.id)}
                      disabled={testingId === webhook.id}
                      className="px-3 py-1 text-sm bg-cyber-primary/20 text-cyber-primary rounded hover:bg-cyber-primary/30 disabled:opacity-50"
                    >
                      {testingId === webhook.id ? t.ui.webhookTestBtnLoading : t.ui.webhookTestBtn}
                    </button>
                    <button
                      onClick={() => handleToggleWebhook(webhook.id, webhook.status === 'active' ? 'inactive' : 'active')}
                      className="px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600"
                    >
                      {webhook.status === 'active' ? t.ui.webhookPause : t.ui.webhookResume}
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      className="px-3 py-1 text-sm text-red-400 hover:text-red-300"
                    >
                      {t.ui.webhookDelete}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
              <h2 className="text-xl font-bold text-white mb-4 font-display">
                {t.ui.webhookNewTitle}
              </h2>

              {/* Presets */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">{t.ui.webhookQuickConnect}</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_INTEGRATIONS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.ui.webhookNameLabel}</label>
                  <input
                    type="text"
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                    className="glass-input w-full"
                    placeholder={t.ui.webhookNamePlaceholder}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">URL</label>
                  <input
                    type="url"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                    className="glass-input w-full"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t.ui.webhookEventsLabel}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {EVENT_TYPES.map(event => (
                      <label key={event.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newWebhook.events.includes(event.id)}
                          onChange={() => toggleEvent(event.id)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-300">{language === 'tr' ? event.labelTr : event.labelEn}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {t.ui.webhookSecretLabel}
                  </label>
                  <input
                    type="text"
                    value={newWebhook.secret}
                    onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                    className="glass-input w-full font-mono"
                    placeholder={t.ui.webhookSecretPlaceholder}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t.ui.webhookSecretHint}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  {t.ui.webhookCancel}
                </button>
                <button
                  onClick={handleCreateWebhook}
                  disabled={!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0}
                  className="px-6 py-2 bg-cyber-primary text-black font-semibold rounded-lg hover:bg-cyber-primary/80 disabled:opacity-50"
                >
                  {t.ui.webhookCreate}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
