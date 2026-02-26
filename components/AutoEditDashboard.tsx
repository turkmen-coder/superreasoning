import { useState, useCallback, useRef } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders } from '../services/apiClient';

const API_BASE = import.meta.env?.VITE_API_BASE_URL || '/api/v1';

type EditMode = 'grammar' | 'clarity' | 'structure' | 'tone' | 'all';
type ToneStyle = 'professional' | 'casual' | 'technical' | 'creative' | 'academic';

interface AutoEditResult {
  edited: string;
  original: string;
  mode: EditMode;
  changes: Array<{
    type: 'add' | 'remove' | 'replace';
    description: string;
    position: number;
  }>;
  stats: {
    originalLength: number;
    editedLength: number;
    wordCountBefore: number;
    wordCountAfter: number;
    readabilityBefore: number;
    readabilityAfter: number;
  };
  suggestions: string[];
}

const EDIT_MODES: { id: EditMode; labelTr: string; labelEn: string; icon: string; descTr: string; descEn: string }[] = [
  { id: 'grammar', labelTr: 'Gramer & Yazım', labelEn: 'Grammar & Spelling', icon: '✓', descTr: 'Yazım hatalarını ve dilbilgisi hatalarını düzeltir', descEn: 'Fixes spelling and grammar errors' },
  { id: 'clarity', labelTr: 'Netlik', labelEn: 'Clarity', icon: '💡', descTr: 'Daha anlaşılır ve net ifadeler kullanır', descEn: 'Makes statements clearer and more understandable' },
  { id: 'structure', labelTr: 'Yapı', labelEn: 'Structure', icon: '🏗️', descTr: 'Daha iyi organizasyon ve bölümlendirme', descEn: 'Better organization and sectioning' },
  { id: 'tone', labelTr: 'Ton', labelEn: 'Tone', icon: '🎭', descTr: 'Tutarlı ve uygun ton ayarlaması', descEn: 'Consistent and appropriate tone adjustment' },
  { id: 'all', labelTr: 'Tam Düzenleme', labelEn: 'Full Edit', icon: '⚡', descTr: 'Tüm iyileştirmeleri uygular', descEn: 'Applies all improvements' },
];

const TONE_STYLES: { id: ToneStyle; labelTr: string; labelEn: string }[] = [
  { id: 'professional', labelTr: 'Profesyonel', labelEn: 'Professional' },
  { id: 'casual', labelTr: 'Samimi', labelEn: 'Casual' },
  { id: 'technical', labelTr: 'Teknik', labelEn: 'Technical' },
  { id: 'creative', labelTr: 'Yaratıcı', labelEn: 'Creative' },
  { id: 'academic', labelTr: 'Akademik', labelEn: 'Academic' },
];

