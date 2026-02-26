/**
 * Scheduled Jobs — Create and manage scheduled prompt generation tasks.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '../services/apiClient';

interface ScheduledJob {
  id: string;
  name: string;
  prompt: string;
  cronExpression: string;
  input: string;
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'paused' | 'completed';
  results: { runAt: string; output: string }[];
  createdAt: string;
}

const CRON_PRESETS = [
  { label: 'Her saat', value: '0 * * * *', labelEn: 'Every hour' },
  { label: 'Her 6 saat', value: '0 */6 * * *', labelEn: 'Every 6 hours' },
  { label: 'Her gün (gece yarısı)', value: '0 0 * * *', labelEn: 'Daily (midnight)' },
  { label: 'Her gün (sabah 9)', value: '0 9 * * *', labelEn: 'Daily (9 AM)' },
  { label: 'Haftalık (Pazartesi)', value: '0 9 * * 1', labelEn: 'Weekly (Monday)' },
  { label: 'Aylık', value: '0 0 1 * *', labelEn: 'Monthly' },
];

export default function ScheduledJobs() {
  const { t, language } = useTranslation();

  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newJob, setNewJob] = useState({
    name: '',
    prompt: '',
    input: '',
    cronExpression: '0 * * * *',
  });

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/scheduled-jobs`, { headers });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (e) {
      console.error('Failed to load jobs:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const handleCreateJob = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/scheduled-jobs`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewJob({ name: '', prompt: '', input: '', cronExpression: '0 * * * *' });
        loadJobs();
      }
    } catch (e) {
      console.error('Failed to create job:', e);
    }
  };

  const handleToggleJob = async (jobId: string, status: 'active' | 'paused') => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/scheduled-jobs/${jobId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      loadJobs();
    } catch (e) {
      console.error('Failed to toggle job:', e);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm(t.ui.scheduledDeleteConfirm)) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/scheduled-jobs/${jobId}`, { method: 'DELETE', headers });
      loadJobs();
    } catch (e) {
      console.error('Failed to delete job:', e);
    }
  };

  const handleRunNow = async (jobId: string) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/scheduled-jobs/${jobId}/run`, { method: 'POST', headers });
      loadJobs();
    } catch (e) {
      console.error('Failed to run job:', e);
    }
  };

  const getCronDescription = (cron: string) => {
    const preset = CRON_PRESETS.find(p => p.value === cron);
    return preset ? (language === 'tr' ? preset.label : preset.labelEn) : cron;
  };

  return (
    <div className="text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-cyber-primary font-display">
              {t.ui.scheduledTitle}
            </h1>
            <p className="text-gray-400 mt-1">
              {t.ui.scheduledDesc}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-cyber-primary text-black font-semibold rounded-lg hover:bg-cyber-primary/80 transition-colors"
          >
            + {t.ui.scheduledNewBtn}
          </button>
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-cyber-primary border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 glass-card">
            <p className="text-gray-400">{t.ui.scheduledEmpty}</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-cyber-primary hover:underline"
            >
              {t.ui.scheduledEmptyCreate}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job.id} className="glass-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-white">{job.name}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        job.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        job.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {job.status === 'active' ? t.ui.scheduledActive :
                         job.status === 'paused' ? t.ui.scheduledPaused :
                         t.ui.scheduledCompleted}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {getCronDescription(job.cronExpression)}
                      </span>
                      {job.nextRun && (
                        <span>
                          {t.ui.scheduledNext} {new Date(job.nextRun).toLocaleString()}
                        </span>
                      )}
                      {job.lastRun && (
                        <span>
                          {t.ui.scheduledLast} {new Date(job.lastRun).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRunNow(job.id)}
                      className="px-3 py-1 text-sm bg-cyber-primary/20 text-cyber-primary rounded hover:bg-cyber-primary/30"
                    >
                      {t.ui.scheduledRunNow}
                    </button>
                    <button
                      onClick={() => handleToggleJob(job.id, job.status === 'active' ? 'paused' : 'active')}
                      className="px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600"
                    >
                      {job.status === 'active' ? t.ui.scheduledPause : t.ui.scheduledResume}
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="px-3 py-1 text-sm text-red-400 hover:text-red-300"
                    >
                      {t.ui.scheduledDelete}
                    </button>
                  </div>
                </div>

                {/* Results */}
                {job.results.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2 font-display">
                      {t.ui.scheduledResults} ({job.results.length})
                    </h4>
                    <div className="space-y-2">
                      {job.results.slice(0, 3).map((result, i) => (
                        <div key={i} className="p-2 bg-black/30 rounded text-sm">
                          <span className="text-gray-500 text-xs">{new Date(result.runAt).toLocaleString()}</span>
                          <pre className="mt-1 text-gray-300 truncate">{result.output}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
              <h2 className="text-xl font-bold text-white mb-4 font-display">
                {t.ui.scheduledNewTitle}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.ui.scheduledNameLabel}</label>
                  <input
                    type="text"
                    value={newJob.name}
                    onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
                    className="glass-input w-full"
                    placeholder={t.ui.scheduledNamePlaceholder}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.ui.scheduledScheduleLabel}</label>
                  <select
                    value={newJob.cronExpression}
                    onChange={(e) => setNewJob({ ...newJob, cronExpression: e.target.value })}
                    className="glass-input w-full"
                  >
                    {CRON_PRESETS.map(preset => (
                      <option key={preset.value} value={preset.value}>
                        {language === 'tr' ? preset.label : preset.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.ui.scheduledPromptLabel}</label>
                  <textarea
                    value={newJob.prompt}
                    onChange={(e) => setNewJob({ ...newJob, prompt: e.target.value })}
                    className="glass-input w-full h-32 font-mono text-sm"
                    placeholder={t.ui.scheduledPromptPlaceholder}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {t.ui.scheduledInputLabel}
                  </label>
                  <textarea
                    value={newJob.input}
                    onChange={(e) => setNewJob({ ...newJob, input: e.target.value })}
                    className="glass-input w-full h-20"
                    placeholder={t.ui.scheduledInputPlaceholder}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  {t.ui.scheduledCancel}
                </button>
                <button
                  onClick={handleCreateJob}
                  disabled={!newJob.name || !newJob.prompt}
                  className="px-6 py-2 bg-cyber-primary text-black font-semibold rounded-lg hover:bg-cyber-primary/80 disabled:opacity-50"
                >
                  {t.ui.scheduledCreate}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
