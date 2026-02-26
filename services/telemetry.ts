/**
 * Kullanım telemetrisi — GDPR/anonimleştirme gözetilir.
 * Kişisel veri toplanmaz; yalnızca domain, framework, düzenleme/copy ve token tahmini.
 * Consent olmadan yalnızca bellek (session) kullanılır; consent ile sessionStorage.
 */

export type TelemetryConsent = boolean;

export type TelemetryEventType =
  | 'generation'
  | 'edited'
  | 'copy'
  | 'feedback_add_to_pool';

export interface TelemetryEvent {
  type: TelemetryEventType;
  ts: number;
  /** Anonim: domain id (örn. "auto", "analysis") */
  domainId: string;
  /** Anonim: framework enum */
  framework: string;
  /** HF | Gemini | OpenAI | Groq | ... */
  provider: string;
  /** Tahmini giriş token (kelime * 1.3) */
  inputTokenEst?: number;
  /** Tahmini çıktı token (kelime * 1.3) */
  outputTokenEst?: number;
  /** generation sonrası kullanıcı düzenleme yaptı mı (edited event'te true) */
  wasEdited?: boolean;
  /** Yanıt süresi (ms) */
  latencyMs?: number;
  /** Cache hit mi? */
  cacheHit?: boolean;
}

const STORAGE_KEY = 'sr_telemetry';
const MAX_EVENTS = 2000;

let inMemoryEvents: TelemetryEvent[] = [];

function persist(consent: TelemetryConsent) {
  if (!consent) return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const prev = raw ? (JSON.parse(raw) as TelemetryEvent[]) : [];
    const combined = [...prev, ...inMemoryEvents].slice(-MAX_EVENTS);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
    inMemoryEvents = [];
  } catch {
    inMemoryEvents = inMemoryEvents.slice(-MAX_EVENTS);
  }
}

function load(consent: TelemetryConsent): TelemetryEvent[] {
  const fromMem = inMemoryEvents;
  if (!consent) return fromMem;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const fromStorage = raw ? (JSON.parse(raw) as TelemetryEvent[]) : [];
    return [...fromStorage, ...fromMem];
  } catch {
    return fromMem;
  }
}

/** Token tahmini: kelime sayısı * 1.3 (GPT-style yaklaşık) */
export function estimateTokens(wordCount: number): number {
  return Math.max(0, Math.round(wordCount * 1.3));
}

export function recordEvent(
  event: Omit<TelemetryEvent, 'ts'>,
  consent: TelemetryConsent
): void {
  const e: TelemetryEvent = { ...event, ts: Date.now() };
  inMemoryEvents.push(e);
  if (consent) persist(consent);
}

export function getEvents(consent: TelemetryConsent): TelemetryEvent[] {
  return load(consent);
}

// ────────────────────────────────────────────────────────────
// Basic Summary (backward compat)
// ────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalGenerations: number;
  editRateByDomain: Record<string, { total: number; edited: number; rate: number }>;
  successByDomain: Record<string, number>; // 1 - edit rate
  totalInputTokenEst: number;
  totalOutputTokenEst: number;
  totalTokenEst: number;
  feedbackCount: number;
}

export function getAnalyticsSummary(consent: TelemetryConsent): AnalyticsSummary {
  const events = getEvents(consent);
  const generations = events.filter((e) => e.type === 'generation');
  const edited = events.filter((e) => e.type === 'edited');
  const feedbacks = events.filter((e) => e.type === 'feedback_add_to_pool');

  const byDomain: Record<string, { total: number; edited: number }> = {};
  for (const g of generations) {
    const d = g.domainId || 'unknown';
    if (!byDomain[d]) byDomain[d] = { total: 0, edited: 0 };
    byDomain[d].total += 1;
  }
  for (const e of edited) {
    const d = e.domainId || 'unknown';
    if (!byDomain[d]) byDomain[d] = { total: 0, edited: 0 };
    byDomain[d].edited += 1;
  }

  const editRateByDomain: AnalyticsSummary['editRateByDomain'] = {};
  const successByDomain: AnalyticsSummary['successByDomain'] = {};
  for (const [domain, v] of Object.entries(byDomain)) {
    const rate = v.total > 0 ? v.edited / v.total : 0;
    editRateByDomain[domain] = { ...v, rate };
    successByDomain[domain] = 1 - rate;
  }

  let totalInput = 0,
    totalOutput = 0;
  for (const e of events) {
    if (e.inputTokenEst != null) totalInput += e.inputTokenEst;
    if (e.outputTokenEst != null) totalOutput += e.outputTokenEst;
  }

  return {
    totalGenerations: generations.length,
    editRateByDomain,
    successByDomain,
    totalInputTokenEst: totalInput,
    totalOutputTokenEst: totalOutput,
    totalTokenEst: totalInput + totalOutput,
    feedbackCount: feedbacks.length,
  };
}

