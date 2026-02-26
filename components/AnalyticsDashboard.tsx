import React, { useState, useMemo } from 'react';
import { Icon } from './ui';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from '../i18n';
import {
  getAdvancedAnalytics,
  exportEventsAsCSV,
  clearTelemetryData,
  type AdvancedAnalytics,
  type TelemetryEvent,
} from '../services/telemetry';

interface AnalyticsDashboardProps {
  consent: boolean;
}

type TabId = 'overview' | 'tokens' | 'providers' | 'activity';

// ─── Renk Paleti ───────────────────────────────────────────
const COLORS = {
  primary: '#06e8f9',
  accent: '#a855f7',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  blue: '#3b82f6',
  pink: '#ec4899',
  orange: '#f97316',
  teal: '#14b8a6',
};

const PIE_COLORS = [COLORS.primary, COLORS.accent, COLORS.success, COLORS.warning, COLORS.blue, COLORS.pink, COLORS.orange, COLORS.teal];

// ─── Yardımcı ──────────────────────────────────────────────
function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function formatMs(ms: number): string {
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
  return ms + 'ms';
}

function getEventTypeLabel(type: string, lang: string): string {
  const labels: Record<string, Record<string, string>> = {
    generation: { tr: 'Üretim', en: 'Generation' },
    edited: { tr: 'Düzenleme', en: 'Edited' },
    copy: { tr: 'Kopyalama', en: 'Copy' },
    feedback_add_to_pool: { tr: 'Öneri', en: 'Feedback' },
  };
  return labels[type]?.[lang] || type;
}

function timeAgo(ts: number, lang: string): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === 'tr' ? 'Az önce' : 'Just now';
  if (mins < 60) return `${mins} ${lang === 'tr' ? 'dk önce' : 'min ago'}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${lang === 'tr' ? 'saat önce' : 'hr ago'}`;
  const days = Math.floor(hours / 24);
  return `${days} ${lang === 'tr' ? 'gün önce' : 'days ago'}`;
}

// ─── KPI Kartı ─────────────────────────────────────────────
function KPICard({ label, value, subValue, icon, color, trend }: {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="glass-card p-4 hover:border-cyber-primary/30 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          {icon}
        </div>
        {trend && (
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
            trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' :
            trend === 'down' ? 'bg-red-500/10 text-red-400' :
            'bg-gray-500/10 text-gray-500'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
          </span>
        )}
      </div>
      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold font-mono group-hover:text-white transition-colors" style={{ color }}>{value}</p>
      {subValue && <p className="text-[9px] font-mono text-gray-600 mt-1">{subValue}</p>}
    </div>
  );
}

