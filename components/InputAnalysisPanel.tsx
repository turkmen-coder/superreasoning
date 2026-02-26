import React from 'react';
import { useTranslation } from '../i18n';
import { getInputAnalysis, InputAnalysis } from '../utils/analysis';
import { compressIntent } from '../utils/compressIntent';

interface InputAnalysisPanelProps {
  intent: string;
}

const detailLevelClass = {
  short: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
  medium: 'text-cyber-primary border-cyber-primary/30 bg-cyber-primary/5',
  detailed: 'text-cyber-success border-cyber-success/30 bg-cyber-success/5',
  empty: 'text-gray-500 border-glass-border bg-cyber-dark/50',
};

const InputAnalysisPanel: React.FC<InputAnalysisPanelProps> = ({ intent }) => {
  const { t } = useTranslation();
  const analysis: InputAnalysis = getInputAnalysis(intent);
  const compressed = compressIntent(intent);
  const saved = analysis.chars - compressed.length;

  if (!analysis.hasContent) {
    return (
      <div className="mt-2 p-3 border border-glass-border rounded-lg bg-cyber-dark/30">
        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">
          {t.ui.analysisInput}
        </p>
        <p className="text-xs text-gray-600">{t.ui.analysisEmpty}</p>
      </div>
    );
  }

  const levelKey = analysis.detailLevel === 'short' ? 'analysisShort' : analysis.detailLevel === 'medium' ? 'analysisMedium' : 'analysisDetailed';
  const levelLabel = t.ui[levelKey as keyof typeof t.ui] as string;

  return (
    <div className="mt-2 p-3 border border-glass-border rounded-lg bg-cyber-dark/30 animate-in fade-in duration-300">
      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">
        {t.ui.analysisInput}
      </p>
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-xs font-mono text-gray-400">
          {analysis.words} {t.ui.analysisWords}
        </span>
        <span className="text-gray-600">·</span>
        <span className="text-xs font-mono text-gray-400">
          {analysis.chars} {t.ui.chars}
        </span>
        <span className="text-gray-600">·</span>
        <span className="text-[10px] font-mono text-cyber-primary" title="GPT-4 ~1 token/word, GPT-3.5 ~0.75 token/word">
          ~{Math.round(analysis.words * 0.75)} (3.5) · ~{Math.round(analysis.words * 1)} (4)
        </span>
        {saved > 0 && (
          <>
            <span className="text-gray-600">·</span>
            <span className="text-[10px] font-mono text-cyber-success" title={t.ui.analysisCompressedHint}>
              → {compressed.length} {t.ui.chars} ({t.ui.analysisCompressed})
            </span>
          </>
        )}
        <span className="text-gray-600">·</span>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${detailLevelClass[analysis.detailLevel]}`}>
          {levelLabel}
        </span>
      </div>
    </div>
  );
};

export default InputAnalysisPanel;
