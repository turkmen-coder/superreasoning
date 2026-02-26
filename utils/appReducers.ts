/**
 * App.tsx state management — useReducer refactoring.
 *
 * Groups 30+ useState calls into 4 focused reducers:
 * 1. generationReducer  — input, provider, loading, result, attachments
 * 2. qualityReducer     — judge, lint, budget, provenance, cache, enrichment
 * 3. uiReducer          — navigation, modals, metrics display
 * 4. settingsReducer    — telemetry, workflow, provider config, auto-enrich
 */

import type { Framework, PromptResponse, Attachment } from '../types';
import type { ClientProvider } from '../services/unifiedProviderService';
import type { JudgeResult } from '../services/judgeEnsemble';
import type { LintResult } from '../services/promptLint';
import type { BudgetAnalysis } from '../services/budgetOptimizer';
import type { ProvenanceRecord } from '../types/provenance';
import type { WorkflowRunResult } from '../types';
import type { SidebarPage } from '../components/Sidebar';
import { OPENROUTER_DEFAULT_MODEL_ID } from '../data/openRouterModels';

// ── 1) Generation State ─────────────────────────────────────────────────────

export interface GenerationState {
  intent: string;
  framework: Framework;
  domainId: string;
  loading: boolean;
  error: string | null;
  result: PromptResponse | null;
  attachments: Attachment[];
  dragActive: boolean;
}

export type GenerationAction =
  | { type: 'SET_INTENT'; payload: string }
  | { type: 'SET_FRAMEWORK'; payload: Framework }
  | { type: 'SET_DOMAIN'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_RESULT'; payload: PromptResponse | null }
  | { type: 'ADD_ATTACHMENTS'; payload: Attachment[] }
  | { type: 'REMOVE_ATTACHMENT'; payload: number }
  | { type: 'SET_DRAG_ACTIVE'; payload: boolean }
  | { type: 'START_GENERATION' }
  | { type: 'GENERATION_SUCCESS'; payload: PromptResponse }
  | { type: 'GENERATION_ERROR'; payload: string }
  | { type: 'UPDATE_RESULT'; payload: Partial<PromptResponse> };

export const initialGenerationState: GenerationState = {
  intent: '',
  framework: 'AUTO' as Framework,
  domainId: 'auto',
  loading: false,
  error: null,
  result: null,
  attachments: [],
  dragActive: false,
};

export function generationReducer(state: GenerationState, action: GenerationAction): GenerationState {
  switch (action.type) {
    case 'SET_INTENT':
      return { ...state, intent: action.payload };
    case 'SET_FRAMEWORK':
      return { ...state, framework: action.payload };
    case 'SET_DOMAIN':
      return { ...state, domainId: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_RESULT':
      return { ...state, result: action.payload };
    case 'ADD_ATTACHMENTS':
      return { ...state, attachments: [...state.attachments, ...action.payload] };
    case 'REMOVE_ATTACHMENT':
      return { ...state, attachments: state.attachments.filter((_, i) => i !== action.payload) };
    case 'SET_DRAG_ACTIVE':
      return { ...state, dragActive: action.payload };
    case 'START_GENERATION':
      return { ...state, loading: true, error: null, result: null };
    case 'GENERATION_SUCCESS':
      return { ...state, loading: false, result: action.payload };
    case 'GENERATION_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'UPDATE_RESULT':
      return state.result
        ? { ...state, result: { ...state.result, ...action.payload } }
        : state;
    default:
      return state;
  }
}

// ── 2) Quality State ────────────────────────────────────────────────────────

export interface EnrichmentMetrics {
  ambiguityBefore: number;
  ambiguityAfter: number;
  promptsIntegrated: number;
  tokensAdded: number;
  durationMs: number;
}

export interface QualityState {
  showQualityPanel: boolean;
  judgeResult: JudgeResult | null;
  lintResult: LintResult | null;
  budgetAnalysis: BudgetAnalysis | null;
  provenance: ProvenanceRecord | null;
  lastCacheHit: boolean;
  enrichmentMetrics: EnrichmentMetrics | null;
}

export type QualityAction =
  | { type: 'TOGGLE_QUALITY_PANEL' }
  | { type: 'SET_JUDGE_RESULT'; payload: JudgeResult | null }
  | { type: 'SET_LINT_RESULT'; payload: LintResult | null }
  | { type: 'SET_BUDGET_ANALYSIS'; payload: BudgetAnalysis | null }
  | { type: 'SET_PROVENANCE'; payload: ProvenanceRecord | null }
  | { type: 'SET_CACHE_HIT'; payload: boolean }
  | { type: 'SET_ENRICHMENT_METRICS'; payload: EnrichmentMetrics | null }
  | { type: 'RESET_QUALITY' };

export const initialQualityState: QualityState = {
  showQualityPanel: false,
  judgeResult: null,
  lintResult: null,
  budgetAnalysis: null,
  provenance: null,
  lastCacheHit: false,
  enrichmentMetrics: null,
};

export function qualityReducer(state: QualityState, action: QualityAction): QualityState {
  switch (action.type) {
    case 'TOGGLE_QUALITY_PANEL':
      return { ...state, showQualityPanel: !state.showQualityPanel };
    case 'SET_JUDGE_RESULT':
      return { ...state, judgeResult: action.payload };
    case 'SET_LINT_RESULT':
      return { ...state, lintResult: action.payload };
    case 'SET_BUDGET_ANALYSIS':
      return { ...state, budgetAnalysis: action.payload };
    case 'SET_PROVENANCE':
      return { ...state, provenance: action.payload };
    case 'SET_CACHE_HIT':
      return { ...state, lastCacheHit: action.payload };
    case 'SET_ENRICHMENT_METRICS':
      return { ...state, enrichmentMetrics: action.payload };
    case 'RESET_QUALITY':
      return {
        ...state,
        judgeResult: null,
        lintResult: null,
        budgetAnalysis: null,
        provenance: null,
        lastCacheHit: false,
        enrichmentMetrics: null,
      };
    default:
      return state;
  }
}

// ── 3) UI State ─────────────────────────────────────────────────────────────

export interface UIState {
  activePage: SidebarPage;
  computePower: number;
  lastLatency: number;
  lastTokensPerSec: number;
  showConfirmModal: boolean;
}

export type UIAction =
  | { type: 'SET_PAGE'; payload: SidebarPage }
  | { type: 'SET_COMPUTE_POWER'; payload: number }
  | { type: 'SET_LATENCY'; payload: number }
  | { type: 'SET_TOKENS_PER_SEC'; payload: number }
  | { type: 'SET_CONFIRM_MODAL'; payload: boolean };

export const initialUIState: UIState = {
  activePage: 'dashboard',
  computePower: 75,
  lastLatency: 42,
  lastTokensPerSec: 124,
  showConfirmModal: false,
};

export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, activePage: action.payload };
    case 'SET_COMPUTE_POWER':
      return { ...state, computePower: action.payload };
    case 'SET_LATENCY':
      return { ...state, lastLatency: action.payload };
    case 'SET_TOKENS_PER_SEC':
      return { ...state, lastTokensPerSec: action.payload };
    case 'SET_CONFIRM_MODAL':
      return { ...state, showConfirmModal: action.payload };
    default:
      return state;
  }
}

