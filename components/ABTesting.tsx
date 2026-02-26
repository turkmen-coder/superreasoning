/**
 * A/B Testing — Compare two prompts with the same input and measure success.
 */
import { useState, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { generateMasterPromptUnified, type ClientProvider } from '../services/unifiedProviderService';
import { Framework } from '../src/types';

interface TestResult {
  id: string;
  promptA: string;
  promptB: string;
  input: string;
  outputA: string;
  outputB: string;
  metricsA?: { clarity: number; specificity: number; structure: number };
  metricsB?: { clarity: number; specificity: number; structure: number };
  winner?: 'A' | 'B' | 'tie';
  createdAt: string;
}

interface Props {
  onComplete?: (result: TestResult) => void;
}

export default function ABTesting({ onComplete }: Props) {
  const { t } = useTranslation();

  const [promptA, setPromptA] = useState('');
  const [promptB, setPromptB] = useState('');
  const [testInput, setTestInput] = useState('');
  const [provider, setProvider] = useState<ClientProvider>('auto');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [currentResult, setCurrentResult] = useState<TestResult | null>(null);
  const [autoRun, setAutoRun] = useState(true);

  const runTest = useCallback(async () => {
    if (!promptA || !promptB || !testInput) return;

    setLoading(true);
    try {
      const [resultA, resultB] = await Promise.all([
        generateMasterPromptUnified(provider, {
          intent: promptA,
          framework: Framework.AUTO,
          domainId: 'general',
          useSearch: false,
          thinkingMode: false,
          language: 'tr',
          localizedRules: ''
        }),
        generateMasterPromptUnified(provider, {
          intent: promptB,
          framework: Framework.AUTO,
          domainId: 'general',
          useSearch: false,
          thinkingMode: false,
          language: 'tr',
          localizedRules: ''
        })
      ]);

      const testResult: TestResult = {
        id: Math.random().toString(36).substring(7),
        promptA,
        promptB,
        input: testInput,
        outputA: resultA.response.masterPrompt || '',
        outputB: resultB.response.masterPrompt || '',
        createdAt: new Date().toISOString(),
      };

      setCurrentResult(testResult);
      setResults(prev => [testResult, ...prev]);
      onComplete?.(testResult);
    } catch (error) {
      console.error('A/B Test error:', error);
    } finally {
      setLoading(false);
    }
  }, [promptA, promptB, testInput, provider, onComplete]);

  const selectWinner = (winner: 'A' | 'B' | 'tie') => {
    if (!currentResult) return;
    const updated = { ...currentResult, winner };
    setCurrentResult(updated);
    setResults(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const clearResults = () => {
    setResults([]);
    setCurrentResult(null);
  };

  return (
    <div className="text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-display text-cyber-primary">
            {t.ui.abTestTitle}
          </h1>
          <p className="text-gray-400 mt-1">
            {t.ui.abTestDesc}
          </p>
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Prompt A */}
          <div className="glass-card p-4 !border-red-500/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold font-display text-red-400">Prompt A</h3>
              <span className="text-xs text-gray-500">{promptA.length} chars</span>
            </div>
            <textarea
              value={promptA}
              onChange={(e) => setPromptA(e.target.value)}
              placeholder={t.ui.abTestPromptAPlaceholder}
              className="w-full h-40 px-3 py-2 glass-input text-sm placeholder-gray-500 focus:border-red-500 resize-none"
            />
          </div>

          {/* Test Input */}
          <div className="glass-card p-4 !border-cyber-primary/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold font-display text-cyber-primary">
                {t.ui.abTestInputLabel}
              </h3>
            </div>
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder={t.ui.abTestInputPlaceholder}
              className="w-full h-40 px-3 py-2 glass-input text-sm placeholder-gray-500 focus:border-cyber-primary resize-none"
            />

            <div className="mt-4">
              <label className="block text-xs text-gray-400 mb-2">
                {t.ui.abTestModelLabel}
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as ClientProvider)}
                className="w-full px-3 py-2 glass-input text-sm"
              >
                <option value="auto">Auto</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Claude</option>
                <option value="gemini">Gemini</option>
                <option value="deepseek">DeepSeek</option>
                <option value="groq">Groq</option>
              </select>
            </div>

            <button
              onClick={runTest}
              disabled={!promptA || !promptB || !testInput || loading}
              className="w-full mt-4 px-4 py-3 bg-cyber-primary text-black font-semibold font-display rounded-lg hover:bg-cyber-primary/80 shadow-neon-cyan disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? t.ui.abTestBtnLoading : t.ui.abTestBtn}
            </button>
          </div>

          {/* Prompt B */}
          <div className="glass-card p-4 !border-blue-500/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold font-display text-blue-400">Prompt B</h3>
              <span className="text-xs text-gray-500">{promptB.length} chars</span>
            </div>
            <textarea
              value={promptB}
              onChange={(e) => setPromptB(e.target.value)}
              placeholder={t.ui.abTestPromptBPlaceholder}
              className="w-full h-40 px-3 py-2 glass-input text-sm placeholder-gray-500 focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Results */}
        {currentResult && (
          <div className="glass-card p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-display text-white">
                {t.ui.abTestResults}
              </h2>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={autoRun}
                    onChange={(e) => setAutoRun(e.target.checked)}
                    className="w-4 h-4"
                  />
                  {t.ui.abTestAutoCompare}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Output A */}
              <div className={`p-4 rounded-lg border-2 ${currentResult.winner === 'A' ? 'border-green-500 bg-green-500/10' : 'border-red-500/30 bg-black/30'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-red-400">Prompt A</h4>
                  {currentResult.winner === 'A' && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                      {t.ui.abTestWinner}
                    </span>
                  )}
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap max-h-64 overflow-auto">
                  {currentResult.outputA}
                </pre>
              </div>

              {/* Output B */}
              <div className={`p-4 rounded-lg border-2 ${currentResult.winner === 'B' ? 'border-green-500 bg-green-500/10' : 'border-blue-500/30 bg-black/30'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-blue-400">Prompt B</h4>
                  {currentResult.winner === 'B' && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                      {t.ui.abTestWinner}
                    </span>
                  )}
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap max-h-64 overflow-auto">
                  {currentResult.outputB}
                </pre>
              </div>
            </div>

            {/* Winner Selection */}
            {!currentResult.winner && (
              <div className="mt-6 pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-3">
                  {t.ui.abTestQuestion}
                </p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => selectWinner('A')}
                    className="px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    Prompt A
                  </button>
                  <button
                    onClick={() => selectWinner('tie')}
                    className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    {t.ui.abTestTie}
                  </button>
                  <button
                    onClick={() => selectWinner('B')}
                    className="px-6 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    Prompt B
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {results.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-display text-white">
                {t.ui.abTestHistory} ({results.length})
              </h2>
              <button
                onClick={clearResults}
                className="text-sm text-gray-400 hover:text-white"
              >
                {t.ui.abTestClear}
              </button>
            </div>

            <div className="space-y-3">
              {results.map((result) => (
                <div
                  key={result.id}
                  onClick={() => setCurrentResult(result)}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${
                    currentResult?.id === result.id
                      ? 'bg-cyber-primary/20 border border-cyber-primary/50'
                      : 'bg-black/30 hover:bg-black/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      {new Date(result.createdAt).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                      {result.winner === 'A' && <span className="text-red-400">A</span>}
                      {result.winner === 'B' && <span className="text-blue-400">B</span>}
                      {result.winner === 'tie' && <span className="text-gray-400">=</span>}
                      {!result.winner && <span className="text-gray-500">?</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