export default function AutoEditDashboard() {
  const { language } = useTranslation();
  const t = language === 'tr';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [originalPrompt, setOriginalPrompt] = useState('');
  const [selectedMode, setSelectedMode] = useState<EditMode>('all');
  const [toneStyle, setToneStyle] = useState<ToneStyle>('professional');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AutoEditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(true);
  const [history, setHistory] = useState<AutoEditResult[]>([]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(w => w.length > 0).length;

  const runAutoEdit = useCallback(async () => {
    if (!originalPrompt.trim()) {
      setError(language === 'tr' ? 'Lütfen bir prompt girin.' : 'Please enter a prompt.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/auto-edit`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: originalPrompt,
          mode: selectedMode,
          tone: toneStyle,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auto-edit failed');

      setResult(data);
      setHistory(prev => [data, ...prev].slice(0, 10));
      setSelectedHistoryIndex(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsProcessing(false);
    }
  }, [originalPrompt, selectedMode, toneStyle, language]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setOriginalPrompt(content);
      setResult(null);
    };
    reader.readAsText(file);
  }, []);

  const applyEdit = useCallback(() => {
    if (result?.edited) {
      setOriginalPrompt(result.edited);
      setResult(null);
    }
  }, [result]);

  const loadFromHistory = useCallback((index: number) => {
    const item = history[index];
    if (item) {
      setOriginalPrompt(item.edited);
      setSelectedHistoryIndex(index);
      setResult(null);
    }
  }, [history]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Silent fail
    }
  }, []);

  const renderDiff = (original: string, edited: string) => {
    if (!showDiff) return <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">{edited}</pre>;

    // Simple diff visualization
    const origLines = original.split('\n');
    const editLines = edited.split('\n');
    const maxLen = Math.max(origLines.length, editLines.length);

    return (
      <div className="space-y-1">
        {Array.from({ length: maxLen }, (_, i) => {
          const orig = origLines[i] || '';
          const edit = editLines[i] || '';
          const isChanged = orig !== edit;

          return (
            <div key={i} className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className={`p-1 rounded ${isChanged ? 'bg-red-500/10 text-red-400 line-through' : 'text-gray-500'}`}>
                {orig || ' '}
              </div>
              <div className={`p-1 rounded ${isChanged ? 'bg-green-500/10 text-green-400' : 'text-gray-300'}`}>
                {edit || ' '}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider">Auto Edit</h2>
            <p className="font-mono text-[10px] text-gray-500 mt-0.5">
              {t ? 'Promptlarınızı otomatik olarak düzenleyin ve iyileştirin' : 'Automatically edit and improve your prompts'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono">
            AI Powered
          </span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Input & Settings */}
        <div className="lg:col-span-2 space-y-4">
          {/* Input Area */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold text-cyber-primary uppercase tracking-wider">
                {t ? 'Orijinal Prompt' : 'Original Prompt'}
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.md,.prompt"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] font-mono px-3 py-1.5 border border-glass-border rounded hover:border-cyber-primary/50 text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {t ? 'Dosya Yükle' : 'Upload File'}
                </button>
                {originalPrompt && (
                  <button
                    onClick={() => { setOriginalPrompt(''); setResult(null); }}
                    className="text-[10px] font-mono px-3 py-1.5 border border-glass-border rounded hover:border-red-500/50 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    {t ? 'Temizle' : 'Clear'}
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={originalPrompt}
              onChange={(e) => { setOriginalPrompt(e.target.value); setResult(null); }}
              placeholder={t ? 'Düzenlemek istediğiniz promptu buraya yapıştırın...' : 'Paste your prompt here to edit...'}
              className="w-full h-48 glass-card-lg p-4 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyber-primary resize-none"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
              <span>{wordCount(originalPrompt)} {t ? 'kelime' : 'words'}</span>
              <span>{originalPrompt.length} {t ? 'karakter' : 'characters'}</span>
            </div>
          </div>

          {/* Edit Mode Selection */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-mono text-xs font-bold text-cyber-primary uppercase tracking-wider">
              {t ? 'Düzenleme Modu' : 'Edit Mode'}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {EDIT_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedMode === mode.id
                      ? 'border-cyber-primary bg-cyber-primary/10'
                      : 'border-glass-border hover:border-glass-border/60'
                  }`}
                >
                  <div className="text-lg mb-1">{mode.icon}</div>
                  <div className={`text-[10px] font-mono font-bold uppercase ${selectedMode === mode.id ? 'text-cyber-primary' : 'text-gray-400'}`}>
                    {t ? mode.labelTr : mode.labelEn}
                  </div>
                  <div className="text-[8px] font-mono text-gray-600 mt-1 leading-tight">
                    {t ? mode.descTr : mode.descEn}
                  </div>
                </button>
              ))}
            </div>

            {/* Tone Selection */}
            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-mono text-gray-500 uppercase">
                {t ? 'Ton Stili' : 'Tone Style'}
              </label>
              <div className="flex flex-wrap gap-2">
                {TONE_STYLES.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => setToneStyle(tone.id)}
                    className={`px-3 py-1.5 rounded border font-mono text-[10px] uppercase transition-all ${
                      toneStyle === tone.id
                        ? 'border-cyber-primary bg-cyber-primary/10 text-cyber-primary'
                        : 'border-glass-border text-gray-500 hover:border-gray-500'
                    }`}
                  >
                    {t ? tone.labelTr : tone.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Process Button */}
            <button
              onClick={runAutoEdit}
              disabled={isProcessing || !originalPrompt.trim()}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-cyber-primary/20 to-cyan-500/20 border border-cyber-primary/40 text-cyber-primary font-mono text-xs uppercase tracking-wider hover:bg-cyber-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t ? 'Düzenleniyor...' : 'Editing...'}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  {t ? 'Otomatik Düzenle' : 'Auto Edit'}
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 border border-red-500/30 bg-red-900/10 rounded-lg">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="text-red-400 text-xs font-mono">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - History */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="font-mono text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              {t ? 'Geçmiş' : 'History'}
            </h3>

            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 opacity-50">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <p className="text-[10px] font-mono">
                  {t ? 'Henüz düzenleme yapılmadı' : 'No edits yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadFromHistory(idx)}
                    className={`w-full p-3 rounded border text-left transition-all ${
                      selectedHistoryIndex === idx
                        ? 'border-cyber-primary bg-cyber-primary/10'
                        : 'border-glass-border hover:border-glass-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-400 uppercase">
                        {EDIT_MODES.find(m => m.id === item.mode)?.labelEn}
                      </span>
                      <span className="text-[8px] font-mono text-gray-600">
                        +{item.stats.wordCountAfter - item.stats.wordCountBefore} words
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] font-mono text-gray-500 truncate">
                      {item.edited.slice(0, 50)}...
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="glass-card p-5 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-mono text-xs font-bold text-cyber-success uppercase tracking-wider">
                {t ? 'Düzenlenmiş Prompt' : 'Edited Prompt'}
              </h3>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyber-success/20 text-cyber-success text-[10px] font-mono">
                  {result.changes.length} {t ? 'değişiklik' : 'changes'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDiff(!showDiff)}
                className="text-[10px] font-mono px-3 py-1.5 border border-glass-border rounded hover:border-cyber-primary/50 text-gray-400 hover:text-gray-200 transition-colors"
              >
                {showDiff ? (t ? 'Fark Görünümünü Gizle' : 'Hide Diff') : (t ? 'Fark Görünümü' : 'Show Diff')}
              </button>
              <button
                onClick={() => copyToClipboard(result.edited)}
                className="text-[10px] font-mono px-3 py-1.5 border border-glass-border rounded hover:border-cyber-primary/50 text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {t ? 'Kopyala' : 'Copy'}
              </button>
              <button
                onClick={applyEdit}
                className="text-[10px] font-mono font-bold px-4 py-1.5 rounded bg-cyber-success/20 text-cyber-success border border-cyber-success/40 hover:bg-cyber-success/30 transition-colors"
              >
                {t ? 'Uygula' : 'Apply'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-cyber-dark/60 rounded border border-glass-border">
            <div>
              <div className="text-[10px] font-mono text-gray-500 uppercase">{t ? 'Kelimeler' : 'Words'}</div>
              <div className="text-sm font-mono text-gray-300">
                {result.stats.wordCountBefore} → {result.stats.wordCountAfter}
                <span className={`ml-1 text-[10px] ${result.stats.wordCountAfter > result.stats.wordCountBefore ? 'text-cyber-primary' : 'text-cyber-success'}`}>
                  ({result.stats.wordCountAfter > result.stats.wordCountBefore ? '+' : ''}{result.stats.wordCountAfter - result.stats.wordCountBefore})
                </span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-gray-500 uppercase">{t ? 'Okunabilirlik' : 'Readability'}</div>
              <div className="text-sm font-mono text-gray-300">
                {result.stats.readabilityBefore}% → {result.stats.readabilityAfter}%
                <span className="ml-1 text-[10px] text-cyber-success">
                  (+{result.stats.readabilityAfter - result.stats.readabilityBefore}%)
                </span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-gray-500 uppercase">{t ? 'Boyut' : 'Size'}</div>
              <div className="text-sm font-mono text-gray-300">
                {Math.round(result.stats.originalLength / 1024 * 10) / 10}KB → {Math.round(result.stats.editedLength / 1024 * 10) / 10}KB
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-gray-500 uppercase">{t ? 'Mod' : 'Mode'}</div>
              <div className="text-sm font-mono text-cyber-primary uppercase">
                {EDIT_MODES.find(m => m.id === result.mode)?.labelEn}
              </div>
            </div>
          </div>

          {/* Changes List */}
          {result.changes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono text-gray-500 uppercase">
                {t ? 'Yapılan Değişiklikler' : 'Changes Made'}
              </h4>
              <div className="space-y-1">
                {result.changes.map((change, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[10px] font-mono p-2 bg-cyber-dark/40 rounded border border-glass-border">
                    <span className={`shrink-0 ${
                      change.type === 'add' ? 'text-green-400' :
                      change.type === 'remove' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {change.type === 'add' ? '+' : change.type === 'remove' ? '−' : '⟳'}
                    </span>
                    <span className="text-gray-300">{change.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono text-gray-500 uppercase">
                {t ? 'Ek Öneriler' : 'Additional Suggestions'}
              </h4>
              <div className="space-y-1">
                {result.suggestions.map((suggestion, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[10px] font-mono p-2 bg-cyber-primary/5 rounded border border-cyber-primary/20">
                    <span className="text-cyber-primary shrink-0">💡</span>
                    <span className="text-gray-400">{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diff/Result Display */}
          <div className="border border-glass-border rounded-lg p-4 bg-cyber-dark/40 max-h-96 overflow-y-auto">
            {showDiff && (
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-500 uppercase mb-2">
                <span>{t ? 'Orijinal' : 'Original'}</span>
                <span>{t ? 'Düzenlenmiş' : 'Edited'}</span>
              </div>
            )}
            {renderDiff(result.original, result.edited)}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 border border-cyan-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.5" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>
            <h4 className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
              {t ? 'Auto Edit Nedir?' : 'What is Auto Edit?'}
            </h4>
            <p className="font-mono text-[10px] text-gray-500 mt-1">
              {t
                ? 'Auto Edit, promptlarınızı otomatik olarak analiz eder ve grammer, netlik, yapı ve ton açısından iyileştirmeler yapar. Farklı düzenleme modları seçebilir ve profesyonel, samimi, teknik gibi ton stilleri belirleyebilirsiniz.'
                : 'Auto Edit automatically analyzes your prompts and makes improvements in grammar, clarity, structure, and tone. You can select different editing modes and choose tone styles like professional, casual, or technical.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