// ─── Sekme Butonu ──────────────────────────────────────────
function TabButton({ active, label, onClick, icon }: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-[11px] uppercase tracking-wider transition-all duration-200 ${
        active
          ? 'bg-cyber-primary/15 text-cyber-primary border border-cyber-primary/40 shadow-[0_0_15px_rgba(6,232,249,0.08)]'
          : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] border border-transparent'
      }`}
    >
      {icon}
      <span className="font-display">{label}</span>
    </button>
  );
}

// ─── Custom Tooltip ────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 shadow-xl">
      <p className="text-[10px] font-mono text-gray-400 mb-1">{label}</p>
      {payload.map((item: any, idx: number) => (
        <p key={idx} className="text-[10px] font-mono" style={{ color: item.color }}>
          {item.name}: <span className="font-bold">{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Aktivite Akışı ────────────────────────────────────────
function ActivityFeed({ events, lang }: { events: TelemetryEvent[]; lang: string }) {
  const typeColors: Record<string, string> = {
    generation: COLORS.primary,
    edited: COLORS.warning,
    copy: COLORS.success,
    feedback_add_to_pool: COLORS.accent,
  };

  return (
    <div className="space-y-2">
      {events.map((event, idx) => (
        <div
          key={`${event.ts}-${idx}`}
          className="flex items-center gap-3 glass-card px-4 py-3 hover:border-cyber-primary/20 transition-colors"
        >
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: typeColors[event.type] || COLORS.primary }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-white uppercase">{getEventTypeLabel(event.type, lang)}</span>
              <span className="text-[9px] font-mono text-gray-600">•</span>
              <span className="text-[9px] font-mono text-gray-500">{event.domainId}</span>
              {event.provider && (
                <>
                  <span className="text-[9px] font-mono text-gray-600">•</span>
                  <span className="text-[9px] font-mono text-gray-500">{event.provider}</span>
                </>
              )}
            </div>
            {(event.inputTokenEst || event.outputTokenEst) && (
              <p className="text-[9px] font-mono text-gray-600 mt-0.5">
                {event.inputTokenEst ? `in: ${event.inputTokenEst}` : ''} {event.outputTokenEst ? `out: ${event.outputTokenEst}` : ''}
                {event.latencyMs ? ` • ${formatMs(event.latencyMs)}` : ''}
              </p>
            )}
          </div>
          <span className="text-[9px] font-mono text-gray-600 flex-shrink-0">{timeAgo(event.ts, lang)}</span>
        </div>
      ))}
      {events.length === 0 && (
        <p className="text-center text-gray-600 font-mono text-xs py-8">
          {lang === 'tr' ? 'Henüz aktivite yok' : 'No activity yet'}
        </p>
      )}
    </div>
  );
}

// ─── Boş Durum ─────────────────────────────────────────────
function EmptyState({ lang }: { lang: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="w-20 h-20 rounded-2xl bg-cyber-primary/5 border border-cyber-primary/20 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06e8f9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="text-sm font-mono text-gray-400 font-bold mb-1">
          {lang === 'tr' ? 'Henüz Veri Yok' : 'No Data Yet'}
        </h3>
        <p className="text-[11px] font-mono text-gray-600 max-w-md">
          {lang === 'tr'
            ? 'Prompt oluşturun ve analitik verileriniz burada görselleştirilecek. Grafikler, token kullanımı, provider karşılaştırması ve daha fazlası.'
            : 'Generate prompts and your analytics data will be visualized here. Charts, token usage, provider comparison and more.'}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ANA BİLEŞEN
// ═══════════════════════════════════════════════════════════
const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ consent }) => {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const analytics: AdvancedAnalytics = useMemo(() => getAdvancedAnalytics(consent), [consent]);

  // CSV dışa aktar
  const handleExport = () => {
    const csv = exportEventsAsCSV(consent);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `super-reasoning-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Veri temizle
  const handleClear = () => {
    clearTelemetryData(consent);
    setShowClearConfirm(false);
    window.location.reload();
  };

  if (analytics.totalGenerations === 0 && analytics.totalEdits === 0) {
    return <EmptyState lang={language} />;
  }

  // ─── Token Area Chart verisi ────────────────────────────
  const tokenTimeData = analytics.timeSeries.map(b => ({
    name: b.label,
    input: b.inputTokens,
    output: b.outputTokens,
  }));

  // ─── Provider Pie verisi ────────────────────────────────
  const providerPieData = analytics.providerStats.map(p => ({
    name: p.provider,
    value: p.count,
  }));

  // ─── Domain Bar verisi ──────────────────────────────────
  const domainBarData = analytics.domainStats.slice(0, 8).map(d => ({
    name: d.domain,
    count: d.count,
    success: d.successRate,
  }));

  // ─── Framework Bar verisi ───────────────────────────────
  const frameworkBarData = analytics.frameworkStats.map(f => ({
    name: f.framework,
    count: f.count,
    editRate: f.editRate,
  }));

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'overview',
      label: t.ui.analyticsOverview,
      icon: <Icon name="dashboard" size={14} />,
    },
    {
      id: 'tokens',
      label: t.ui.analyticsTokenUsage,
      icon: <Icon name="token" size={14} />,
    },
    {
      id: 'providers',
      label: t.ui.analyticsProviders,
      icon: <Icon name="layers" size={14} />,
    },
    {
      id: 'activity',
      label: t.ui.analyticsActivity,
      icon: <Icon name="monitoring" size={14} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Aksiyon Butonları ──────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {tabs.map(tab => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              label={tab.label}
              onClick={() => setActiveTab(tab.id)}
              icon={tab.icon}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-glass-border text-[10px] font-mono text-gray-500 hover:text-cyber-primary hover:border-cyber-primary/40 transition-colors uppercase tracking-wider"
          >
            <Icon name="download" size={12} />
            CSV
          </button>
          {!showClearConfirm ? (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/20 text-[10px] font-mono text-red-500/50 hover:text-red-400 hover:border-red-500/40 transition-colors uppercase tracking-wider"
            >
              <Icon name="delete" size={12} />
              {t.ui.analyticsClear}
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/40 text-[10px] font-mono text-red-400 hover:bg-red-500/20 transition-colors uppercase"
              >
                {t.ui.analyticsYesDelete}
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-2 rounded-lg border border-glass-border text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors uppercase"
              >
                {t.ui.analyticsCancel}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ OVERVIEW TAB ═══════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* KPI Kartları */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard
              label={t.ui.analyticsTotalGenerations}
              value={formatNumber(analytics.totalGenerations)}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} strokeWidth="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>}
              color={COLORS.primary}
            />
            <KPICard
              label={t.ui.analyticsSuccessRate}
              value={`${analytics.overallSuccessRate}%`}
              subValue={`${analytics.totalEdits} ${t.ui.analyticsEdits}`}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.success} strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
              color={COLORS.success}
              trend={analytics.overallSuccessRate >= 80 ? 'up' : analytics.overallSuccessRate >= 50 ? 'neutral' : 'down'}
            />
            <KPICard
              label={t.ui.analyticsTotalTokens}
              value={formatNumber(analytics.totalTokens)}
              subValue={`in: ${formatNumber(analytics.totalInputTokens)} / out: ${formatNumber(analytics.totalOutputTokens)}`}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
              color={COLORS.accent}
            />
            <KPICard
              label={t.ui.analyticsAvgLatency}
              value={analytics.avgLatencyMs > 0 ? formatMs(analytics.avgLatencyMs) : '—'}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.warning} strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
              color={COLORS.warning}
            />
            <KPICard
              label={t.ui.analyticsCopies}
              value={formatNumber(analytics.totalCopies)}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.blue} strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
              color={COLORS.blue}
            />
            <KPICard
              label={t.ui.analyticsFeedbacks}
              value={formatNumber(analytics.totalFeedbacks)}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.pink} strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>}
              color={COLORS.pink}
            />
          </div>

          {/* Grafikler Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Üretim Zaman Serisi */}
            <div className="glass-card p-5">
              <h3 className="text-[11px] font-display text-gray-400 uppercase tracking-wider mb-4">
                {t.ui.analyticsTimeline}
              </h3>
              {analytics.timeSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={analytics.timeSeries} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradGen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradEdit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.warning} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.warning} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'monospace' }} stroke="#1a1a2e" />
                    <YAxis tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'monospace' }} stroke="#1a1a2e" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="generations" name={t.ui.analyticsGenerations} stroke={COLORS.primary} fill="url(#gradGen)" strokeWidth={2} />
                    <Area type="monotone" dataKey="edits" name={t.ui.analyticsEditsSuffix} stroke={COLORS.warning} fill="url(#gradEdit)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-gray-600 font-mono text-xs">
                  {t.ui.analyticsNoTimeData}
                </div>
              )}
            </div>

            {/* Başarı Gauge + Domain Dağılımı */}
            <div className="glass-card p-5">
              <h3 className="text-[11px] font-display text-gray-400 uppercase tracking-wider mb-4">
                {t.ui.analyticsDomainDist}
              </h3>
              {domainBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={domainBarData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#6b7280', fontFamily: 'monospace' }} stroke="#1a1a2e" />
                    <YAxis tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'monospace' }} stroke="#1a1a2e" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name={t.ui.analyticsDomainUsage} radius={[4, 4, 0, 0]}>
                      {domainBarData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-gray-600 font-mono text-xs">
                  {t.ui.analyticsNoDomainData}
                </div>
              )}
            </div>
          </div>

          {/* Domain başarı oranları tablosu */}
          {analytics.domainStats.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-[11px] font-display text-gray-400 uppercase tracking-wider mb-4">
                {t.ui.analyticsDomainSuccess}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {analytics.domainStats.slice(0, 8).map((d, idx) => (
                  <div key={d.domain} className="flex items-center gap-3 bg-cyber-dark/30 border border-glass-border rounded-lg px-4 py-3">
                    <div className="w-2 h-10 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-mono text-gray-400 truncate">{d.domain}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${d.successRate}%`, background: d.successRate >= 80 ? COLORS.success : d.successRate >= 50 ? COLORS.warning : COLORS.error }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold" style={{ color: d.successRate >= 80 ? COLORS.success : d.successRate >= 50 ? COLORS.warning : COLORS.error }}>
                          {d.successRate}%
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-gray-600">{d.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TOKEN USAGE TAB ════════════════════════════════ */}
      {activeTab === 'tokens' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Token KPI'lar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              label={t.ui.analyticsInputTokens}
              value={formatNumber(analytics.totalInputTokens)}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
              color={COLORS.primary}
            />
            <KPICard
              label={t.ui.analyticsOutputTokens}
              value={formatNumber(analytics.totalOutputTokens)}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
              color={COLORS.accent}
            />
            <KPICard
              label={t.ui.analyticsTotalTokens}
              value={formatNumber(analytics.totalTokens)}
              subValue={`${t.ui.analyticsAvgPerGen}: ~${analytics.totalGenerations > 0 ? formatNumber(Math.round(analytics.totalTokens / analytics.totalGenerations)) : 0}`}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.success} strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>}
              color={COLORS.success}
            />
          </div>

          {/* Token Zaman Çizelgesi */}
          <div className="glass-card p-5">
            <h3 className="text-[11px] font-display text-gray-400 uppercase tracking-wider mb-4">
              {t.ui.analyticsTokenTimeline}
            </h3>
            {tokenTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={tokenTimeData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradInput" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradOutput" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'monospace' }} stroke="#1a1a2e" />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'monospace' }} stroke="#1a1a2e" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Area type="monotone" dataKey="input" name={t.ui.analyticsInputTokens} stroke={COLORS.primary} fill="url(#gradInput)" strokeWidth={2} />
                  <Area type="monotone" dataKey="output" name={t.ui.analyticsOutputTokens} stroke={COLORS.accent} fill="url(#gradOutput)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-600 font-mono text-xs">
                {t.ui.analyticsNoTimeData}
              </div>
            )}
          </div>

          {/* Token/Üretim oranı grafiği */}
          <div className="glass-card p-5">
            <h3 className="text-[11px] font-display text-gray-400 uppercase tracking-wider mb-4">
              {t.ui.analyticsInputOutputRatio}
            </h3>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-gray-500">{t.ui.analyticsInput}</span>
                  <span className="text-[10px] font-mono text-cyber-primary font-bold">
                    {analytics.totalTokens > 0 ? Math.round((analytics.totalInputTokens / analytics.totalTokens) * 100) : 0}%
                  </span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${analytics.totalTokens > 0 ? (analytics.totalInputTokens / analytics.totalTokens) * 100 : 0}%`,
                      background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.blue})`,
                    }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-gray-500">{t.ui.analyticsOutput}</span>
                  <span className="text-[10px] font-mono text-purple-400 font-bold">
                    {analytics.totalTokens > 0 ? Math.round((analytics.totalOutputTokens / analytics.totalTokens) * 100) : 0}%
                  </span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${analytics.totalTokens > 0 ? (analytics.totalOutputTokens / analytics.totalTokens) * 100 : 0}%`,
                      background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.pink})`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PROVIDERS TAB ══════════════════════════════════ */}
      {activeTab === 'providers' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Provider Pasta Grafiği */}
            <div className="glass-card p-5">
              <h3 className="text-[11px] font-display text-gray-400 uppercase tracking-wider mb-4">
                {t.ui.analyticsProviderDist}
              </h3>
              {providerPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={providerPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {providerPieData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} fillOpacity={0.85} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-gray-600 font-mono text-xs">
                  {t.ui.analyticsNoProviderData}
                </div>
              )}
            </div>

            {/* Framework Dağılımı */}
            <div className="glass-card p-5">
              <h3 className="text-[11px] font-display text-gray-400 uppercase tracking-wider mb-4">
                {t.ui.analyticsFrameworkUsage}
              </h3>
              {frameworkBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={frameworkBarData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'monospace' }} stroke="#1a1a2e" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'monospace' }} stroke="#1a1a2e" width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name={t.ui.analyticsDomainUsage} radius={[0, 4, 4, 0]}>
                      {frameworkBarData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-gray-600 font-mono text-xs">
                  {t.ui.analyticsNoFrameworkData}
                </div>
              )}
            </div>
          </div>

          {/* Provider Detay Tablosu */}
          {analytics.providerStats.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-[11px] font-display text-gray-400 uppercase tracking-wider mb-4">
                {t.ui.analyticsProviderTable}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] font-mono">
                  <thead>
                    <tr className="border-b border-glass-border">
                      <th className="text-left py-2 px-3 text-gray-500 uppercase">{t.ui.analyticsProvider}</th>
                      <th className="text-right py-2 px-3 text-gray-500 uppercase">{t.ui.analyticsDomainUsage}</th>
                      <th className="text-right py-2 px-3 text-gray-500 uppercase">{t.ui.analyticsTokens}</th>
                      <th className="text-right py-2 px-3 text-gray-500 uppercase">{t.ui.analyticsAvgLatency}</th>
                      <th className="text-right py-2 px-3 text-gray-500 uppercase">{t.ui.analyticsSuccess}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.providerStats.map((p, idx) => (
                      <tr key={p.provider} className="border-b border-glass-border/10 hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                            <span className="text-white font-bold">{p.provider}</span>
                          </div>
                        </td>
                        <td className="text-right py-2.5 px-3 text-gray-400">{p.count}</td>
                        <td className="text-right py-2.5 px-3 text-gray-400">{formatNumber(p.totalTokens)}</td>
                        <td className="text-right py-2.5 px-3 text-gray-400">{p.avgLatencyMs > 0 ? formatMs(p.avgLatencyMs) : '—'}</td>
                        <td className="text-right py-2.5 px-3">
                          <span className={`font-bold ${p.successRate >= 80 ? 'text-emerald-400' : p.successRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {p.successRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ ACTIVITY TAB ═══════════════════════════════════ */}
      {activeTab === 'activity' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Aktivite özeti */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass-card p-4 text-center">
              <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: COLORS.primary }} />
              <p className="text-lg font-mono font-bold text-white">{analytics.totalGenerations}</p>
              <p className="text-[9px] font-mono text-gray-500 uppercase">{t.ui.analyticsGenerations}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: COLORS.warning }} />
              <p className="text-lg font-mono font-bold text-white">{analytics.totalEdits}</p>
              <p className="text-[9px] font-mono text-gray-500 uppercase">{t.ui.analyticsEditsSuffix}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: COLORS.success }} />
              <p className="text-lg font-mono font-bold text-white">{analytics.totalCopies}</p>
              <p className="text-[9px] font-mono text-gray-500 uppercase">{t.ui.analyticsCopies}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: COLORS.accent }} />
              <p className="text-lg font-mono font-bold text-white">{analytics.totalFeedbacks}</p>
              <p className="text-[9px] font-mono text-gray-500 uppercase">{t.ui.analyticsFeedbacks}</p>
            </div>
          </div>

          {/* Aktivite akışı */}
          <div className="glass-card p-5">
            <h3 className="text-[11px] font-display text-gray-400 uppercase tracking-wider mb-4">
              {t.ui.analyticsRecentActivity}
            </h3>
            <ActivityFeed events={analytics.recentEvents} lang={language} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
