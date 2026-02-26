/**
 * Agent Streaming UI
 *
 * Agent çalışırken ara adımları gerçek zamanlı gösteren UI bileşeni.
 * Progress bar, step detayları ve completion feedback içerir.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import type { StreamingStep } from '../types/agent';

interface AgentStreamingUIProps {
  steps: StreamingStep[];
  isRunning: boolean;
  onComplete?: (steps: StreamingStep[]) => void;
  onError?: (error: string) => void;
}

const STATUS_COLORS = {
  pending: 'text-gray-500 border-glass-border bg-glass-bg',
  in_progress: 'text-cyber-primary border-cyber-primary/50 bg-cyber-primary/10',
  completed: 'text-green-400 border-green-500/30 bg-green-500/10',
  error: 'text-red-400 border-red-500/30 bg-red-500/10',
};

const STATUS_ICONS = {
  pending: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
    </svg>
  ),
  in_progress: (
    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  completed: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

export default function AgentStreamingUI({ steps, isRunning, onComplete, onError }: AgentStreamingUIProps) {
  const { t } = useTranslation();
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  // Calculate overall progress
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalProgress = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

  // Auto-expand current step
  useEffect(() => {
    const currentStepIdx = steps.findIndex(s => s.status === 'in_progress');
    if (currentStepIdx >= 0) {
      setExpandedSteps(prev => new Set([...prev, currentStepIdx]));
    }
  }, [steps]);

  // Check for completion
  useEffect(() => {
    if (!isRunning && steps.length > 0 && steps.every(s => s.status === 'completed')) {
      onComplete?.(steps);
    }
    if (steps.some(s => s.status === 'error')) {
      const errorStep = steps.find(s => s.status === 'error');
      if (errorStep?.detail) {
        onError?.(errorStep.detail);
      }
    }
  }, [steps, isRunning, onComplete, onError]);

  const toggleStep = useCallback((idx: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  if (steps.length === 0) return null;

  return (
    <div className="glass-card-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className={`w-5 h-5 ${isRunning ? 'animate-pulse text-cyber-primary' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="font-mono text-sm font-semibold text-gray-300">
            {t.ui.agentStreamPipeline}
          </span>
          {isRunning && (
            <span className="text-xs text-cyber-primary animate-pulse">
              {t.ui.agentStreamRunning}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {completedSteps}/{steps.length}
          </span>
          <span className="text-sm font-mono text-cyber-primary">
            {totalProgress}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-cyber-primary to-cyber-accent transition-all duration-500 ease-out"
          style={{ width: `${totalProgress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, idx) => {
          const isExpanded = expandedSteps.has(idx);
          const statusColor = STATUS_COLORS[step.status];
          const StatusIcon = STATUS_ICONS[step.status];

          return (
            <div key={idx} className="glass-card overflow-hidden">
              {/* Step Header */}
              <button
                onClick={() => toggleStep(idx)}
                className={`w-full flex items-center justify-between px-3 py-2 ${statusColor} transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border border-current">
                    {step.status === 'in_progress' ? (
                      <span className="text-xs font-bold">{idx + 1}</span>
                    ) : (
                      StatusIcon
                    )}
                  </div>
                  <span className="font-mono text-sm">{step.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {step.progress !== undefined && step.status === 'in_progress' && (
                    <span className="text-xs opacity-70">{step.progress}%</span>
                  )}
                  <svg
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Step Detail */}
              {isExpanded && step.detail && (
                <div className="px-3 py-2 bg-black/30 border-t border-glass-border">
                  <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap break-words max-h-32 overflow-auto">
                    {step.detail}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion Message */}
      {!isRunning && steps.every(s => s.status === 'completed') && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-green-400 font-medium">
              {t.ui.agentStreamComplete}
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {steps.some(s => s.status === 'error') && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-400 font-medium">
              {t.ui.agentStreamError}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Hook for Streaming ----------

export function useAgentStreaming() {
  const [steps, setSteps] = useState<StreamingStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const startStreaming = useCallback((stepLabels: string[]) => {
    setSteps(stepLabels.map((label, idx) => ({
      step: idx + 1,
      total: stepLabels.length,
      status: 'pending' as const,
      label,
    })));
    setIsRunning(true);
  }, []);

  const updateStep = useCallback((stepIndex: number, status: StreamingStep['status'], detail?: string, progress?: number) => {
    setSteps(prev => {
      const next = [...prev];
      if (stepIndex >= 0 && stepIndex < next.length) {
        next[stepIndex] = {
          ...next[stepIndex],
          status,
          detail: detail ?? next[stepIndex].detail,
          progress: progress ?? next[stepIndex].progress,
        };
      }
      return next;
    });
  }, []);

  const completeStreaming = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetStreaming = useCallback(() => {
    setSteps([]);
    setIsRunning(false);
  }, []);

  return {
    steps,
    isRunning,
    startStreaming,
    updateStep,
    completeStreaming,
    resetStreaming,
  };
}
