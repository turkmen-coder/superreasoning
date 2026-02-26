// MasterPrompt.Developer - Core Optimization Service V2
// Client-side multi-round optimization orchestrator
// V2: INP, convergence detection, retry/backoff, improved scoring

import { GoogleGenAI } from '@google/genai';
import type {
  OptimizationInput,
  OptimizationOutput,
  OptimizationRound,
  OptimizationSession,
  OptimizationChange,
  OptimizerProvider,
  WebVitalsMetrics,
  BundleMetrics,
  TypeScriptMetrics,
  BackendMetrics,
  FrontendLang,
  BackendLang,
} from '../types/optimizer';
import { SCORE_WEIGHTS, SCORE_WEIGHTS_WITH_BACKEND, CWV_THRESHOLDS, CONVERGENCE_THRESHOLD } from '../types/optimizer';
import { analyzeWebVitals, analyzeBundleMetrics, analyzeTypeScript, analyzeBackendCode } from './webVitalsAnalyzer';
import {
  getOptimizerSystemInstruction,
  getRoundRefinementPrompt,
  OPTIMIZER_FUNCTION_DEFS,
} from './optimizerPrompts';

type Language = 'tr' | 'en';

// --- API Key Helpers ---

function getGeminiKey(): string {
  const key =
    (typeof process !== 'undefined' && (process.env?.GEMINI_API_KEY || process.env?.API_KEY)) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY);
  if (!key) throw new Error('Gemini API key not configured');
  return String(key);
}

function getDeepSeekKey(): string {
  const key =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DEEPSEEK_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.DEEPSEEK_API_KEY);
  if (!key) throw new Error('DeepSeek API key not configured');
  return String(key);
}

function getOpenAIKey(): string {
  const key =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.OPENAI_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY);
  if (!key) throw new Error('OpenAI API key not configured');
  return String(key);
}

// --- Composite Score (V2: Lighthouse-inspired log-normal approach) ---

function logNormalScore(value: number, median: number): number {
  // Simplified log-normal CDF-based scoring (Lighthouse-style)
  if (value <= 0) return 100;
  const ratio = value / median;
  if (ratio <= 0.5) return 100;
  if (ratio >= 3) return 0;
  // Smooth curve between 0.5x and 3x of median
  return Math.round(100 * Math.exp(-0.5 * Math.pow(Math.log(ratio), 2)));
}

export function computeCompositeScore(
  webVitals: WebVitalsMetrics,
  bundle: BundleMetrics,
  typescript: TypeScriptMetrics,
  backendMetrics?: BackendMetrics,
): number {
  // Web Vitals score (0-100) - Lighthouse-style log-normal scoring
  const lcpScore = logNormalScore(webVitals.lcp, CWV_THRESHOLDS.lcp);
  const inpScore = logNormalScore(webVitals.inp, CWV_THRESHOLDS.inp);
  const clsScore = logNormalScore(webVitals.cls * 1000, CWV_THRESHOLDS.cls * 1000);
  // LCP weighted heaviest (Google weighting: LCP 25%, INP 30%, CLS 25%)
  const cwvScore = lcpScore * 0.30 + inpScore * 0.40 + clsScore * 0.30;

  // Bundle score (0-100) - based on reduction and optimization indicators
  const reductionScore = Math.min(50, bundle.reductionPercent);
  const lazyScore = Math.min(25, bundle.lazyLoadedCount * 8);
  const treeShakeScore = bundle.treeShaken.length === 0 ? 25 : Math.max(0, 25 - bundle.treeShaken.length * 8);
  const bundleScore = reductionScore + lazyScore + treeShakeScore;

  // TypeScript score (0-100)
  const tsScore = typescript.strictModeCompliant
    ? 100
    : Math.max(0, 100 - typescript.anyUsageCount * 15 - typescript.issues.length * 5);

  // Clean architecture score (0-100)
  const barrelPenalty = bundle.barrelImports.length * 10;
  const archScore = Math.min(100, Math.max(0,
    (bundle.chunksCount > 3 ? 30 : 10) +
    (bundle.lazyLoadedCount > 0 ? 30 : 0) +
    (typescript.interfacesCount > 0 ? 20 : 0) +
    (bundle.treeShaken.length === 0 ? 20 : 0) -
    barrelPenalty
  ));

  // Use backend-inclusive weights when backend metrics are present
  if (backendMetrics) {
    const w = SCORE_WEIGHTS_WITH_BACKEND;
    const backendScore = backendMetrics.score;
    return Math.round(
      cwvScore * w.webVitals +
      bundleScore * w.bundle +
      tsScore * w.typescript +
      archScore * w.cleanArchitecture +
      backendScore * w.backend
    );
  }

  return Math.round(
    cwvScore * SCORE_WEIGHTS.webVitals +
    bundleScore * SCORE_WEIGHTS.bundle +
    tsScore * SCORE_WEIGHTS.typescript +
    archScore * SCORE_WEIGHTS.cleanArchitecture
  );
}

