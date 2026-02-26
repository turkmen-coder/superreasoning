import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Framework, PromptResponse } from '../types';
import CyberButton from './CyberButton';
import { useTranslation } from '../i18n';
import { useToast } from './ToastSystem';
import { getOutputAnalysis } from '../utils/analysis';
import { addToSuggestionPool } from '../services/suggestionPool';

export type TelemetryEventPayload = { type: 'edited' | 'copy' | 'feedback_add_to_pool'; domainId?: string; framework?: string; provider?: string };

interface ResultDisplayProps {
  result: PromptResponse | null;
  domainId?: string;
  framework?: Framework;
  provider?: string;
  telemetryConsent?: boolean;
  onRecordEvent?: (payload: TelemetryEventPayload) => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({
  result,
  domainId,
  framework,
  provider,
  telemetryConsent: _telemetryConsent,
  onRecordEvent,
}) => {
  const [copied, setCopied] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const { t } = useTranslation();
  const { addToast } = useToast();

  if (!result) return null;

  const displayPrompt = editingPrompt !== null ? editingPrompt : result.masterPrompt;
  const outputAnalysis = getOutputAnalysis({ ...result, masterPrompt: displayPrompt });

  const handleCopy = () => {
    navigator.clipboard.writeText(displayPrompt);
    setCopied(true);
    addToast(t.ui.toastCopySuccess, 'success');
    onRecordEvent?.({ type: 'copy', domainId, framework: framework as string, provider });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDoneEdit = () => {
    setEditingPrompt(null);
    onRecordEvent?.({ type: 'edited', domainId, framework: framework as string, provider });
  };

  const handleAddToPool = () => {
    if (!window.confirm(t.ui.feedbackConfirmMessage)) return;
    const fw = (result.detectedFramework ?? framework) as Framework;
    const dom = result.detectedDomain ?? domainId ?? 'auto';
    addToSuggestionPool({
      masterPrompt: result.masterPrompt,
      reasoning: result.reasoning,
      domainId: dom,
      framework: fw,
    });
    onRecordEvent?.({ type: 'feedback_add_to_pool', domainId: dom, framework: fw as string, provider });
    addToast(t.ui.feedbackAdded, 'success');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" role="region" aria-label={t.ui.masterOutput}>
      <div className="glass-card p-1 mb-6 relative group" aria-live="polite" aria-atomic="true">

        {/* Header Strip */}
        <div className="bg-cyber-gray px-4 py-2 border-b border-glass-border flex justify-between items-center">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyber-success rounded-full animate-pulse" aria-hidden="true" />
                <span className="text-cyber-success font-mono text-xs tracking-widest uppercase">
                {t.ui.success}
                </span>
            </div>
            {result.detectedFramework && (
                <span className="text-gray-400 text-[10px] font-mono border border-gray-600 px-2 rounded uppercase">
                    FW: {result.detectedFramework}
                </span>
            )}
            {result.detectedDomain && (
                <span className="text-cyber-primary text-[10px] font-mono border border-cyber-primary/30 px-2 rounded uppercase">
                    DOMAIN: {result.detectedDomain}
                </span>
            )}
            {result.groundingScore != null && (
                <span className="text-cyber-success text-[10px] font-mono border border-cyber-success/40 px-2 rounded uppercase" title={t.ui.groundingScoreHint}>
                    {t.ui.groundingScoreLabel}: {result.groundingScore}%
                </span>
            )}
          </div>
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-gray-600" />
            <div className="w-1 h-1 bg-gray-600" />
            <div className="w-1 h-1 bg-gray-600" />
          </div>
        </div>

        {/* Çıktı analizi */}
        <div className="px-4 py-2 border-b border-glass-border bg-cyber-black/30 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono">
          <span className="text-gray-500 uppercase tracking-wider">{t.ui.analysisOutput}</span>
          <span className="text-gray-400">
            {t.ui.analysisMasterLength}: {outputAnalysis.masterPromptWords} {t.ui.analysisWords} ({outputAnalysis.masterPromptChars} {t.ui.chars})
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">
            {t.ui.analysisReasoningLength}: {outputAnalysis.reasoningWords} {t.ui.analysisWords}
          </span>
          {outputAnalysis.sectionCount > 0 && (
            <>
              <span className="text-gray-600">|</span>
              <span className="text-cyber-primary">{t.ui.analysisSections}: {outputAnalysis.sectionCount}</span>
              <div className="w-full mt-1 flex flex-wrap gap-1">
                {outputAnalysis.sections.slice(0, 8).map((s, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-cyber-primary/10 border border-cyber-primary/20 text-cyber-primary truncate max-w-[140px]" title={s}>
                    {s}
                  </span>
                ))}
                {outputAnalysis.sections.length > 8 && (
                  <span className="text-gray-500">+{outputAnalysis.sections.length - 8}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6">
          <h3 className="text-gray-400 font-display text-sm mb-2 uppercase tracking-wider">{t.ui.logicCore}</h3>
          <p className="text-gray-300 text-sm mb-6 border-l-2 border-cyber-accent pl-4 italic">
            {result.reasoning}
          </p>

          <h3 className="text-cyber-primary font-display text-sm mb-2 uppercase tracking-wider">{t.ui.masterOutput}</h3>
          <div className="relative mb-6">
            {editingPrompt === null ? (
              <div className="markdown-output w-full bg-cyber-black/50 border border-glass-border p-4 rounded-sm overflow-x-auto text-gray-300 text-sm leading-relaxed">
                <ReactMarkdown>{displayPrompt}</ReactMarkdown>
              </div>
            ) : (
              <>
                <textarea
                  className="w-full h-64 bg-cyber-black/50 border border-glass-border p-4 rounded-sm text-gray-300 font-mono text-sm resize-y"
                  value={editingPrompt}
                  onChange={(e) => setEditingPrompt(e.target.value)}
                  aria-label={t.ui.masterOutput}
                />
                <p className="text-[10px] text-gray-500 mt-1 uppercase">{t.ui.previewFile}</p>
                <div className="markdown-output mt-2 w-full bg-cyber-black/50 border border-glass-border p-4 rounded-sm overflow-x-auto text-gray-300 text-sm leading-relaxed max-h-48 overflow-y-auto">
                  <ReactMarkdown>{editingPrompt}</ReactMarkdown>
                </div>
              </>
            )}
            <div className="absolute top-2 right-2 flex gap-2">
              {editingPrompt === null ? (
                <button
                  type="button"
                  onClick={() => setEditingPrompt(result.masterPrompt)}
                  aria-label={t.ui.editOutput}
                  className="text-xs font-mono text-cyber-primary border border-cyber-primary/30 px-2 py-1 hover:bg-cyber-primary/10 transition-colors focus-visible:ring-2 focus-visible:ring-cyber-primary focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-dark rounded"
                >
                  {t.ui.editOutput}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDoneEdit}
                  aria-label={t.ui.doneEdit}
                  className="text-xs font-mono text-cyber-success border border-cyber-success/30 px-2 py-1 hover:bg-cyber-success/10 transition-colors focus-visible:ring-2 focus-visible:ring-cyber-success focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-dark rounded"
                >
                  {t.ui.doneEdit}
                </button>
              )}
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? t.ui.copied : t.ui.copy}
                className="text-xs font-mono text-cyber-primary border border-cyber-primary/30 px-2 py-1 hover:bg-cyber-primary/10 transition-colors focus-visible:ring-2 focus-visible:ring-cyber-primary focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-dark rounded"
              >
                {copied ? t.ui.copied : t.ui.copy}
              </button>
            </div>
          </div>

          {/* Grounding Sources Section — numaralı [1], [2] metin içi referanslarla eşleşir */}
          {result.groundingSources && result.groundingSources.length > 0 && (
            <div className="mt-4 border-t border-glass-border pt-4">
               <h3 className="text-cyber-success font-display text-xs mb-3 uppercase tracking-wider flex items-center gap-2">
                 <span className="text-lg">⚡</span> {t.ui.groundingTitle}
               </h3>
               <p className="text-[10px] text-gray-500 mb-2 font-mono">{t.ui.groundingSourcesRefHint}</p>
               <div className="grid grid-cols-1 gap-2">
                 {result.groundingSources.map((source, idx) => (
                   <a
                    key={idx}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-cyber-dark/30 border border-glass-border hover:border-cyber-success/50 hover:bg-cyber-success/5 transition-all group"
                   >
                      <span className="text-[10px] font-mono text-cyber-success mr-2 shrink-0">[{idx + 1}]</span>
                      <span className="text-xs text-gray-400 font-mono truncate group-hover:text-cyber-success transition-colors max-w-[75%]">
                        {source.title}
                      </span>
                      <span className="text-[10px] text-gray-600 uppercase shrink-0">{t.ui.externalLink}</span>
                   </a>
                 ))}
               </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-glass-border flex justify-between items-center flex-wrap gap-3">
          <button
            type="button"
            onClick={handleAddToPool}
            aria-label={t.ui.feedbackAddToPool}
            className="text-[10px] font-mono text-cyber-accent border border-cyber-accent/40 px-2 py-1.5 hover:bg-cyber-accent/10 transition-colors uppercase focus-visible:ring-2 focus-visible:ring-cyber-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-dark rounded"
            title={t.ui.feedbackConfirmTitle}
          >
            {t.ui.feedbackAddToPool}
          </button>
          <CyberButton onClick={handleCopy} variant="secondary">
            {copied ? t.ui.copiedMaster : t.ui.copyMaster}
          </CyberButton>
        </div>

      </div>
    </div>
  );
};

export default ResultDisplay;
