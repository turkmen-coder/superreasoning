/**
 * Prompt Enhance Panel — Judge V3 skorunu yükseltmek için
 * Python prompt_enhancer.py'yi backend üzerinden çağırır.
 * @see scripts/prompt_enhancer.py
 */
import { useState, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { enhancePromptViaBrain } from '../services/brainClient';

interface EnhanceResult {
  enhanced: string;
  changes: string[];
  before_analysis: {
    issues_count: number;
    issues: string[];
    word_count: number;
    section_count: number;
  };
  after_analysis: {
    issues_count: number;
    issues: string[];
    word_count: number;
    section_count: number;
  };
  estimated_score_gain: number;
}

interface Props {
  masterPrompt: string;
  reasoning?: string;
  framework: string;
  domainId: string;
  language: string;
  agentMode?: boolean;
  onApply?: (enhanced: string) => void;
}

export default function EnhancePanel({ masterPrompt, reasoning, framework, domainId, language, agentMode: _agentMode = false, onApply }: Props) {
  const { language: uiLang } = useTranslation();
  const t = uiLang === 'tr';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EnhanceResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const runEnhance = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await enhancePromptViaBrain({
        masterPrompt,
        domainId,
        framework,
        language: language === 'tr' ? 'tr' : 'en',
        reasoning: reasoning || '',
      }) as EnhanceResult;
      setResult(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Enhance failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [masterPrompt, domainId, framework, language, reasoning]);

  const handleApply = () => {
    if (result?.enhanced && onApply) {
      onApply(result.enhanced);
    }
  };

  return (
    <div className="glass-card overflow-hidden" role="region" aria-label={t ? 'Prompt Geliştirici' : 'Prompt Enhancer'}>
      {/* Main button */}
      <button
        type="button"
        onClick={runEnhance}
        disabled={loading || !masterPrompt}
        className="w-full flex items-center justify-between p-3 hover:bg-cyber-dark/30 transition-colors text-left disabled:opacity-40"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">⚡</span>
          <h3 className="text-xs font-display font-bold uppercase tracking-wider text-cyber-accent">
            {t ? 'KALİTEYİ YÜKSELT' : 'ENHANCE QUALITY'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-success/20 text-cyber-success">
              +{result.estimated_score_gain} {t ? 'puan' : 'pts'}
            </span>
          )}
          {loading && <span className="text-[10px] font-mono text-cyber-accent animate-pulse">ENHANCING...</span>}
        </div>
      </button>

      {error && (
        <div className="border-t border-glass-border p-3">
          <p className="text-red-400 text-xs font-mono">{error}</p>
        </div>
      )}

      {result && (
        <div className="border-t border-glass-border p-3 space-y-3">
          {/* Score improvement summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-[10px] font-mono">
              <div className="flex items-center gap-1">
                <span className="text-gray-500 uppercase">{t ? 'Sorunlar:' : 'Issues:'}</span>
                <span className="text-red-400">{result.before_analysis.issues_count}</span>
                <span className="text-gray-600">→</span>
                <span className="text-cyber-success">{result.after_analysis.issues_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 uppercase">{t ? 'Bölümler:' : 'Sections:'}</span>
                <span className="text-gray-400">{result.before_analysis.section_count}</span>
                <span className="text-gray-600">→</span>
                <span className="text-cyber-primary">{result.after_analysis.section_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 uppercase">{t ? 'Kelime:' : 'Words:'}</span>
                <span className="text-gray-400">{result.before_analysis.word_count}</span>
                <span className="text-gray-600">→</span>
                <span className="text-cyber-primary">{result.after_analysis.word_count}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold">
              <span className="px-2 py-1 rounded bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30">
                +{result.estimated_score_gain} {t ? 'TAHMİNİ PUAN' : 'EST. SCORE'}
              </span>
            </div>
          </div>

          {/* Changes list */}
          {result.changes.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-gray-500 uppercase">
                {t ? 'Yapılan İyileştirmeler:' : 'Improvements Made:'}
              </span>
              <div className="space-y-0.5">
                {result.changes.map((change, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] font-mono">
                    <span className="text-cyber-success shrink-0 mt-0.5">✓</span>
                    <span className="text-gray-300">{change}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.changes.length === 0 && (
            <p className="text-[10px] font-mono text-cyber-success text-center py-2">
              {t ? 'Prompt zaten optimize durumda!' : 'Prompt is already optimized!'}
            </p>
          )}

          {/* Action buttons */}
          {result.changes.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-[10px] font-mono px-3 py-1.5 border border-glass-border rounded hover:border-cyber-primary/50 text-gray-400 hover:text-gray-200 transition-colors"
              >
                {showPreview ? (t ? 'ÖNİZLEMEYİ GİZLE' : 'HIDE PREVIEW') : (t ? 'ÖNİZLEME' : 'PREVIEW')}
              </button>
              {onApply && (
                <button
                  onClick={handleApply}
                  className="text-[10px] font-mono font-bold px-4 py-1.5 rounded bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/40 hover:bg-cyber-accent/30 hover:border-cyber-accent/60 transition-colors"
                >
                  {t ? 'GELİŞTİRİLMİŞ PROMPTU UYGULA' : 'APPLY ENHANCED PROMPT'}
                </button>
              )}
            </div>
          )}

          {/* Preview */}
          {showPreview && result.enhanced && (
            <div className="border border-glass-border rounded p-2 bg-cyber-dark/40 max-h-80 overflow-y-auto">
              <pre className="text-[10px] font-mono text-gray-300 whitespace-pre-wrap">
                {result.enhanced}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
