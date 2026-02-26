import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ToastSystem';
import { useTranslation } from '../i18n';

interface EvolutionGeneration {
  id: string;
  prompt: string;
  score: number;
  metrics: {
    clarity: number;
    specificity: number;
    structure: number;
    safety: number;
    reproducibility: number;
  };
  improvements: string[];
  timestamp: Date;
  generation: number;
  parent?: string;
}

interface EvolutionSession {
  id: string;
  originalPrompt: string;
  generations: EvolutionGeneration[];
  bestGeneration: EvolutionGeneration;
  improvements: string[];
  convergenceReached: boolean;
  totalGenerations: number;
  startTime: Date;
  endTime?: Date;
}

interface PromptEvolutionEngineProps {
  initialPrompt?: string;
  onEvolutionComplete?: (session: EvolutionSession) => void;
  maxGenerations?: number;
  convergenceThreshold?: number;
}

const PromptEvolutionEngine: React.FC<PromptEvolutionEngineProps> = ({
  initialPrompt = '',
  onEvolutionComplete,
  maxGenerations = 10,
  convergenceThreshold = 0.95
}) => {
  const { session: _session } = useAuth();
  const { addToast } = useToast();
  const { t, language } = useTranslation();

  const [prompt, setPrompt] = useState(initialPrompt);
  const [isEvolving, setIsEvolving] = useState(false);
  const [currentSession, setCurrentSession] = useState<EvolutionSession | null>(null);
  const [selectedGeneration, setSelectedGeneration] = useState<string | null>(null);
  const [evolutionStrategy, setEvolutionStrategy] = useState<'genetic' | 'iterative' | 'hybrid'>('hybrid');
  const [mutationRate, setMutationRate] = useState(0.3);
  const [elitismRate, setElitismRate] = useState(0.2);

  // Mock evolution algorithms
  const evaluatePrompt = useCallback(async (promptText: string): Promise<EvolutionGeneration['metrics']> => {
    // Simulate prompt evaluation - gerçek uygulamada Judge Ensemble V3 kullanılacak
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock scoring based on prompt characteristics
    const clarity = Math.min(10, promptText.length / 50 + Math.random() * 2);
    const specificity = Math.min(10, (promptText.match(/\b(specific|precise|exact|detailed)\b/gi) || []).length * 2 + Math.random() * 3);
    const structure = Math.min(10, (promptText.match(/(##|###|---|\n\n)/g) || []).length * 1.5 + Math.random() * 2);
    const safety = Math.min(10, 8 + Math.random() * 2); // Assume generally safe
    const reproducibility = Math.min(10, (promptText.match(/\b(step|process|follow|repeat)\b/gi) || []).length * 1.5 + Math.random() * 2);

    return {
      clarity,
      specificity,
      structure,
      safety,
      reproducibility
    };
  }, []);

  const calculateOverallScore = useCallback((metrics: EvolutionGeneration['metrics']): number => {
    const weights = {
      clarity: 0.25,
      specificity: 0.30,
      structure: 0.20,
      safety: 0.15,
      reproducibility: 0.10
    };

    return Object.entries(metrics).reduce((score, [key, value]) => {
      return score + (value * weights[key as keyof typeof weights]);
    }, 0);
  }, []);

  const mutatePrompt = useCallback(async (promptText: string, strategy: string): Promise<string> => {
    // Simulate prompt mutation - gerçek uygulamada LLM kullanılacak
    await new Promise(resolve => setTimeout(resolve, 1200));

    const mutations = {
      genetic: [
        // Add specific examples
        () => promptText + '\n\nExample: [Specific example of desired output]',
        // Enhance structure
        () => promptText.replace(/^(.+)/m, '## $1'),
        // Add constraints
        () => promptText + '\n\nConstraints: Be specific, measurable, and actionable',
        // Refine language
        () => promptText.replace(/\b(good|better)\b/gi, 'optimal'),
        // Add context
        () => `Context: Professional environment\n\n${promptText}`
      ],
      iterative: [
        // Improve clarity
        () => promptText.replace(/\b(create|make)\b/gi, 'Generate a comprehensive'),
        // Add specificity
        () => promptText.replace(/\b(helpful|useful)\b/gi, 'actionable and practical'),
        // Enhance structure
        () => `${promptText}\n\n## Requirements\n## Deliverables\n## Success Criteria`,
        // Add constraints
        () => `${promptText}\n\nLimitations: Consider edge cases and error handling`
      ],
      hybrid: [
        // Combine multiple improvements
        () => {
          let improved = promptText;
          improved = improved.replace(/\b(create|make)\b/gi, 'Generate a comprehensive');
          improved = improved.replace(/^(.+)/m, '## $1');
          improved += '\n\n## Requirements\n## Deliverables\n## Success Criteria';
          return improved;
        }
      ]
    };

    const availableMutations = mutations[strategy as keyof typeof mutations] || mutations.hybrid;
    const mutationFn = availableMutations[Math.floor(Math.random() * availableMutations.length)];

    return mutationFn();
  }, []);

  const crossoverPrompts = useCallback((parent1: string, parent2: string): string => {
    // Simulate genetic crossover
    const lines1 = parent1.split('\n');
    const lines2 = parent2.split('\n');

    const crossoverPoint = Math.floor(Math.random() * Math.min(lines1.length, lines2.length));
    const child = [
      ...lines1.slice(0, crossoverPoint),
      ...lines2.slice(crossoverPoint)
    ].join('\n');

    return child;
  }, []);

  const runEvolution = useCallback(async () => {
    if (!prompt.trim()) {
      addToast(t.ui.evolutionNoPrompt, 'info');
      return;
    }

    setIsEvolving(true);

    try {
      const session: EvolutionSession = {
        id: Date.now().toString(),
        originalPrompt: prompt,
        generations: [],
        bestGeneration: {
          id: 'original',
          prompt,
          score: 0,
          metrics: await evaluatePrompt(prompt),
          improvements: [],
          timestamp: new Date(),
          generation: 0
        },
        improvements: [],
        convergenceReached: false,
        totalGenerations: 0,
        startTime: new Date()
      };

      // Initial evaluation
      const initialMetrics = await evaluatePrompt(prompt);
      const initialScore = calculateOverallScore(initialMetrics);
      session.bestGeneration.score = initialScore;
      session.bestGeneration.metrics = initialMetrics;

      // Evolution loop
      for (let generation = 1; generation <= maxGenerations; generation++) {
        const parentPopulation = session.generations.slice(-5); // Keep last 5 generations

        let newPrompt: string;
        let parentPrompt: string;

        if (Math.random() < mutationRate || parentPopulation.length < 2) {
          // Mutation
          parentPrompt = session.bestGeneration.prompt;
          newPrompt = await mutatePrompt(parentPrompt, evolutionStrategy);
        } else {
          // Crossover
          const parent1 = parentPopulation[Math.floor(Math.random() * parentPopulation.length)];
          const parent2 = parentPopulation[Math.floor(Math.random() * parentPopulation.length)];
          parentPrompt = parent1.prompt;
          newPrompt = crossoverPrompts(parent1.prompt, parent2.prompt);
        }

        // Evaluate new generation
        const metrics = await evaluatePrompt(newPrompt);
        const score = calculateOverallScore(metrics);

        const newGeneration: EvolutionGeneration = {
          id: `gen-${generation}`,
          prompt: newPrompt,
          score,
          metrics,
          improvements: [],
          timestamp: new Date(),
          generation,
          parent: parentPrompt
        };

        session.generations.push(newGeneration);
        session.totalGenerations++;

        // Update best generation
        if (score > session.bestGeneration.score) {
          const improvement = ((score - session.bestGeneration.score) / session.bestGeneration.score * 100).toFixed(1);
          newGeneration.improvements = [
            language === 'tr'
              ? `Skor artışı: %${improvement}%`
              : `Score improvement: %${improvement}%`
          ];

          session.bestGeneration = newGeneration;
          session.improvements.push(...newGeneration.improvements);
        }

        // Check convergence
        if (score >= convergenceThreshold * 10) {
          session.convergenceReached = true;
          break;
        }

        // Elitism: keep only top performers
        if (session.generations.length > 10) {
          session.generations.sort((a, b) => b.score - a.score);
          const eliteCount = Math.ceil(session.generations.length * elitismRate);
          session.generations = session.generations.slice(0, Math.max(eliteCount, 5));
        }

        // Small delay for UI updates
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      session.endTime = new Date();
      setCurrentSession(session);

      if (onEvolutionComplete) {
        onEvolutionComplete(session);
      }

      addToast(
        language === 'tr'
          ? `Evolüsyon tamamlandı: ${session.totalGenerations} nesil, en iyi skor: ${session.bestGeneration.score.toFixed(2)}`
          : `Evolution complete: ${session.totalGenerations} generations, best score: ${session.bestGeneration.score.toFixed(2)}`,
        'success'
      );

    } catch (error) {
      console.error('Evolution error:', error);
      addToast(t.ui.evolutionFailed, 'error');
    } finally {
      setIsEvolving(false);
    }
  }, [prompt, maxGenerations, convergenceThreshold, mutationRate, elitismRate, evolutionStrategy, evaluatePrompt, calculateOverallScore, mutatePrompt, crossoverPrompts, language, onEvolutionComplete, addToast]);

  const resetEvolution = useCallback(() => {
    setCurrentSession(null);
    setSelectedGeneration(null);
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  const exportSession = useCallback(() => {
    if (!currentSession) return;

    const exportData = {
      session: currentSession,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evolution-session-${currentSession.id}.json`;
    a.click();
    URL.revokeObjectURL(url);

    addToast(
      language === 'tr' ? 'Oturum dışa aktarıldı' : 'Session exported',
      'success'
    );
  }, [currentSession, language, addToast]);

  const getScoreColor = useCallback((score: number): string => {
    if (score >= 9) return 'text-green-400';
    if (score >= 7) return 'text-yellow-400';
    if (score >= 5) return 'text-orange-400';
    return 'text-red-400';
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-lg font-bold text-cyber-primary uppercase tracking-wider font-display">
          {t.ui.evolutionTitle}
        </h3>

        {currentSession && (
          <div className="flex gap-2">
            <button
              onClick={exportSession}
              className="px-3 py-1 bg-cyber-primary hover:bg-cyber-primary/80 text-cyber-black rounded font-mono text-xs"
            >
              {t.ui.evolutionExport}
            </button>
            <button
              onClick={resetEvolution}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded font-mono text-xs"
            >
              {t.ui.evolutionReset}
            </button>
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="glass-card p-6 space-y-4">
        <h4 className="font-mono text-sm font-bold text-cyber-primary uppercase tracking-wider font-display">
          {t.ui.evolutionSettingsTitle}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Strategy Selection */}
          <div>
            <label className="block text-cyber-primary text-xs font-mono uppercase mb-2">
              {t.ui.evolutionStrategy}
            </label>
            <select
              value={evolutionStrategy}
              onChange={(e) => setEvolutionStrategy(e.target.value as any)}
              className="glass-input w-full font-mono text-sm"
            >
              <option value="genetic">{t.ui.evolutionGenetic}</option>
              <option value="iterative">{t.ui.evolutionIterative}</option>
              <option value="hybrid">{t.ui.evolutionHybrid}</option>
            </select>
          </div>

          {/* Mutation Rate */}
          <div>
            <label className="block text-cyber-primary text-xs font-mono uppercase mb-2">
              {t.ui.evolutionMutationRate}: {(mutationRate * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.1"
              value={mutationRate}
              onChange={(e) => setMutationRate(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Elitism Rate */}
          <div>
            <label className="block text-cyber-primary text-xs font-mono uppercase mb-2">
              {t.ui.evolutionElitismRate}: {(elitismRate * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="0.5"
              step="0.1"
              value={elitismRate}
              onChange={(e) => setElitismRate(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Prompt Input */}
        <div>
          <label className="block text-cyber-primary text-xs font-mono uppercase mb-2">
            {t.ui.evolutionInitialPrompt}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t.ui.evolutionInitialPromptPlaceholder}
            className="glass-input w-full h-24 font-mono text-sm resize-none"
          />
        </div>

        {/* Start Button */}
        <button
          onClick={runEvolution}
          disabled={isEvolving || !prompt.trim()}
          className="w-full px-6 py-3 bg-cyber-primary hover:bg-cyber-primary/80 disabled:bg-cyber-primary/30 disabled:cursor-not-allowed text-cyber-black rounded font-mono text-sm uppercase tracking-wider transition-all"
        >
          {isEvolving ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-cyber-black border-t-transparent rounded-full animate-spin" />
              {t.ui.evolutionEvolving}
            </span>
          ) : (
            t.ui.evolutionStartBtn
          )}
        </button>
      </div>

      {/* Results */}
      {currentSession && (
        <div className="space-y-6">
          {/* Session Summary */}
          <div className="glass-card p-6">
            <h4 className="font-mono text-sm font-bold text-cyber-primary uppercase tracking-wider mb-4 font-display">
              {t.ui.evolutionSessionSummary}
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyber-primary font-mono">
                  {currentSession.totalGenerations}
                </div>
                <div className="text-cyber-primary/60 text-xs font-mono uppercase">
                  {t.ui.evolutionGenerations}
                </div>
              </div>

              <div className="text-center">
                <div className={`text-2xl font-bold font-mono ${getScoreColor(currentSession.bestGeneration.score)}`}>
                  {currentSession.bestGeneration.score.toFixed(2)}
                </div>
                <div className="text-cyber-primary/60 text-xs font-mono uppercase">
                  {t.ui.evolutionBestScore}
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-cyber-primary font-mono">
                  {currentSession.convergenceReached ? '✓' : '✗'}
                </div>
                <div className="text-cyber-primary/60 text-xs font-mono uppercase">
                  {t.ui.evolutionConvergence}
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-cyber-primary font-mono">
                  {Math.round((currentSession.endTime?.getTime() || Date.now()) - currentSession.startTime.getTime() / 1000)}s
                </div>
                <div className="text-cyber-primary/60 text-xs font-mono uppercase">
                  {t.ui.evolutionDuration}
                </div>
              </div>
            </div>
          </div>

          {/* Generations Timeline */}
          <div className="glass-card p-6">
            <h4 className="font-mono text-sm font-bold text-cyber-primary uppercase tracking-wider mb-4 font-display">
              {t.ui.evolutionTimeline}
            </h4>

            <div className="space-y-3">
              {currentSession.generations.map((gen, _index) => (
                <div
                  key={gen.id}
                  className={`border rounded p-4 cursor-pointer transition-all ${
                    selectedGeneration === gen.id
                      ? 'border-cyber-primary bg-cyber-primary/10'
                      : 'border-cyber-primary/30 hover:border-cyber-primary/50'
                  }`}
                  onClick={() => setSelectedGeneration(gen.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-cyber-primary font-mono text-sm">
                        {t.ui.evolutionGenLabel} {gen.generation}
                      </div>
                      {gen.parent && (
                        <div className="text-cyber-primary/40 text-xs font-mono">
                          {t.ui.evolutionParentLabel} {gen.parent.slice(0, 30)}...
                        </div>
                      )}
                    </div>

                    <div className={`font-bold font-mono ${getScoreColor(gen.score)}`}>
                      {gen.score.toFixed(2)}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {Object.entries(gen.metrics).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className="text-cyber-primary/60 text-xs font-mono uppercase">
                          {key.slice(0, 3)}
                        </div>
                        <div className="text-cyber-primary font-mono text-sm">
                          {value.toFixed(1)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Improvements */}
                  {gen.improvements.length > 0 && (
                    <div className="mt-2">
                      <div className="text-green-400 text-xs font-mono">
                        {gen.improvements.join(' • ')}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Best Generation Display */}
          <div className="glass-card p-6">
            <h4 className="font-mono text-sm font-bold text-cyber-primary uppercase tracking-wider mb-4 font-display">
              {t.ui.evolutionBestGeneration}
            </h4>
            <div className="bg-cyber-black border border-cyber-primary/30 rounded p-4">
              <pre className="text-cyber-primary font-mono text-sm whitespace-pre-wrap">
                {currentSession.bestGeneration.prompt}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptEvolutionEngine;
