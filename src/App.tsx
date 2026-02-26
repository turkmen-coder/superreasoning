import React, { useState, useCallback, useRef, useEffect, useMemo, useReducer, lazy, Suspense } from 'react';
import { Framework } from './types';
import {
  generateMasterPromptUnified,
  getProviderLabel,
  getModelLabel,
  type ClientProvider,
} from '../services/unifiedProviderService';
import { setOpenRouterModel } from '../services/openRouterService';
import Sidebar, { type SidebarPage } from './components/Sidebar';
import DomainSelector from './components/DomainSelector';
import OutputTerminal from './components/OutputTerminal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import ExportButton from './components/ExportButton';
import OpenInAI from './components/OpenInAI';
import VoiceInput from './components/VoiceInput';
import ScoreBadge from './components/ScoreBadge';
import OnboardingModal, { useOnboarding } from './components/OnboardingModal';
import SystemPromptEditor from './components/SystemPromptEditor';
import BackendHealthPanel from './components/BackendHealthPanel';
import ProviderCostCalculator from './components/ProviderCostCalculator';
import TokenBudgetIndicator from './components/TokenBudgetIndicator';
import OutputFormatSelector, { type OutputFormat, getFormatInstruction } from './components/OutputFormatSelector';
import PersonaLibrary, { type Persona } from './components/PersonaLibrary';
import PromptInjectionWarning from './components/PromptInjectionWarning';
import WebhookSettings, { triggerWebhook } from './components/WebhookSettings';
import { useTheme } from './hooks/useTheme';
import CommandPalette, { type Command } from './components/CommandPalette';
import EmptyState from './components/EmptyState';
import SkeletonLoader from './components/SkeletonLoader';
import FloatingFAB from './components/FloatingFAB';
import ContextMenu, { useContextMenu, type ContextMenuItem } from './components/ContextMenu';
import ThemeCustomizer from './components/ThemeCustomizer';
const PromptDiffViewer = lazy(() => import('./components/PromptDiffViewer'));
const FewShotGenerator = lazy(() => import('./components/FewShotGenerator'));
const PromptTournament = lazy(() => import('./components/PromptTournament'));
const BatchProcessor = lazy(() => import('./components/BatchProcessor'));
import PromptHistoryPanel from './components/PromptHistoryPanel';
import { usePromptHistory } from './hooks/usePromptHistory';
import FrameworkSelector from '../components/FrameworkSelector';
import ResultDisplay, { TelemetryEventPayload } from '../components/ResultDisplay';
import TemplateSelector from '../components/TemplateSelector';
import JudgePanel from '../components/JudgePanel';
import PromptLintPanel from '../components/PromptLintPanel';
import BudgetPanel from '../components/BudgetPanel';
import ProvenanceView from '../components/ProvenanceView';
import CacheStatus from '../components/CacheStatus';
import AgentPipeline from '../components/AgentPipeline';
import DashboardHeader from '../components/DashboardHeader';
import StatusFooter from '../components/StatusFooter';
import AuthPage from '../components/AuthPage';
import PricingPage from '../components/PricingPage';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ToastProvider, useToast } from '../components/ToastSystem';
import { I18nProvider, useTranslation } from './i18n';
import SettingsPage from './components/SettingsPage';
import { judgePrompt } from '../services/judgeEnsemble';
import { lintPrompt } from '../services/promptLint';
import { analyzeBudget } from '../services/budgetOptimizer';
import { cacheGet, cachePut, getCacheStats } from '../services/semanticCache';
import { GUARDRAIL_BLOCKS } from '../services/irExtractor';
import { runWorkflow } from '../services/orchestrator';
import { getActiveProfile, buildStyleContext } from '../services/styleProfiles';
import { WORKFLOW_PRESETS } from '../data/workflows';
import { compressIntent } from '../utils/compressIntent';
import { analyzeIntentViaBrain, enrichPromptViaBrain } from '../services/brainClient';
import type { EnrichmentResult } from '../types/enrichment';
import {
  recordEvent, estimateTokens, getTelemetryConsent, setTelemetryConsent, getAdvancedAnalytics,
} from '../services/telemetry';
import { getInputAnalysis, getOutputAnalysis } from '../utils/analysis';
import {
  generationReducer, initialGenerationState,
  qualityReducer, initialQualityState,
  uiReducer, initialUIState,
  settingsReducer, initialSettingsState,
} from '../utils/appReducers';

