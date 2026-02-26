/**
 * Super Reasoning Prompt-as-Code SDK (OpenAPI uyumlu client)
 * Tarayıcı veya Node'da kullanılabilir.
 */

export const DEFAULT_BASE_URL = 'http://localhost:4000';

export interface GenerateOptions {
  intent: string;
  framework?: string;
  domainId?: string;
  provider?: 'groq' | 'gemini' | 'huggingface' | 'claude' | 'claude-opus' | 'openrouter';
  language?: 'tr' | 'en';
  contextRules?: string;
  /** OpenRouter için model id (örn. anthropic/claude-3.5-sonnet) */
  openRouterModel?: string;
}

export interface PromptResponse {
  masterPrompt: string;
  reasoning?: string;
  detectedFramework?: string;
  detectedDomain?: string;
}

export interface StoredPrompt {
  id: string;
  version: string;
  name?: string;
  masterPrompt: string;
  reasoning?: string;
  meta?: Record<string, string>;
  createdAt: string;
}

export interface SavePromptOptions {
  id: string;
  version: string;
  masterPrompt: string;
  name?: string;
  reasoning?: string;
  meta?: Record<string, string>;
}

export interface ClientOptions {
  baseUrl?: string;
  apiKey?: string;
  orgId?: string;
}

export class SuperReasoningClient {
  constructor(
    public baseUrl: string = DEFAULT_BASE_URL,
    private apiKey?: string,
    private orgId?: string
  ) {}

  private headers(body?: object): Record<string, string> {
    const h: Record<string, string> = body ? { 'Content-Type': 'application/json' } : {};
    if (this.apiKey) h['x-api-key'] = this.apiKey;
    if (this.orgId) h['x-org-id'] = this.orgId;
    return h;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: object
  ): Promise<{ ok: boolean; data?: T; error?: string }> {
    const url = `${this.baseUrl}/v1${path}`;
    const res = await fetch(url, {
      method,
      headers: this.headers(body),
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: T | undefined;
    let error: string | undefined;
    try {
      const j = JSON.parse(text);
      if (res.ok) data = j as T;
      else error = (j as { error?: string }).error ?? text;
    } catch {
      if (!res.ok) error = text;
      else data = text as unknown as T;
    }
    if (!res.ok) return { ok: false, error: error ?? `HTTP ${res.status}` };
    return { ok: true, data };
  }

  async health(): Promise<{ status: string }> {
    const r = await this.request<{ status: string }>('GET', '/health');
    if (!r.ok) throw new Error(r.error);
    return r.data!;
  }

  async generate(options: GenerateOptions): Promise<PromptResponse> {
    const r = await this.request<PromptResponse>('POST', '/generate', {
      intent: options.intent,
      framework: options.framework ?? 'AUTO',
      domainId: options.domainId ?? 'auto',
      provider: options.provider ?? 'groq',
      language: options.language ?? 'en',
      contextRules: options.contextRules,
      openRouterModel: options.openRouterModel,
    });
    if (!r.ok) throw new Error(r.error);
    return r.data!;
  }

  async listPrompts(): Promise<StoredPrompt[]> {
    const r = await this.request<{ prompts: StoredPrompt[] }>('GET', '/prompts');
    if (!r.ok) throw new Error(r.error);
    return r.data!.prompts;
  }

  async getPrompt(id: string, version?: string): Promise<StoredPrompt> {
    const path = version ? `/prompts/${id}?version=${encodeURIComponent(version)}` : `/prompts/${id}`;
    const r = await this.request<StoredPrompt>('GET', path);
    if (!r.ok) throw new Error(r.error);
    return r.data!;
  }

  async savePrompt(options: SavePromptOptions): Promise<StoredPrompt> {
    const r = await this.request<StoredPrompt>('POST', '/prompts', options);
    if (!r.ok) throw new Error(r.error);
    return r.data!;
  }

  async deletePrompt(id: string, version?: string): Promise<void> {
    const path = version ? `/prompts/${id}?version=${encodeURIComponent(version)}` : `/prompts/${id}`;
    const r = await this.request<unknown>('DELETE', path);
    if (!r.ok) throw new Error(r.error);
  }

  async createRun(options: {
    intent: string;
    framework?: string;
    domainId?: string;
    provider?: string;
    workflowPreset?: string;
    projectId?: string;
  }): Promise<{ runId: string; status: string; stepResults?: unknown[]; finalPrompt?: PromptResponse }> {
    const r = await this.request<{
      runId: string;
      status: string;
      stepResults?: unknown[];
      finalPrompt?: PromptResponse;
    }>('POST', '/runs', {
      intent: options.intent,
      framework: options.framework ?? 'AUTO',
      domainId: options.domainId ?? 'auto',
      provider: options.provider ?? 'groq',
      workflowPreset: options.workflowPreset ?? 'quick',
      projectId: options.projectId,
    });
    if (!r.ok) throw new Error(r.error);
    return r.data!;
  }

  async getRun(runId: string): Promise<{
    runId: string;
    status: string;
    stepOutputs?: unknown[];
    intent?: string;
    createdAt?: string;
  }> {
    const r = await this.request<{
      runId: string;
      status: string;
      stepOutputs?: unknown[];
      intent?: string;
      createdAt?: string;
    }>('GET', `/runs/${runId}`);
    if (!r.ok) throw new Error(r.error);
    return r.data!;
  }

  async listRuns(projectId?: string): Promise<{ runs: { runId: string; status: string; intentCompressed?: string }[] }> {
    const path = projectId ? `/runs?projectId=${encodeURIComponent(projectId)}` : '/runs';
    const r = await this.request<{ runs: { runId: string; status: string; intentCompressed?: string }[] }>('GET', path);
    if (!r.ok) throw new Error(r.error);
    return r.data!;
  }

  async getUsage(): Promise<{ orgId: string; plan: string; requestCount: number; tokenCount: number }> {
    const r = await this.request<{ orgId: string; plan: string; requestCount: number; tokenCount: number }>('GET', '/usage');
    if (!r.ok) throw new Error(r.error);
    return r.data!;
  }
}

export function createClient(baseUrl?: string, apiKey?: string, orgId?: string): SuperReasoningClient {
  return new SuperReasoningClient(
    baseUrl ?? process.env.SR_API_URL ?? DEFAULT_BASE_URL,
    apiKey ?? process.env.SR_API_KEY,
    orgId ?? process.env.SR_ORG_ID
  );
}
