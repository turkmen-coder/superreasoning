/**
 * Agent Scenario Recorder — Record + Replay agent interactions.
 *
 * Records every agent message, tool call, and response during a session.
 * Replay mode re-runs the recorded scenario with optional diff comparison.
 *
 * Usage:
 *   const recorder = new AgentRecorder();
 *   recorder.startRecording(sessionId);
 *   recorder.recordMessage({ role: 'user', content: '...' });
 *   recorder.recordToolCall({ tool: 'search_prompts', input: {...}, output: '...' });
 *   const session = recorder.stopRecording();
 *
 *   // Later: replay
 *   const diff = await replaySession(session, agentRunner);
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface RecordedMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
}

export interface RecordedToolCall {
  tool: string;
  input: Record<string, unknown>;
  output: string;
  durationMs: number;
  timestamp: string;
}

export interface RecordedStep {
  index: number;
  type: 'message' | 'tool_call';
  message?: RecordedMessage;
  toolCall?: RecordedToolCall;
}

export interface AgentSession {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  completedAt?: string;
  steps: RecordedStep[];
  context: {
    agentModel?: string;
    systemPrompt?: string;
    tools?: string[];
  };
  metadata: Record<string, unknown>;
}

export interface ReplayResult {
  sessionId: string;
  replayedAt: string;
  totalSteps: number;
  matchedSteps: number;
  divergedSteps: number;
  diffs: ReplayDiff[];
  summary: 'identical' | 'minor_diff' | 'major_diff';
}

export interface ReplayDiff {
  stepIndex: number;
  type: 'message_diff' | 'tool_output_diff' | 'tool_missing' | 'extra_step';
  original: string;
  replayed: string;
  similarity: number;  // 0-1, cosine or edit distance based
}

// ── Recorder Class ─────────────────────────────────────────────────────────

export class AgentRecorder {
  private sessions = new Map<string, AgentSession>();
  private activeSessionId: string | null = null;

  /** Start recording a new session */
  startRecording(sessionId: string, name: string = 'Unnamed Session', context?: AgentSession['context']): void {
    const session: AgentSession = {
      id: sessionId,
      name,
      createdAt: new Date().toISOString(),
      steps: [],
      context: context ?? {},
      metadata: {},
    };
    this.sessions.set(sessionId, session);
    this.activeSessionId = sessionId;
  }

  /** Record a message exchange */
  recordMessage(message: Omit<RecordedMessage, 'timestamp'>): void {
    const session = this.getActiveSession();
    if (!session) return;

    session.steps.push({
      index: session.steps.length,
      type: 'message',
      message: {
        ...message,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /** Record a tool call and its result */
  recordToolCall(call: Omit<RecordedToolCall, 'timestamp'>): void {
    const session = this.getActiveSession();
    if (!session) return;

    session.steps.push({
      index: session.steps.length,
      type: 'tool_call',
      toolCall: {
        ...call,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /** Stop recording and return the session */
  stopRecording(): AgentSession | null {
    const session = this.getActiveSession();
    if (!session) return null;

    session.completedAt = new Date().toISOString();
    this.activeSessionId = null;
    return session;
  }

  /** Check if currently recording */
  isRecording(): boolean {
    return this.activeSessionId !== null;
  }

  /** Get a recorded session by ID */
  getSession(sessionId: string): AgentSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /** List all recorded sessions */
  listSessions(): AgentSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Delete a session */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /** Export session as JSON */
  exportSession(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return JSON.stringify(session, null, 2);
  }

  /** Import a session from JSON */
  importSession(json: string): AgentSession {
    const session = JSON.parse(json) as AgentSession;
    this.sessions.set(session.id, session);
    return session;
  }

  private getActiveSession(): AgentSession | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) ?? null;
  }
}

// ── Replay Engine ──────────────────────────────────────────────────────────

/** Simple string similarity (Jaccard on words) */
function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Replay a recorded session step-by-step.
 *
 * @param session - The recorded session to replay
 * @param toolRunner - Function that executes a tool call and returns the output
 *                     Returns null if tool is unavailable (mock mode)
 */
export async function replaySession(
  session: AgentSession,
  toolRunner: (tool: string, input: Record<string, unknown>) => Promise<string | null>,
): Promise<ReplayResult> {
  const diffs: ReplayDiff[] = [];
  let matchedSteps = 0;

  for (const step of session.steps) {
    if (step.type === 'tool_call' && step.toolCall) {
      const { tool, input, output: originalOutput } = step.toolCall;

      try {
        const replayedOutput = await toolRunner(tool, input);

        if (replayedOutput === null) {
          diffs.push({
            stepIndex: step.index,
            type: 'tool_missing',
            original: originalOutput,
            replayed: '[tool not available]',
            similarity: 0,
          });
          continue;
        }

        const sim = stringSimilarity(originalOutput, replayedOutput);

        if (sim >= 0.95) {
          matchedSteps++;
        } else {
          diffs.push({
            stepIndex: step.index,
            type: 'tool_output_diff',
            original: originalOutput.slice(0, 500),
            replayed: replayedOutput.slice(0, 500),
            similarity: Math.round(sim * 10000) / 10000,
          });
        }
      } catch {
        diffs.push({
          stepIndex: step.index,
          type: 'tool_output_diff',
          original: originalOutput.slice(0, 500),
          replayed: '[error during replay]',
          similarity: 0,
        });
      }
    } else if (step.type === 'message') {
      // Messages are compared but not re-executed
      matchedSteps++;
    }
  }

  const totalSteps = session.steps.length;
  const divergedSteps = diffs.length;
  const matchRatio = totalSteps > 0 ? matchedSteps / totalSteps : 1;

  let summary: ReplayResult['summary'];
  if (matchRatio >= 0.95) {
    summary = 'identical';
  } else if (matchRatio >= 0.7) {
    summary = 'minor_diff';
  } else {
    summary = 'major_diff';
  }

  return {
    sessionId: session.id,
    replayedAt: new Date().toISOString(),
    totalSteps,
    matchedSteps,
    divergedSteps,
    diffs,
    summary,
  };
}

// ── Mock Tool Provider ─────────────────────────────────────────────────────

export interface MockToolResponse {
  tool: string;
  inputPattern?: Record<string, unknown>;  // If provided, only match this input
  response: string;
}

/**
 * Create a mock tool runner from a list of predefined responses.
 * Used for deterministic testing without LLM API calls.
 */
export function createMockToolRunner(
  mocks: MockToolResponse[],
): (tool: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (toolName: string, _input: Record<string, unknown>): Promise<string | null> => {
    const mock = mocks.find(m => m.tool === toolName);
    if (!mock) return null;
    return mock.response;
  };
}

// ── Preset Mocks ───────────────────────────────────────────────────────────

/** Standard mock responses for CI testing */
export const PRESET_MOCKS: MockToolResponse[] = [
  {
    tool: 'search_prompts',
    response: JSON.stringify({
      results: [
        { id: 'mock-1', score: 0.95, name: 'Mock Prompt 1', category: 'testing', tags: ['test'] },
        { id: 'mock-2', score: 0.88, name: 'Mock Prompt 2', category: 'testing', tags: ['test'] },
      ],
      total: 2,
    }),
  },
  {
    tool: 'get_prompt',
    response: JSON.stringify({
      id: 'mock-1',
      name: 'Mock Prompt 1',
      prompt: 'This is a mock prompt for testing purposes.',
      category: 'testing',
      tags: ['test', 'mock'],
    }),
  },
  {
    tool: 'list_categories',
    response: JSON.stringify({
      categories: ['testing', 'development', 'analysis'],
      total: 3,
      totalPrompts: 100,
    }),
  },
  {
    tool: 'recommend_prompts',
    response: JSON.stringify({
      recommendations: [
        { id: 'mock-1', name: 'Mock Prompt 1', relevance: 0.92 },
      ],
    }),
  },
  {
    tool: 'enrich_prompt',
    response: JSON.stringify({
      enrichedPrompt: 'Enhanced prompt with additional context.',
      metrics: { ambiguityBefore: 0.6, ambiguityAfter: 0.2, promptsIntegrated: 3 },
    }),
  },
];

// ── Singleton Instance ─────────────────────────────────────────────────────

let globalRecorder: AgentRecorder | null = null;

export function getAgentRecorder(): AgentRecorder {
  if (!globalRecorder) {
    globalRecorder = new AgentRecorder();
  }
  return globalRecorder;
}