// ────────────────────────────────────────────────────────────
// Advanced Analytics: time series, provider stats, etc.
// ────────────────────────────────────────────────────────────

/** Saatlik zaman dilimi bucket'ı */
export interface TimeSeriesBucket {
  label: string;        // "14:00", "15:00" veya "2026-02-14"
  timestamp: number;
  generations: number;
  edits: number;
  copies: number;
  feedbacks: number;
  inputTokens: number;
  outputTokens: number;
  avgLatencyMs: number;
  cacheHits: number;
}

/** Provider bazlı istatistikler */
export interface ProviderStat {
  provider: string;
  count: number;
  totalTokens: number;
  avgLatencyMs: number;
  successRate: number; // 1 - edit rate
}

/** Framework bazlı istatistikler */
export interface FrameworkStat {
  framework: string;
  count: number;
  editRate: number;
}

/** Domain bazlı istatistikler (pie chart için) */
export interface DomainStat {
  domain: string;
  count: number;
  percentage: number;
  successRate: number;
}

export interface AdvancedAnalytics {
  // KPI'lar
  totalGenerations: number;
  totalEdits: number;
  totalCopies: number;
  totalFeedbacks: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  overallEditRate: number;
  overallSuccessRate: number;
  avgLatencyMs: number;
  cacheHitRate: number;

  // Zaman serisi (saatlik)
  timeSeries: TimeSeriesBucket[];

  // Provider dağılımı
  providerStats: ProviderStat[];

  // Framework dağılımı
  frameworkStats: FrameworkStat[];

  // Domain dağılımı
  domainStats: DomainStat[];

  // Son eventler (aktivite akışı)
  recentEvents: TelemetryEvent[];
}

function bucketByHour(events: TelemetryEvent[]): TimeSeriesBucket[] {
  const buckets = new Map<string, {
    timestamp: number;
    generations: number;
    edits: number;
    copies: number;
    feedbacks: number;
    inputTokens: number;
    outputTokens: number;
    latencies: number[];
    cacheHits: number;
  }>();

  for (const e of events) {
    const d = new Date(e.ts);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        timestamp: new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime(),
        generations: 0, edits: 0, copies: 0, feedbacks: 0,
        inputTokens: 0, outputTokens: 0, latencies: [], cacheHits: 0,
      });
    }
    const b = buckets.get(key)!;
    switch (e.type) {
      case 'generation': b.generations++; break;
      case 'edited': b.edits++; break;
      case 'copy': b.copies++; break;
      case 'feedback_add_to_pool': b.feedbacks++; break;
    }
    if (e.inputTokenEst) b.inputTokens += e.inputTokenEst;
    if (e.outputTokenEst) b.outputTokens += e.outputTokenEst;
    if (e.latencyMs) b.latencies.push(e.latencyMs);
    if (e.cacheHit) b.cacheHits++;
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, b]) => ({
      label: label.split(' ')[1] || label, // saat kısmı
      timestamp: b.timestamp,
      generations: b.generations,
      edits: b.edits,
      copies: b.copies,
      feedbacks: b.feedbacks,
      inputTokens: b.inputTokens,
      outputTokens: b.outputTokens,
      avgLatencyMs: b.latencies.length > 0
        ? Math.round(b.latencies.reduce((a, c) => a + c, 0) / b.latencies.length)
        : 0,
      cacheHits: b.cacheHits,
    }));
}

