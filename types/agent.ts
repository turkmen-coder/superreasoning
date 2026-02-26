/**
 * Multi-Agent System Types
 */

// Agent tipleri
export type AgentType = 'devops' | 'prompt' | 'analytics' | 'orchestrator';

export interface AgentCapability {
  name: string;
  description: string;
  tools: string[];
}

// Agent Memory
export interface AgentMemory {
  id: string;
  userId: string;
  preferredFrameworks: string[];
  commonDomains: string[];
  enrichmentMode: 'fast' | 'deep';
  pastSuccessfulPrompts: PastPrompt[];
  userPreferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PastPrompt {
  promptId: string;
  promptName: string;
  successRate: number;
  usedAt: string;
  domainId?: string;
  framework?: string;
}

// Agent Message (A2A Communication)
export interface AgentMessage {
  id: string;
  from: AgentType;
  to: AgentType | 'broadcast';
  type: 'request' | 'response' | 'notification' | 'error';
  payload: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
}

// Streaming Step
export interface StreamingStep {
  step: number;
  total: number;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  label: string;
  detail?: string;
  progress?: number; // 0-100
}

// Prompt Version
export interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  content: string;
  enrichmentMetrics?: {
    ambiguityScore: number;
    promptsIntegrated: number;
    tokensAdded: number;
  };
  createdAt: string;
  createdBy: 'user' | 'agent';
  tags: string[];
}

// Prompt Comparison
export interface PromptComparison {
  promptA: {
    id: string;
    name: string;
    content: string;
  };
  promptB: {
    id: string;
    name: string;
    content: string;
  };
  analysis: {
    structureDiff: string[];
    lengthDiff: number;
    sectionDiff: string[];
    recommendation: 'A' | 'B' | 'either';
    reasoning: string;
  };
}

// Batch Enrichment
export interface BatchEnrichItem {
  id: string;
  prompt: string;
  domainId?: string;
  mode: 'fast' | 'deep';
}

export interface BatchEnrichResult {
  id: string;
  originalPrompt: string;
  enrichedPrompt?: string;
  status: 'success' | 'error';
  error?: string;
  metrics?: {
    promptsIntegrated: number;
    tokensAdded: number;
    durationMs: number;
  };
}

// Prompt Pack Export
export interface PromptPack {
  id: string;
  name: string;
  description: string;
  domainId: string;
  prompts: Array<{
    id: string;
    name: string;
    category: string;
    content: string;
  }>;
  exportedAt: string;
  version: string;
}

// Autonomous Task
export interface AutonomousTask {
  id: string;
  type: 'health_monitor' | 'drift_detection' | 'cost_optimization' | 'auto_enrich';
  enabled: boolean;
  intervalMs: number;
  lastRun?: string;
  nextRun?: string;
  config: Record<string, unknown>;
  results: AutonomousTaskResult[];
}

export interface AutonomousTaskResult {
  id: string;
  taskId: string;
  runAt: string;
  status: 'success' | 'warning' | 'error';
  findings: string[];
  actions: string[];
  metrics?: Record<string, number>;
}

// Orchestrator Decision
export interface OrchestratorDecision {
  query: string;
  intent: string;
  routedTo: AgentType[];
  reasoning: string;
  confidence: number;
}

// Agent Status
export interface AgentStatus {
  type: AgentType;
  status: 'idle' | 'busy' | 'error';
  currentTask?: string;
  lastActivity?: string;
  toolsAvailable: string[];
  messagesProcessed: number;
}
