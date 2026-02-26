/**
 * Auto-Prompt Benchmark Panel — v3.2
 * Üretilen prompt'u Judge + Lint + Budget ile otomatik test eder ve sonuçları gösterir.
 */
import { useState, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '../services/apiClient';
import { runQualitySuiteViaBrain } from '../services/brainClient';

interface BenchmarkResult {
  judgeScore: number | null;
  lintPassed: boolean | null;
  lintErrors: number;
  lintWarnings: number;
  tokenCount: number;
  costUsd: number;
  durationMs: number;
  provider: string;
  testPassed: boolean;
}

interface Props {
  masterPrompt: string;
  reasoning?: string;
  framework?: string;
  domainId?: string;
  provider?: string;
  agentMode?: boolean;
}

export default function BenchmarkPanel({ masterPrompt, reasoning, framework, domainId, provider, agentMode = false }: Props) {
  const { language } = useTranslation();
  const t = language === 'tr';
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [error, setError] = useState('');

  const runBenchmark = useCallback(async () => {
    if (!masterPrompt) return;
    setRunning(true);
    setError('');
    const startTime = Date.now();

    try {
      const quality = await runQualitySuiteViaBrain({
        masterPrompt,
        reasoning,
        inputText: masterPrompt,
        domainId: domainId || 'auto',
        framework: framework || 'AUTO',
        provider: provider || 'groq',
        language: t ? 'tr' : 'en',
      });

      const judgeRes = (quality?.judge && typeof quality.judge === 'object') ? quality.judge as Record<string, unknown> : null;
      const lintRes = (quality?.lint && typeof quality.lint === 'object') ? quality.lint as Record<string, unknown> : null;
      const budgetRes = (quality?.budget && typeof quality.budget === 'object') ? quality.budget as Record<string, unknown> : null;

      const durationMs = Date.now() - startTime;

      const judgeScore = typeof judgeRes?.totalScore === 'number' ? judgeRes.totalScore : null;
      const lintPassed = typeof lintRes?.passed === 'boolean' ? lintRes.passed : null;
      const lintErrors = typeof lintRes?.totalErrors === 'number' ? lintRes.totalErrors : 0;
      const lintWarnings = typeof lintRes?.totalWarnings === 'number' ? lintRes.totalWarnings : 0;
      const tokenCount = typeof budgetRes?.totalTokens === 'number' ? budgetRes.totalTokens : 0;
      const estimatedCost = (budgetRes?.estimatedCost && typeof budgetRes.estimatedCost === 'object')
        ? budgetRes.estimatedCost as Record<string, unknown>
        : null;
      const costUsd = typeof estimatedCost?.totalCostUsd === 'number' ? estimatedCost.totalCostUsd : 0;

      // Test: judge >= 65 && lint passed
      const testPassed = (judgeScore !== null ? judgeScore >= 65 : true) && (lintPassed !== null ? lintPassed : true);

      const benchmark: BenchmarkResult = {
        judgeScore, lintPassed, lintErrors, lintWarnings,
        tokenCount, costUsd, durationMs,
        provider: provider || 'groq', testPassed,
      };
      setResult(benchmark);

      // Save benchmark result
      try {
        const authHeaders = await getAuthHeaders();
        await fetch(`${API_BASE}/benchmarks`, {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: '1.0.0', provider: benchmark.provider,
            mode: agentMode ? 'agent' : 'standard',
            judge_score: benchmark.judgeScore, lint_passed: benchmark.lintPassed,
            lint_errors: benchmark.lintErrors, lint_warnings: benchmark.lintWarnings,
            token_count: benchmark.tokenCount, cost_usd: benchmark.costUsd,
            test_passed: benchmark.testPassed, duration_ms: benchmark.durationMs,
          }),
        });
      } catch { /* non-blocking */ }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Benchmark failed';
      setError(message);
    }
    setRunning(false);
  }, [masterPrompt, reasoning, framework, domainId, provider, agentMode, t]);

  const getScoreColor = (score: number) =>
    score >= 80 ? 'text-cyber-success' : score >= 65 ? 'text-amber-400' : 'text-red-400';

  const getScoreBar = (score: number) =>
    score >= 80 ? 'bg-cyber-success' : score >= 65 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="glass-card overflow-hidden" role="region" aria-label={t ? 'Benchmark' : 'Benchmark'}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-cyber-dark/30 transition-colors text-left"
        aria-expanded={expanded}
      >
        <h3 className="text-xs font-display font-bold uppercase tracking-wider text-gray-300">
          {t ? 'OTOMATİK BENCHMARK' : 'AUTO BENCHMARK'}
        </h3>
        <div className="flex items-center gap-2">
          {result && (
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              result.testPassed ? 'bg-cyber-success/20 text-cyber-success' : 'bg-red-500/20 text-red-400'
            }`}>
              {result.testPassed ? 'PASS' : 'FAIL'}
            </span>
          )}
          <span className="text-gray-500 text-xs">{expanded ? '▼' : '▶'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-glass-border p-3 space-y-3">
          {/* Run button */}
          <button
            onClick={runBenchmark}
            disabled={running || !masterPrompt}
            className="w-full text-[10px] font-mono font-bold py-2 rounded bg-cyber-accent/20 text-cyber-accent hover:bg-cyber-accent/30 border border-cyber-accent/30 disabled:opacity-40 transition-colors"
          >
            {running ? (
              <span className="animate-pulse">{t ? 'TEST EDİLİYOR...' : 'TESTING...'}</span>
            ) : (
              t ? 'BENCHMARK ÇALIŞTIR (Judge + Lint + Budget)' : 'RUN BENCHMARK (Judge + Lint + Budget)'
            )}
          </button>

          {error && <p className="text-red-400 text-[10px] font-mono">{error}</p>}

          {result && (
            <div className="space-y-3">
              {/* Score summary */}
              <div className="grid grid-cols-4 gap-2">
                {/* Judge Score */}
                <div className="text-center p-2 rounded glass-card">
                  <p className="text-[9px] font-mono text-gray-500 uppercase">{t ? 'Judge Puan' : 'Judge Score'}</p>
                  {result.judgeScore !== null ? (
                    <>
                      <p className={`text-lg font-mono font-bold ${getScoreColor(result.judgeScore)}`}>
                        {result.judgeScore}
                      </p>
                      <div className="w-full h-1 rounded-full bg-gray-800 mt-1">
                        <div className={`h-full rounded-full ${getScoreBar(result.judgeScore)} transition-all`}
                          style={{ width: `${result.judgeScore}%` }} />
                      </div>
                    </>
                  ) : (
                    <p className="text-lg font-mono text-gray-600">-</p>
                  )}
                </div>

                {/* Lint */}
                <div className="text-center p-2 rounded glass-card">
                  <p className="text-[9px] font-mono text-gray-500 uppercase">Lint</p>
                  <p className={`text-lg font-mono font-bold ${result.lintPassed ? 'text-cyber-success' : 'text-red-400'}`}>
                    {result.lintPassed ? 'OK' : 'FAIL'}
                  </p>
                  <p className="text-[9px] font-mono text-gray-600">
                    {result.lintErrors}E / {result.lintWarnings}W
                  </p>
                </div>

                {/* Tokens */}
                <div className="text-center p-2 rounded glass-card">
                  <p className="text-[9px] font-mono text-gray-500 uppercase">Tokens</p>
                  <p className="text-lg font-mono font-bold text-gray-300">{result.tokenCount.toLocaleString()}</p>
                  <p className="text-[9px] font-mono text-gray-600">${result.costUsd.toFixed(4)}</p>
                </div>

                {/* Speed */}
                <div className="text-center p-2 rounded glass-card">
                  <p className="text-[9px] font-mono text-gray-500 uppercase">{t ? 'Süre' : 'Time'}</p>
                  <p className="text-lg font-mono font-bold text-gray-300">{result.durationMs}</p>
                  <p className="text-[9px] font-mono text-gray-600">ms</p>
                </div>
              </div>

              {/* Overall verdict */}
              <div className={`text-center p-2 rounded border ${
                result.testPassed ? 'bg-cyber-success/10 border-cyber-success/30' : 'bg-red-500/10 border-red-500/30'
              }`}>
                <p className={`text-xs font-mono font-bold ${result.testPassed ? 'text-cyber-success' : 'text-red-400'}`}>
                  {result.testPassed
                    ? (t ? 'BENCHMARK BAŞARILI — Prompt kalitesi yeterli' : 'BENCHMARK PASSED — Prompt quality sufficient')
                    : (t ? 'BENCHMARK BAŞARISIZ — İyileştirme önerilir' : 'BENCHMARK FAILED — Improvement recommended')}
                </p>
              </div>
            </div>
          )}

          {!result && !running && (
            <p className="text-gray-600 text-[10px] font-mono text-center py-2">
              {t
                ? 'Prompt kalitesini Judge Ensemble V3, Lint ve Budget Optimizer ile otomatik test edin.'
                : 'Auto-test prompt quality with Judge Ensemble V3, Lint and Budget Optimizer.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
