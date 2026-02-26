import React, { useState, useCallback, useRef, useEffect, useMemo, useReducer } from 'react';
import { Framework, Attachment, Language } from './types';
import {
  generateMasterPromptUnified,
  getProviderLabel,
  getModelLabel,
  type ClientProvider,
} from './services/unifiedProviderService';
import { setOpenRouterModel } from './services/openRouterService';
import { OPENROUTER_MODELS } from './data/openRouterModels';
import FrameworkSelector from './components/FrameworkSelector';
import DomainSelector from './components/DomainSelector';
import ResultDisplay, { TelemetryEventPayload } from './components/ResultDisplay';
import TemplateSelector from './components/TemplateSelector';
import ConfirmationModal from './components/ConfirmationModal';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import WorkflowPanel from './components/WorkflowPanel';
import StyleProfileManager from './components/StyleProfileManager';
import ApiIntegrationPanel from './components/ApiIntegrationPanel';
import AuthPage from './components/AuthPage';
import PricingPage from './components/PricingPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import JudgePanel from './components/JudgePanel';
import PromptLintPanel from './components/PromptLintPanel';
import BudgetPanel from './components/BudgetPanel';
import ProvenanceView from './components/ProvenanceView';
import CacheStatus from './components/CacheStatus';
import VersionHistoryPanel from './components/VersionHistoryPanel';
import PromptLibrary from './components/PromptLibrary';
import CustomBuilderPanel from './components/CustomBuilderPanel';
import BenchmarkPanel from './components/BenchmarkPanel';
import EnhancePanel from './components/EnhancePanel';
import EnrichmentPanel from './components/EnrichmentPanel';
import PromptCICDInline from './components/PromptCICDInline';
import { judgePrompt } from './services/judgeEnsemble';
import { lintPrompt } from './services/promptLint';
import { analyzeBudget } from './services/budgetOptimizer';
import { cacheGet, cachePut, getCacheStats } from './services/semanticCache';
import { GUARDRAIL_BLOCKS } from './services/irExtractor';
import { runWorkflow } from './services/orchestrator';
import { getActiveProfile, buildStyleContext } from './services/styleProfiles';
import { WORKFLOW_PRESETS } from './data/workflows';
import { ToastProvider, useToast } from './components/ToastSystem';
import { I18nProvider, useTranslation } from './i18n';
import { compressIntent } from './utils/compressIntent';
import {
  recordEvent,
  estimateTokens,
  getTelemetryConsent,
  setTelemetryConsent,
  getAdvancedAnalytics,
} from './services/telemetry';
import { getInputAnalysis, getOutputAnalysis } from './utils/analysis';
import { getAuthHeaders } from './services/apiClient';
import {
  generationReducer, initialGenerationState,
  qualityReducer, initialQualityState,
  uiReducer, initialUIState,
  settingsReducer, initialSettingsState,
} from './utils/appReducers';

const ENRICH_API_BASE = import.meta.env?.VITE_API_BASE_URL || '/api/v1';

// New V4 Dashboard Components
import Sidebar, { type SidebarPage } from './components/Sidebar';
import DashboardHeader from './components/DashboardHeader';
import OutputTerminal from './components/OutputTerminal';
import AgentPipeline from './components/AgentPipeline';
import AILabWorkbench from './components/AILabWorkbench';
import OptimizerPanel from './components/OptimizerPanel';
import VibeCodingPanel from './components/VibeCodingPanel';
import PromptCICDPage from './components/PromptCICDPage';
import StatusFooter from './components/StatusFooter';
// CommandPalette available for future use

/** Auth gate */
function AuthGate() {
  const { loading, session } = useAuth();
  const [showPricing, setShowPricing] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center">
        <div className="text-cyber-primary font-mono text-sm animate-pulse">
          INITIALIZING SYSTEM...
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  if (showPricing) {
    return <PricingPage onBack={() => setShowPricing(false)} />;
  }

  return <AppContent onShowPricing={() => setShowPricing(true)} />;
}

