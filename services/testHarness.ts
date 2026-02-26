/**
 * Deterministic Test Harness — Zero-LLM-cost agent testing.
 *
 * Provides a complete test execution environment with:
 *   - Mock tool providers (deterministic responses)
 *   - Assertion engine (expectations on agent outputs)
 *   - Test suite runner (multiple scenarios)
 *   - Coverage tracking (tool call coverage)
 *   - CI-compatible JSON report output
 *
 * Usage:
 *   const harness = new TestHarness();
 *   harness.addMock('search_prompts', { results: [...] });
 *   harness.addAssertion('output', 'contains', 'expected text');
 *   const report = await harness.runScenario(session);
 *
 * @see services/agentRecorder.ts (recording provider)
 */

import type {
  AgentSession,
  ReplayResult,
  MockToolResponse,
} from './agentRecorder';
import {
  replaySession,
  createMockToolRunner,
  PRESET_MOCKS,
} from './agentRecorder';

// ── Types ──────────────────────────────────────────────────────────────────

export type AssertionType =
  | 'equals'
  | 'contains'
  | 'not_contains'
  | 'matches_regex'
  | 'json_path'
  | 'tool_called'
  | 'tool_not_called'
  | 'tool_call_count'
  | 'step_count'
  | 'similarity_above'
  | 'custom';

export interface TestAssertion {
  name: string;
  type: AssertionType;
  target: 'output' | 'tool_calls' | 'messages' | 'session';
  expected: string | number | boolean;
  /** For json_path: the JSONPath expression */
  path?: string;
  /** For similarity_above: threshold 0-1 */
  threshold?: number;
  /** For custom: validation function serialized as string */
  customFn?: string;
}

export interface AssertionResult {
  assertion: TestAssertion;
  passed: boolean;
  actual: string | number | boolean;
  message: string;
}

export interface TestScenario {
  id: string;
  name: string;
  description?: string;
  session: AgentSession;
  mocks: MockToolResponse[];
  assertions: TestAssertion[];
  tags?: string[];
  timeout?: number;
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  assertionResults: AssertionResult[];
  replayResult: ReplayResult;
  coverage: ToolCoverage;
  durationMs: number;
  error?: string;
}

export interface ToolCoverage {
  totalToolsCalled: number;
  uniqueToolsCalled: string[];
  toolCallCounts: Record<string, number>;
  mockedTools: string[];
  unmockedTools: string[];
  coveragePercent: number;
}

export interface TestSuiteResult {
  suiteId: string;
  suiteName: string;
  executedAt: string;
  totalScenarios: number;
  passed: number;
  failed: number;
  errors: number;
  scenarios: ScenarioResult[];
  overallCoverage: ToolCoverage;
  durationMs: number;
}

// ── Test Harness Class ─────────────────────────────────────────────────────

export class TestHarness {
  private mocks: MockToolResponse[] = [...PRESET_MOCKS];
  private scenarios: TestScenario[] = [];

  /** Add a mock tool response */
  addMock(tool: string, response: unknown, inputPattern?: Record<string, unknown>): this {
    this.mocks.push({
      tool,
      response: typeof response === 'string' ? response : JSON.stringify(response),
      inputPattern,
    });
    return this;
  }

  /** Clear all custom mocks (keeps presets) */
  clearMocks(): this {
    this.mocks = [...PRESET_MOCKS];
    return this;
  }

  /** Replace all mocks including presets */
  setMocks(mocks: MockToolResponse[]): this {
    this.mocks = [...mocks];
    return this;
  }

  /** Add a test scenario */
  addScenario(scenario: TestScenario): this {
    this.scenarios.push(scenario);
    return this;
  }