// ── 4) Settings State ───────────────────────────────────────────────────────

export interface SettingsState {
  provider: ClientProvider;
  lastUsedProvider: ClientProvider | null;
  claudeModel: 'sonnet' | 'opus';
  openRouterModel: string;
  useSearch: boolean;
  thinkingMode: boolean;
  telemetryConsent: boolean;
  workflowPresetId: string;
  workflowResult: WorkflowRunResult | null;
  workflowLoading: boolean;
  autoEnrich: boolean;
}

export type SettingsAction =
  | { type: 'SET_PROVIDER'; payload: ClientProvider }
  | { type: 'SET_LAST_USED_PROVIDER'; payload: ClientProvider | null }
  | { type: 'SET_CLAUDE_MODEL'; payload: 'sonnet' | 'opus' }
  | { type: 'SET_OPENROUTER_MODEL'; payload: string }
  | { type: 'SET_USE_SEARCH'; payload: boolean }
  | { type: 'SET_THINKING_MODE'; payload: boolean }
  | { type: 'SET_TELEMETRY_CONSENT'; payload: boolean }
  | { type: 'SET_WORKFLOW_PRESET'; payload: string }
  | { type: 'SET_WORKFLOW_RESULT'; payload: WorkflowRunResult | null }
  | { type: 'SET_WORKFLOW_LOADING'; payload: boolean }
  | { type: 'SET_AUTO_ENRICH'; payload: boolean };

export const initialSettingsState: SettingsState = {
  provider: 'auto',
  lastUsedProvider: null,
  claudeModel: 'sonnet',
  openRouterModel: OPENROUTER_DEFAULT_MODEL_ID,
  useSearch: false,
  thinkingMode: false,
  telemetryConsent: false,
  workflowPresetId: 'quick',
  workflowResult: null,
  workflowLoading: false,
  autoEnrich: true,
};

export function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_PROVIDER':
      return { ...state, provider: action.payload };
    case 'SET_LAST_USED_PROVIDER':
      return { ...state, lastUsedProvider: action.payload };
    case 'SET_CLAUDE_MODEL':
      return { ...state, claudeModel: action.payload };
    case 'SET_OPENROUTER_MODEL':
      return { ...state, openRouterModel: action.payload };
    case 'SET_USE_SEARCH':
      return { ...state, useSearch: action.payload };
    case 'SET_THINKING_MODE':
      return { ...state, thinkingMode: action.payload };
    case 'SET_TELEMETRY_CONSENT':
      return { ...state, telemetryConsent: action.payload };
    case 'SET_WORKFLOW_PRESET':
      return { ...state, workflowPresetId: action.payload };
    case 'SET_WORKFLOW_RESULT':
      return { ...state, workflowResult: action.payload };
    case 'SET_WORKFLOW_LOADING':
      return { ...state, workflowLoading: action.payload };
    case 'SET_AUTO_ENRICH':
      return { ...state, autoEnrich: action.payload };
    default:
      return state;
  }
}
