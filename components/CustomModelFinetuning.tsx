/**
 * Custom Model Fine-tuning — Fine-tune custom models using prompt history.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '../services/apiClient';

interface FineTuneJob {
  id: string;
  name: string;
  modelId: string;
  baseModel: string;
  status: 'preparing' | 'training' | 'completed' | 'failed';
  progress: number;
  datasetSize: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface CustomModel {
  id: string;
  name: string;
  baseModel: string;
  status: 'active' | 'training' | 'inactive';
  createdAt: string;
  promptCount: number;
}

export default function CustomModelFinetuning() {
  const { t } = useTranslation();

  const [models, setModels] = useState<CustomModel[]>([]);
  const [jobs, setJobs] = useState<FineTuneJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newJob, setNewJob] = useState({
    name: '',
    baseModel: 'gpt-4o-mini',
    datasetSize: 100,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [modelsRes, jobsRes] = await Promise.all([
        fetch(`${API_BASE}/custom-models`, { headers }),
        fetch(`${API_BASE}/finetune-jobs`, { headers }),
      ]);
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        setModels(modelsData.models || []);
      }
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData.jobs || []);
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateJob = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/finetune-jobs`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewJob({ name: '', baseModel: 'gpt-4o-mini', datasetSize: 100 });
        loadData();
      }
    } catch (e) {
      console.error('Failed to create job:', e);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm(t.ui.finetuneDeleteConfirm)) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/custom-models/${modelId}`, { method: 'DELETE', headers });
      loadData();
    } catch (e) {
      console.error('Failed to delete model:', e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'training': return 'bg-yellow-500/20 text-yellow-400';
      case 'completed': return 'bg-blue-500/20 text-blue-400';
      case 'failed': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-cyber-primary font-display">
              {t.ui.finetuneTitle}
            </h1>
            <p className="text-gray-400 mt-1">
              {t.ui.finetuneDesc}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-cyber-primary text-black font-semibold rounded-lg hover:bg-cyber-primary/80 transition-colors"
          >
            + {t.ui.finetuneNewBtn}
          </button>
        </div>

        {/* Custom Models */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 font-display">{t.ui.finetuneModelsTitle}</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-cyber-primary border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : models.length === 0 ? (
            <div className="p-8 glass-card text-center">
              <p className="text-gray-400">{t.ui.finetuneModelsEmpty}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {models.map(model => (
                <div key={model.id} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{model.name}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(model.status)}`}>
                      {model.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{model.baseModel}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-gray-500">
                      {model.promptCount} {t.ui.finetunePromptLabel}
                    </span>
                    <button
                      onClick={() => handleDeleteModel(model.id)}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      {t.ui.finetuneDelete}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Training Jobs */}
        <div>
          <h2 className="text-lg font-semibold mb-4 font-display">{t.ui.finetuneHistoryTitle}</h2>
          {jobs.length === 0 ? (
            <div className="p-8 glass-card text-center">
              <p className="text-gray-400">{t.ui.finetuneHistoryEmpty}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map(job => (
                <div key={job.id} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{job.name}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{job.baseModel}</span>
                    <span>{job.datasetSize} {t.ui.finetuneDataPoints}</span>
                  </div>
                  {job.status === 'training' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>{t.ui.finetuneProgress}</span>
                        <span>{job.progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyber-primary transition-all"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {job.error && (
                    <p className="mt-2 text-sm text-red-400">{job.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 max-w-lg w-full">
              <h2 className="text-xl font-bold text-white mb-4 font-display">
                {t.ui.finetuneNewJobTitle}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.ui.finetuneJobNameLabel}</label>
                  <input
                    type="text"
                    value={newJob.name}
                    onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
                    className="glass-input w-full"
                    placeholder={t.ui.finetuneJobNamePlaceholder}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">{'Base Model'}</label>
                  <select
                    value={newJob.baseModel}
                    onChange={(e) => setNewJob({ ...newJob, baseModel: e.target.value })}
                    className="glass-input w-full"
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="claude-3-haiku">Claude 3 Haiku</option>
                    <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {t.ui.finetuneDatasetLabel}
                  </label>
                  <select
                    value={newJob.datasetSize}
                    onChange={(e) => setNewJob({ ...newJob, datasetSize: parseInt(e.target.value) })}
                    className="glass-input w-full"
                  >
                    <option value={50}>50 prompts</option>
                    <option value={100}>100 prompts</option>
                    <option value={250}>250 prompts</option>
                    <option value={500}>500 prompts</option>
                    <option value={1000}>1000 prompts</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {t.ui.finetuneDatasetHint}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  {t.ui.finetuneCancel}
                </button>
                <button
                  onClick={handleCreateJob}
                  disabled={!newJob.name}
                  className="px-6 py-2 bg-cyber-primary text-black font-semibold rounded-lg hover:bg-cyber-primary/80 disabled:opacity-50"
                >
                  {t.ui.finetuneStart}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