  /** Create a scenario from a recorded session with auto-generated assertions */
  createScenarioFromSession(
    session: AgentSession,
    options: { autoAssertions?: boolean; mocks?: MockToolResponse[] } = {},
  ): TestScenario {
    const assertions: TestAssertion[] = [];

    if (options.autoAssertions !== false) {
      // Auto-generate assertions from recorded session
      const toolCalls = session.steps.filter(s => s.type === 'tool_call' && s.toolCall);
      const messages = session.steps.filter(s => s.type === 'message' && s.message);

      // Assert step count matches
      assertions.push({
        name: 'Step count matches recording',
        type: 'step_count',
        target: 'session',
        expected: session.steps.length,
      });

      // Assert each recorded tool was called
      const uniqueTools = new Set(toolCalls.map(s => s.toolCall!.tool));
      for (const tool of uniqueTools) {
        assertions.push({
          name: `Tool "${tool}" was called`,
          type: 'tool_called',
          target: 'tool_calls',
          expected: tool,
        });
      }

      // Assert assistant messages are similar
      const assistantMsgs = messages.filter(s => s.message?.role === 'assistant');
      if (assistantMsgs.length > 0) {
        assertions.push({
          name: 'Replay similarity above threshold',
          type: 'similarity_above',
          target: 'output',
          expected: 0.7,
          threshold: 0.7,
        });
      }
    }

    const scenario: TestScenario = {
      id: `scenario-${session.id}`,
      name: `Replay: ${session.name}`,
      description: `Auto-generated from recorded session ${session.id}`,
      session,
      mocks: options.mocks ?? this.mocks,
      assertions,
    };

    return scenario;
  }