export function getAdvancedAnalytics(consent: TelemetryConsent): AdvancedAnalytics {
  const events = getEvents(consent);
  const generations = events.filter((e) => e.type === 'generation');
  const edits = events.filter((e) => e.type === 'edited');
  const copies = events.filter((e) => e.type === 'copy');
  const feedbacks = events.filter((e) => e.type === 'feedback_add_to_pool');

  // Toplam tokenlar
  let totalInput = 0, totalOutput = 0;
  const latencies: number[] = [];
  let cacheHits = 0;
  for (const e of events) {
    if (e.inputTokenEst) totalInput += e.inputTokenEst;
    if (e.outputTokenEst) totalOutput += e.outputTokenEst;
    if (e.latencyMs) latencies.push(e.latencyMs);
    if (e.cacheHit) cacheHits++;
  }

  // Provider stats
  const providerMap = new Map<string, { count: number; tokens: number; latencies: number[]; edits: number }>();
  for (const g of generations) {
    const p = g.provider || 'unknown';
    if (!providerMap.has(p)) providerMap.set(p, { count: 0, tokens: 0, latencies: [], edits: 0 });
    const ps = providerMap.get(p)!;
    ps.count++;
    ps.tokens += (g.inputTokenEst || 0) + (g.outputTokenEst || 0);
    if (g.latencyMs) ps.latencies.push(g.latencyMs);
  }
  for (const e of edits) {
    const p = e.provider || 'unknown';
    if (providerMap.has(p)) providerMap.get(p)!.edits++;
  }

  const providerStats: ProviderStat[] = Array.from(providerMap.entries())
    .map(([provider, s]) => ({
      provider,
      count: s.count,
      totalTokens: s.tokens,
      avgLatencyMs: s.latencies.length > 0
        ? Math.round(s.latencies.reduce((a, c) => a + c, 0) / s.latencies.length)
        : 0,
      successRate: s.count > 0 ? Math.round((1 - s.edits / s.count) * 100) : 100,
    }))
    .sort((a, b) => b.count - a.count);

  // Framework stats
  const fwMap = new Map<string, { count: number; edits: number }>();
  for (const g of generations) {
    const f = g.framework || 'unknown';
    if (!fwMap.has(f)) fwMap.set(f, { count: 0, edits: 0 });
    fwMap.get(f)!.count++;
  }
  for (const e of edits) {
    const f = e.framework || 'unknown';
    if (fwMap.has(f)) fwMap.get(f)!.edits++;
  }
  const frameworkStats: FrameworkStat[] = Array.from(fwMap.entries())
    .map(([framework, s]) => ({
      framework,
      count: s.count,
      editRate: s.count > 0 ? Math.round((s.edits / s.count) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Domain stats
  const domMap = new Map<string, { count: number; edits: number }>();
  for (const g of generations) {
    const d = g.domainId || 'unknown';
    if (!domMap.has(d)) domMap.set(d, { count: 0, edits: 0 });
    domMap.get(d)!.count++;
  }
  for (const e of edits) {
    const d = e.domainId || 'unknown';
    if (domMap.has(d)) domMap.get(d)!.edits++;
  }
  const totalGen = generations.length || 1;
  const domainStats: DomainStat[] = Array.from(domMap.entries())
    .map(([domain, s]) => ({
      domain,
      count: s.count,
      percentage: Math.round((s.count / totalGen) * 100),
      successRate: s.count > 0 ? Math.round((1 - s.edits / s.count) * 100) : 100,
    }))
    .sort((a, b) => b.count - a.count);

  // Time series
  const timeSeries = bucketByHour(events);

  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((a, c) => a + c, 0) / latencies.length)
    : 0;

  const editRate = generations.length > 0
    ? Math.round((edits.length / generations.length) * 100)
    : 0;

  return {
    totalGenerations: generations.length,
    totalEdits: edits.length,
    totalCopies: copies.length,
    totalFeedbacks: feedbacks.length,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    totalTokens: totalInput + totalOutput,
    overallEditRate: editRate,
    overallSuccessRate: 100 - editRate,
    avgLatencyMs: avgLatency,
    cacheHitRate: events.length > 0 ? Math.round((cacheHits / events.length) * 100) : 0,
    timeSeries,
    providerStats,
    frameworkStats,
    domainStats,
    recentEvents: events.slice(-20).reverse(),
  };
}

// ────────────────────────────────────────────────────────────
// CSV Export
// ────────────────────────────────────────────────────────────

export function exportEventsAsCSV(consent: TelemetryConsent): string {
  const events = getEvents(consent);
  const header = 'timestamp,type,domainId,framework,provider,inputTokenEst,outputTokenEst,latencyMs,cacheHit\n';
  const rows = events.map(e =>
    `${new Date(e.ts).toISOString()},${e.type},${e.domainId},${e.framework},${e.provider},${e.inputTokenEst ?? ''},${e.outputTokenEst ?? ''},${e.latencyMs ?? ''},${e.cacheHit ?? ''}`
  ).join('\n');
  return header + rows;
}

export function clearTelemetryData(consent: TelemetryConsent): void {
  inMemoryEvents = [];
  if (consent) {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {} // eslint-disable-line no-empty
  }
}

// ────────────────────────────────────────────────────────────
// Consent management
// ────────────────────────────────────────────────────────────

/** Consent'ı session'da saklamak için (GDPR: kullanıcı seçimi) */
export const TELEMETRY_CONSENT_KEY = 'sr_telemetry_consent';

export function getTelemetryConsent(): boolean {
  try {
    return sessionStorage.getItem(TELEMETRY_CONSENT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setTelemetryConsent(consent: boolean): void {
  try {
    sessionStorage.setItem(TELEMETRY_CONSENT_KEY, consent ? 'true' : 'false');
  } catch {} // eslint-disable-line no-empty
}
