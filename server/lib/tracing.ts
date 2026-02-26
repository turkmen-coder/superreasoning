/**
 * OpenTelemetry Tracing — Distributed tracing for Super Reasoning API.
 *
 * MUST be imported BEFORE any other module (especially Express).
 * Entry point: server/index.ts → import './lib/tracing';
 *
 * Exports span helpers for manual instrumentation in business logic.
 * Auto-instruments: Express HTTP, pg (PostgreSQL), fetch.
 *
 * Configuration (env vars):
 *   SR_OTEL_ENABLED   = "true" | "false" (default: "false")
 *   SR_OTEL_ENDPOINT  = OTLP collector URL (default: "http://localhost:4318/v1/traces")
 *   SR_OTEL_SERVICE   = Service name (default: "super-reasoning-api")
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import {
  trace,
  SpanStatusCode,
  type Span,
  type SpanOptions,
  type Tracer,
} from '@opentelemetry/api';

// ── Configuration ───────────────────────────────────────────────────────────

const OTEL_ENABLED = process.env.SR_OTEL_ENABLED === 'true';
const OTEL_ENDPOINT = process.env.SR_OTEL_ENDPOINT || 'http://localhost:4318/v1/traces';
const SERVICE_NAME = process.env.SR_OTEL_SERVICE || 'super-reasoning-api';
const SERVICE_VERSION = '3.2.0';

// ── SDK Initialization ──────────────────────────────────────────────────────

let sdk: NodeSDK | null = null;

if (OTEL_ENABLED) {
  const exporter = new OTLPTraceExporter({ url: OTEL_ENDPOINT });

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
    'deployment.environment': process.env.NODE_ENV || 'development',
  });

  sdk = new NodeSDK({
    resource,
    traceExporter: exporter as any,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable noisy fs instrumentation
        '@opentelemetry/instrumentation-fs': { enabled: false } as any,
      }),
    ],
  });

  sdk.start();
  console.info(`[OTel] Tracing enabled → ${OTEL_ENDPOINT}`);

  // Graceful shutdown
  const shutdown = async () => {
    try {
      await sdk?.shutdown();
      console.info('[OTel] Tracing shut down gracefully');
    } catch (err) {
      console.error('[OTel] Shutdown error:', err);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} else {
  console.info('[OTel] Tracing disabled (set SR_OTEL_ENABLED=true to enable)');
}

// ── Custom Tracer ───────────────────────────────────────────────────────────

const tracer: Tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION);

// ── Span Helpers ────────────────────────────────────────────────────────────

/**
 * Custom attributes used across Super Reasoning spans.
 */
export const SR_ATTRS = {
  PROVIDER: 'sr.provider',
  DOMAIN: 'sr.domain',
  FRAMEWORK: 'sr.framework',
  CACHE_HIT: 'sr.cache_hit',
  TOKEN_INPUT: 'sr.token.input',
  TOKEN_OUTPUT: 'sr.token.output',
  COST_USD: 'sr.cost_usd',
  JUDGE_SCORE: 'sr.judge_score',
  RISK_LEVEL: 'sr.risk_level',
  RUN_ID: 'sr.run_id',
  PROMPT_ID: 'sr.prompt_id',
} as const;

/**
 * Wrap an async function in a traced span.
 * Automatically records errors and sets span status.
 *
 * @example
 * const result = await withSpan('llm.generate', { attributes: { [SR_ATTRS.PROVIDER]: 'openai' } }, async (span) => {
 *   const output = await callLLM(prompt);
 *   span.setAttribute(SR_ATTRS.TOKEN_OUTPUT, output.tokens);
 *   return output;
 * });
 */
export async function withSpan<T>(
  name: string,
  optionsOrFn: SpanOptions | ((span: Span) => Promise<T>),
  maybeFn?: (span: Span) => Promise<T>,
): Promise<T> {
  const options: SpanOptions = typeof optionsOrFn === 'function' ? {} : optionsOrFn;
  const fn = typeof optionsOrFn === 'function' ? optionsOrFn : maybeFn!;

  return tracer.startActiveSpan(name, options, async (span: Span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Wrap a synchronous function in a traced span.
 */
export function withSpanSync<T>(
  name: string,
  optionsOrFn: SpanOptions | ((span: Span) => T),
  maybeFn?: (span: Span) => T,
): T {
  const options: SpanOptions = typeof optionsOrFn === 'function' ? {} : optionsOrFn;
  const fn = typeof optionsOrFn === 'function' ? optionsOrFn : maybeFn!;

  const span = tracer.startSpan(name, options);
  try {
    const result = fn(span);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Get the active tracer for creating manual spans.
 */
export function getTracer(): Tracer {
  return tracer;
}

/**
 * Check if OTel tracing is enabled.
 */
export function isTracingEnabled(): boolean {
  return OTEL_ENABLED;
}

export { SpanStatusCode } from '@opentelemetry/api';
export type { Span } from '@opentelemetry/api';
