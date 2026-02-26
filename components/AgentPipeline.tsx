import React from 'react';
import { useTranslation } from '../i18n';

interface AgentPipelineProps {
  activeStep?: number;
  loading?: boolean;
}

const PIPELINE_STEPS = [
  {
    id: 'prompt-gen',
    labelTr: 'Prompt Gen',
    labelEn: 'Prompt Gen',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
    color: 'cyber-primary',
  },
  {
    id: 'test-validation',
    labelTr: 'Test & Validation',
    labelEn: 'Test & Validation',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    color: 'cyber-success',
  },
  {
    id: 'refine',
    labelTr: 'Refine',
    labelEn: 'Refine',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
    color: 'cyber-accent',
  },
];

const AgentPipeline: React.FC<AgentPipelineProps> = ({ activeStep = -1, loading = false }) => {
  const { language } = useTranslation();

  return (
    <div>
      {/* Section Title */}
      <div className="flex items-center gap-2 mb-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <h3 className="font-mono text-xs font-bold text-gray-300 uppercase tracking-wider">
          {language === 'tr' ? 'Agent Zinciri' : 'Agent Chain'} (Pipeline)
        </h3>
      </div>

      {/* Pipeline Steps */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          {PIPELINE_STEPS.map((step, idx) => {
            const isActive = idx === activeStep;
            const isCompleted = idx < activeStep;
            const colorVar = step.color;

            return (
              <React.Fragment key={step.id}>
                {/* Step Node */}
                <div className="flex flex-col items-center gap-3 flex-1">
                  <div
                    className={`
                      w-14 h-14 rounded-lg border flex items-center justify-center transition-all duration-500
                      ${isActive
                        ? `border-${colorVar}/60 bg-${colorVar}/10 text-${colorVar} shadow-glow-primary-subtle`
                        : isCompleted
                          ? `border-${colorVar}/40 bg-${colorVar}/5 text-${colorVar}/70`
                          : 'border-cyber-border/40 bg-cyber-dark/40 text-gray-600'
                      }
                      ${isActive && loading ? 'animate-pulse' : ''}
                    `}
                    style={
                      isActive
                        ? { borderColor: `var(--color-${colorVar}, rgba(0,240,255,0.6))` }
                        : undefined
                    }
                  >
                    {step.icon}
                  </div>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-wider font-bold ${
                      isActive || isCompleted ? 'text-gray-300' : 'text-gray-600'
                    }`}
                  >
                    {language === 'tr' ? step.labelTr : step.labelEn}
                  </span>
                </div>

                {/* Arrow Connector */}
                {idx < PIPELINE_STEPS.length - 1 && (
                  <div className="flex items-center px-2 -mt-6">
                    <div className="flex items-center gap-1">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={isCompleted || isActive ? 'text-cyber-primary/50' : 'text-gray-700'}>
                        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={isCompleted ? 'text-cyber-primary/40' : 'text-gray-800'}>
                        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AgentPipeline;