function AppContent({ onShowPricing: _onShowPricing }: { onShowPricing?: () => void }) {
  // New Focus Mode State
  const [focusMode, setFocusMode] = useState(false);

  // ── 4 Reducers (replaces 30+ useState) ──────────────────────────────────
  const [gen, genDispatch] = useReducer(generationReducer, initialGenerationState);
  const [quality, qualityDispatch] = useReducer(qualityReducer, initialQualityState);
  const [ui, uiDispatch] = useReducer(uiReducer, initialUIState);
  const [settings, settingsDispatch] = useReducer(settingsReducer, initialSettingsState);

  // Destructure for backward compat in JSX (avoids massive diff)
  const { intent, framework, domainId, loading, error, result, attachments, dragActive } = gen;
  const { showQualityPanel, judgeResult, lintResult, budgetAnalysis, provenance, lastCacheHit, enrichmentMetrics } = quality;
  const { activePage, computePower, lastLatency, lastTokensPerSec, showConfirmModal } = ui;
  const { provider, lastUsedProvider, claudeModel, openRouterModel, telemetryConsent,
    workflowPresetId, workflowResult, workflowLoading, useSearch, thinkingMode, autoEnrich } = settings;

  // Convenience setters (thin wrappers over dispatch)
  const setIntent = (v: string) => genDispatch({ type: 'SET_INTENT', payload: v });
  const setFramework = (v: Framework) => genDispatch({ type: 'SET_FRAMEWORK', payload: v });
  const setDomainId = (v: string) => genDispatch({ type: 'SET_DOMAIN', payload: v });
  const setProvider = (v: ClientProvider) => settingsDispatch({ type: 'SET_PROVIDER', payload: v });
  const setActivePage = (v: SidebarPage) => uiDispatch({ type: 'SET_PAGE', payload: v });

  // Smart Retry: store last generation params for error recovery
  const lastGenParamsRef = useRef<{
    intent: string; framework: Framework; domainId: string;
    provider: string; useSearch: boolean; thinkingMode: boolean;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    settingsDispatch({ type: 'SET_TELEMETRY_CONSENT', payload: getTelemetryConsent() });
  }, []);

  useEffect(() => {
    if (provider === 'openrouter') setOpenRouterModel(openRouterModel);
  }, [provider, openRouterModel]);

  const handleTelemetryConsentChange = (value: boolean) => {
    setTelemetryConsent(value);
    settingsDispatch({ type: 'SET_TELEMETRY_CONSENT', payload: value });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, language } = useTranslation();
  const { addToast } = useToast();

  const MAX_CHARS = 100000;

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!loading && !ui.showConfirmModal) {
          e.preventDefault();
          handlePreGenerate();
        }
      }
      // 'F' key toggles focus mode (only when not typing in an input/textarea)
      if (e.key === 'f' || e.key === 'F') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          setFocusMode(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [intent, loading, ui.showConfirmModal]);

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    const maxFiles = 3;
    if (attachments.length + files.length > maxFiles) {
      addToast("Max 3 files allowed.", "error");
      return;
    }
    Array.from(files).forEach((file) => {
      const isText = file.type.startsWith('text/');
      const isImage = file.type.startsWith('image/');
      if (isText) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = (e.target?.result as string) || '';
          const base64 = btoa(unescape(encodeURIComponent(text)));
          genDispatch({ type: 'ADD_ATTACHMENTS', payload: [{ name: file.name, mimeType: file.type, data: base64, preview: text.slice(0, 500) }] });
        };
        reader.readAsText(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const r = e.target?.result as string;
        const base64Data = r.split(',')[1];
        genDispatch({ type: 'ADD_ATTACHMENTS', payload: [{ name: file.name, mimeType: file.type, data: base64Data, ...(isImage && { preview: r }) }] });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleTemplateSelect = useCallback(
    (template: { intentTr: string; intentEn: string; domainId: string; framework: Framework }) => {
      setIntent(language === 'tr' ? template.intentTr : template.intentEn);
      setDomainId(template.domainId);
      setFramework(template.framework);
      addToast(language === 'tr' ? 'Şablon yüklendi.' : 'Template loaded.', 'success');
    },
    [language, addToast]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") genDispatch({ type: 'SET_DRAG_ACTIVE', payload: true });
    else if (e.type === "dragleave") genDispatch({ type: 'SET_DRAG_ACTIVE', payload: false });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    genDispatch({ type: 'SET_DRAG_ACTIVE', payload: false });
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFiles(e.dataTransfer.files);
  };

  const removeAttachment = (index: number) => {
    genDispatch({ type: 'REMOVE_ATTACHMENT', payload: index });
  };

  const handlePreGenerate = () => {
    if (!intent.trim() && attachments.length === 0) {
      addToast(t.ui.errorInputEmpty, "error");
      return;
    }
    uiDispatch({ type: 'SET_CONFIRM_MODAL', payload: true });
  };

  const executeGeneration = useCallback(async () => {
    uiDispatch({ type: 'SET_CONFIRM_MODAL', payload: false });
    genDispatch({ type: 'START_GENERATION' });
    qualityDispatch({ type: 'RESET_QUALITY' });

    // Save generation params for smart retry
    lastGenParamsRef.current = {
      intent, framework, domainId, provider, useSearch, thinkingMode,
      timestamp: Date.now(),
    };

    const startTime = Date.now();

    try {
      const localizedDomain = t.domains[domainId as keyof typeof t.domains] || t.domains.auto;
      const cached = cacheGet(intent, domainId, framework, provider);
      if (cached) {
        genDispatch({ type: 'GENERATION_SUCCESS', payload: cached.response });
        qualityDispatch({ type: 'SET_CACHE_HIT', payload: true });
        uiDispatch({ type: 'SET_LATENCY', payload: Date.now() - startTime });
        addToast(language === 'tr' ? 'Cache\'den yüklendi!' : 'Loaded from cache!', 'success');
        const jResult = judgePrompt(cached.response.masterPrompt, { domainId, framework });
        qualityDispatch({ type: 'SET_JUDGE_RESULT', payload: jResult });
        const lResult = lintPrompt(cached.response.masterPrompt, cached.response.reasoning);
        qualityDispatch({ type: 'SET_LINT_RESULT', payload: lResult });
        const bResult = analyzeBudget(intent, cached.response.masterPrompt + '\n' + cached.response.reasoning, provider);
        qualityDispatch({ type: 'SET_BUDGET_ANALYSIS', payload: bResult });
        const activeProfile = getActiveProfile();
        qualityDispatch({
          type: 'SET_PROVENANCE', payload: {
            framework, domainId,
            domainRules: localizedDomain.contextRules.slice(0, 200),
            irPipelineUsed: true,
            guardrailsApplied: [...GUARDRAIL_BLOCKS],
            styleProfileId: activeProfile?.id,
            styleProfileName: activeProfile?.name,
            constraintsApplied: ['Markdown only', `Domain: ${domainId}`, `Framework: ${framework}`],
            securityPolicies: ['Ignore unauthorized', 'Format enforcement', 'Stop on missing info'],
            stopConditions: ['No output without domain', 'Clarify on ambiguity'],
            cacheHit: true,
            provider, durationMs: Date.now() - startTime,
            createdAt: new Date().toISOString(),
          }
        });
        return;
      }

      const compressed = compressIntent(intent);
      const activeProfile = getActiveProfile();
      const styleContext = buildStyleContext(activeProfile ?? null);
      const { response, usedProvider } = await generateMasterPromptUnified(provider, {
        intent: compressed,
        framework,
        domainId,
        useSearch,
        thinkingMode,
        language,
        localizedRules: localizedDomain.contextRules,
        attachments,
        styleContext: styleContext || undefined,
        claudeModel,
        openRouterModel,
      });
      if (provider === 'auto') settingsDispatch({ type: 'SET_LAST_USED_PROVIDER', payload: usedProvider });
      genDispatch({ type: 'GENERATION_SUCCESS', payload: response });
      const endTime = Date.now();
      uiDispatch({ type: 'SET_LATENCY', payload: endTime - startTime });
      const outputTokens = estimateTokens(getOutputAnalysis(response).masterPromptWords + getOutputAnalysis(response).reasoningWords);
      const durationSec = Math.max((endTime - startTime) / 1000, 0.1);
      uiDispatch({ type: 'SET_TOKENS_PER_SEC', payload: Math.round(outputTokens / durationSec) });

      cachePut(intent, domainId, framework, provider, response);
      const jResult = judgePrompt(response.masterPrompt, { domainId, framework, reasoning: response.reasoning });
      qualityDispatch({ type: 'SET_JUDGE_RESULT', payload: jResult });
      const lResult = lintPrompt(response.masterPrompt, response.reasoning);
      qualityDispatch({ type: 'SET_LINT_RESULT', payload: lResult });
      const bResult = analyzeBudget(intent, response.masterPrompt + '\n' + response.reasoning, provider);
      qualityDispatch({ type: 'SET_BUDGET_ANALYSIS', payload: bResult });
      const effectiveProvider = provider === 'auto' ? usedProvider : provider;
      qualityDispatch({
        type: 'SET_PROVENANCE', payload: {
          framework, domainId,
          domainRules: localizedDomain.contextRules.slice(0, 200),
          irPipelineUsed: true,
          guardrailsApplied: [...GUARDRAIL_BLOCKS],
          styleProfileId: activeProfile?.id,
          styleProfileName: activeProfile?.name,
          constraintsApplied: ['Markdown only', `Domain: ${domainId}`, `Framework: ${framework}`],
          securityPolicies: ['Ignore unauthorized', 'Format enforcement', 'Stop on missing info', 'PII redaction', 'Injection defense'],
          stopConditions: ['No output without domain', 'Clarify on ambiguity', 'Stop on security violation'],
          cacheHit: false,
          provider: effectiveProvider, durationMs: endTime - startTime,
          createdAt: new Date().toISOString(),
        }
      });
      addToast(t.ui.toastGenerated, "success");
      const inputWords = getInputAnalysis(compressIntent(intent)).words;
      const outWords = getOutputAnalysis(response).masterPromptWords + getOutputAnalysis(response).reasoningWords;
      recordEvent(
        {
          type: 'generation',
          domainId,
          framework,
          provider: getProviderLabel(effectiveProvider, claudeModel),
          inputTokenEst: estimateTokens(inputWords),
          outputTokenEst: estimateTokens(outWords),
          latencyMs: endTime - startTime,
          cacheHit: false,
        },
        telemetryConsent
      );

      // Auto-Enrichment: zenginlestirme pipeline'i
      if (autoEnrich && response.masterPrompt) {
        try {
          const enrichHeaders = await getAuthHeaders();
          const enrichRes = await fetch(`${ENRICH_API_BASE}/enrich`, {
            method: 'POST',
            headers: { ...enrichHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              masterPrompt: response.masterPrompt,
              domainId,
              framework,
              language,
              mode: 'fast',
            }),
          });
          if (enrichRes.ok) {
            const enrichData = await enrichRes.json();
            if (enrichData.integratedPrompts?.length > 0) {
              const enriched = enrichData.enrichedPrompt;
              genDispatch({ type: 'UPDATE_RESULT', payload: { masterPrompt: enriched } });
              qualityDispatch({
                type: 'SET_ENRICHMENT_METRICS', payload: {
                  ambiguityBefore: enrichData.metrics.ambiguityScoreBefore,
                  ambiguityAfter: enrichData.metrics.ambiguityScoreAfter,
                  promptsIntegrated: enrichData.metrics.promptsIntegrated,
                  tokensAdded: enrichData.metrics.tokensAdded,
                  durationMs: enrichData.metrics.durationMs,
                }
              });
              // Re-judge with enriched prompt
              const jEnriched = judgePrompt(enriched, { domainId, framework, reasoning: response.reasoning });
              qualityDispatch({ type: 'SET_JUDGE_RESULT', payload: jEnriched });
              const lEnriched = lintPrompt(enriched, response.reasoning);
              qualityDispatch({ type: 'SET_LINT_RESULT', payload: lEnriched });
              addToast(
                language === 'tr' ? `Otomatik zenginlestirildi (+${enrichData.metrics.promptsIntegrated} prompt)` : `Auto-enriched (+${enrichData.metrics.promptsIntegrated} prompts)`,
                'success'
              );
            }
          }
        } catch (enrichErr) {
          console.warn('[AutoEnrich] Failed:', enrichErr);
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || t.ui.errorCritical;
      genDispatch({ type: 'GENERATION_ERROR', payload: errorMsg });
      addToast(t.ui.toastError, "error");
    }
  }, [intent, framework, domainId, useSearch, thinkingMode, language, t, attachments, addToast, provider, claudeModel, openRouterModel, telemetryConsent, autoEnrich]);

  /** Smart Retry: restore saved params and re-execute */
  const handleSmartRetry = useCallback(() => {
    const params = lastGenParamsRef.current;
    if (params) {
      genDispatch({ type: 'SET_INTENT', payload: params.intent });
      genDispatch({ type: 'SET_FRAMEWORK', payload: params.framework });
      genDispatch({ type: 'SET_DOMAIN', payload: params.domainId });
      settingsDispatch({ type: 'SET_PROVIDER', payload: params.provider as ClientProvider });
      settingsDispatch({ type: 'SET_USE_SEARCH', payload: params.useSearch });
      settingsDispatch({ type: 'SET_THINKING_MODE', payload: params.thinkingMode });
    }
    executeGeneration();
  }, [executeGeneration]);

  /** Copy error report to clipboard */
  const handleCopyErrorReport = useCallback(() => {
    const params = lastGenParamsRef.current;
    const report = [
      `--- Super Reasoning Error Report ---`,
      `Time: ${new Date().toISOString()}`,
      `Error: ${error}`,
      `Provider: ${params?.provider || provider}`,
      `Domain: ${params?.domainId || domainId}`,
      `Framework: ${params?.framework || framework}`,
      `Thinking: ${params?.thinkingMode ?? thinkingMode}`,
      `Search: ${params?.useSearch ?? useSearch}`,
      `Intent (first 200 chars): ${(params?.intent || intent).slice(0, 200)}`,
      `---`,
    ].join('\n');
    navigator.clipboard.writeText(report);
    addToast(t.ui.errorCopied, 'success');
  }, [error, provider, domainId, framework, thinkingMode, useSearch, intent, addToast, t]);

  const handleRecordEvent = useCallback(
    (payload: TelemetryEventPayload) => {
      recordEvent(
        {
          type: payload.type,
          domainId: payload.domainId ?? domainId,
          framework: payload.framework ?? framework,
          provider: payload.provider ?? getProviderLabel(provider === 'auto' ? (lastUsedProvider ?? 'auto') : provider, claudeModel),
          wasEdited: payload.type === 'edited',
        },
        telemetryConsent
      );
    },
    [domainId, framework, provider, lastUsedProvider, claudeModel, telemetryConsent]
  );

  const handleWorkflowRun = useCallback(async () => {
    if (!intent.trim() && attachments.length === 0) {
      addToast(t.ui.errorInputEmpty, 'error');
      return;
    }
    const preset = WORKFLOW_PRESETS.find((p) => p.id === workflowPresetId) ?? WORKFLOW_PRESETS[0];
    const localizedDomain = t.domains[domainId as keyof typeof t.domains] || t.domains.auto;
    const generateMasterPrompt = async (
      intent: string,
      framework: Framework,
      domainId: string,
      useSearch: boolean,
      thinkingMode: boolean,
      language: Language,
      contextRules: string,
      attachments: Attachment[] = [],
      styleContext?: string
    ) => {
      const { response } = await generateMasterPromptUnified(provider, {
        intent,
        framework,
        domainId,
        useSearch,
        thinkingMode,
        language,
        localizedRules: contextRules,
        attachments,
        styleContext,
        claudeModel,
        openRouterModel,
      });
      return response;
    };
    settingsDispatch({ type: 'SET_WORKFLOW_LOADING', payload: true });
    genDispatch({ type: 'START_GENERATION' });
    settingsDispatch({ type: 'SET_WORKFLOW_RESULT', payload: null });
    try {
      const activeProfile = getActiveProfile();
      const styleContext = buildStyleContext(activeProfile ?? null);
      const runResult = await runWorkflow({
        steps: preset.steps,
        initialIntent: compressIntent(intent),
        framework, domainId, provider, thinkingMode, language,
        contextRules: localizedDomain.contextRules,
        attachments,
        styleContext: styleContext || undefined,
        generateFn: generateMasterPrompt,
        labels: {
          research: t.ui.workflowStepResearch,
          summarize: t.ui.workflowStepSummarize,
          generate_prompt: t.ui.workflowStepGenerate,
          test: t.ui.workflowStepTest,
        },
      });
      settingsDispatch({ type: 'SET_WORKFLOW_RESULT', payload: runResult });
      if (runResult.finalPrompt) {
        genDispatch({ type: 'GENERATION_SUCCESS', payload: runResult.finalPrompt });
        addToast(t.ui.toastGenerated, 'success');
      }
      if (runResult.error) addToast(t.ui.toastError, 'error');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      genDispatch({ type: 'GENERATION_ERROR', payload: message });
      addToast(t.ui.toastError, 'error');
      settingsDispatch({ type: 'SET_WORKFLOW_RESULT', payload: { stepResults: [], finalPrompt: null, error: message } });
    } finally {
      settingsDispatch({ type: 'SET_WORKFLOW_LOADING', payload: false });
    }
  }, [intent, attachments, workflowPresetId, framework, domainId, provider, claudeModel, openRouterModel, thinkingMode, language, t, addToast]);

  const effectiveProvider = provider === 'auto' ? (lastUsedProvider ?? 'auto') : provider;
  const currentModelLabel = getModelLabel(effectiveProvider, { openRouterModel, claudeModel });
  const aiLabAnalyticsSnapshot = useMemo(() => {
    const analytics = getAdvancedAnalytics(telemetryConsent);
    return {
      totalGenerations: analytics.totalGenerations,
      overallSuccessRate: analytics.overallSuccessRate,
      overallEditRate: analytics.overallEditRate,
      avgLatencyMs: analytics.avgLatencyMs,
      topDomains: analytics.domainStats.slice(0, 3).map((d) => ({
        domain: d.domain,
        successRate: d.successRate,
        count: d.count,
      })),
      topFrameworks: analytics.frameworkStats.slice(0, 3).map((f) => ({
        framework: f.framework,
        editRate: f.editRate,
        count: f.count,
      })),
      topProviders: analytics.providerStats.slice(0, 3).map((p) => ({
        provider: p.provider,
        successRate: p.successRate,
        count: p.count,
      })),
    };
  }, [telemetryConsent]);

  // ─────────────────────────────────────────────────────
  // RENDER: V4 Dashboard Layout
  // ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cyber-black text-gray-200 font-sans selection:bg-cyber-primary selection:text-black overflow-hidden">
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => uiDispatch({ type: 'SET_CONFIRM_MODAL', payload: false })}
        onConfirm={executeGeneration}
        intent={intent}
        framework={framework}
        domainId={domainId}
        useSearch={useSearch}
        thinkingMode={thinkingMode}
        attachments={attachments}
        provider={provider}
        computePower={computePower}
      />

      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onPageChange={(p) => uiDispatch({ type: 'SET_PAGE', payload: p })}
      />

      {/* Focus Mode sidebar overlay */}
      {focusMode && (
        <div className="fixed left-0 top-0 w-[220px] h-full bg-black/30 z-[51] pointer-events-none transition-opacity duration-500" />
      )}

      {/* Main Content Area — offset by sidebar width */}
      <div className="ml-[220px] flex flex-col min-h-screen">
        {/* Header (with Focus Mode Toggle inserted dynamically to DashboardHeader or here) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyber-border/40 bg-cyber-black flex-shrink-0">
          <DashboardHeader systemActive={!!result} loading={loading} />

          {/* Focus Mode Toggle */}
          {activePage === 'dashboard' && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">Focus Mode</span>
              <button
                type="button"
                onClick={() => setFocusMode(!focusMode)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${focusMode ? 'bg-cyber-primary' : 'bg-cyber-border/50'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${focusMode ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-8 py-6" id="main-content" role="main">
          {activePage === 'dashboard' && (
            <div className={`space-y-6 animate-in fade-in duration-500 transition-opacity duration-500 ${focusMode ? 'opacity-100' : 'opacity-100'}`}>
              {/* Row 1: Input + Output */}
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8">
                {/* INPUT PANEL */}
                <section className={`space-y-4 transition-all duration-500 ${focusMode ? 'scale-[1.02] transform origin-left z-10 relative' : ''}`} aria-labelledby="input-heading">
                  <div className="flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-2 pointer-events-auto">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="9" y1="21" x2="9" y2="9" />
                      </svg>
                      <h2 id="input-heading" className="font-mono text-xs font-bold text-gray-300 uppercase tracking-wider">
                        {t.ui.inputLabel} (Input)
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Upload Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-8 h-8 rounded-lg border border-cyber-border/50 bg-cyber-dark/50 flex items-center justify-center hover:border-cyber-primary/50 transition-colors"
                        aria-label="Upload file"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </button>
                      {/* Save Button */}
                      <button
                        type="button"
                        className="w-8 h-8 rounded-lg border border-cyber-border/50 bg-cyber-dark/50 flex items-center justify-center hover:border-cyber-primary/50 transition-colors"
                        aria-label="Save"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                          <polyline points="7 3 7 8 15 8" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Input Card (Glassmorphic) */}
                  <div className={`
                    glass-card-elevated p-7 space-y-5 transition-all duration-300
                    ${focusMode ? 'shadow-[0_0_30px_rgba(0,229,255,0.05)]' : ''}
                  `}>
                    {/* Template Selector */}
                    <TemplateSelector onSelect={handleTemplateSelect} />

                    {/* Text Input */}
                    <div
                      className="relative"
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <textarea
                        className={`w-full h-[200px] bg-[#0c0c16]/60 backdrop-blur-sm border rounded-xl p-6 text-gray-200 placeholder-gray-600
                          focus:outline-none focus:border-cyber-primary/60 focus:shadow-[0_0_20px_rgba(0,229,255,0.15)]
                          transition-all duration-300 font-mono text-sm leading-relaxed resize-none
                          ${dragActive ? 'border-cyber-primary bg-cyber-primary/5' : 'border-cyber-border/40'}
                        `}
                        placeholder={language === 'tr' ? 'System: "You are an expert AI engineer..."\nUser: "Design a prompt..."' : 'System: "You are an expert AI engineer..."\nUser: "Design a prompt..."'}
                        value={intent}
                        onChange={(e) => setIntent(e.target.value.slice(0, MAX_CHARS))}
                        aria-label={t.ui.inputLabel}
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={(e) => processFiles(e.target.files)}
                        multiple
                        accept="image/*,application/pdf,text/plain,application/zip,.zip"
                      />
                    </div>

                    {/* Attachments */}
                    {attachments.length > 0 && (
                      <div className="space-y-1.5">
                        {attachments.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-cyber-dark/60 border border-cyber-border/30 rounded px-3 py-1.5 text-[10px] font-mono">
                            <span className="text-cyber-primary truncate">{file.name}</span>
                            <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500 hover:text-red-400 ml-2" aria-label="Remove">
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* GENERATE BUTTON */}
                    <button
                      type="button"
                      onClick={handlePreGenerate}
                      disabled={loading}
                      aria-busy={loading}
                      className={`
                        w-full py-3.5 rounded-xl font-mono text-sm font-bold uppercase tracking-[0.2em] transition-all duration-300
                        flex items-center justify-center gap-3
                        ${loading
                          ? 'bg-cyber-primary/20 text-cyber-primary/60 cursor-not-allowed border border-cyber-primary/30'
                          : 'bg-cyber-primary/10 border border-cyber-primary/50 text-cyber-primary hover:bg-cyber-primary/20 hover:shadow-[0_0_25px_rgba(0,229,255,0.3)] hover:scale-[1.01] active:scale-[0.99]'
                        }
                      `}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {t.ui.processing}
                        </>
                      ) : (
                        <>
                          Generate Prompt
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                          </svg>
                        </>
                      )}
                    </button>

                    {/* Error Display — Smart Retry */}
                    {error && (
                      <div className="p-3 border border-red-500/30 bg-red-900/10 rounded space-y-2">
                        <div className="flex items-start justify-between">
                          <p className="text-red-400 text-[10px] font-mono">
                            <strong className="uppercase tracking-wider">{t.ui.errorDetails}:</strong> {error}
                          </p>
                        </div>
                        {lastGenParamsRef.current && (
                          <div className="flex flex-wrap gap-1.5 text-[9px] font-mono text-gray-500">
                            <span className="px-1.5 py-0.5 bg-cyber-dark/60 rounded border border-cyber-border/20">
                              {lastGenParamsRef.current.provider}
                            </span>
                            <span className="px-1.5 py-0.5 bg-cyber-dark/60 rounded border border-cyber-border/20">
                              {lastGenParamsRef.current.domainId}
                            </span>
                            <span className="px-1.5 py-0.5 bg-cyber-dark/60 rounded border border-cyber-border/20">
                              {lastGenParamsRef.current.framework}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSmartRetry}
                            className="text-[10px] font-mono font-bold px-3 py-1.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                          >
                            {t.ui.retryWithParams}
                          </button>
                          <button
                            onClick={handleCopyErrorReport}
                            className="text-[10px] font-mono px-3 py-1.5 rounded border border-cyber-border/30 text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            {t.ui.errorCopyReport}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* OUTPUT TERMINAL */}
                <section aria-labelledby="output-heading" className={`transition-all duration-500 ${focusMode ? 'focus-dimmed' : 'opacity-100'}`}>
                  <OutputTerminal result={result} loading={loading} />
                </section>
              </div>

              {/* Row 2: Domain + Framework (full-width sequential) */}
              <div className={`space-y-6 transition-all duration-500 ${focusMode ? 'focus-dimmed' : 'opacity-100'}`}>
                {/* DOMAIN SELECTOR */}
                <section aria-labelledby="domain-heading">
                  <div className="flex items-center gap-2 mb-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    <h3 id="domain-heading" className="font-mono text-xs font-bold text-gray-300 uppercase tracking-wider">
                      {t.ui.domainLabel} (Domain)
                    </h3>
                  </div>
                  <DomainSelector selectedDomainId={domainId} onSelect={setDomainId} />
                </section>

                {/* FRAMEWORK SELECTOR */}
                <section aria-labelledby="framework-heading">
                  <div className="flex items-center gap-2 mb-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <h3 id="framework-heading" className="font-mono text-xs font-bold text-gray-300 uppercase tracking-wider">
                      {t.ui.frameworkLabel}
                    </h3>
                  </div>
                  <FrameworkSelector selected={framework} onSelect={setFramework} />
                </section>
              </div>

              {/* AI Agent Lab — Dashboard'dan erişim */}
              <section className="bg-gradient-to-r from-cyber-primary/5 via-purple-500/5 to-cyber-accent/5 border border-cyber-primary/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyber-primary/10 border border-cyber-primary/30 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.5">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                        AI Agent Lab
                      </h3>
                      <p className="font-mono text-[10px] text-gray-500 mt-0.5">
                        {language === 'tr'
                          ? 'Prompt kütüphanesini kullanan akıllı agent: arama, öneri, sentez. OpenAI Agents SDK.'
                          : 'Smart agent using prompt library: search, recommend, synthesize. OpenAI Agents SDK.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePage('ailab')}
                    className="font-mono text-[10px] font-bold px-4 py-2.5 rounded-lg bg-cyber-primary/20 text-cyber-primary border border-cyber-primary/40 hover:bg-cyber-primary/30 transition-colors uppercase tracking-wider"
                  >
                    {language === 'tr' ? "AI Lab'e git" : 'Go to AI Lab'}
                  </button>
                </div>
              </section>

              {/* Row 3: Agent Pipeline */}
              <AgentPipeline activeStep={loading ? 0 : result ? 2 : -1} loading={loading} />

              {/* Row 4: Result Details (shown when result exists) */}
              {result && (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <CacheStatus stats={getCacheStats()} lastHit={lastCacheHit} />
                  {enrichmentMetrics && enrichmentMetrics.promptsIntegrated > 0 && (
                    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                      <span className="text-[9px] font-mono text-purple-400 uppercase tracking-wider font-bold">
                        {language === 'tr' ? 'Otomatik Zenginlestirildi' : 'Auto-Enriched'}
                      </span>
                      <span className="text-[9px] font-mono text-gray-500">
                        Ambiguity: {enrichmentMetrics.ambiguityBefore} → {enrichmentMetrics.ambiguityAfter}
                      </span>
                      <span className="text-[9px] font-mono text-green-400">
                        +{enrichmentMetrics.promptsIntegrated} {language === 'tr' ? 'prompt' : 'prompts'}
                      </span>
                      <span className="text-[9px] font-mono text-gray-500">
                        +{enrichmentMetrics.tokensAdded} tokens
                      </span>
                      <span className="text-[9px] font-mono text-gray-600">
                        {enrichmentMetrics.durationMs}ms
                      </span>
                    </div>
                  )}
                  <ResultDisplay
                    result={result}
                    domainId={domainId}
                    framework={framework}
                    provider={getProviderLabel(provider === 'auto' ? (lastUsedProvider ?? 'auto') : provider, claudeModel)}
                    telemetryConsent={telemetryConsent}
                    onRecordEvent={handleRecordEvent}
                  />
                  <button
                    type="button"
                    onClick={() => qualityDispatch({ type: 'TOGGLE_QUALITY_PANEL' })}
                    aria-expanded={showQualityPanel}
                    className="w-full text-[10px] font-mono text-cyber-primary border border-cyber-primary/40 px-4 py-2 rounded uppercase tracking-wider hover:bg-cyber-primary/10 transition-colors flex items-center justify-between"
                  >
                    <span>{t.ui.qualityTitle} {judgeResult ? `(${judgeResult.totalScore}/100)` : ''}</span>
                    <span>{showQualityPanel ? '▼' : '▶'}</span>
                  </button>
                  {showQualityPanel && (
                    <div className="space-y-3 animate-in fade-in duration-300">
                      {judgeResult && <JudgePanel result={judgeResult} />}
                      {lintResult && <PromptLintPanel result={lintResult} />}
                      {budgetAnalysis && <BudgetPanel analysis={budgetAnalysis} />}
                      {provenance && <ProvenanceView provenance={provenance} />}
                    </div>
                  )}
                  <EnhancePanel
                    masterPrompt={result.masterPrompt}
                    reasoning={result.reasoning}
                    framework={framework}
                    domainId={domainId}
                    language={language}
                    onApply={(enhanced) => {
                      genDispatch({ type: 'UPDATE_RESULT', payload: { masterPrompt: enhanced } });
                      const jResult = judgePrompt(enhanced, { domainId, framework, reasoning: result.reasoning });
                      qualityDispatch({ type: 'SET_JUDGE_RESULT', payload: jResult });
                      const lResult = lintPrompt(enhanced, result.reasoning);
                      qualityDispatch({ type: 'SET_LINT_RESULT', payload: lResult });
                      addToast(language === 'tr' ? 'Geliştirilmiş prompt uygulandı!' : 'Enhanced prompt applied!', 'success');
                    }}
                  />
                  <EnrichmentPanel
                    masterPrompt={result.masterPrompt}
                    framework={framework}
                    domainId={domainId}
                    language={language}
                    onApply={(enriched) => {
                      genDispatch({ type: 'UPDATE_RESULT', payload: { masterPrompt: enriched } });
                      const jResult = judgePrompt(enriched, { domainId, framework, reasoning: result.reasoning });
                      qualityDispatch({ type: 'SET_JUDGE_RESULT', payload: jResult });
                      const lResult = lintPrompt(enriched, result.reasoning);
                      qualityDispatch({ type: 'SET_LINT_RESULT', payload: lResult });
                      addToast(language === 'tr' ? 'Zenginleştirilmiş prompt uygulandı!' : 'Enriched prompt applied!', 'success');
                    }}
                  />
                  <BenchmarkPanel masterPrompt={result.masterPrompt} reasoning={result.reasoning} framework={framework} domainId={domainId} provider={provider} />
                  <PromptCICDInline
                    masterPrompt={result.masterPrompt}
                    reasoning={result.reasoning}
                    intent={intent}
                    domainId={domainId}
                    framework={framework}
                    provider={provider}
                    language={language}
                    judgeResult={judgeResult}
                    lintResult={lintResult}
                    budgetAnalysis={budgetAnalysis}
                  />
                  <VersionHistoryPanel promptId="latest" />
                </div>
              )}
            </div>
          )}

          {/* Analytics Page */}
          {activePage === 'analytics' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyber-primary/10 border border-cyber-primary/30 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                      <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-mono text-sm font-bold text-white uppercase tracking-wider">{t.ui.analyticsTitle}</h2>
                    <p className="font-mono text-[10px] text-gray-500 mt-0.5">
                      {language === 'tr' ? 'Kullanım metrikleri, token analizi ve performans izleme' : 'Usage metrics, token analysis and performance monitoring'}
                    </p>
                  </div>
                </div>
                <label htmlFor="telemetry-consent" className="flex items-center gap-2 cursor-pointer bg-[#0c0c18] border border-cyber-border/40 rounded-lg px-4 py-2.5">
                  <input
                    id="telemetry-consent"
                    type="checkbox"
                    checked={telemetryConsent}
                    onChange={(e) => handleTelemetryConsentChange(e.target.checked)}
                    className="rounded border-cyber-border bg-cyber-dark text-cyber-primary"
                  />
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">{t.ui.analyticsConsent}</span>
                </label>
              </div>
              <AnalyticsDashboard consent={telemetryConsent} />
            </div>
          )}

          {/* AI Lab — Unified Workbench */}
          {activePage === 'ailab' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <AILabWorkbench
                currentPrompt={result?.masterPrompt}
                domainId={domainId}
                framework={framework}
                analyticsSnapshot={aiLabAnalyticsSnapshot}
                onApplyEnrichedPrompt={(enriched) => {
                  if (!result) return;
                  genDispatch({ type: 'UPDATE_RESULT', payload: { masterPrompt: enriched } });
                  const jResult = judgePrompt(enriched, { domainId, framework, reasoning: result.reasoning });
                  qualityDispatch({ type: 'SET_JUDGE_RESULT', payload: jResult });
                  const lResult = lintPrompt(enriched, result.reasoning);
                  qualityDispatch({ type: 'SET_LINT_RESULT', payload: lResult });
                  addToast(language === 'tr' ? 'AI Lab zenginleştirmesi uygulandı!' : 'AI Lab enrichment applied!', 'success');
                }}
              />

              {/* Workflow Panel */}
              <h2 className="font-mono text-sm font-bold text-white uppercase tracking-wider">{t.ui.workflowTitle}</h2>
              <WorkflowPanel
                presetId={workflowPresetId}
                onPresetChange={(v) => settingsDispatch({ type: 'SET_WORKFLOW_PRESET', payload: v })}
                onRun={handleWorkflowRun}
                running={workflowLoading}
                result={workflowResult}
                disabled={(!intent.trim() && attachments.length === 0) || loading}
              />
              <StyleProfileManager />
            </div>
          )}

          {/* Code Optimizer Page */}
          {activePage === 'optimizer' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <OptimizerPanel />
            </div>
          )}

          {/* Vibe Coding Page */}
          {activePage === 'vibecoding' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <VibeCodingPanel />
            </div>
          )}

          {/* Settings Page */}
          {activePage === 'settings' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h2 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                {language === 'tr' ? 'Ayarlar' : 'Settings'}
              </h2>

              {/* Compute Power */}
              <div className="bg-[#0c0c18] border border-cyber-border/50 rounded-lg p-5 space-y-3">
                <h3 className="font-mono text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {language === 'tr' ? 'Hesaplama Gücü' : 'Compute Power'}
                </h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Level</span>
                  <span className="text-[10px] font-mono text-cyber-primary font-bold">{computePower}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={computePower}
                  onChange={(e) => uiDispatch({ type: 'SET_COMPUTE_POWER', payload: Number(e.target.value) })}
                  className="w-full h-1 bg-cyber-dark rounded-full appearance-none cursor-pointer outline-none"
                />
                <p className="text-[9px] font-mono text-gray-600">
                  {language === 'tr'
                    ? 'Daha yüksek değerler daha kapsamlı analiz sağlar ancak daha fazla zaman alabilir.'
                    : 'Higher values provide more thorough analysis but may take longer.'}
                </p>
              </div>

              {/* Auto-Enrichment Setting */}
              <div className="bg-[#0c0c18] border border-purple-500/30 rounded-lg p-5 space-y-3">
                <h3 className="font-mono text-xs font-bold text-purple-400 uppercase tracking-wider">
                  {language === 'tr' ? 'Otomatik Zenginlestirme' : 'Auto-Enrichment'}
                </h3>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoEnrich}
                    onChange={(e) => settingsDispatch({ type: 'SET_AUTO_ENRICH', payload: e.target.checked })}
                    className="rounded border-cyber-border bg-cyber-dark text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-[11px] font-mono text-gray-400">
                    {language === 'tr'
                      ? 'Uretim sonrasi otomatik kutuphane zenginlestirmesi (1040+ prompt)'
                      : 'Auto library enrichment after generation (1040+ prompts)'}
                  </span>
                </label>
                <p className="text-[9px] font-mono text-gray-600">
                  {language === 'tr'
                    ? 'Acik oldugunda, her uretimden sonra ambiguity detection + prompt library entegrasyonu otomatik calisir.'
                    : 'When enabled, ambiguity detection + prompt library integration runs automatically after each generation.'}
                </p>
              </div>

              {/* Provider Selection */}
              <div className="bg-[#0c0c18] border border-cyber-border/50 rounded-lg p-5 space-y-4">
                <h3 className="font-mono text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {language === 'tr' ? 'AI Motor Seçimi' : 'AI Engine Selection'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(['auto', 'groq', 'huggingface', 'gemini', 'openai', 'deepseek', 'openrouter', 'claude', 'ollama'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className={`px-4 py-2 rounded-lg border font-mono text-[11px] uppercase tracking-wider transition-all
                        ${provider === p
                          ? 'border-cyber-primary bg-cyber-primary/10 text-cyber-primary'
                          : 'border-cyber-border bg-cyber-dark text-gray-500 hover:border-gray-500'
                        }`}
                    >
                      {p === 'auto' ? (language === 'tr' ? '⚡ Otomatik (En İyi)' : '⚡ Auto (Best)') : getProviderLabel(p, claudeModel)}
                    </button>
                  ))}
                </div>

                {provider === 'claude' && (
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => settingsDispatch({ type: 'SET_CLAUDE_MODEL', payload: 'sonnet' })}
                      className={`px-3 py-1.5 rounded border font-mono text-[10px] uppercase ${claudeModel === 'sonnet' ? 'border-cyber-primary/50 text-cyber-primary bg-cyber-primary/10' : 'border-cyber-border text-gray-500'}`}>
                      Sonnet
                    </button>
                    <button type="button" onClick={() => settingsDispatch({ type: 'SET_CLAUDE_MODEL', payload: 'opus' })}
                      className={`px-3 py-1.5 rounded border font-mono text-[10px] uppercase ${claudeModel === 'opus' ? 'border-cyber-primary/50 text-cyber-primary bg-cyber-primary/10' : 'border-cyber-border text-gray-500'}`}>
                      Opus 4.6
                    </button>
                  </div>
                )}

                {provider === 'openrouter' && (
                  <select
                    value={openRouterModel}
                    onChange={(e) => settingsDispatch({ type: 'SET_OPENROUTER_MODEL', payload: e.target.value })}
                    className="bg-cyber-dark border border-cyber-border rounded px-3 py-2 text-[11px] font-mono text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyber-primary w-full mt-2"
                  >
                    {OPENROUTER_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                )}

                {(provider === 'gemini' || provider === 'claude') && (
                  <div className="flex gap-3 mt-2">
                    <button type="button" onClick={() => settingsDispatch({ type: 'SET_THINKING_MODE', payload: !thinkingMode })}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-[10px] uppercase transition-all
                        ${thinkingMode ? 'border-cyber-accent bg-cyber-accent/10 text-cyber-accent' : 'border-cyber-border text-gray-500'}`}>
                      <div className={`w-2 h-2 rounded-full ${thinkingMode ? 'bg-cyber-accent animate-pulse' : 'bg-gray-600'}`} />
                      Thinking
                    </button>
                    <button type="button" onClick={() => settingsDispatch({ type: 'SET_USE_SEARCH', payload: !useSearch })}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-[10px] uppercase transition-all
                        ${useSearch ? 'border-cyber-success bg-cyber-success/10 text-cyber-success' : 'border-cyber-border text-gray-500'}`}>
                      <div className={`w-2 h-2 rounded-full ${useSearch ? 'bg-cyber-success animate-pulse' : 'bg-gray-600'}`} />
                      Search
                    </button>
                  </div>
                )}
              </div>

              {/* API & SaaS Panel */}
              <ApiIntegrationPanel
                defaultApiKey={import.meta.env?.VITE_API_KEY || ''}
                language={language}
              />

              {/* Custom Builder */}
              <CustomBuilderPanel />
            </div>
          )}

          {/* Prompts Page */}
          {activePage === 'prompts' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <PromptLibrary onUsePrompt={(p) => {
                genDispatch({ type: 'SET_INTENT', payload: p.masterPrompt });
                uiDispatch({ type: 'SET_PAGE', payload: 'dashboard' });
                addToast(language === 'tr' ? 'Prompt yüklendi' : 'Prompt loaded', 'success');
              }} />
              <VersionHistoryPanel promptId="latest" />
            </div>
          )}

          {/* Prompt CI/CD Page */}
          {activePage === 'testing' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <PromptCICDPage />
            </div>
          )}
        </main>

        {/* Footer */}
        <StatusFooter latencyMs={lastLatency} tokensPerSec={lastTokensPerSec} model={currentModelLabel} />
      </div>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-5 bg-grid-pattern bg-[length:40px_40px]" />
      <div className="fixed top-0 left-[220px] w-[500px] h-[500px] bg-cyber-primary/3 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-cyber-accent/5 rounded-full blur-[150px] pointer-events-none" />
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
