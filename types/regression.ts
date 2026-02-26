/**
 * Prompt CI/CD — Contract Outputs, Test Cases, Regression Engine, Version Lifecycle.
 * All type definitions for the prompt regression testing system.
 */

// ─── Contract Output Types ────────────────────────────────────────────────────

export interface ContractRule {
  /** JSON Schema validation (ajv) */
  jsonSchema?: Record<string, unknown>;
  /** Regex patterns that must match */
  regexPatterns?: { pattern: string; flags?: string; label?: string }[];
  /** Required markdown sections with optional min word count */
  requiredSections?: { heading: string; minWords?: number }[];
  /** Minimum output character length */
  minLength?: number;
  /** Maximum output character length */
  maxLength?: number;
  /** Keywords that MUST appear */
  requiredKeywords?: string[];
  /** Keywords that MUST NOT appear */
  forbiddenKeywords?: string[];
}

export interface ContractRuleViolation {
  ruleType: keyof ContractRule;
  label: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export interface ContractValidationResult {
  passed: boolean;
  score: number; // 0–100
  totalRules: number;
  passedRules: number;
  violations: ContractRuleViolation[];
}

export interface PromptContract {
  id: string;
  orgId: string;
  promptId: string;
  name: string;
  description?: string;
  rules: ContractRule;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Test Case Types ──────────────────────────────────────────────────────────

export type MatchMode = 'exact' | 'contains' | 'regex' | 'semantic' | 'contract';

export interface PromptTestCase {
  id: string;
  orgId: string;
  promptId: string;
  name: string;
  description?: string;
  inputVars: Record<string, string>;
  expectedOutput?: string;
  matchMode: MatchMode;
  tags: string[];
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Regression Run Types ─────────────────────────────────────────────────────

export type TriggerType = 'manual' | 'on_save' | 'on_promote' | 'scheduled' | 'api';
export type RunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error';
export type TestType = 'contract' | 'golden_test' | 'judge_gate' | 'lint_gate' | 'budget_gate' | 'cross_provider'
  | 'adversarial_injection' | 'adversarial_jailbreak' | 'adversarial_exfiltration' | 'adversarial_tool_poison' | 'adversarial_encoding';
export type ResultStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'error';

export interface RegressionRunConfig {
  providers?: string[];
  models?: string[];
  provider?: string;            // preferred LLM provider for golden tests
  model?: string;               // preferred model for golden tests
  domainId?: string;            // domain for judge gate (instead of 'auto')
  judgeThreshold?: number;
  lintMustPass?: boolean;
  contractMustPass?: boolean;
  budgetMaxCost?: number;
  semanticThreshold?: number;   // cosine similarity threshold (0-1, default 0.7)
}

export interface RegressionRunSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  gateResults: {
    judge: { passed: boolean; score: number };
    lint: { passed: boolean; errors: number; warnings: number };
    contract: { passed: boolean; score: number };
    budget: { passed: boolean; costUsd: number };
  };
  overallScore: number;
}

export interface RegressionRun {
  id: string;
  orgId: string;
  promptId: string;
  version: string;
  triggerType: TriggerType;
  status: RunStatus;
  config: RegressionRunConfig;
  summary: RegressionRunSummary | null;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface RegressionResult {
  id: string;
  runId: string;
  testType: TestType;
  testCaseId?: string;
  provider?: string;
  model?: string;
  status: ResultStatus;
  input?: string;
  actualOutput?: string;
  expected?: string;
  score?: number;
  details: Record<string, unknown>;
  durationMs?: number;
  createdAt: string;
}

// ─── Version Lifecycle Types ──────────────────────────────────────────────────

export type VersionStatus = 'draft' | 'testing' | 'staging' | 'production' | 'archived';

export interface VersionLifecycleInfo {
  promptId: string;
  version: string;
  status: VersionStatus;
  promotedAt?: string;
  promotedBy?: string;
  gates: {
    lint: { passed: boolean; checked: boolean };
    judge: { passed: boolean; score: number; checked: boolean };
    contract: { passed: boolean; score: number; checked: boolean };
    regression: { passed: boolean; checked: boolean };
  };
}

export interface PromoteRequest {
  targetStatus: VersionStatus;
  /** When true, skip approval requirement (only admin+) */
  forcePromote?: boolean;
}

export interface PromoteResult {
  success: boolean;
  newStatus: VersionStatus;
  message: string;
  gateResults?: VersionLifecycleInfo['gates'];
  /** Set when approval is required before promote completes */
  pendingApproval?: ApprovalRequest;
}

// ─── Approval Workflow ───────────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  promptId: string;
  version: string;
  fromStatus: VersionStatus;
  toStatus: VersionStatus;
  requestedBy: string;        // userId
  requestedAt: string;        // ISO timestamp
  status: ApprovalStatus;
  requiredApprovers: number;  // How many approvals needed (default: 1)
  approvals: ApprovalVote[];
  gateResults?: VersionLifecycleInfo['gates'];
}

export interface ApprovalVote {
  userId: string;
  email?: string;
  decision: 'approve' | 'reject';
  comment?: string;
  votedAt: string;            // ISO timestamp
}

export interface ApprovalConfig {
  /** Require approval for promote to this status or higher */
  requireApprovalFrom: VersionStatus;
  /** Number of approvals needed */
  requiredApprovers: number;
  /** Roles that can approve (default: admin, owner) */
  approverRoles: string[];
}

export const DEFAULT_APPROVAL_CONFIG: ApprovalConfig = {
  requireApprovalFrom: 'staging',
  requiredApprovers: 1,
  approverRoles: ['admin', 'owner'],
};
