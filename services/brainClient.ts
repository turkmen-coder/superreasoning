import { API_BASE, getAuthHeaders } from './apiClient';

export type BrainOperation =
  | 'analyze_intent'
  | 'enrich_prompt'
  | 'enhance_prompt'
  | 'prompt_analysis'
  | 'prompt_transform'
  | 'fix_text'
  | 'quality_suite'
  | 'version_history'
  | 'orchestrate';

interface BrainExecuteRequest {
  operation: BrainOperation;
  language?: 'tr' | 'en';
  payload: Record<string, unknown>;
  context?: Record<string, unknown>;
}

interface BrainExecuteResponse<T = unknown> {
  operation: BrainOperation;
  ok: boolean;
  result: T;
}

async function executeBrain<T>(input: BrainExecuteRequest): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/brain/execute`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Brain execution failed');
  }

  return (data as BrainExecuteResponse<T>).result;
}

export interface BrainAnalyzeIntentResult {
  domain: string;
  framework: string;
  reasoning: string;
  enrichedPrompt?: string;
}

export async function analyzeIntentViaBrain(params: {
  prompt: string;
  language: 'tr' | 'en';
  domainId?: string;
  framework?: string;
  context?: Record<string, unknown>;
}): Promise<BrainAnalyzeIntentResult> {
  return executeBrain<BrainAnalyzeIntentResult>({
    operation: 'analyze_intent',
    language: params.language,
    payload: {
      prompt: params.prompt,
      domainId: params.domainId,
      framework: params.framework,
    },
    context: params.context,
  });
}

export async function fixTextViaBrain(params: {
  text: string;
  language: 'tr' | 'en';
}): Promise<{ original: string; fixed: string }> {
  return executeBrain<{ original: string; fixed: string }>({
    operation: 'fix_text',
    language: params.language,
    payload: {
      text: params.text,
    },
  });
}

export async function enhancePromptViaBrain(params: {
  masterPrompt: string;
  language: 'tr' | 'en';
  domainId?: string;
  framework?: string;
  reasoning?: string;
}): Promise<unknown> {
  return executeBrain({
    operation: 'enhance_prompt',
    language: params.language,
    payload: {
      masterPrompt: params.masterPrompt,
      domainId: params.domainId,
      framework: params.framework,
      reasoning: params.reasoning,
    },
  });
}

export async function analyzePromptViaBrain(params: {
  prompt: string;
  language: 'tr' | 'en';
  analysisType: 'structure' | 'quality' | 'variables' | 'elements';
}): Promise<unknown> {
  return executeBrain({
    operation: 'prompt_analysis',
    language: params.language,
    payload: {
      prompt: params.prompt,
      analysisType: params.analysisType,
    },
  });
}

export async function transformPromptViaBrain(params: {
  prompt: string;
  language: 'tr' | 'en';
  transformation: 'markdown_to_json' | 'flat_to_structured' | 'single_to_multiturn' | 'normalize_variables';
}): Promise<unknown> {
  return executeBrain({
    operation: 'prompt_transform',
    language: params.language,
    payload: {
      prompt: params.prompt,
      transformation: params.transformation,
    },
  });
}

export async function enrichPromptViaBrain(params: {
  masterPrompt: string;
  language: 'tr' | 'en';
  domainId?: string;
  framework?: string;
  mode?: 'fast' | 'deep' | 'agent';
}): Promise<unknown> {
  return executeBrain({
    operation: 'enrich_prompt',
    language: params.language,
    payload: {
      masterPrompt: params.masterPrompt,
      domainId: params.domainId,
      framework: params.framework,
      mode: params.mode,
    },
  });
}

export interface BrainQualitySuiteResult {
  judge: unknown;
  lint: unknown;
  budget: unknown;
}

export async function runQualitySuiteViaBrain(params: {
  masterPrompt: string;
  reasoning?: string;
  inputText?: string;
  domainId?: string;
  framework?: string;
  provider?: string;
  language: 'tr' | 'en';
}): Promise<BrainQualitySuiteResult> {
  return executeBrain<BrainQualitySuiteResult>({
    operation: 'quality_suite',
    language: params.language,
    payload: {
      masterPrompt: params.masterPrompt,
      reasoning: params.reasoning,
      inputText: params.inputText,
      domainId: params.domainId,
      framework: params.framework,
      provider: params.provider,
    },
  });
}

export interface BrainVersionHistoryResult {
  promptId: string;
  versions: unknown[];
}

export async function getVersionHistoryViaBrain(params: {
  promptId: string;
  language: 'tr' | 'en';
}): Promise<BrainVersionHistoryResult> {
  return executeBrain<BrainVersionHistoryResult>({
    operation: 'version_history',
    language: params.language,
    payload: { promptId: params.promptId },
  });
}