// Lazy-loaded heavy pages
const AnalyticsDashboard = lazy(() => import('../components/AnalyticsDashboard'));
const AILabWorkbench = lazy(() => import('../components/AILabWorkbench'));
const WorkflowPanel = lazy(() => import('../components/WorkflowPanel'));
const StyleProfileManager = lazy(() => import('../components/StyleProfileManager'));
const OptimizerPanel = lazy(() => import('../components/OptimizerPanel'));
const MetaPromptLibrary = lazy(() => import('../components/MetaPromptLibrary'));
const RAGFlowDashboard = lazy(() => import('../components/RAGFlowDashboard'));
const EnhancePanel = lazy(() => import('../components/EnhancePanel'));
const EnrichmentPanel = lazy(() => import('../components/EnrichmentPanel'));
const AutoCompletePanel = lazy(() => import('../components/AutoCompletePanel'));
const PromptAnalysisPanel = lazy(() => import('../components/PromptAnalysisPanel'));
const PromptTransformPanel = lazy(() => import('../components/PromptTransformPanel'));
const BenchmarkPanel = lazy(() => import('../components/BenchmarkPanel'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-40">
    <div className="font-mono text-[10px] text-cyber-primary/50 animate-pulse uppercase tracking-widest">Yükleniyor...</div>
  </div>
);

// ─── Auth Gate ─────────────────────────────────────────────────────────────
function AuthGate() {
  const { loading, session } = useAuth();
  const [showPricing, setShowPricing] = useState(false);
  if (loading) return <div className="min-h-screen bg-cyber-black flex items-center justify-center"><div className="text-cyber-primary font-mono text-xs animate-pulse tracking-widest uppercase">Sistem Başlatılıyor...</div></div>;
  if (!session) return <AuthPage />;
  if (showPricing) return <PricingPage onBack={() => setShowPricing(false)} />;
  return <AppContent onShowPricing={() => setShowPricing(true)} />;
}

// ─── Main App ───────────────────────────────────────────────────────────────
function AppContent({ onShowPricing: _onShowPricing }: { onShowPricing?: () => void }) {
  const [gen, genDispatch] = useReducer(generationReducer, initialGenerationState);
  const [quality, qualityDispatch] = useReducer(qualityReducer, initialQualityState);
  const [ui, uiDispatch] = useReducer(uiReducer, initialUIState);
  const [settings, settingsDispatch] = useReducer(settingsReducer, initialSettingsState);

  const { intent, framework, domainId, loading, error, result, attachments, dragActive } = gen;
  const { showQualityPanel, judgeResult, lintResult, budgetAnalysis, provenance, lastCacheHit, enrichmentMetrics } = quality;
  const { activePage, lastLatency, lastTokensPerSec } = ui;
  const { provider, lastUsedProvider, claudeModel, openRouterModel, telemetryConsent,
    workflowPresetId, workflowResult, workflowLoading, useSearch, thinkingMode, autoEnrich } = settings;

  const setIntent = (v: string) => genDispatch({ type: 'SET_INTENT', payload: v });
  const setFramework = (v: Framework) => genDispatch({ type: 'SET_FRAMEWORK', payload: v });
  const setDomainId = (v: string) => genDispatch({ type: 'SET_DOMAIN', payload: v });
  const setProvider = (v: ClientProvider) => settingsDispatch({ type: 'SET_PROVIDER', payload: v });
  const setPage = (v: SidebarPage) => uiDispatch({ type: 'SET_PAGE', payload: v as any });

  // Prompt history
  const { history, addEntry, removeEntry, clearHistory } = usePromptHistory();

  const [agentMode, setAgentMode] = useState(false);
  const [agentAnalyzing, setAgentAnalyzing] = useState(false);
  const [agentHint, setAgentHint] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(localStorage.getItem('sr_system_prompt') || '');
  const [diffPrompt, setDiffPrompt] = useState<{ left: string; right: string } | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('auto');
  const [activePersonaId, setActivePersonaId] = useState<string | undefined>();
  const prevResultRef = useRef<string | null>(null);
  const { show: showOnboarding, done: onboardingDone } = useOnboarding();
  const { theme, toggle: toggleTheme } = useTheme();
  const [splitView, setSplitView] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const { menu: ctxMenu, open: openCtxMenu, close: closeCtxMenu } = useContextMenu();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastGenParamsRef = useRef<any>(null);
  const executeGenerationRef = useRef<(() => void) | null>(null);
  const handlePreGenerateRef = useRef<(() => void) | null>(null);

  const { t, language } = useTranslation();
  const { addToast } = useToast();

  useEffect(() => { settingsDispatch({ type: 'SET_TELEMETRY_CONSENT', payload: getTelemetryConsent() }); }, []);
  useEffect(() => { if (provider === 'openrouter') setOpenRouterModel(openRouterModel); }, [provider, openRouterModel]);

  // Global keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !loading) { e.preventDefault(); handlePreGenerateRef.current?.(); return; }
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '?') { e.preventDefault(); setShowShortcuts(p => !p); return; }
        const pages: Record<string, SidebarPage> = { '1': 'dashboard', '2': 'prompts', '3': 'ailab', '4': 'optimizer', '5': 'ragflow', '6': 'analytics', '7': 'settings' };
        if (pages[e.key]) { e.preventDefault(); setPage(pages[e.key]); }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [loading]);

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    if (attachments.length + files.length > 3) { addToast('Maksimum 3 dosya.', 'error'); return; }
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const isText = file.type.startsWith('text/');
      const isImage = file.type.startsWith('image/');
      reader.onload = (e) => {
        const r = e.target?.result as string;
        if (isText) {
          genDispatch({ type: 'ADD_ATTACHMENTS', payload: [{ name: file.name, mimeType: file.type, data: btoa(unescape(encodeURIComponent(r))), preview: r.slice(0, 500) }] });
        } else {
          genDispatch({ type: 'ADD_ATTACHMENTS', payload: [{ name: file.name, mimeType: file.type, data: r.split(',')[1], ...(isImage && { preview: r }) }] });
        }
      };
      isText ? reader.readAsText(file) : reader.readAsDataURL(file);
    });
  };

  const handleTemplateSelect = useCallback(
    (template: { intentTr: string; intentEn: string; domainId: string; framework: Framework }) => {
      setIntent(language === 'tr' ? template.intentTr : template.intentEn);
      setDomainId(template.domainId);
      setFramework(template.framework);
      addToast('Şablon yüklendi.', 'success');
    }, [language, addToast]
  );

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); genDispatch({ type: 'SET_DRAG_ACTIVE', payload: e.type !== 'dragleave' }); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); genDispatch({ type: 'SET_DRAG_ACTIVE', payload: false }); if (e.dataTransfer.files?.[0]) processFiles(e.dataTransfer.files); };

  const executeGeneration = useCallback(async () => {
    genDispatch({ type: 'START_GENERATION' }); qualityDispatch({ type: 'RESET_QUALITY' });
    lastGenParamsRef.current = { intent, framework, domainId, provider, useSearch, thinkingMode, timestamp: Date.now() };
    const startTime = Date.now();
    // Append format instruction
    const intentWithFormat = outputFormat !== 'auto' ? intent + getFormatInstruction(outputFormat) : intent;
    try {
      const localizedDomain = t.domains[domainId as keyof typeof t.domains] || t.domains.auto;
      const cached = cacheGet(intent, domainId, framework, provider);
      if (cached) {
        genDispatch({ type: 'GENERATION_SUCCESS', payload: cached.response });
        qualityDispatch({ type: 'SET_CACHE_HIT', payload: true });
        uiDispatch({ type: 'SET_LATENCY', payload: Date.now() - startTime });
        addToast('Cache\'den yüklendi!', 'success');
        qualityDispatch({ type: 'SET_JUDGE_RESULT', payload: judgePrompt(cached.response.masterPrompt, { domainId, framework }) });
        qualityDispatch({ type: 'SET_LINT_RESULT', payload: lintPrompt(cached.response.masterPrompt, cached.response.reasoning) });
        qualityDispatch({ type: 'SET_BUDGET_ANALYSIS', payload: analyzeBudget(intent, cached.response.masterPrompt + '\n' + cached.response.reasoning, provider) });
        return;
      }
      const activeProfile = getActiveProfile();
      const styleContext = buildStyleContext(activeProfile ?? null);
      const { response, usedProvider } = await generateMasterPromptUnified(provider, {
        intent: compressIntent(intent), framework, domainId, useSearch, thinkingMode,
        language, localizedRules: localizedDomain.contextRules, attachments,
        styleContext: styleContext || undefined, claudeModel, openRouterModel, systemPrompt,
      });
      if (provider === 'auto') settingsDispatch({ type: 'SET_LAST_USED_PROVIDER', payload: usedProvider });
      genDispatch({ type: 'GENERATION_SUCCESS', payload: response });
      const endTime = Date.now();
      uiDispatch({ type: 'SET_LATENCY', payload: endTime - startTime });
      const outTokens = estimateTokens(getOutputAnalysis(response).masterPromptWords + getOutputAnalysis(response).reasoningWords);
      uiDispatch({ type: 'SET_TOKENS_PER_SEC', payload: Math.round(outTokens / Math.max((endTime - startTime) / 1000, 0.1)) });
      cachePut(intent, domainId, framework, provider, response);
      const effectiveProvider = provider === 'auto' ? usedProvider : provider;
      qualityDispatch({ type: 'SET_JUDGE_RESULT', payload: judgePrompt(response.masterPrompt, { domainId, framework, reasoning: response.reasoning }) });
      qualityDispatch({ type: 'SET_LINT_RESULT', payload: lintPrompt(response.masterPrompt, response.reasoning) });
      qualityDispatch({ type: 'SET_BUDGET_ANALYSIS', payload: analyzeBudget(intent, response.masterPrompt + '\n' + response.reasoning, provider) });
      qualityDispatch({ type: 'SET_PROVENANCE', payload: { framework, domainId, domainRules: localizedDomain.contextRules.slice(0, 200), irPipelineUsed: true, guardrailsApplied: [...GUARDRAIL_BLOCKS], styleProfileId: activeProfile?.id, styleProfileName: activeProfile?.name, constraintsApplied: ['Markdown only', `Domain: ${domainId}`, `Framework: ${framework}`], securityPolicies: ['Ignore unauthorized', 'Format enforcement'], stopConditions: ['No output without domain'], cacheHit: false, provider: effectiveProvider, durationMs: endTime - startTime, createdAt: new Date().toISOString() } });
      addToast(t.ui.toastGenerated, 'success');
      recordEvent({ type: 'generation', domainId, framework, provider: getProviderLabel(effectiveProvider, claudeModel), inputTokenEst: estimateTokens(getInputAnalysis(compressIntent(intent)).words), outputTokenEst: outTokens, latencyMs: endTime - startTime, cacheHit: false }, telemetryConsent);
      // Save to history
      // Save previous prompt for diff comparison
      if (result?.masterPrompt) prevResultRef.current = result.masterPrompt;
      addEntry({ intent, masterPrompt: response.masterPrompt, reasoning: response.reasoning, provider: effectiveProvider, framework, domainId, score: judgePrompt(response.masterPrompt, { domainId, framework }).totalScore });
      // Webhook
      triggerWebhook('generate', { masterPrompt: response.masterPrompt, framework, domainId, provider: effectiveProvider });
      if (autoEnrich && response.masterPrompt) {
        try {
          const enrichData = await enrichPromptViaBrain({ masterPrompt: response.masterPrompt, domainId, framework, language, mode: 'fast' }) as EnrichmentResult;
          if (enrichData?.integratedPrompts?.length > 0) {
            genDispatch({ type: 'UPDATE_RESULT', payload: { masterPrompt: enrichData.enrichedPrompt } });
            qualityDispatch({ type: 'SET_ENRICHMENT_METRICS', payload: { ambiguityBefore: enrichData.metrics.ambiguityScoreBefore, ambiguityAfter: enrichData.metrics.ambiguityScoreAfter, promptsIntegrated: enrichData.metrics.promptsIntegrated, tokensAdded: enrichData.metrics.tokensAdded, durationMs: enrichData.metrics.durationMs } });
            addToast(`+${enrichData.metrics.promptsIntegrated} prompt eklendi`, 'success');
          }
        } catch { /* silent */ }
      }
    } catch (err: unknown) {
      genDispatch({ type: 'GENERATION_ERROR', payload: err instanceof Error ? err.message : t.ui.errorCritical });
      addToast(t.ui.toastError, 'error');
    }
  }, [intent, framework, domainId, useSearch, thinkingMode, language, t, attachments, addToast, provider, claudeModel, openRouterModel, telemetryConsent, autoEnrich, addEntry, systemPrompt, result?.masterPrompt, outputFormat]);

  executeGenerationRef.current = executeGeneration;

  const handlePreGenerate = useCallback(async () => {
    if (!intent.trim() && attachments.length === 0) { addToast(t.ui.errorInputEmpty, 'error'); return; }
    setAgentAnalyzing(true); setAgentHint(null);
    try {
      const data = await analyzeIntentViaBrain({ prompt: intent, language, domainId, framework });
      if (data.domain && data.domain !== 'auto') setDomainId(data.domain);
      if (data.framework) setFramework(data.framework as Framework);
      if (data.reasoning) setAgentHint(data.reasoning);
    } catch { /* silent */ } finally { setAgentAnalyzing(false); }
    executeGenerationRef.current?.();
  }, [intent, attachments, domainId, framework, language, addToast, t]);

  handlePreGenerateRef.current = handlePreGenerate;

  const handleSmartRetry = useCallback(() => {
    const p = lastGenParamsRef.current;
    if (p) { genDispatch({ type: 'SET_INTENT', payload: p.intent }); genDispatch({ type: 'SET_FRAMEWORK', payload: p.framework }); genDispatch({ type: 'SET_DOMAIN', payload: p.domainId }); settingsDispatch({ type: 'SET_PROVIDER', payload: p.provider as ClientProvider }); }
    executeGeneration();
  }, [executeGeneration]);

  const handleRecordEvent = useCallback((payload: TelemetryEventPayload) => {
    recordEvent({ type: payload.type, domainId: payload.domainId ?? domainId, framework: payload.framework ?? framework, provider: payload.provider ?? getProviderLabel(provider === 'auto' ? (lastUsedProvider ?? 'auto') : provider, claudeModel), wasEdited: payload.type === 'edited' }, telemetryConsent);
  }, [domainId, framework, provider, lastUsedProvider, claudeModel, telemetryConsent]);

  const handleWorkflowRun = useCallback(async () => {
    if (!intent.trim() && attachments.length === 0) { addToast(t.ui.errorInputEmpty, 'error'); return; }
    const preset = WORKFLOW_PRESETS.find((p) => p.id === workflowPresetId) ?? WORKFLOW_PRESETS[0];
    const localizedDomain = t.domains[domainId as keyof typeof t.domains] || t.domains.auto;
    settingsDispatch({ type: 'SET_WORKFLOW_LOADING', payload: true }); genDispatch({ type: 'START_GENERATION' });
    try {
      const activeProfile = getActiveProfile(); const styleContext = buildStyleContext(activeProfile ?? null);
      const runResult = await runWorkflow({
        steps: preset.steps, initialIntent: compressIntent(intent), framework, domainId, provider, thinkingMode, language, contextRules: localizedDomain.contextRules, attachments, styleContext: styleContext || undefined, systemPrompt,
        generateFn: async (intent, framework, domainId, useSearch, thinkingMode, language, contextRules, attachments, styleContext) => { const { response } = await generateMasterPromptUnified(provider, { intent, framework, domainId, useSearch, thinkingMode, language, localizedRules: contextRules, attachments, styleContext, claudeModel, openRouterModel, systemPrompt }); return response; },
        labels: { research: t.ui.workflowStepResearch, summarize: t.ui.workflowStepSummarize, generate_prompt: t.ui.workflowStepGenerate, test: t.ui.workflowStepTest }
      });
      settingsDispatch({ type: 'SET_WORKFLOW_RESULT', payload: runResult });
      if (runResult.finalPrompt) { genDispatch({ type: 'GENERATION_SUCCESS', payload: runResult.finalPrompt }); addToast(t.ui.toastGenerated, 'success'); }
      if (runResult.error) addToast(t.ui.toastError, 'error');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      genDispatch({ type: 'GENERATION_ERROR', payload: msg }); addToast(t.ui.toastError, 'error');
      settingsDispatch({ type: 'SET_WORKFLOW_RESULT', payload: { stepResults: [], finalPrompt: null, error: msg } });
    } finally { settingsDispatch({ type: 'SET_WORKFLOW_LOADING', payload: false }); }
  }, [intent, attachments, workflowPresetId, framework, domainId, provider, claudeModel, openRouterModel, thinkingMode, language, t, addToast, systemPrompt]);

  const effectiveProvider = provider === 'auto' ? (lastUsedProvider ?? 'auto') : provider;
  const currentModelLabel = getModelLabel(effectiveProvider, { openRouterModel, claudeModel });
  const aiLabAnalyticsSnapshot = useMemo(() => {
    const a = getAdvancedAnalytics(telemetryConsent);
    return {
      totalGenerations: a.totalGenerations, overallSuccessRate: a.overallSuccessRate, overallEditRate: a.overallEditRate, avgLatencyMs: a.avgLatencyMs,
      topDomains: a.domainStats.slice(0, 3).map(d => ({ domain: d.domain, successRate: d.successRate, count: d.count })),
      topFrameworks: a.frameworkStats.slice(0, 3).map(f => ({ framework: f.framework, editRate: f.editRate, count: f.count })),
      topProviders: a.providerStats.slice(0, 3).map(p => ({ provider: p.provider, successRate: p.successRate, count: p.count }))
    };
  }, [telemetryConsent]);

  const applyToResult = (newPrompt: string) => {
    if (!result) return;
    genDispatch({ type: 'UPDATE_RESULT', payload: { masterPrompt: newPrompt } });
    qualityDispatch({ type: 'SET_JUDGE_RESULT', payload: judgePrompt(newPrompt, { domainId, framework, reasoning: result.reasoning }) });
    qualityDispatch({ type: 'SET_LINT_RESULT', payload: lintPrompt(newPrompt, result.reasoning) });
  };

  // Persist system prompt
  useEffect(() => { localStorage.setItem('sr_system_prompt', systemPrompt); }, [systemPrompt]);

  // Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdPaletteOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const paletteCommands: Command[] = [
    { id: 'generate', label: 'Prompt Üret', icon: '⚡', group: 'Aksiyon', keywords: ['generate', 'üret'], action: () => executeGenerationRef.current?.() },
    { id: 'copy', label: 'Promptu Kopyala', icon: '📋', group: 'Aksiyon', keywords: ['copy', 'kopyala'], action: () => result?.masterPrompt && navigator.clipboard.writeText(result.masterPrompt) },
    { id: 'split', label: splitView ? 'Tek Sütun' : 'Split View', icon: '⬜', group: 'Görünüm', keywords: ['split', 'view'], action: () => setSplitView(v => !v) },
    { id: 'theme', label: theme === 'dark' ? 'Açık Mod' : 'Koyu Mod', icon: '🌙', group: 'Görünüm', keywords: ['theme', 'tema'], action: toggleTheme },
    { id: 'shortcuts', label: 'Klavye Kısayolları', icon: '⌨️', group: 'Yardım', keywords: ['keyboard', 'shortcuts'], action: () => setShowShortcuts(true) },
    { id: 'p-dashboard', label: 'Prompt Lab', icon: '⚡', group: 'Sayfa', action: () => setPage('dashboard') },
    { id: 'p-library', label: 'Kütüphane', icon: '📚', group: 'Sayfa', action: () => setPage('prompts') },
    { id: 'p-ailab', label: 'AI Lab', icon: '🔬', group: 'Sayfa', action: () => setPage('ailab') },
    { id: 'p-settings', label: 'Ayarlar', icon: '⚙️', group: 'Sayfa', action: () => setPage('settings') },
  ];

  const resultContextItems: ContextMenuItem[] = [
    { id: 'copy', label: 'Kopyala', icon: '📋', action: () => result?.masterPrompt && navigator.clipboard.writeText(result.masterPrompt) },
    { id: 'chatgpt', label: "ChatGPT'de Aç", icon: '🤖', action: () => { result?.masterPrompt && navigator.clipboard.writeText(result.masterPrompt); window.open('https://chat.openai.com/', '_blank'); }, divider: true },
    { id: 'claude', label: "Claude'da Aç", icon: '🟠', action: () => { result?.masterPrompt && navigator.clipboard.writeText(result.masterPrompt); window.open('https://claude.ai/new', '_blank'); } },
    { id: 'diff', label: 'Diff Görüntüle', icon: '🔀', action: () => prevResultRef.current && result?.masterPrompt && setDiffPrompt({ left: prevResultRef.current, right: result.masterPrompt }), divider: true },
  ];

  return (
    <div className="min-h-screen bg-cyber-black text-gray-200 font-sans overflow-hidden">
      <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <CommandPalette commands={paletteCommands} isOpen={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
      {showOnboarding && <OnboardingModal onDone={onboardingDone} />}
      {diffPrompt && (
        <Suspense fallback={null}>
          <PromptDiffViewer left={diffPrompt.left} right={diffPrompt.right} leftLabel="Önceki" rightLabel="Şimdiki" onClose={() => setDiffPrompt(null)} />
        </Suspense>
      )}
      {ctxMenu && result?.masterPrompt && (
        <ContextMenu items={resultContextItems} x={ctxMenu.x} y={ctxMenu.y} onClose={closeCtxMenu} />
      )}

      <Sidebar activePage={activePage as SidebarPage} onPageChange={setPage} />

      <div className={`transition-all duration-300 flex flex-col min-h-screen ${splitView ? 'ml-[200px] max-[768px]:ml-0' : 'ml-[200px] max-[768px]:ml-0'
        }`}>
        <FloatingFAB onClick={() => executeGenerationRef.current?.()} loading={loading} />
        <header className="flex items-center justify-between h-14 px-6 border-b border-cyber-border/30 bg-cyber-black/80 backdrop-blur-sm flex-shrink-0">
          <nav className="flex items-center gap-1.5">
            <button onClick={() => setSplitView(v => !v)} title={splitView ? 'Tek sütun' : 'Split View'}
              className={`flex items-center gap-1 px-2 py-1 rounded border font-mono text-[9px] uppercase transition-all ${splitView ? 'border-cyber-primary/50 bg-cyber-primary/10 text-cyber-primary' : 'border-cyber-border/30 text-gray-600 hover:text-gray-400'
                }`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="18" rx="1" /><rect x="13" y="3" width="8" height="18" rx="1" /></svg>
              Split
            </button>
            <button onClick={() => setCmdPaletteOpen(true)} title="Komut Paleti (Cmd+K)"
              className="flex items-center gap-1 px-2 py-1 rounded border border-cyber-border/30 text-gray-600 hover:text-gray-400 font-mono text-[9px] uppercase transition-all">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <kbd className="text-[8px]">⌘K</kbd>
            </button>
          </nav>
          <DashboardHeader systemActive={!!result} loading={loading} />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6" role="main">

          {/* ── DASHBOARD ─────────────────────────────── */}
          {activePage === 'dashboard' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Input Panel */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-mono text-xs font-bold text-gray-400 uppercase tracking-wider">⚡ {t.ui.inputLabel}</h2>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => { setAgentMode(!agentMode); setAgentHint(null); }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md border font-mono text-[9px] font-bold uppercase tracking-wider transition-all ${agentMode ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400' : 'border-cyber-border/40 text-gray-500 hover:border-cyber-primary/40'}`}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                        Agent
                      </button>
                      <VoiceInput onTranscript={(t) => setIntent(intent + (intent ? ' ' : '') + t)} disabled={loading} />
                      <button type="button" onClick={() => setShowShortcuts(true)} className="w-6 h-6 rounded-md border border-cyber-border/40 text-gray-600 hover:text-gray-300 hover:border-cyber-primary/30 flex items-center justify-center font-mono text-[10px] transition-colors" title="Klavye Kısayolları (?)">?</button>
                      <button type="button" onClick={toggleTheme} className="w-7 h-7 rounded-md border border-cyber-border/40 bg-cyber-dark/50 flex items-center justify-center hover:border-cyber-primary/40 transition-colors" title={theme === 'dark' ? 'Açık mod' : 'Koyu mod'}>
                        <span className="text-sm">{theme === 'dark' ? '☀️' : '🌙'}</span>
                      </button>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-7 h-7 rounded-md border border-cyber-border/40 bg-cyber-dark/50 flex items-center justify-center hover:border-cyber-primary/40 transition-colors" aria-label="Dosya yükle">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      </button>
                    </div>
                  </div>

                  <div className="glass-card p-4 space-y-3">
                    <TemplateSelector onSelect={handleTemplateSelect} />
                    <PersonaLibrary
                      activePersonaId={activePersonaId}
                      onApply={(p: Persona) => { setActivePersonaId(p.id); setSystemPrompt(p.systemPrompt); }}
                      onClear={() => { setActivePersonaId(undefined); setSystemPrompt(''); }}
                    />
                    <div className="relative" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
                      <textarea
                        className={`w-full h-40 bg-[#0a0a10]/80 border rounded-lg p-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyber-primary/50 transition-all duration-200 font-mono text-xs resize-none ${dragActive ? 'border-cyber-primary bg-cyber-primary/5' : 'border-cyber-border/40'}`}
                        placeholder={language === 'tr' ? 'Prompt isteğinizi yazın...' : 'Enter your prompt request...'}
                        value={intent} onChange={(e) => setIntent(e.target.value.slice(0, 100000))} aria-label={t.ui.inputLabel}
                      />
                      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => processFiles(e.target.files)} multiple accept="image/*,text/plain,application/pdf,.zip" />
                    </div>
                    <TokenBudgetIndicator text={intent} provider={provider} />
                    <PromptInjectionWarning text={intent} />

                    {attachments.length > 0 && (
                      <div className="space-y-1">
                        {attachments.map((f, i) => (
                          <div key={i} className="flex items-center justify-between bg-cyber-dark/60 border border-cyber-border/30 rounded px-2.5 py-1 text-[10px] font-mono">
                            <span className="text-cyber-primary truncate">{f.name}</span>
                            <button onClick={() => genDispatch({ type: 'REMOVE_ATTACHMENT', payload: i })} className="text-gray-600 hover:text-red-400 ml-2 transition-colors">✕</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {agentMode && agentHint && <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[10px] font-mono text-emerald-400"><span className="flex-shrink-0">✦</span><span>{agentHint}</span></div>}
                    {agentMode && agentAnalyzing && <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[10px] font-mono text-emerald-400"><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg><span>Agent analiz ediyor...</span></div>}

                    <button type="button" onClick={handlePreGenerate} disabled={loading}
                      className={`w-full py-3 rounded-lg font-mono text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 ${loading ? 'bg-cyber-primary/20 text-cyber-primary/60 cursor-not-allowed' : 'bg-gradient-to-r from-cyber-primary to-[#00b8cc] text-cyber-black hover:shadow-[0_0_25px_rgba(6,232,249,0.35)] hover:scale-[1.01] active:scale-[0.99]'}`}>
                      {loading ? (<><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{t.ui.processing}</>) : (<>Generate <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg></>)}
                    </button>

                    {error && (
                      <div className="p-3 border border-red-500/30 bg-red-900/10 rounded space-y-2">
                        <p className="text-red-400 text-[10px] font-mono">{error}</p>
                        <button onClick={handleSmartRetry} className="text-[10px] font-mono px-3 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30">{t.ui.retryWithParams}</button>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-mono text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{t.ui.domainLabel}</h3>
                    <DomainSelector selectedDomainId={domainId} onSelect={setDomainId} />
                  </div>
                  <div>
                    <h3 className="font-mono text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{t.ui.frameworkLabel}</h3>
                    <FrameworkSelector selected={framework} onSelect={setFramework} />
                  </div>
                  <div>
                    <h3 className="font-mono text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Çıktı Formatı</h3>
                    <OutputFormatSelector value={outputFormat} onChange={setOutputFormat} />
                  </div>
                  <BatchProcessor framework={framework} domainId={domainId} provider={provider} language={language} />
                </section>

                {/* Output */}
                <section><OutputTerminal result={result} loading={loading} agentAnalyzing={agentAnalyzing} agentHint={agentHint} /></section>
              </div>

              <AgentPipeline activeStep={loading ? 0 : result ? 2 : -1} loading={loading} />

              {result && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <CacheStatus stats={getCacheStats()} lastHit={lastCacheHit} />
                  {enrichmentMetrics && enrichmentMetrics.promptsIntegrated > 0 && (
                    <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                      <span className="text-[9px] font-mono text-purple-400 uppercase font-bold">Zenginleştirildi</span>
                      <span className="text-[9px] font-mono text-gray-500">Ambiguity: {enrichmentMetrics.ambiguityBefore} → {enrichmentMetrics.ambiguityAfter}</span>
                      <span className="text-[9px] font-mono text-green-400">+{enrichmentMetrics.promptsIntegrated} prompt</span>
                    </div>
                  )}
                  {/* Score Badge + Export + Diff */}
                  <div className="flex flex-wrap items-center justify-between gap-3 py-1">
                    <div className="flex items-center gap-3">
                      {judgeResult && <ScoreBadge score={judgeResult.totalScore} size="sm" />}
                      <span className="font-mono text-[10px] text-gray-600">Prompt hazır ✓</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {prevResultRef.current && (
                        <button type="button" onClick={() => setDiffPrompt({ left: prevResultRef.current!, right: result.masterPrompt })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyber-border/50 text-gray-500 hover:border-cyber-primary/50 hover:text-cyber-primary font-mono text-[10px] uppercase tracking-wider transition-all">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" /></svg>
                          Diff
                        </button>
                      )}
                      <ExportButton masterPrompt={result.masterPrompt} reasoning={result.reasoning} framework={framework} domainId={domainId} />
                    </div>
                  </div>
                  {/* Open in AI platforms */}
                  <OpenInAI prompt={result.masterPrompt} />
                  <ResultDisplay result={result} domainId={domainId} framework={framework} provider={getProviderLabel(effectiveProvider, claudeModel)} telemetryConsent={telemetryConsent} onRecordEvent={handleRecordEvent} />
                  <button type="button" onClick={() => qualityDispatch({ type: 'TOGGLE_QUALITY_PANEL' })} className="w-full text-[10px] font-mono text-cyber-primary border border-cyber-primary/30 px-4 py-1.5 rounded uppercase tracking-wider hover:bg-cyber-primary/10 transition-colors flex items-center justify-between">
                    <span>{t.ui.qualityTitle} {judgeResult ? `(${judgeResult.totalScore}/100)` : ''}</span>
                    <span>{showQualityPanel ? '▼' : '▶'}</span>
                  </button>
                  {showQualityPanel && (
                    <Suspense fallback={<PageLoader />}>
                      <div className="space-y-3 animate-in fade-in duration-200">
                        {judgeResult && <JudgePanel result={judgeResult} />}
                        {lintResult && <PromptLintPanel result={lintResult} />}
                        {budgetAnalysis && <BudgetPanel analysis={budgetAnalysis} />}
                        {provenance && <ProvenanceView provenance={provenance} />}
                      </div>
                    </Suspense>
                  )}
                  <Suspense fallback={<PageLoader />}>
                    <FewShotGenerator masterPrompt={result.masterPrompt} domainId={domainId} framework={framework} language={language} provider={provider} />
                    <PromptTournament intent={intent} domainId={domainId} provider={provider} language={language} />
                    <AutoCompletePanel masterPrompt={result.masterPrompt} domainId={domainId} framework={framework} language={language} agentMode={agentMode} onApply={(p) => { applyToResult(p); addToast('Sentezlendi!', 'success'); }} />
                    <EnhancePanel masterPrompt={result.masterPrompt} reasoning={result.reasoning} framework={framework} domainId={domainId} language={language} agentMode={agentMode} onApply={(p) => { applyToResult(p); addToast('Geliştirildi!', 'success'); }} />
                    <EnrichmentPanel masterPrompt={result.masterPrompt} framework={framework} domainId={domainId} language={language} agentMode={agentMode} onApply={(p) => { applyToResult(p); addToast('Zenginleştirildi!', 'success'); }} />
                    <PromptAnalysisPanel masterPrompt={result.masterPrompt} language={language} agentMode={agentMode} />
                    <PromptTransformPanel masterPrompt={result.masterPrompt} language={language} agentMode={agentMode} onApply={(p) => { applyToResult(p); addToast('Dönüştürüldü!', 'success'); }} />
                    <BenchmarkPanel masterPrompt={result.masterPrompt} reasoning={result.reasoning} framework={framework} domainId={domainId} provider={provider} agentMode={agentMode} />
                  </Suspense>
                </div>
              )}
            </div>
          )}

          {/* ── GEÇMİŞ ─────────────────────────────── */}
          {activePage === 'prompts' && (
            <div className="animate-in fade-in duration-300">
              <Suspense fallback={<PageLoader />}>
                <PromptHistoryPanel history={history} language={language}
                  onReuse={(entry) => { genDispatch({ type: 'SET_INTENT', payload: entry.intent }); setPage('dashboard'); addToast('Prompt yüklendi', 'success'); }}
                  onRemove={removeEntry} onClear={clearHistory} />
              </Suspense>
              <div className="mt-8">
                <Suspense fallback={<PageLoader />}>
                  <MetaPromptLibrary onUsePrompt={(p) => { genDispatch({ type: 'SET_INTENT', payload: p.masterPrompt }); setPage('dashboard'); addToast('Prompt yüklendi', 'success'); }} />
                </Suspense>
              </div>
            </div>
          )}

          {/* ── AI LAB ─────────────────────────────── */}
          {activePage === 'ailab' && (
            <Suspense fallback={<PageLoader />}>
              <div className="space-y-6 animate-in fade-in duration-300">
                <AILabWorkbench currentPrompt={result?.masterPrompt} domainId={domainId} framework={framework} analyticsSnapshot={aiLabAnalyticsSnapshot} onApplyEnrichedPrompt={(e) => { if (result) { applyToResult(e); addToast('AI Lab uygulandı!', 'success'); } }} />
                <WorkflowPanel presetId={workflowPresetId} onPresetChange={(v) => settingsDispatch({ type: 'SET_WORKFLOW_PRESET', payload: v })} onRun={handleWorkflowRun} running={workflowLoading} result={workflowResult} disabled={(!intent.trim() && attachments.length === 0) || loading} />
                <StyleProfileManager />
              </div>
            </Suspense>
          )}

          {/* ── OPTİMİZER ──────────────────────────── */}
          {activePage === 'optimizer' && (<Suspense fallback={<PageLoader />}><div className="animate-in fade-in duration-300"><OptimizerPanel /></div></Suspense>)}

          {/* ── RAG ENGINE ─────────────────────────── */}
          {activePage === 'ragflow' && (
            <Suspense fallback={<PageLoader />}>
              <div className="animate-in fade-in duration-300">
                <RAGFlowDashboard
                  onApplyAgent={(template) => { const prefix = language === 'tr' ? `[RAGFlow Ajan: ${template.nameTr}]\n\n` : `[RAGFlow Agent: ${template.nameEn}]\n\n`; genDispatch({ type: 'SET_INTENT', payload: prefix + (language === 'tr' ? template.descriptionTr : template.descriptionEn) }); setPage('dashboard'); addToast('Ajan uygulandı', 'success'); }}
                  onApplyChunkMethod={(method) => { const prefix = language === 'tr' ? `[RAGFlow Parçalama: ${method.nameTr}]\n\n` : `[RAGFlow Chunking: ${method.nameEn}]\n\n`; genDispatch({ type: 'SET_INTENT', payload: prefix + (language === 'tr' ? method.descriptionTr : method.descriptionEn) }); setPage('dashboard'); addToast('Yöntem uygulandı', 'success'); }}
                />
              </div>
            </Suspense>
          )}

          {/* ── ANALİTİK ───────────────────────────── */}
          {activePage === 'analytics' && (
            <Suspense fallback={<PageLoader />}>
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <h1 className="font-mono text-sm font-bold text-white uppercase tracking-wider">{t.ui.analyticsTitle}</h1>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={telemetryConsent} onChange={(e) => { setTelemetryConsent(e.target.checked); settingsDispatch({ type: 'SET_TELEMETRY_CONSENT', payload: e.target.checked }); }} className="rounded border-cyber-border bg-cyber-dark text-cyber-primary" />
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">{t.ui.analyticsConsent}</span>
                  </label>
                </div>
                <AnalyticsDashboard consent={telemetryConsent} />
              </div>
            </Suspense>
          )}

          {/* ── AYARLAR ────────────────────────────── */}
          {activePage === 'settings' && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <SettingsPage
                provider={provider} onProviderChange={setProvider}
                claudeModel={claudeModel as 'sonnet' | 'opus'} onClaudeModelChange={(m) => settingsDispatch({ type: 'SET_CLAUDE_MODEL', payload: m })}
                openRouterModel={openRouterModel} onOpenRouterModelChange={(m) => settingsDispatch({ type: 'SET_OPENROUTER_MODEL', payload: m })}
                thinkingMode={thinkingMode} onThinkingModeChange={(v) => settingsDispatch({ type: 'SET_THINKING_MODE', payload: v })}
                useSearch={useSearch} onUseSearchChange={(v) => settingsDispatch({ type: 'SET_USE_SEARCH', payload: v })}
                autoEnrich={autoEnrich} onAutoEnrichChange={(v) => settingsDispatch({ type: 'SET_AUTO_ENRICH', payload: v })}
                telemetryConsent={telemetryConsent} onTelemetryConsentChange={(v) => { setTelemetryConsent(v); settingsDispatch({ type: 'SET_TELEMETRY_CONSENT', payload: v }); }}
                language={language as 'tr' | 'en'}
              />
              <ThemeCustomizer />
              <SystemPromptEditor value={systemPrompt} onChange={setSystemPrompt} language={language} />
              <WebhookSettings language={language} />
              <BackendHealthPanel />
              <ProviderCostCalculator />
            </div>
          )}
        </main>

        <StatusFooter latencyMs={lastLatency} tokensPerSec={lastTokensPerSec} model={currentModelLabel} />
      </div>

      {/* Ambient FX */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03] bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[length:40px_40px]" />
      <div className="fixed top-20 left-[200px] w-80 h-80 bg-cyber-primary/4 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-80 h-80 bg-cyber-accent/4 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
