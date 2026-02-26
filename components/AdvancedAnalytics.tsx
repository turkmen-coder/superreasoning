import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface AnalyticsData {
  promptUsage: {
    date: string;
    count: number;
    tokens: number;
    cost: number;
  }[];
  providerPerformance: {
    provider: string;
    usage: number;
    avgLatency: number;
    successRate: number;
    cost: number;
  }[];
  frameworkUsage: {
    framework: string;
    count: number;
    avgQuality: number;
  }[];
  domainUsage: {
    domain: string;
    count: number;
    avgTokens: number;
  }[];
  userActivity: {
    hour: number;
    prompts: number;
    users: number;
  }[];
  qualityMetrics: {
    date: string;
    avgJudgeScore: number;
    lintPassRate: number;
    optimizationRate: number;
  }[];
  costAnalysis: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  collaborationMetrics: {
    activeUsers: number;
    totalSessions: number;
    avgSessionDuration: number;
    commentsPerSession: number;
  };
}

interface AdvancedAnalyticsProps {
  timeRange: '7d' | '30d' | '90d' | '1y';
  onTimeRangeChange: (range: '7d' | '30d' | '90d' | '1y') => void;
}

const COLORS = ['#00ff88', '#00ccff', '#ff00ff', '#ffaa00', '#ff0055', '#00ffcc'];

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({
  timeRange,
  onTimeRangeChange
}) => {
  const { t, language } = useTranslation();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'usage' | 'performance' | 'quality' | 'cost'>('usage');

  // Mock data generation - gerçek uygulamada API'den gelecek
  useEffect(() => {
    const generateMockData = () => {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;

      const promptUsage = Array.from({ length: Math.min(days, 30) }, (_, i) => ({
        date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 100) + 20,
        tokens: Math.floor(Math.random() * 50000) + 10000,
        cost: Math.random() * 5 + 0.5
      }));

      const providerPerformance = [
        { provider: 'Groq', usage: 450, avgLatency: 850, successRate: 98.5, cost: 2.34 },
        { provider: 'Gemini', usage: 320, avgLatency: 1200, successRate: 97.2, cost: 4.56 },
        { provider: 'Claude', usage: 280, avgLatency: 2100, successRate: 99.1, cost: 8.90 },
        { provider: 'OpenAI', usage: 190, avgLatency: 1500, successRate: 98.8, cost: 6.78 },
        { provider: 'DeepSeek', usage: 150, avgLatency: 1800, successRate: 96.5, cost: 1.23 }
      ];

      const frameworkUsage = [
        { framework: 'AUTO', count: 420, avgQuality: 8.2 },
        { framework: 'KERNEL', count: 280, avgQuality: 8.5 },
        { framework: 'CO_STAR', count: 190, avgQuality: 7.9 },
        { framework: 'RTF', count: 160, avgQuality: 8.1 },
        { framework: 'RISEN', count: 140, avgQuality: 8.3 }
      ];

      const domainUsage = [
        { domain: 'general', count: 380, avgTokens: 25000 },
        { domain: 'frontend', count: 290, avgTokens: 32000 },
        { domain: 'backend', count: 240, avgTokens: 28000 },
        { domain: 'ui-design', count: 180, avgTokens: 22000 },
        { domain: 'architecture', count: 120, avgTokens: 35000 }
      ];

      const userActivity = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        prompts: Math.floor(Math.random() * 50) + 10,
        users: Math.floor(Math.random() * 20) + 5
      }));

      const qualityMetrics = Array.from({ length: Math.min(days, 30) }, (_, i) => ({
        date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        avgJudgeScore: Math.random() * 2 + 7,
        lintPassRate: Math.random() * 20 + 75,
        optimizationRate: Math.random() * 30 + 40
      }));

      const costAnalysis = [
        { category: language === 'tr' ? 'Prompt Üretimi' : 'Generation', amount: 12.45, percentage: 45 },
        { category: language === 'tr' ? 'Optimizasyon' : 'Optimization', amount: 5.67, percentage: 20 },
        { category: language === 'tr' ? 'Judge Analizi' : 'Judge Analysis', amount: 3.89, percentage: 14 },
        { category: language === 'tr' ? 'Depolama' : 'Storage', amount: 2.34, percentage: 8 },
        { category: language === 'tr' ? 'Diğer' : 'Other', amount: 3.45, percentage: 13 }
      ];

      const collaborationMetrics = {
        activeUsers: 47,
        totalSessions: 156,
        avgSessionDuration: 23.5, // minutes
        commentsPerSession: 3.8
      };

      return {
        promptUsage,
        providerPerformance,
        frameworkUsage,
        domainUsage,
        userActivity,
        qualityMetrics,
        costAnalysis,
        collaborationMetrics
      };
    };

    setLoading(true);
    setTimeout(() => {
      setData(generateMockData());
      setLoading(false);
    }, 1000);
  }, [timeRange, language]);

  const totalPrompts = useMemo(() =>
    data?.promptUsage.reduce((sum, day) => sum + day.count, 0) || 0, [data]
  );

  const totalCost = useMemo(() =>
    data?.promptUsage.reduce((sum, day) => sum + day.cost, 0) || 0, [data]
  );

  const avgQuality = useMemo(() => {
    if (!data || !data.frameworkUsage.length) return 0;
    return data.frameworkUsage.reduce((sum, fw) => sum + fw.avgQuality, 0) / data.frameworkUsage.length;
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cyber-primary font-mono text-sm animate-pulse">
          {language === 'tr' ? 'ANALİTİK YÜKLENİYOR...' : 'LOADING ANALYTICS...'}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-lg font-bold text-cyber-primary uppercase tracking-wider">
          {t.ui.advancedTitle}
        </h3>

        <div className="flex items-center gap-4">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value as '7d' | '30d' | '90d' | '1y')}
            className="bg-cyber-dark border border-cyber-primary/30 text-cyber-primary px-3 py-2 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyber-primary/50"
          >
            <option value="7d">{language === 'tr' ? 'Son 7 Gün' : 'Last 7 Days'}</option>
            <option value="30d">{language === 'tr' ? 'Son 30 Gün' : 'Last 30 Days'}</option>
            <option value="90d">{language === 'tr' ? 'Son 90 Gün' : 'Last 90 Days'}</option>
            <option value="1y">{language === 'tr' ? 'Son 1 Yıl' : 'Last 1 Year'}</option>
          </select>

          {/* Metric Tabs */}
          <div className="flex bg-cyber-dark border border-cyber-primary/30 rounded-lg p-1">
            {(['usage', 'performance', 'quality', 'cost'] as const).map((metric) => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric)}
                className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider transition-all ${
                  selectedMetric === metric
                    ? 'bg-cyber-primary text-cyber-black'
                    : 'text-cyber-primary hover:bg-cyber-primary/10'
                }`}
              >
                {language === 'tr' ?
                  (metric === 'usage' ? 'Kullanım' :
                   metric === 'performance' ? 'Performans' :
                   metric === 'quality' ? 'Kalite' : 'Maliyet') :
                  (metric === 'usage' ? 'Usage' :
                   metric === 'performance' ? 'Performance' :
                   metric === 'quality' ? 'Quality' : 'Cost')
                }
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-4">
          <div className="text-cyber-primary/60 text-xs font-mono uppercase">
            {language === 'tr' ? 'TOPLAM PROMPT' : 'TOTAL PROMPTS'}
          </div>
          <div className="text-2xl font-bold text-cyber-primary font-mono mt-1">
            {totalPrompts.toLocaleString()}
          </div>
          <div className="text-green-400 text-xs font-mono mt-2">
            ↑ 12.5% {language === 'tr' ? 'önceki döneme göre' : 'vs previous period'}
          </div>
        </div>

        <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-4">
          <div className="text-cyber-primary/60 text-xs font-mono uppercase">
            {t.ui.advancedTotalCost}
          </div>
          <div className="text-2xl font-bold text-cyber-primary font-mono mt-1">
            ${totalCost.toFixed(2)}
          </div>
          <div className="text-yellow-400 text-xs font-mono mt-2">
            ↑ 5.2% {language === 'tr' ? 'önceki döneme göre' : 'vs previous period'}
          </div>
        </div>

        <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-4">
          <div className="text-cyber-primary/60 text-xs font-mono uppercase">
            {language === 'tr' ? 'ORT. KALİTE' : 'AVG QUALITY'}
          </div>
          <div className="text-2xl font-bold text-cyber-primary font-mono mt-1">
            {avgQuality.toFixed(1)}/10
          </div>
          <div className="text-green-400 text-xs font-mono mt-2">
            ↑ 0.8 {language === 'tr' ? 'puan artış' : 'point increase'}
          </div>
        </div>

        <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-4">
          <div className="text-cyber-primary/60 text-xs font-mono uppercase">
            {language === 'tr' ? 'AKTİF KULLANICI' : 'ACTIVE USERS'}
          </div>
          <div className="text-2xl font-bold text-cyber-primary font-mono mt-1">
            {data.collaborationMetrics.activeUsers}
          </div>
          <div className="text-green-400 text-xs font-mono mt-2">
            ↑ 23 {language === 'tr' ? 'yeni kullanıcı' : 'new users'}
          </div>
        </div>
      </div>

      {/* Charts based on selected metric */}
      {selectedMetric === 'usage' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prompt Usage Trend */}
          <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-6">
            <h4 className="font-mono text-sm font-bold text-cyber-primary uppercase tracking-wider mb-4">
              {language === 'tr' ? 'PROMPT KULLANIM TRENDİ' : 'PROMPT USAGE TREND'}
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.promptUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#00ff88" tick={{ fill: '#00ff88', fontSize: 10 }} />
                <YAxis stroke="#00ff88" tick={{ fill: '#00ff88', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0f', border: '1px solid #00ff88' }}
                  labelStyle={{ color: '#00ff88' }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#00ff88"
                  fill="#00ff88"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Framework Usage */}
          <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-6">
            <h4 className="font-mono text-sm font-bold text-cyber-primary uppercase tracking-wider mb-4">
              {t.ui.analyticsFrameworkUsage}
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.frameworkUsage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => `${props.framework || props.name}: ${props.count || props.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.frameworkUsage.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0f', border: '1px solid #00ff88' }}
                  labelStyle={{ color: '#00ff88' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selectedMetric === 'performance' && (
        <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-6">
          <h4 className="font-mono text-sm font-bold text-cyber-primary uppercase tracking-wider mb-4">
            {language === 'tr' ? 'SAĞLAYICI PERFORMANSI' : 'PROVIDER PERFORMANCE'}
          </h4>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.providerPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="provider" stroke="#00ccff" tick={{ fill: '#00ccff', fontSize: 10 }} />
              <YAxis stroke="#00ccff" tick={{ fill: '#00ccff', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0a0f', border: '1px solid #00ccff' }}
                labelStyle={{ color: '#00ccff' }}
              />
              <Legend />
              <Bar dataKey="usage" fill="#00ccff" name={t.ui.analyticsDomainUsage} />
              <Bar dataKey="successRate" fill="#00ff88" name={t.ui.analyticsSuccessRate} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {selectedMetric === 'quality' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quality Metrics */}
          <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-6">
            <h4 className="font-mono text-sm font-bold text-cyber-primary uppercase tracking-wider mb-4">
              {t.ui.advancedQualityMetrics}
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.qualityMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#ff00ff" tick={{ fill: '#ff00ff', fontSize: 10 }} />
                <YAxis stroke="#ff00ff" tick={{ fill: '#ff00ff', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0f', border: '1px solid #ff00ff' }}
                  labelStyle={{ color: '#ff00ff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="avgJudgeScore" stroke="#ff00ff" name={language === 'tr' ? 'Judge Puanı' : 'Judge Score'} />
                <Line type="monotone" dataKey="lintPassRate" stroke="#00ff88" name={language === 'tr' ? 'Lint Geçme' : 'Lint Pass'} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Domain Performance */}
          <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-6">
            <h4 className="font-mono text-sm font-bold text-cyber-primary uppercase tracking-wider mb-4">
              {language === 'tr' ? 'ALAN PERFORMANSI' : 'DOMAIN PERFORMANCE'}
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.domainUsage} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#ffaa00" tick={{ fill: '#ffaa00', fontSize: 10 }} />
                <YAxis dataKey="domain" type="category" stroke="#ffaa00" tick={{ fill: '#ffaa00', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0f', border: '1px solid #ffaa00' }}
                  labelStyle={{ color: '#ffaa00' }}
                />
                <Bar dataKey="avgTokens" fill="#ffaa00" name={language === 'tr' ? 'Ort. Token' : 'Avg Tokens'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selectedMetric === 'cost' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Analysis */}
          <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-6">
            <h4 className="font-mono text-sm font-bold text-cyber-primary uppercase tracking-wider mb-4">
              {language === 'tr' ? 'MALİYET ANALİZİ' : 'COST ANALYSIS'}
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.costAnalysis}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => `${props.category || props.name}: ${props.percentage || props.value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {data.costAnalysis.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0f', border: '1px solid #ff0055' }}
                  labelStyle={{ color: '#ff0055' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Cost Trend */}
          <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-6">
            <h4 className="font-mono text-sm font-bold text-cyber-primary uppercase tracking-wider mb-4">
              {language === 'tr' ? 'MALİYET TRENDİ' : 'COST TREND'}
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.promptUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#ff0055" tick={{ fill: '#ff0055', fontSize: 10 }} />
                <YAxis stroke="#ff0055" tick={{ fill: '#ff0055', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0f', border: '1px solid #ff0055' }}
                  labelStyle={{ color: '#ff0055' }}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#ff0055"
                  fill="#ff0055"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Collaboration Metrics */}
      <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-6">
        <h4 className="font-mono text-sm font-bold text-cyber-primary uppercase tracking-wider mb-4">
          {language === 'tr' ? 'İŞ BİRLİĞİ METRİKLERİ' : 'COLLABORATION METRICS'}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-cyber-primary font-mono">
              {data.collaborationMetrics.activeUsers}
            </div>
            <div className="text-cyber-primary/60 text-xs font-mono uppercase mt-1">
              {language === 'tr' ? 'Aktif Kullanıcı' : 'Active Users'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyber-primary font-mono">
              {data.collaborationMetrics.totalSessions}
            </div>
            <div className="text-cyber-primary/60 text-xs font-mono uppercase mt-1">
              {language === 'tr' ? 'Toplam Oturum' : 'Total Sessions'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyber-primary font-mono">
              {data.collaborationMetrics.avgSessionDuration.toFixed(1)}m
            </div>
            <div className="text-cyber-primary/60 text-xs font-mono uppercase mt-1">
              {language === 'tr' ? 'Ort. Oturum Süresi' : 'Avg Session Duration'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyber-primary font-mono">
              {data.collaborationMetrics.commentsPerSession.toFixed(1)}
            </div>
            <div className="text-cyber-primary/60 text-xs font-mono uppercase mt-1">
              {language === 'tr' ? 'Oturum Başına Yorum' : 'Comments Per Session'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