// --- Baseline analysis (pre-optimization snapshot) ---

export interface BaselineSnapshot {
  webVitals: WebVitalsMetrics;
  bundle: BundleMetrics;
  typescript: TypeScriptMetrics;
  score: number;
}

export function getBaselineSnapshot(input: OptimizationInput): BaselineSnapshot | null {
  const err = validateInput(input);
  if (err) return null;
  const webVitals = analyzeWebVitals(input.components);
  const bundle = analyzeBundleMetrics(input);
  const typescript = analyzeTypeScript(input.components);
  const score = computeCompositeScore(webVitals, bundle, typescript);
  return { webVitals, bundle, typescript, score };
}

// --- Retry with Exponential Backoff ---

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// --- AI Provider Calls ---

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = new GoogleGenAI({ apiKey: getGeminiKey() });
  const result = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0,
    },
  });
  return result.text || '';
}

async function callDeepSeek(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.deepseek.com/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getDeepSeekKey(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const blocks = data.content || [];
  return blocks.map((b: { type: string; text?: string }) => b.text || '').join('');
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getOpenAIKey()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 8192,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: OPTIMIZER_FUNCTION_DEFS.map(fn => ({
        type: 'function',
        function: fn,
      })),
      tool_choice: 'auto',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const msg = data.choices?.[0]?.message;

  // If function calling was used, reconstruct the output from tool calls
  if (msg?.tool_calls?.length) {
    const results: Record<string, unknown> = {};
    for (const call of msg.tool_calls) {
      try {
        results[call.function.name] = JSON.parse(call.function.arguments);
      } catch {
        // skip malformed tool call
      }
    }
    return JSON.stringify(results);
  }

  return msg?.content || '';
}

async function callProvider(
  provider: OptimizerProvider,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  return withRetry(() => {
    switch (provider) {
      case 'gemini': return callGemini(systemPrompt, userPrompt);
      case 'deepseek': return callDeepSeek(systemPrompt, userPrompt);
      case 'openai': return callOpenAI(systemPrompt, userPrompt);
      default: throw new Error(`Unknown provider: ${provider}`);
    }
  });
}

// --- Response Parsing ---

function parseOptimizationResponse(raw: string): {
  output: OptimizationOutput;
  changes: OptimizationChange[];
} {
  // Try to extract JSON from the response
  let jsonStr = raw.trim();

  // Strip markdown code fences if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // If it starts with { try direct parse, otherwise find first {
  if (!jsonStr.startsWith('{')) {
    const idx = jsonStr.indexOf('{');
    if (idx >= 0) jsonStr = jsonStr.slice(idx);
  }

  // Find the last closing brace
  const lastBrace = jsonStr.lastIndexOf('}');
  if (lastBrace >= 0) {
    jsonStr = jsonStr.slice(0, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // Handle OpenAI function call format
    if (parsed.optimize_component && !parsed.components) {
      const comp = parsed.optimize_component;
      return {
        output: {
          components: [{
            name: comp.name || 'Optimized',
            dependencies: comp.dependencies || [],
            code: comp.optimizedCode || comp.code || '',
            optimizations: comp.optimizations || [],
          }],
          folderStructure: parsed.update_folder_structure?.structure || {},
        },
        changes: [],
      };
    }

    const components = (parsed.components || []).map((c: any) => ({
      name: String(c.name || ''),
      dependencies: Array.isArray(c.dependencies) ? c.dependencies.map(String) : [],
      code: String(c.code || c.optimizedCode || ''),
      optimizations: Array.isArray(c.optimizations) ? c.optimizations.map(String) : [],
    }));

    const changes: OptimizationChange[] = (parsed.changes || []).map((ch: any) => ({
      type: ch.type || 'cwv-optimization',
      description: String(ch.description || ''),
      descriptionTr: String(ch.descriptionTr || ch.description || ''),
      file: String(ch.file || ''),
      before: String(ch.before || ''),
      after: String(ch.after || ''),
      impact: ch.impact || 'medium',
    }));

    return {
      output: {
        components,
        folderStructure: parsed.folderStructure || {},
      },
      changes,
    };
  } catch {
    throw new Error('Failed to parse AI response as JSON. Raw response: ' + raw.slice(0, 200));
  }
}

// --- Input Validation ---

function validateInput(input: OptimizationInput): string | null {
  if (!input.components || !Array.isArray(input.components) || input.components.length === 0) {
    return 'Input must have at least one component';
  }
  for (const comp of input.components) {
    if (!comp.name) return 'Each component must have a name';
    if (!comp.code) return `Component "${comp.name}" must have code`;
    if (!Array.isArray(comp.dependencies)) return `Component "${comp.name}" dependencies must be an array`;
  }
  if (!input.folderStructure || typeof input.folderStructure !== 'object') {
    return 'Input must have a folderStructure object';
  }
  return null;
}

// --- Main Optimization Pipeline ---

export interface OptimizeOptions {
  input: OptimizationInput;
  provider: OptimizerProvider;
  maxRounds: number;
  language: Language;
  frontendLang?: FrontendLang;
  backendLang?: BackendLang;
  onRoundComplete?: (round: OptimizationRound) => void;
  onStatusChange?: (status: string) => void;
}

// --- Language Detection from Raw Code ---

export interface DetectedLanguage {
  frontendLang?: FrontendLang;
  backendLang?: BackendLang;
  detectedName: string;
}

export function detectLanguageFromCode(code: string): DetectedLanguage {
  const c = code.trim();

  // Assembly (x86/ARM) — check early, very distinctive
  if (
    /\bsection\s+\.\w+/i.test(c) ||
    /\b(mov|push|pop|syscall|int\s+0x)\b/i.test(c) ||
    /%(r|e)(ax|bx|cx|dx|sp|bp|si|di)\b/.test(c) ||
    /\b(db|dw|dd|dq)\b/.test(c) ||
    /\.(global|text|data|bss)\b/.test(c) ||
    /\b(bl|bx\s+lr|ldr|str)\b/.test(c)
  ) {
    return { backendLang: 'assembly', detectedName: 'Assembly' };
  }

  // Rust
  if (/\bfn\s+main\s*\(/.test(c) || /\blet\s+mut\b/.test(c) || /\bimpl\b/.test(c) || /\bpub\s+fn\b/.test(c) || /::new\(\)/.test(c)) {
    return { backendLang: 'rust', detectedName: 'Rust' };
  }

  // Go
  if (/\bpackage\s+main\b/.test(c) || /\bfunc\s+main\s*\(/.test(c) || /\bfmt\./.test(c) || /\bgo\s+func\b/.test(c)) {
    return { backendLang: 'go', detectedName: 'Go' };
  }

  // Kotlin
  if (/\bfun\s+main\b/.test(c) || /\bdata\s+class\b/.test(c) || (/\bval\s+/.test(c) && /\bprintln\s*\(/.test(c))) {
    return { backendLang: 'kotlin', detectedName: 'Kotlin' };
  }

  // Swift
  if (/\bimport\s+Foundation\b/.test(c) || /\bguard\s+let\b/.test(c) || (/\bfunc\s+/.test(c) && /\b(var|let)\s+\w+\s*:/.test(c) && !/\bval\s+/.test(c))) {
    return { backendLang: 'swift', detectedName: 'Swift' };
  }

  // Java
  if (/\bpublic\s+class\b/.test(c) || /\bSystem\.out\.print/.test(c) || /\bpublic\s+static\s+void\s+main\b/.test(c)) {
    return { backendLang: 'java', detectedName: 'Java' };
  }

  // C# / .NET
  if (/\busing\s+System\b/.test(c) || /\bnamespace\s+\w+/.test(c) && /\bclass\s+\w+/.test(c) && /\bConsole\.Write/.test(c)) {
    return { backendLang: 'csharp', detectedName: 'C#' };
  }

  // Scala
  if (/\bobject\s+\w+/.test(c) && /\bdef\s+main\b/.test(c) || /\bval\s+/.test(c) && /\bprintln\s*\(/.test(c) && /\bcase\s+class\b/.test(c)) {
    return { backendLang: 'scala', detectedName: 'Scala' };
  }

  // Elixir
  if (/\bdefmodule\b/.test(c) || /\bdef\s+\w+.*\bdo\b/.test(c) && /\|>/.test(c)) {
    return { backendLang: 'elixir', detectedName: 'Elixir' };
  }

  // Haskell
  if (/\bmodule\s+\w+/.test(c) && /\bwhere\b/.test(c) || /\bmain\s*::\s*IO\b/.test(c) || /\b(putStrLn|getLine)\b/.test(c)) {
    return { backendLang: 'haskell', detectedName: 'Haskell' };
  }

  // Dart/Flutter
  if (/\bimport\s+'package:flutter\//.test(c) || /\bWidget\s+build\b/.test(c) || /\bvoid\s+main\s*\(\)/.test(c) && /\bStatelessWidget\b/.test(c)) {
    return { backendLang: 'dart', detectedName: 'Dart' };
  }

  // R
  if (/\blibrary\s*\(/.test(c) && /\b<-\s+function\b/.test(c) || /\bggplot\s*\(/.test(c) || /\bdata\.frame\s*\(/.test(c)) {
    return { backendLang: 'r', detectedName: 'R' };
  }

  // Lua
  if (/\bfunction\s+\w+\s*\(.*\)\s*\n/.test(c) && /\bend\b/.test(c) && /\blocal\s+/.test(c)) {
    return { backendLang: 'lua', detectedName: 'Lua' };
  }

  // Perl
  if (/^#!.*perl/m.test(c) || /\buse\s+strict\b/.test(c) || /\$\w+\s*=/.test(c) && /\bsub\s+\w+/.test(c) && /\bmy\s+/.test(c)) {
    return { backendLang: 'perl', detectedName: 'Perl' };
  }

  // Zig
  if (/\bconst\s+std\s*=\s*@import\b/.test(c) || /\bpub\s+fn\b/.test(c) && /\b@import\b/.test(c)) {
    return { backendLang: 'zig', detectedName: 'Zig' };
  }

  // PHP
  if (/^<\?php/m.test(c) || /\$\w+\s*=/.test(c) && /\bfunction\s+\w+\s*\(/.test(c) && /\becho\b/.test(c)) {
    return { backendLang: 'php', detectedName: 'PHP' };
  }

  // Ruby
  if (/\brequire\s+'/.test(c) && /\bdef\s+\w+/.test(c) && /\bend\b/.test(c) || /\bputs\s+/.test(c) && /\bclass\s+\w+\s*<\s*\w+/.test(c)) {
    return { backendLang: 'ruby', detectedName: 'Ruby' };
  }

  // Python
  if (/\bdef\s+\w+\s*\(.*\)\s*:/.test(c) || /\bimport\s+\w+/.test(c) && /\bprint\s*\(/.test(c) || /\bself\.\w+/.test(c) || /^\s{4}\w+/m.test(c) && /\bif\s+__name__\s*==\s*['"]__main__['"]\s*:/.test(c)) {
    return { backendLang: 'python', detectedName: 'Python' };
  }

  // C++ (check before C)
  if (/#include\s*<iostream>/.test(c) || /\bstd::/.test(c) || /\bcout\s*<</.test(c) || /\btemplate\s*</.test(c) || /\bclass\s+\w+\s*\{/.test(c) && /#include/.test(c)) {
    return { backendLang: 'cpp', detectedName: 'C++' };
  }

  // C
  if (/#include\s*<std(io|lib|string)\.h>/.test(c) || /\bint\s+main\s*\(/.test(c) && /\bprintf\s*\(/.test(c) || /\bmalloc\s*\(/.test(c) || /\bvoid\s*\*/.test(c)) {
    return { backendLang: 'c', detectedName: 'C' };
  }

  // Vue (check before generic TS/React)
  if (/<template>/.test(c) || /<script\s+setup/.test(c) || /\bdefineComponent\b/.test(c)) {
    return { frontendLang: 'vue', detectedName: 'Vue' };
  }

  // Angular
  if (/@Component\s*\(\{/.test(c) || /@Injectable\b/.test(c) || /@NgModule\b/.test(c)) {
    return { frontendLang: 'angular', detectedName: 'Angular' };
  }

  // Svelte
  if (/<script[\s>]/.test(c) && /\$:/.test(c) || /\{#if\s/.test(c) || /\{#each\s/.test(c)) {
    return { frontendLang: 'svelte', detectedName: 'Svelte' };
  }

  // React/TypeScript (JSX + TS)
  if (/\bimport\s+React\b/.test(c) || /\buseState\b/.test(c) || /\buseEffect\b/.test(c) || /\bJSX\.Element\b/.test(c)) {
    if (/\binterface\s+\w+/.test(c) || /:\s*(string|number|boolean)\b/.test(c) || /\bReact\.FC\b/.test(c)) {
      return { frontendLang: 'react-ts', detectedName: 'React/TypeScript' };
    }
    return { frontendLang: 'react-js', detectedName: 'React/JavaScript' };
  }

  // Next.js
  if (/\bgetServerSideProps\b/.test(c) || /\bgetStaticProps\b/.test(c) || /\b(next\/router|next\/link|next\/image)\b/.test(c)) {
    return { frontendLang: 'nextjs', detectedName: 'Next.js' };
  }

  // Generic TypeScript (no React)
  if (/\binterface\s+\w+/.test(c) && /:\s*(string|number|boolean)\b/.test(c) || /\btype\s+\w+\s*=/.test(c)) {
    // Could be Deno or Node
    if (/\bDeno\.\w+/.test(c)) {
      return { backendLang: 'deno', detectedName: 'Deno' };
    }
    return { backendLang: 'node', detectedName: 'Node.js/TypeScript' };
  }

  // Node.js (plain JS with require/express/etc)
  if (/\brequire\s*\(/.test(c) && /\bmodule\.exports\b/.test(c) || /\bconst\s+express\s*=/.test(c) || /\bapp\.(get|post|listen)\s*\(/.test(c)) {
    return { backendLang: 'node', detectedName: 'Node.js' };
  }

  // HTML/CSS/JS fallback
  if (/<html[\s>]/i.test(c) || /<div[\s>]/i.test(c) && /<\/div>/i.test(c) || /<!DOCTYPE\s+html>/i.test(c)) {
    return { frontendLang: 'html-css-js', detectedName: 'HTML/CSS/JS' };
  }

  return { detectedName: '' };
}

// --- Wrap raw code into OptimizationInput JSON ---

export function wrapRawCodeAsInput(code: string): OptimizationInput {
  return {
    components: [{ name: 'Main', dependencies: [], code: code.trim() }],
    folderStructure: {},
  };
}

export async function runOptimization(options: OptimizeOptions): Promise<OptimizationSession> {
  const { input, provider, maxRounds, language, frontendLang, backendLang, onRoundComplete, onStatusChange } = options;

  // Validate
  const validationError = validateInput(input);
  if (validationError) {
    return {
      id: crypto.randomUUID(),
      startedAt: Date.now(),
      status: 'error',
      input,
      rounds: [],
      currentRound: 0,
      maxRounds,
      targetMetrics: {
        lcpThreshold: CWV_THRESHOLDS.lcp,
        inpThreshold: CWV_THRESHOLDS.inp,
        clsThreshold: CWV_THRESHOLDS.cls,
      },
      finalOutput: null,
      error: validationError,
      converged: false,
    };
  }

  const session: OptimizationSession = {
    id: crypto.randomUUID(),
    startedAt: Date.now(),
    status: 'analyzing',
    input,
    rounds: [],
    currentRound: 0,
    maxRounds: Math.min(5, Math.max(3, maxRounds)),
    targetMetrics: {
      lcpThreshold: CWV_THRESHOLDS.lcp,
      inpThreshold: CWV_THRESHOLDS.inp,
      clsThreshold: CWV_THRESHOLDS.cls,
    },
    finalOutput: null,
    error: null,
    converged: false,
  };

  const systemPrompt = getOptimizerSystemInstruction(language, frontendLang, backendLang);
  let currentInput = input;
  let previousScore = 0;

  try {
    for (let round = 1; round <= session.maxRounds; round++) {
      const roundStart = Date.now();
      onStatusChange?.(`Round ${round}/${session.maxRounds}`);

      // Build user prompt
      let userPrompt: string;
      if (round === 1) {
        userPrompt = `Optimize the following component architecture:\n\n${JSON.stringify(currentInput, null, 2)}`;
      } else {
        const prevRound = session.rounds[session.rounds.length - 1];
        const refinement = getRoundRefinementPrompt(
          round,
          prevRound.webVitals,
          prevRound.bundle,
          prevRound.typescript,
          language,
          prevRound.backendMetrics,
        );
        userPrompt = `${refinement}\n\nCurrent code:\n${JSON.stringify(currentInput, null, 2)}`;
      }

      // Call AI with retry
      const rawResponse = await callProvider(provider, systemPrompt, userPrompt);
      const { output, changes } = parseOptimizationResponse(rawResponse);

      // Analyze optimized code
      const webVitals = analyzeWebVitals(output.components);
      const bundle = analyzeBundleMetrics({ components: output.components, folderStructure: output.folderStructure });
      const typescript = analyzeTypeScript(output.components);

      // Analyze backend code if backend language is specified
      let backendMetricsResult: BackendMetrics | undefined;
      if (backendLang) {
        const allCode = output.components.map(c => c.code).join('\n');
        backendMetricsResult = analyzeBackendCode(allCode, backendLang);
      }

      // Compute bundle improvement vs original
      const originalBundle = analyzeBundleMetrics(input);
      const updatedBundle: BundleMetrics = {
        ...bundle,
        originalSizeKb: originalBundle.originalSizeKb,
        reductionPercent: originalBundle.originalSizeKb > 0
          ? Math.round((1 - bundle.optimizedSizeKb / originalBundle.originalSizeKb) * 100)
          : 0,
      };

      const score = computeCompositeScore(webVitals, updatedBundle, typescript, backendMetricsResult);
      const scoreImprovement = score - previousScore;

      const roundResult: OptimizationRound = {
        round,
        timestamp: Date.now(),
        durationMs: Date.now() - roundStart,
        webVitals,
        bundle: updatedBundle,
        typescript,
        backendMetrics: backendMetricsResult,
        changes,
        output,
        score,
        scoreImprovement,
        provider,
      };

      session.rounds = [...session.rounds, roundResult];
      session.currentRound = round;
      previousScore = score;
      onRoundComplete?.(roundResult);

      // Update input for next round
      currentInput = {
        components: output.components.map(c => ({
          name: c.name,
          dependencies: c.dependencies,
          code: c.code,
        })),
        folderStructure: output.folderStructure,
      };

      // Convergence detection: stop if improvement < threshold
      if (round >= 2 && Math.abs(scoreImprovement) < CONVERGENCE_THRESHOLD) {
        session.converged = true;
        break;
      }

      // Early stop if all CWV thresholds met and score is good
      if (webVitals.allPass && score >= 80) {
        break;
      }
    }

    // Set final output from last round
    const lastRound = session.rounds[session.rounds.length - 1];
    return {
      ...session,
      status: 'complete',
      finalOutput: lastRound?.output || null,
    };
  } catch (err) {
    return {
      ...session,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
