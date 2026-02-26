/**
 * Prompt Transform Panel — Format dönüşümleri + ftfy metin düzeltme.
 * Markdown→JSON, flat→structured, single→multiturn, variable normalization, encoding fix.
 */
import { useState, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { transformPromptViaBrain, fixTextViaBrain } from '../services/brainClient';

type TransformMode = 'markdown_to_json' | 'flat_to_structured' | 'single_to_multiturn' | 'normalize_variables';

interface TransformResult {
  original: string;
  transformed: string;
  format: string;
  changes: string[];
  metadata?: Record<string, unknown>;
}

interface Props {
  masterPrompt: string;
  language: string;
  agentMode?: boolean;
  onApply?: (transformed: string) => void;
}

const MODES: { key: TransformMode; label: string; labelTr: string; desc: string; descTr: string }[] = [
  {
    key: 'flat_to_structured',
    label: 'Flat to Structured',
    labelTr: 'Duz Metin → Yapisal',
    desc: 'Convert flat text to sectioned structure',
    descTr: 'Duz metni bolumlu yapiya donustur',
  },
  {
    key: 'markdown_to_json',
    label: 'Markdown to JSON',
    labelTr: 'Markdown → JSON',
    desc: 'Convert markdown prompt to JSON format',
    descTr: 'Markdown promptu JSON formatina donustur',
  },
  {
    key: 'single_to_multiturn',
    label: 'Single to Multi-turn',
    labelTr: 'Tek → Coklu Tur',
    desc: 'Split into system/user/assistant turns',
    descTr: 'System/user/assistant turlerine ayir',
  },
  {
    key: 'normalize_variables',
    label: 'Normalize Variables',
    labelTr: 'Degisken Normalizasyonu',
    desc: 'Unify variable placeholder styles',
    descTr: 'Degisken stillerini birlestir',
  },
];

export default function PromptTransformPanel({ masterPrompt, language: _language, agentMode: _agentMode = false, onApply }: Props) {
  const { language: uiLang } = useTranslation();
  const t = uiLang === 'tr';
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<TransformMode>('flat_to_structured');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TransformResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // ftfy state
  const [ftfyMode, setFtfyMode] = useState(false);
  const [ftfyResult, setFtfyResult] = useState<{ original: string; fixed: string } | null>(null);
  const [ftfyLoading, setFtfyLoading] = useState(false);

  const runTransform = useCallback(async () => {
    if (!masterPrompt.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await transformPromptViaBrain({
        prompt: masterPrompt,
        language: t ? 'tr' : 'en',
        transformation: mode,
      }) as TransformResult;
      setResult(data);
      setShowPreview(true);
    } catch (err) {
      console.error('Transform error:', err);
    } finally {
      setLoading(false);
    }
  }, [masterPrompt, mode, t]);

  const runFtfy = useCallback(async () => {
    if (!masterPrompt.trim()) return;
    setFtfyLoading(true);
    setFtfyResult(null);
    try {
      const data = await fixTextViaBrain({
        text: masterPrompt,
        language: t ? 'tr' : 'en',
      });
      setFtfyResult(data);
    } catch (err) {
      console.error('ftfy error:', err);
    } finally {
      setFtfyLoading(false);
    }
  }, [masterPrompt, t]);

  const handleApply = (text: string) => {
    if (onApply) onApply(text);
    setResult(null);
    setFtfyResult(null);
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-cyber-darker/50 hover:bg-cyber-darker/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-purple-400 font-mono text-xs font-bold">
            {t ? 'PROMPT DONUSUM' : 'PROMPT TRANSFORM'}
          </span>
          {result && (
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono">
              {result.changes.length} {t ? 'degisiklik' : 'changes'}
            </span>
          )}
        </div>
        <span className="text-gray-500 text-xs">{open ? '[-]' : '[+]'}</span>
      </button>

      {open && (
        <div className="p-4 space-y-3 bg-cyber-black/50">
          {/* Mode toggle: Transform vs ftfy */}
          <div className="flex gap-1 bg-cyber-darker/40 rounded p-0.5">
            <button
              onClick={() => setFtfyMode(false)}
              className={`flex-1 text-[10px] font-mono py-1.5 px-2 rounded transition-colors ${
                !ftfyMode
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t ? 'DONUSUM' : 'TRANSFORM'}
            </button>
            <button
              onClick={() => setFtfyMode(true)}
              className={`flex-1 text-[10px] font-mono py-1.5 px-2 rounded transition-colors ${
                ftfyMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t ? 'METIN DUZELT (ftfy)' : 'TEXT FIX (ftfy)'}
            </button>
          </div>

          {/* Transform Mode */}
          {!ftfyMode && (
            <div className="space-y-3">
              {/* Mode selector */}
              <div className="grid grid-cols-2 gap-1">
                {MODES.map(m => (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    className={`text-left px-2 py-1.5 rounded text-[10px] font-mono transition-colors ${
                      mode === m.key
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-glass-bg text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <div className="font-bold">{t ? m.labelTr : m.label}</div>
                    <div className="text-[9px] opacity-70">{t ? m.descTr : m.desc}</div>
                  </button>
                ))}
              </div>

              {/* Run button */}
              <button
                onClick={runTransform}
                disabled={loading || !masterPrompt.trim()}
                className="w-full py-2 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs font-mono font-bold transition-colors disabled:opacity-40"
              >
                {loading ? (t ? 'DONUSTURULUYOR...' : 'TRANSFORMING...') : (t ? 'DONUSTIR' : 'TRANSFORM')}
              </button>

              {/* Result */}
              {result && (
                <div className="space-y-2">
                  {/* Changes list */}
                  {result.changes.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-gray-400 text-[10px] font-mono">
                        {t ? 'Degisiklikler:' : 'Changes:'}
                      </span>
                      {result.changes.map((c, i) => (
                        <div key={i} className="text-green-400 text-[10px] font-mono pl-2">
                          + {c}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preview toggle */}
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-[10px] font-mono text-gray-500 hover:text-gray-300"
                  >
                    {showPreview ? (t ? 'Onizlemeyi Gizle' : 'Hide Preview') : (t ? 'Onizleme' : 'Preview')}
                  </button>

                  {showPreview && (
                    <pre className="bg-glass-bg rounded p-2 text-[10px] text-gray-300 font-mono max-h-48 overflow-auto whitespace-pre-wrap">
                      {result.transformed}
                    </pre>
                  )}

                  {/* Apply button */}
                  <button
                    onClick={() => handleApply(result.transformed)}
                    className="w-full py-2 rounded bg-green-600/30 hover:bg-green-600/50 text-green-300 text-xs font-mono font-bold transition-colors"
                  >
                    {t ? 'DONUSUM UYGULA' : 'APPLY TRANSFORM'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ftfy Mode */}
          {ftfyMode && (
            <div className="space-y-3">
              <p className="text-gray-500 text-[10px] font-mono">
                {t
                  ? 'Encoding bozukluklarini (mojibake, garbled text) otomatik duzeltir.'
                  : 'Auto-fix encoding issues (mojibake, garbled text) using ftfy.'}
              </p>

              <button
                onClick={runFtfy}
                disabled={ftfyLoading || !masterPrompt.trim()}
                className="w-full py-2 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 text-xs font-mono font-bold transition-colors disabled:opacity-40"
              >
                {ftfyLoading ? (t ? 'DUZELTILIYOR...' : 'FIXING...') : (t ? 'METIN DUZELT' : 'FIX TEXT')}
              </button>

              {ftfyResult && (
                <div className="space-y-2">
                  {ftfyResult.original === ftfyResult.fixed ? (
                    <div className="text-green-400 text-xs font-mono text-center py-2">
                      {t ? 'Encoding sorunu bulunamadi!' : 'No encoding issues found!'}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <span className="text-gray-500 text-[10px] font-mono">{t ? 'Duzeltilmis:' : 'Fixed:'}</span>
                        <pre className="bg-glass-bg rounded p-2 text-[10px] text-amber-300 font-mono max-h-32 overflow-auto whitespace-pre-wrap">
                          {ftfyResult.fixed}
                        </pre>
                      </div>
                      <button
                        onClick={() => handleApply(ftfyResult.fixed)}
                        className="w-full py-2 rounded bg-green-600/30 hover:bg-green-600/50 text-green-300 text-xs font-mono font-bold transition-colors"
                      >
                        {t ? 'DUZELTILMIS METIN UYGULA' : 'APPLY FIXED TEXT'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
