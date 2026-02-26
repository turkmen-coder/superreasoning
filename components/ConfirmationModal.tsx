import React, { useEffect, useRef, useMemo } from 'react';
import { useTranslation } from '../i18n';
import CyberButton from './CyberButton';
import { Framework, Attachment } from '../types';
import { estimateTokenCount } from '../services/budgetOptimizer';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  intent: string;
  framework: Framework;
  domainId: string;
  useSearch: boolean;
  thinkingMode: boolean;
  /** New preflight props */
  attachments?: Attachment[];
  provider?: string;
  computePower?: number;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen, onClose, onConfirm, intent, framework, domainId, useSearch, thinkingMode,
  attachments = [], provider = 'huggingface', computePower = 75,
}) => {
  const { t, language } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const el = dialogRef.current;
    const focusables = el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Preflight analysis
  const preflight = useMemo(() => {
    const tokenEst = estimateTokenCount(intent);
    const fileCount = attachments.length;
    const warnings: string[] = [];

    if (intent.trim().split(/\s+/).length < 5) {
      warnings.push(t.ui.preflightWarningShortInput);
    }
    if (domainId === 'auto') {
      warnings.push(t.ui.preflightWarningAutoDomain);
    }
    if (framework === Framework.AUTO) {
      warnings.push(t.ui.preflightWarningAutoFramework);
    }

    const providerLabels: Record<string, string> = {
      huggingface: 'HF Inference (Free)',
      groq: 'Groq LPU',
      gemini: 'Google Gemini',
      claude: 'Anthropic Claude',
      openrouter: 'OpenRouter',
    };

    return {
      tokenEst,
      fileCount,
      warnings,
      providerLabel: providerLabels[provider] || provider,
    };
  }, [intent, attachments, domainId, framework, provider, t]);

  if (!isOpen) return null;

  const domainName = t.domains[domainId as keyof typeof t.domains]?.name || domainId;
  const frameworkName = t.frameworks[framework]?.name || framework;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div
        className="absolute inset-0 bg-cyber-black/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        className="relative bg-cyber-dark border border-glass-border max-w-lg w-full p-1 shadow-[0_0_50px_rgba(6,232,249,0.1)] animate-in zoom-in-95 duration-300 rounded-lg overflow-hidden focus-visible:ring-2 focus-visible:ring-cyber-primary focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-black"
      >
        <div className="bg-cyber-gray px-6 py-4 border-b border-glass-border flex justify-between items-center">
           <h3 id="confirm-modal-title" className="text-white font-mono font-bold tracking-wider flex items-center gap-2">
             <span className="text-cyber-primary" aria-hidden="true">◈</span> {t.ui.confirmTitle}
           </h3>
           <button
             ref={closeBtnRef}
             type="button"
             onClick={onClose}
             aria-label={language === 'tr' ? 'İptal ve kapat' : 'Cancel and close'}
             className="text-gray-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-cyber-primary focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-dark rounded p-1"
           >
             ✕
           </button>
        </div>

        <div id="confirm-modal-desc" className="p-6 space-y-5">
           <p className="text-gray-400 text-sm font-mono">{t.ui.confirmMessage}</p>

           {/* Summary Grid — 3 cols for more info */}
           <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-cyber-black/50 border border-glass-border rounded">
                 <span className="text-[10px] text-gray-500 uppercase block mb-1">{t.ui.domainLabel}</span>
                 <span className="text-cyber-secondary font-mono text-xs">{domainName}</span>
              </div>
              <div className="p-3 bg-cyber-black/50 border border-glass-border rounded">
                 <span className="text-[10px] text-gray-500 uppercase block mb-1">{t.ui.frameworkLabel}</span>
                 <span className="text-cyber-accent font-mono text-xs">{frameworkName}</span>
              </div>
              <div className="p-3 bg-cyber-black/50 border border-glass-border rounded">
                 <span className="text-[10px] text-gray-500 uppercase block mb-1">{t.ui.preflightProvider}</span>
                 <span className="text-gray-300 font-mono text-xs">{preflight.providerLabel}</span>
              </div>
           </div>

           {/* Metrics Row */}
           <div className="grid grid-cols-4 gap-2">
              <div className="p-2 bg-cyber-black/50 border border-glass-border rounded text-center">
                 <span className="text-[9px] text-gray-500 uppercase block mb-1">{t.ui.preflightTokenEstimate}</span>
                 <span className="text-cyber-primary font-mono text-sm font-bold">~{preflight.tokenEst}</span>
              </div>
              <div className="p-2 bg-cyber-black/50 border border-glass-border rounded text-center">
                 <span className="text-[9px] text-gray-500 uppercase block mb-1">{t.ui.preflightFileCount}</span>
                 <span className="text-gray-300 font-mono text-sm font-bold">{preflight.fileCount}</span>
              </div>
              <div className="p-2 bg-cyber-black/50 border border-glass-border rounded text-center">
                 <span className="text-[9px] text-gray-500 uppercase block mb-1">{t.ui.preflightComputePower}</span>
                 <span className="text-cyber-primary font-mono text-sm font-bold">{computePower}%</span>
              </div>
              <div className="p-2 bg-cyber-black/50 border border-glass-border rounded text-center">
                 <span className="text-[9px] text-gray-500 uppercase block mb-1">MODE</span>
                 <div className="flex gap-1 justify-center text-[9px] font-mono">
                    <span className={thinkingMode ? 'text-cyber-success' : 'text-gray-600'}>THK</span>
                    <span className="text-gray-700">/</span>
                    <span className={useSearch ? 'text-cyber-success' : 'text-gray-600'}>SRC</span>
                 </div>
              </div>
           </div>

           {/* Intent Preview */}
           <div className="bg-cyber-black/50 border border-glass-border p-4 rounded">
              <span className="text-[10px] text-gray-500 uppercase block mb-2">{t.ui.summaryIntent}</span>
              <p className="text-gray-300 font-mono text-xs italic line-clamp-3">
                 "{intent}"
              </p>
           </div>

           {/* Warnings */}
           {preflight.warnings.length > 0 && (
             <div className="border border-amber-500/30 bg-amber-900/10 rounded p-3 space-y-1.5">
               <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
                   <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                   <line x1="12" y1="9" x2="12" y2="13" />
                   <line x1="12" y1="17" x2="12.01" y2="17" />
                 </svg>
                 {t.ui.preflightWarnings}
               </span>
               {preflight.warnings.map((w, i) => (
                 <p key={i} className="text-amber-300/80 text-[10px] font-mono pl-5">
                   {w}
                 </p>
               ))}
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-cyber-gray/30 border-t border-glass-border flex justify-end gap-3">
           <button
             type="button"
             onClick={onClose}
             className="px-6 py-3 font-mono text-xs text-gray-400 hover:text-white transition-colors uppercase tracking-widest focus-visible:ring-2 focus-visible:ring-cyber-primary focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-dark rounded"
           >
             {t.ui.cancelBtn}
           </button>
           <CyberButton onClick={onConfirm} variant="primary" className="!py-3 !px-6 !text-xs focus-visible:ring-2 focus-visible:ring-cyber-primary focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-black">
             {t.ui.confirmBtn}
           </CyberButton>
        </div>

      </div>
    </div>
  );
};

export default ConfirmationModal;
