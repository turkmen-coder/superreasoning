import React from 'react';
import { useTranslation } from '../i18n';
import CyberButton from './CyberButton';
import { WorkflowRunResult, WorkflowStepType } from '../types';
import { WORKFLOW_PRESETS } from '../data/workflows';

interface WorkflowPanelProps {
  presetId: string;
  onPresetChange: (id: string) => void;
  onRun: () => void;
  running: boolean;
  result: WorkflowRunResult | null;
  disabled?: boolean;
}

const stepIcons: Record<WorkflowStepType, string> = {
  research: '🔍',
  summarize: '📋',
  generate_prompt: '⚡',
  test: '✓',
};

const WorkflowPanel: React.FC<WorkflowPanelProps> = ({
  presetId,
  onPresetChange,
  onRun,
  running,
  result,
  disabled,
}) => {
  const { t, language } = useTranslation();
  const preset = WORKFLOW_PRESETS.find((p) => p.id === presetId) ?? WORKFLOW_PRESETS[0];
  const desc = language === 'tr' ? preset.descriptionTr : preset.descriptionEn;

  return (
    <section
      className="border border-glass-border rounded-lg bg-cyber-dark/50 p-4 space-y-4"
      aria-labelledby="workflow-heading"
    >
      <h2 id="workflow-heading" className="text-sm font-bold uppercase tracking-tight text-gray-200 flex items-center gap-2">
        <span aria-hidden="true">🔗</span> {t.ui.workflowTitle}
      </h2>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 min-w-[180px]">
          <span className="text-[10px] font-mono text-gray-500 uppercase">{t.ui.workflowPresetLabel}</span>
          <select
            value={presetId}
            onChange={(e) => onPresetChange(e.target.value)}
            disabled={running}
            className="w-full bg-cyber-dark border border-glass-border text-gray-200 font-mono text-sm p-2 rounded focus:outline-none focus:border-cyber-primary focus-visible:ring-2 focus-visible:ring-cyber-primary focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-black"
            aria-label={t.ui.workflowPresetLabel}
          >
            {WORKFLOW_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {language === 'tr' ? p.nameTr : p.nameEn}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-gray-500">{desc}</span>
        </label>
        <CyberButton
          type="button"
          onClick={onRun}
          disabled={disabled || running}
          isLoading={running}
          variant="accent"
          className="!py-2 !px-4 !text-xs"
          aria-label={running ? t.ui.workflowRunning : t.ui.workflowRun}
        >
          {running ? t.ui.workflowRunning : t.ui.workflowRun}
        </CyberButton>
      </div>

      {result && (
        <div className="border-t border-glass-border pt-4" role="region" aria-label={t.ui.workflowResultTitle}>
          <h3 className="text-[10px] font-mono text-gray-500 uppercase mb-2">{t.ui.workflowResultTitle}</h3>
          {result.error && (
            <p className="text-red-400 text-xs font-mono mb-2" role="alert">
              {result.error}
            </p>
          )}
          <ul className="space-y-2">
            {result.stepResults.map((sr, idx) => (
              <li
                key={idx}
                className="flex flex-col gap-1 p-2 bg-cyber-black/50 border border-glass-border rounded text-[10px] font-mono"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden="true">{stepIcons[sr.step]}</span>
                  <span className="text-cyber-primary font-bold">{sr.label}</span>
                  {sr.testPass !== undefined && (
                    <span className={sr.testPass ? 'text-cyber-success' : 'text-yellow-500'}>
                      {sr.testPass ? t.ui.workflowPassed : t.ui.workflowFailed}
                    </span>
                  )}
                </div>
                <pre className="text-gray-400 whitespace-pre-wrap break-words max-h-32 overflow-y-auto mt-1 pl-4 border-l border-glass-border">
                  {sr.output.slice(0, 1200)}{sr.output.length > 1200 ? '…' : ''}
                </pre>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default WorkflowPanel;