  /** Run a single scenario */
  async runScenario(scenario: TestScenario): Promise<ScenarioResult> {
    const start = Date.now();

    try {
      // Create mock runner from scenario mocks + harness mocks
      const allMocks = [...this.mocks, ...scenario.mocks];
      const toolRunner = createMockToolRunner(allMocks);

      // Replay the session
      const replayResult = await replaySession(scenario.session, toolRunner);

      // Calculate tool coverage
      const coverage = calculateCoverage(scenario.session, allMocks);

      // Run assertions
      const assertionResults = runAssertions(
        scenario.assertions,
        scenario.session,
        replayResult,
        coverage,
      );

      const allPassed = assertionResults.every(r => r.passed);

      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        passed: allPassed,
        assertionResults,
        replayResult,
        coverage,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        passed: false,
        assertionResults: [],
        replayResult: {
          sessionId: scenario.session.id,
          replayedAt: new Date().toISOString(),
          totalSteps: scenario.session.steps.length,
          matchedSteps: 0,
          divergedSteps: scenario.session.steps.length,
          diffs: [],
          summary: 'major_diff',
        },
        coverage: emptyCoverage(),
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /** Run all registered scenarios */
  async runSuite(suiteName: string = 'Default Suite'): Promise<TestSuiteResult> {
    const start = Date.now();
    const results: ScenarioResult[] = [];

    for (const scenario of this.scenarios) {
      const result = await this.runScenario(scenario);
      results.push(result);
    }

    // Aggregate coverage
    const overallCoverage = aggregateCoverage(results.map(r => r.coverage));

    return {
      suiteId: `suite-${Date.now()}`,
      suiteName,
      executedAt: new Date().toISOString(),
      totalScenarios: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed && !r.error).length,
      errors: results.filter(r => !!r.error).length,
      scenarios: results,
      overallCoverage,
      durationMs: Date.now() - start,
    };
  }

  /** Generate CI-compatible JSON report */
  formatReport(result: TestSuiteResult): string {
    return JSON.stringify({
      ...result,
      _format: 'super-reasoning-test-harness-v1',
      _generatedAt: new Date().toISOString(),
    }, null, 2);
  }
}

// ── Assertion Engine ───────────────────────────────────────────────────────

function runAssertions(
  assertions: TestAssertion[],
  session: AgentSession,
  replayResult: ReplayResult,
  coverage: ToolCoverage,
): AssertionResult[] {
  return assertions.map(assertion => evaluateAssertion(assertion, session, replayResult, coverage));
}

function evaluateAssertion(
  assertion: TestAssertion,
  session: AgentSession,
  replayResult: ReplayResult,
  coverage: ToolCoverage,
): AssertionResult {
  try {
    switch (assertion.type) {
      case 'step_count': {
        const actual = session.steps.length;
        return {
          assertion,
          passed: actual === assertion.expected,
          actual,
          message: actual === assertion.expected
            ? `Step count matches: ${actual}`
            : `Expected ${assertion.expected} steps, got ${actual}`,
        };
      }

      case 'tool_called': {
        const toolName = String(assertion.expected);
        const called = coverage.uniqueToolsCalled.includes(toolName);
        return {
          assertion,
          passed: called,
          actual: called,
          message: called
            ? `Tool "${toolName}" was called`
            : `Tool "${toolName}" was NOT called`,
        };
      }

      case 'tool_not_called': {
        const toolName = String(assertion.expected);
        const called = coverage.uniqueToolsCalled.includes(toolName);
        return {
          assertion,
          passed: !called,
          actual: !called,
          message: !called
            ? `Tool "${toolName}" was not called (as expected)`
            : `Tool "${toolName}" was called (unexpected)`,
        };
      }

      case 'tool_call_count': {
        const toolName = assertion.path ?? '';
        const actual = coverage.toolCallCounts[toolName] ?? 0;
        const expected = Number(assertion.expected);
        return {
          assertion,
          passed: actual === expected,
          actual,
          message: actual === expected
            ? `Tool "${toolName}" called ${actual} times`
            : `Expected "${toolName}" to be called ${expected} times, got ${actual}`,
        };
      }

      case 'similarity_above': {
        const threshold = assertion.threshold ?? (Number(assertion.expected) || 0.7);
        const matchRatio = replayResult.totalSteps > 0
          ? replayResult.matchedSteps / replayResult.totalSteps
          : 0;
        return {
          assertion,
          passed: matchRatio >= threshold,
          actual: Math.round(matchRatio * 100) / 100,
          message: matchRatio >= threshold
            ? `Similarity ${(matchRatio * 100).toFixed(1)}% >= ${(threshold * 100).toFixed(1)}%`
            : `Similarity ${(matchRatio * 100).toFixed(1)}% < ${(threshold * 100).toFixed(1)}% threshold`,
        };
      }

      case 'contains': {
        const haystack = getTargetText(assertion.target, session);
        const needle = String(assertion.expected);
        const found = haystack.toLowerCase().includes(needle.toLowerCase());
        return {
          assertion,
          passed: found,
          actual: found,
          message: found
            ? `Target contains "${needle}"`
            : `Target does not contain "${needle}"`,
        };
      }

      case 'not_contains': {
        const haystack = getTargetText(assertion.target, session);
        const needle = String(assertion.expected);
        const found = haystack.toLowerCase().includes(needle.toLowerCase());
        return {
          assertion,
          passed: !found,
          actual: !found,
          message: !found
            ? `Target does not contain "${needle}" (as expected)`
            : `Target contains "${needle}" (unexpected)`,
        };
      }

      case 'equals': {
        const actual = getTargetText(assertion.target, session);
        const expected = String(assertion.expected);
        const passed = actual.trim() === expected.trim();
        return {
          assertion,
          passed,
          actual: actual.slice(0, 200),
          message: passed ? 'Values match' : 'Values do not match',
        };
      }

      case 'matches_regex': {
        const text = getTargetText(assertion.target, session);
        const re = new RegExp(String(assertion.expected));
        const passed = re.test(text);
        return {
          assertion,
          passed,
          actual: passed,
          message: passed
            ? `Text matches pattern /${assertion.expected}/`
            : `Text does not match pattern /${assertion.expected}/`,
        };
      }

      default:
        return {
          assertion,
          passed: false,
          actual: 'unknown',
          message: `Unknown assertion type: ${assertion.type}`,
        };
    }
  } catch (err) {
    return {
      assertion,
      passed: false,
      actual: 'error',
      message: `Assertion error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function getTargetText(target: TestAssertion['target'], session: AgentSession): string {
  switch (target) {
    case 'output': {
      const assistantMsgs = session.steps
        .filter(s => s.type === 'message' && s.message?.role === 'assistant')
        .map(s => s.message!.content);
      return assistantMsgs.join('\n');
    }
    case 'tool_calls': {
      const toolCalls = session.steps
        .filter(s => s.type === 'tool_call' && s.toolCall)
        .map(s => `${s.toolCall!.tool}: ${s.toolCall!.output}`);
      return toolCalls.join('\n');
    }
    case 'messages': {
      const msgs = session.steps
        .filter(s => s.type === 'message' && s.message)
        .map(s => `[${s.message!.role}] ${s.message!.content}`);
      return msgs.join('\n');
    }
    case 'session':
      return JSON.stringify(session);
    default:
      return '';
  }
}

// ── Coverage Calculation ───────────────────────────────────────────────────

function calculateCoverage(session: AgentSession, mocks: MockToolResponse[]): ToolCoverage {
  const toolCalls = session.steps
    .filter(s => s.type === 'tool_call' && s.toolCall)
    .map(s => s.toolCall!.tool);

  const uniqueTools = [...new Set(toolCalls)];
  const counts: Record<string, number> = {};
  for (const tool of toolCalls) {
    counts[tool] = (counts[tool] ?? 0) + 1;
  }

  const mockedToolNames = new Set(mocks.map(m => m.tool));
  const mockedTools = uniqueTools.filter(t => mockedToolNames.has(t));
  const unmockedTools = uniqueTools.filter(t => !mockedToolNames.has(t));

  const coveragePercent = uniqueTools.length > 0
    ? Math.round((mockedTools.length / uniqueTools.length) * 100)
    : 100;

  return {
    totalToolsCalled: toolCalls.length,
    uniqueToolsCalled: uniqueTools,
    toolCallCounts: counts,
    mockedTools,
    unmockedTools,
    coveragePercent,
  };
}

function emptyCoverage(): ToolCoverage {
  return {
    totalToolsCalled: 0,
    uniqueToolsCalled: [],
    toolCallCounts: {},
    mockedTools: [],
    unmockedTools: [],
    coveragePercent: 0,
  };
}

function aggregateCoverage(coverages: ToolCoverage[]): ToolCoverage {
  const allTools = new Set<string>();
  const allMocked = new Set<string>();
  const allUnmocked = new Set<string>();
  const counts: Record<string, number> = {};
  let totalCalls = 0;

  for (const cov of coverages) {
    totalCalls += cov.totalToolsCalled;
    for (const t of cov.uniqueToolsCalled) allTools.add(t);
    for (const t of cov.mockedTools) allMocked.add(t);
    for (const t of cov.unmockedTools) allUnmocked.add(t);
    for (const [tool, count] of Object.entries(cov.toolCallCounts)) {
      counts[tool] = (counts[tool] ?? 0) + count;
    }
  }

  const unique = [...allTools];
  const mocked = [...allMocked];
  const unmocked = [...allUnmocked].filter(t => !allMocked.has(t));

  return {
    totalToolsCalled: totalCalls,
    uniqueToolsCalled: unique,
    toolCallCounts: counts,
    mockedTools: mocked,
    unmockedTools: unmocked,
    coveragePercent: unique.length > 0 ? Math.round((mocked.length / unique.length) * 100) : 100,
  };
}

// ── Preset Test Scenarios ──────────────────────────────────────────────────

/** Create a basic smoke test scenario from a recorded session */
export function createSmokeTest(session: AgentSession): TestScenario {
  return {
    id: `smoke-${session.id}`,
    name: `Smoke Test: ${session.name}`,
    description: 'Basic replay validation with default mocks',
    session,
    mocks: PRESET_MOCKS,
    assertions: [
      {
        name: 'Session replays without errors',
        type: 'similarity_above',
        target: 'output',
        expected: 0.5,
        threshold: 0.5,
      },
    ],
    tags: ['smoke', 'auto'],
  };
}

/** Create a strict regression test from a recorded session */
export function createRegressionTest(session: AgentSession): TestScenario {
  const toolSteps = session.steps.filter(s => s.type === 'tool_call' && s.toolCall);
  const uniqueTools = [...new Set(toolSteps.map(s => s.toolCall!.tool))];

  const assertions: TestAssertion[] = [
    {
      name: 'High similarity to original',
      type: 'similarity_above',
      target: 'output',
      expected: 0.85,
      threshold: 0.85,
    },
    {
      name: 'Step count within range',
      type: 'step_count',
      target: 'session',
      expected: session.steps.length,
    },
  ];

  // Assert each tool was called
  for (const tool of uniqueTools) {
    assertions.push({
      name: `Tool "${tool}" called`,
      type: 'tool_called',
      target: 'tool_calls',
      expected: tool,
    });
  }

  return {
    id: `regression-${session.id}`,
    name: `Regression: ${session.name}`,
    description: 'Strict replay validation with tool coverage checks',
    session,
    mocks: PRESET_MOCKS,
    assertions,
    tags: ['regression', 'strict'],
  };
}
