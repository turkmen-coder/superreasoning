// MasterPrompt.Developer Optimization System - Type Definitions V2
// Updated: FID -> INP (March 2024), sigmoid scoring, improved weights

// === Input Types ===

export interface ComponentInput {
  name: string;
  dependencies: string[];
  code: string;
}

export interface FolderStructureNode {
  [key: string]: string[] | FolderStructureNode;
}

export interface OptimizationInput {
  components: ComponentInput[];
  folderStructure: FolderStructureNode;
}

// === Metrics Types ===

export interface WebVitalsMetrics {
  lcp: number;
  inp: number;       // INP replaces FID (March 2024)
  cls: number;
  lcpPass: boolean;
  inpPass: boolean;
  clsPass: boolean;
  allPass: boolean;
  details: WebVitalsDetail[];
}

export interface WebVitalsDetail {
  metric: 'lcp' | 'inp' | 'cls';
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  component: string;
}

export interface BundleMetrics {
  originalSizeKb: number;
  optimizedSizeKb: number;
  gzipSizeKb: number;        // gzip estimate
  reductionPercent: number;
  chunksCount: number;
  lazyLoadedCount: number;
  treeShaken: string[];
  barrelImports: string[];   // barrel file imports detected
  duplicatedDeps: string[];  // deps counted in multiple components
}

export interface TypeScriptMetrics {
  strictModeCompliant: boolean;
  interfacesCount: number;
  typesCount: number;
  anyUsageCount: number;
  issues: string[];
}

// === Optimization Types ===

export type OptimizationType =
  | 'lazy-loading'
  | 'tree-shaking'
  | 'code-splitting'
  | 'import-optimization'
  | 'barrel-elimination'
  | 'async-waterfall'
  | 'typescript-strict'
  | 'clean-architecture'
  | 'cwv-optimization'
  | 'backend-optimization'
  | 'db-query-optimization'
  | 'memory-optimization'
  | 'api-optimization';

export interface OptimizationChange {
  type: OptimizationType;
  description: string;
  descriptionTr: string;
  file: string;
  before: string;
  after: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
}

export interface OptimizedComponent {
  name: string;
  dependencies: string[];
  code: string;
  optimizations: string[];
}

export interface OptimizationOutput {
  components: OptimizedComponent[];
  folderStructure: FolderStructureNode;
}

// === Round Types ===

export interface BackendMetrics {
  ttfbMs: number;              // Time to First Byte estimate
  memoryPatterns: string[];    // Memory leak/waste patterns
  dbQueryIssues: string[];     // N+1, missing index, etc.
  apiPatterns: string[];       // REST/GraphQL anti-patterns
  score: number;               // 0-100
}

export interface OptimizationRound {
  round: number;
  timestamp: number;
  durationMs: number;
  webVitals: WebVitalsMetrics;
  bundle: BundleMetrics;
  typescript: TypeScriptMetrics;
  backendMetrics?: BackendMetrics;
  changes: OptimizationChange[];
  output: OptimizationOutput;
  score: number;
  scoreImprovement: number;   // delta from previous round
  provider: OptimizerProvider;
}

// === Stack / Language Context ===

export type FrontendLang =
  | 'react-ts'
  | 'react-js'
  | 'vue'
  | 'angular'
  | 'svelte'
  | 'nextjs'
  | 'nuxt'
  | 'sveltekit'
  | 'html-css-js';

export type BackendLang =
  | 'node'
  | 'python'
  | 'go'
  | 'java'
  | 'csharp'
  | 'php'
  | 'rust'
  | 'c'
  | 'cpp'
  | 'assembly'
  | 'swift'
  | 'kotlin'
  | 'ruby'
  | 'scala'
  | 'dart'
  | 'elixir'
  | 'haskell'
  | 'lua'
  | 'perl'
  | 'r'
  | 'zig'
  | 'deno';

// === Session Types ===

export type OptimizerProvider = 'gemini' | 'deepseek' | 'openai';

export type OptimizationStatus =
  | 'idle'
  | 'analyzing'
  | 'optimizing'
  | 'comparing'
  | 'complete'
  | 'error';

export interface OptimizationSession {
  id: string;
  startedAt: number;
  status: OptimizationStatus;
  input: OptimizationInput;
  rounds: OptimizationRound[];
  currentRound: number;
  maxRounds: number;
  targetMetrics: {
    lcpThreshold: number;
    inpThreshold: number;
    clsThreshold: number;
  };
  finalOutput: OptimizationOutput | null;
  error: string | null;
  converged: boolean;         // true if stopped due to diminishing returns
}

// === Diff Types ===

export interface DiffLine {
  lineNumber: number;
  type: 'added' | 'removed' | 'unchanged';
  content: string;
}

export interface DiffResult {
  lines: DiffLine[];
  stats: {
    added: number;
    removed: number;
    unchanged: number;
  };
}

// === CWV Thresholds (Google 2024+) ===

export const CWV_THRESHOLDS = {
  lcp: 2.5,    // seconds - Good < 2.5s
  inp: 200,    // milliseconds - Good < 200ms (replaces FID < 100ms)
  cls: 0.1,    // unitless - Good < 0.1
} as const;

// === Score Weights (rebalanced to avoid double-counting) ===

export const SCORE_WEIGHTS = {
  webVitals: 0.45,        // LCP + INP + CLS (primary)
  bundle: 0.20,           // reduced from 0.30 to avoid LCP double-count
  typescript: 0.15,
  cleanArchitecture: 0.20, // increased: modularity matters
} as const;

// Backend-inclusive weights (used when backend code is present)
export const SCORE_WEIGHTS_WITH_BACKEND = {
  webVitals: 0.30,
  bundle: 0.15,
  typescript: 0.10,
  cleanArchitecture: 0.15,
  backend: 0.30,
} as const;

// === Convergence threshold ===

export const CONVERGENCE_THRESHOLD = 2; // stop if score improves < 2 pts between rounds

// === Vibe Coding Types ===

export type VibeCodingMode = 'plan' | 'agent';

export type ProjectScale = 'mvp' | 'startup' | 'enterprise';
export type ProjectPhase = 'requirements' | 'architecture' | 'implementation' | 'testing' | 'deployment';

export interface VibeCodingTask {
  id: string;
  title: string;
  description: string;
  phase: ProjectPhase;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedComplexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'epic';
  dependencies: string[];
  agentPrompt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

export interface VibeCodingPlan {
  id: string;
  projectName: string;
  projectDescription: string;
  scale: ProjectScale;
  techStack: {
    frontend?: string;
    backend?: string;
    database?: string;
    deployment?: string;
  };
  phases: {
    phase: ProjectPhase;
    tasks: VibeCodingTask[];
    description: string;
  }[];
  prd: string;
  totalTasks: number;
  generatedAt: number;
  provider: OptimizerProvider;
}

export interface VibeCodingAgentResult {
  taskId: string;
  prompt: string;
  response: string;
  codeBlocks: { language: string; code: string; filename?: string }[];
  timestamp: number;
  durationMs: number;
  provider: OptimizerProvider;
}
