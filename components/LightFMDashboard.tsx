import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders } from '../services/apiClient';

const API_BASE = import.meta.env?.VITE_API_BASE_URL || '/api/v1';

interface ModelMetrics {
  precision: number;
  auc: number;
  recall: number;
  epochs: number;
  loss: string;
  components: number;
}

interface Recommendation {
  itemId: number;
  score: number;
  label: string;
}

interface DatasetInfo {
  name: string;
  users: number;
  items: number;
  interactions: number;
  density: string;
}

const LightFMDashboard: React.FC = () => {
  const { language } = useTranslation();
  const [isTraining, setIsTraining] = useState(false);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [selectedDataset, setSelectedDataset] = useState('movielens');
  const [epochs, setEpochs] = useState(30);
  const [components, setComponents] = useState(30);
  const [lossType, setLossType] = useState<'warp' | 'bpr' | 'logistic'>('warp');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [userId, setUserId] = useState(1);
  const [numRecommendations, setNumRecommendations] = useState(10);
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const trainModel = useCallback(async () => {
    setIsTraining(true);
    setError(null);
    addLog(language === 'tr' ? 'Model eğitimi başlatılıyor...' : 'Starting model training...');

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/lightfm/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          dataset: selectedDataset,
          epochs,
          components,
          loss: lossType,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setMetrics(data.metrics);
      addLog(language === 'tr' ? 'Model eğitimi tamamlandı!' : 'Model training completed!');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      addLog(`${language === 'tr' ? 'Hata' : 'Error'}: ${errorMsg}`);
    } finally {
      setIsTraining(false);
    }
  }, [selectedDataset, epochs, components, lossType, language, addLog]);

  const getRecommendations = useCallback(async () => {
    setLoadingRecs(true);
    setError(null);
    addLog(language === 'tr' ? 'Öneriler alınıyor...' : 'Getting recommendations...');

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/lightfm/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          userId,
          numRecommendations,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setRecommendations(data.recommendations);
      addLog(`${data.recommendations.length} ${language === 'tr' ? 'öneri alındı' : 'recommendations received'}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      addLog(`${language === 'tr' ? 'Hata' : 'Error'}: ${errorMsg}`);
    } finally {
      setLoadingRecs(false);
    }
  }, [userId, numRecommendations, language, addLog]);

  const loadDatasetInfo = useCallback(async () => {
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/lightfm/dataset/${selectedDataset}`, {
        headers: authHeaders,
      });

      if (response.ok) {
        const data = await response.json();
        setDatasetInfo(data);
      }
    } catch {
      // Silent fail - dataset info is optional
    }
  }, [selectedDataset]);

  useEffect(() => {
    loadDatasetInfo();
  }, [loadDatasetInfo]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider">LightFM</h2>
            <p className="font-mono text-[10px] text-gray-500 mt-0.5">
              {language === 'tr' ? 'Hibrit öneri sistemi - Implicit & Explicit feedback' : 'Hybrid recommendation system - Implicit & Explicit feedback'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
            Python
          </span>
          <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-mono">
            Matrix Factorization
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 border border-red-500/30 bg-red-900/10 rounded-lg">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-red-400 text-xs font-mono">{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training Panel */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold text-cyber-primary uppercase tracking-wider">
              {language === 'tr' ? 'Model Eğitimi' : 'Model Training'}
            </h3>
            {isTraining && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyber-primary animate-pulse" />
                <span className="text-[10px] font-mono text-cyber-primary">
                  {language === 'tr' ? 'Eğitiliyor...' : 'Training...'}
                </span>
              </div>
            )}
          </div>

          {/* Dataset Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-gray-500 uppercase">
              {language === 'tr' ? 'Veri Seti' : 'Dataset'}
            </label>
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="w-full glass-input px-3 py-2 text-xs font-mono text-gray-200"
            >
              <option value="movielens">MovieLens 100k</option>
              <option value="movielens_1m">MovieLens 1M</option>
              <option value="stackexchange">Stack Exchange</option>
              <option value="custom">Custom Dataset</option>
            </select>
          </div>

          {/* Dataset Info */}
          {datasetInfo && (
            <div className="p-3 bg-cyber-dark/60 rounded border border-glass-border space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-gray-500">{language === 'tr' ? 'Kullanıcılar' : 'Users'}:</span>
                <span className="text-gray-300">{datasetInfo.users.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-gray-500">{language === 'tr' ? 'Öğeler' : 'Items'}:</span>
                <span className="text-gray-300">{datasetInfo.items.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-gray-500">{language === 'tr' ? 'Etkileşimler' : 'Interactions'}:</span>
                <span className="text-gray-300">{datasetInfo.interactions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-gray-500">{language === 'tr' ? 'Yoğunluk' : 'Density'}:</span>
                <span className="text-gray-300">{datasetInfo.density}</span>
              </div>
            </div>
          )}

          {/* Hyperparameters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-gray-500 uppercase">
                {language === 'tr' ? 'Epoch' : 'Epochs'}
              </label>
              <input
                type="number"
                value={epochs}
                onChange={(e) => setEpochs(Number(e.target.value))}
                min={1}
                max={100}
                className="w-full glass-input px-3 py-2 text-xs font-mono text-gray-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-gray-500 uppercase">
                {language === 'tr' ? 'Bileşenler' : 'Components'}
              </label>
              <input
                type="number"
                value={components}
                onChange={(e) => setComponents(Number(e.target.value))}
                min={10}
                max={200}
                className="w-full glass-input px-3 py-2 text-xs font-mono text-gray-200"
              />
            </div>
          </div>

          {/* Loss Type */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-gray-500 uppercase">
              {language === 'tr' ? 'Kayıp Fonksiyonu' : 'Loss Function'}
            </label>
            <div className="flex gap-2">
              {(['warp', 'bpr', 'logistic'] as const).map((loss) => (
                <button
                  key={loss}
                  onClick={() => setLossType(loss)}
                  className={`px-3 py-1.5 rounded border font-mono text-[10px] uppercase transition-all ${
                    lossType === loss
                      ? 'border-cyber-primary bg-cyber-primary/10 text-cyber-primary'
                      : 'border-glass-border text-gray-500 hover:border-gray-500'
                  }`}
                >
                  {loss.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Train Button */}
          <button
            onClick={trainModel}
            disabled={isTraining}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyber-primary/20 to-pink-500/20 border border-cyber-primary/40 text-cyber-primary font-mono text-xs uppercase tracking-wider hover:bg-cyber-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isTraining ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {language === 'tr' ? 'Eğitiliyor...' : 'Training...'}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {language === 'tr' ? 'Modeli Eğit' : 'Train Model'}
              </>
            )}
          </button>
        </div>

        {/* Metrics & Recommendations */}
        <div className="space-y-4">
          {/* Metrics Panel */}
          {metrics && (
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {language === 'tr' ? 'Model Metrikleri' : 'Model Metrics'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-cyber-dark/60 rounded border border-glass-border">
                  <div className="text-[10px] font-mono text-gray-500 uppercase">Precision@5</div>
                  <div className="text-lg font-mono text-emerald-400">{metrics.precision.toFixed(4)}</div>
                </div>
                <div className="p-3 bg-cyber-dark/60 rounded border border-glass-border">
                  <div className="text-[10px] font-mono text-gray-500 uppercase">AUC</div>
                  <div className="text-lg font-mono text-cyber-primary">{metrics.auc.toFixed(4)}</div>
                </div>
                <div className="p-3 bg-cyber-dark/60 rounded border border-glass-border">
                  <div className="text-[10px] font-mono text-gray-500 uppercase">Recall@5</div>
                  <div className="text-lg font-mono text-purple-400">{metrics.recall.toFixed(4)}</div>
                </div>
                <div className="p-3 bg-cyber-dark/60 rounded border border-glass-border">
                  <div className="text-[10px] font-mono text-gray-500 uppercase">{language === 'tr' ? 'Epoch' : 'Epochs'}</div>
                  <div className="text-lg font-mono text-gray-300">{metrics.epochs}</div>
                </div>
              </div>
              <div className="flex gap-2 text-[10px] font-mono">
                <span className="px-2 py-1 rounded bg-cyber-dark/60 text-gray-400">Loss: {metrics.loss.toUpperCase()}</span>
                <span className="px-2 py-1 rounded bg-cyber-dark/60 text-gray-400">{metrics.components} components</span>
              </div>
            </div>
          )}

          {/* Recommendations Panel */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-mono text-xs font-bold text-cyber-primary uppercase tracking-wider">
              {language === 'tr' ? 'Öneriler' : 'Recommendations'}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase">User ID</label>
                <input
                  type="number"
                  value={userId}
                  onChange={(e) => setUserId(Number(e.target.value))}
                  min={1}
                  className="w-full glass-input px-3 py-2 text-xs font-mono text-gray-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase">
                  {language === 'tr' ? 'Sayı' : 'Count'}
                </label>
                <input
                  type="number"
                  value={numRecommendations}
                  onChange={(e) => setNumRecommendations(Number(e.target.value))}
                  min={1}
                  max={50}
                  className="w-full glass-input px-3 py-2 text-xs font-mono text-gray-200"
                />
              </div>
            </div>

            <button
              onClick={getRecommendations}
              disabled={loadingRecs || !metrics}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-cyber-primary/20 border border-purple-500/40 text-purple-400 font-mono text-xs uppercase tracking-wider hover:bg-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingRecs ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {language === 'tr' ? 'Alınıyor...' : 'Fetching...'}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                  {language === 'tr' ? 'Öneri Al' : 'Get Recommendations'}
                </>
              )}
            </button>

            {/* Recommendations List */}
            {recommendations.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-gray-500 uppercase">
                  {language === 'tr' ? 'Sonuçlar' : 'Results'}
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-cyber-dark/60 rounded border border-glass-border"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-gray-500 w-6">{idx + 1}</span>
                        <span className="text-xs font-mono text-gray-300">{rec.label}</span>
                      </div>
                      <span className="text-xs font-mono text-cyber-primary">{rec.score.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logs Panel */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-xs font-bold text-gray-400 uppercase tracking-wider">
            {language === 'tr' ? 'Sistem Logları' : 'System Logs'}
          </h3>
          <button
            onClick={() => setLogs([])}
            className="text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors"
          >
            {language === 'tr' ? 'Temizle' : 'Clear'}
          </button>
        </div>
        <div className="bg-black/40 rounded p-3 font-mono text-[10px] text-gray-400 h-32 overflow-y-auto space-y-0.5">
          {logs.length === 0 ? (
            <span className="text-gray-600 italic">
              {language === 'tr' ? 'Loglar burada görünecek...' : 'Logs will appear here...'}
            </span>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="text-gray-400">{log}</div>
            ))
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-cyber-primary/5 border border-pink-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="1.5" className="mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>
            <h4 className="font-mono text-xs font-bold text-pink-400 uppercase tracking-wider">
              {language === 'tr' ? 'LightFM Nedir?' : 'What is LightFM?'}
            </h4>
            <p className="font-mono text-[10px] text-gray-500 mt-1">
              {language === 'tr'
                ? 'LightFM, hem implicit hem explicit feedback için popüler öneri algoritmalarının Python implementasyonudur. BPR ve WARP ranking loss fonksiyonlarını destekler. Kullanıcı ve öğe metadata bilgilerini matrix factorization algoritmalarına entegre edebilir.'
                : 'LightFM is a Python implementation of popular recommendation algorithms for both implicit and explicit feedback. It supports BPR and WARP ranking losses, and can incorporate user and item metadata into matrix factorization algorithms.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LightFMDashboard;
