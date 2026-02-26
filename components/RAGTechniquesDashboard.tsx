import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from '../i18n';
import {
  RAG_TECHNIQUES,
  RAG_CATEGORIES,
  type RAGTechnique,
  type RAGCategory,
  type RAGComplexity,
  searchTechniques,
  getCompatibleTechniques,
  recommendStrategy,
  buildCombinedPrompt,
} from '../services/ragTechniquesService';

interface RAGTechniquesDashboardProps {
  onApplyToPrompt?: (prompt: string, techniques: RAGTechnique[]) => void;
}

export default function RAGTechniquesDashboard({ onApplyToPrompt }: RAGTechniquesDashboardProps) {
  const { language } = useTranslation();
  const lang = language as 'tr' | 'en';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RAGCategory | 'all'>('all');
  const [selectedComplexity, setSelectedComplexity] = useState<RAGComplexity | 'all'>('all');
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
  const [expandedTechnique, setExpandedTechnique] = useState<string | null>(null);
  const [recommendQuery, setRecommendQuery] = useState('');
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter techniques
  const filteredTechniques = useMemo(() => {
    let result = RAG_TECHNIQUES;
    if (searchQuery) {
      result = searchTechniques(searchQuery, lang);
    }
    if (selectedCategory !== 'all') {
      result = result.filter((t) => t.category === selectedCategory);
    }
    if (selectedComplexity !== 'all') {
      result = result.filter((t) => t.complexity === selectedComplexity);
    }
    return result;
  }, [searchQuery, selectedCategory, selectedComplexity, lang]);

  // Grouped by category
  const groupedTechniques = useMemo(() => {
    const groups: Record<string, RAGTechnique[]> = {};
    for (const tech of filteredTechniques) {
      if (!groups[tech.category]) groups[tech.category] = [];
      groups[tech.category].push(tech);
    }
    return groups;
  }, [filteredTechniques]);

  // Recommendation
  const recommendation = useMemo(() => {
    if (!recommendQuery.trim()) return null;
    return recommendStrategy(recommendQuery);
  }, [recommendQuery]);

  const toggleTechniqueSelection = useCallback((id: string) => {
    setSelectedTechniques((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }, []);

  const handleApply = useCallback(() => {
    if (selectedTechniques.length === 0) return;
    const combined = buildCombinedPrompt(selectedTechniques, lang);
    const techniques = selectedTechniques
      .map((id) => RAG_TECHNIQUES.find((t) => t.id === id))
      .filter((t): t is RAGTechnique => t !== undefined);
    onApplyToPrompt?.(combined, techniques);
  }, [selectedTechniques, lang, onApplyToPrompt]);

  const handleCopyTemplate = useCallback((technique: RAGTechnique) => {
    navigator.clipboard.writeText(technique.promptTemplate);
    setCopiedId(technique.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const complexityBadge = (c: RAGComplexity) => {
    const colors: Record<RAGComplexity, string> = {
      low: 'bg-green-500/20 text-green-400 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      high: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    const labels: Record<RAGComplexity, Record<'tr' | 'en', string>> = {
      low: { tr: 'Kolay', en: 'Easy' },
      medium: { tr: 'Orta', en: 'Medium' },
      high: { tr: 'Ileri', en: 'Advanced' },
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${colors[c]}`}>
        {labels[c][lang]}
      </span>
    );
  };

  const effectivenessBar = (value: number) => (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${value * 100}%`,
            background: value >= 0.85 ? '#10b981' : value >= 0.75 ? '#f59e0b' : '#ef4444',
          }}
        />
      </div>
      <span className="text-[10px] text-gray-400 font-mono">{Math.round(value * 100)}%</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-cyan-400 font-display tracking-wider">
              {lang === 'tr' ? 'RAG TEKNIK KUTUPHANESI' : 'RAG TECHNIQUES LIBRARY'}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {lang === 'tr'
                ? `${RAG_TECHNIQUES.length} gelismis RAG teknigi | 7 kategori | Prompt sistemine entegre`
                : `${RAG_TECHNIQUES.length} advanced RAG techniques | 7 categories | Integrated with prompt system`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedTechniques.length > 0 && (
              <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 text-xs font-mono">
                {selectedTechniques.length} {lang === 'tr' ? 'secili' : 'selected'}
              </span>
            )}
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'tr' ? 'Teknik ara... (ornek: HyDE, reranking, graph)' : 'Search techniques... (e.g., HyDE, reranking, graph)'}
              className="w-full glass-input px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none font-mono"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as RAGCategory | 'all')}
            className="glass-input px-3 py-2 text-sm text-gray-200 focus:border-cyan-500/50 focus:outline-none font-mono"
          >
            <option value="all">{lang === 'tr' ? 'Tum Kategoriler' : 'All Categories'}</option>
            {RAG_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {lang === 'tr' ? cat.nameTr : cat.nameEn}
              </option>
            ))}
          </select>
          <select
            value={selectedComplexity}
            onChange={(e) => setSelectedComplexity(e.target.value as RAGComplexity | 'all')}
            className="glass-input px-3 py-2 text-sm text-gray-200 focus:border-cyan-500/50 focus:outline-none font-mono"
          >
            <option value="all">{lang === 'tr' ? 'Tum Zorluklar' : 'All Levels'}</option>
            <option value="low">{lang === 'tr' ? 'Kolay' : 'Easy'}</option>
            <option value="medium">{lang === 'tr' ? 'Orta' : 'Medium'}</option>
            <option value="high">{lang === 'tr' ? 'Ileri' : 'Advanced'}</option>
          </select>
        </div>
      </div>

      {/* Smart Recommendation */}
      <div className="bg-gray-900/60 border border-purple-500/30 rounded-lg p-5">
        <h3 className="text-sm font-bold text-purple-400 font-mono mb-3">
          {lang === 'tr' ? 'AKILLI STRATEJI ONERISI' : 'SMART STRATEGY RECOMMENDATION'}
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={recommendQuery}
            onChange={(e) => {
              setRecommendQuery(e.target.value);
              setShowRecommendation(false);
            }}
            placeholder={lang === 'tr' ? 'Sorgunuzu yazin, en uygun RAG stratejisini onerelim...' : 'Type your query and we\'ll recommend the best RAG strategy...'}
            className="flex-1 glass-input px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-purple-500/50 focus:outline-none font-mono"
          />
          <button
            onClick={() => setShowRecommendation(true)}
            disabled={!recommendQuery.trim()}
            className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 rounded text-purple-300 text-xs font-mono font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {lang === 'tr' ? 'ONER' : 'RECOMMEND'}
          </button>
        </div>

        {showRecommendation && recommendation && (
          <div className="mt-4 bg-purple-900/20 border border-purple-500/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-lg">{recommendation.primary.icon}</span>
              <div>
                <p className="text-sm font-bold text-purple-300 font-mono">
                  {lang === 'tr' ? 'Ana Strateji:' : 'Primary Strategy:'}{' '}
                  {lang === 'tr' ? recommendation.primary.nameTr : recommendation.primary.nameEn}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {lang === 'tr' ? recommendation.reasoningTr : recommendation.reasoning}
                </p>
              </div>
            </div>
            {recommendation.supporting.length > 0 && (
              <div className="border-t border-purple-500/10 pt-2">
                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">
                  {lang === 'tr' ? 'Destekleyici Teknikler' : 'Supporting Techniques'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {recommendation.supporting.map((t) => (
                    <span
                      key={t.id}
                      className="px-2 py-1 bg-glass-bg border border-glass-border rounded text-xs text-gray-300 font-mono"
                    >
                      {t.icon} {lang === 'tr' ? t.nameTr : t.nameEn}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => {
                const ids = [recommendation.primary.id, ...recommendation.supporting.map((t) => t.id)];
                setSelectedTechniques(ids);
              }}
              className="px-3 py-1.5 bg-purple-600/40 hover:bg-purple-600/60 border border-purple-500/30 rounded text-purple-200 text-xs font-mono font-bold transition-colors"
            >
              {lang === 'tr' ? 'BU STRATEJIYI SEC' : 'SELECT THIS STRATEGY'}
            </button>
          </div>
        )}
      </div>

      {/* Selected Techniques Action Bar */}
      {selectedTechniques.length > 0 && (
        <div className="bg-gray-900/60 border border-cyan-500/30 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-mono">
              {lang === 'tr' ? 'Secili Teknikler:' : 'Selected Techniques:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedTechniques.map((id) => {
                const tech = RAG_TECHNIQUES.find((t) => t.id === id);
                if (!tech) return null;
                return (
                  <span
                    key={id}
                    className="px-2 py-0.5 bg-cyan-500/15 border border-cyan-500/25 rounded text-[11px] text-cyan-300 font-mono flex items-center gap-1"
                  >
                    {tech.icon} {lang === 'tr' ? tech.nameTr : tech.nameEn}
                    <button
                      onClick={() => toggleTechniqueSelection(id)}
                      className="ml-1 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      x
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTechniques([])}
              className="px-3 py-1.5 text-gray-400 hover:text-gray-200 text-xs font-mono transition-colors"
            >
              {lang === 'tr' ? 'TEMIZLE' : 'CLEAR'}
            </button>
            {onApplyToPrompt && (
              <button
                onClick={handleApply}
                className="px-4 py-1.5 bg-cyan-600/40 hover:bg-cyan-600/60 border border-cyan-500/40 rounded text-cyan-200 text-xs font-mono font-bold transition-colors"
              >
                {lang === 'tr' ? 'PROMPT SISTEMINE UYGULA' : 'APPLY TO PROMPT SYSTEM'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {RAG_CATEGORIES.map((cat) => {
          const count = RAG_TECHNIQUES.filter((t) => t.category === cat.id).length;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(isActive ? 'all' : cat.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                isActive
                  ? 'bg-gray-800/80 border-cyan-500/40 ring-1 ring-cyan-500/20'
                  : 'bg-gray-900/40 border-glass-border hover:border-glass-border'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{cat.icon}</span>
                <span className="text-xs font-bold text-gray-200 font-mono">
                  {lang === 'tr' ? cat.nameTr : cat.nameEn}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                {lang === 'tr' ? cat.descriptionTr : cat.descriptionEn}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-[10px] text-gray-500 font-mono">
                  {count} {lang === 'tr' ? 'teknik' : 'techniques'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Techniques List */}
      <div className="space-y-4">
        {Object.entries(groupedTechniques).map(([catId, techniques]) => {
          const catInfo = RAG_CATEGORIES.find((c) => c.id === catId);
          if (!catInfo) return null;
          return (
            <div key={catId}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-1 h-5 rounded"
                  style={{ backgroundColor: catInfo.color }}
                />
                <h3 className="text-sm font-bold text-gray-300 font-mono">
                  {catInfo.icon} {lang === 'tr' ? catInfo.nameTr : catInfo.nameEn}
                </h3>
                <span className="text-[10px] text-gray-600 font-mono">
                  ({techniques.length})
                </span>
              </div>

              <div className="grid gap-2">
                {techniques.map((tech) => {
                  const isExpanded = expandedTechnique === tech.id;
                  const isSelected = selectedTechniques.includes(tech.id);
                  const compatible = getCompatibleTechniques(tech.id);

                  return (
                    <div
                      key={tech.id}
                      className={`bg-glass-bg border rounded-lg transition-all ${
                        isSelected
                          ? 'border-cyan-500/40 bg-cyan-900/10'
                          : 'border-glass-border hover:border-glass-border'
                      }`}
                    >
                      {/* Technique Header */}
                      <div className="p-4 flex items-center justify-between">
                        <div
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                          onClick={() => setExpandedTechnique(isExpanded ? null : tech.id)}
                        >
                          <span className="text-xl">{tech.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-gray-200 font-mono">
                                {lang === 'tr' ? tech.nameTr : tech.nameEn}
                              </h4>
                              {complexityBadge(tech.complexity)}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                              {lang === 'tr' ? tech.descriptionTr : tech.descriptionEn}
                            </p>
                          </div>
                          {effectivenessBar(tech.effectiveness)}
                        </div>

                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTechniqueSelection(tech.id);
                            }}
                            className={`px-3 py-1 rounded border text-[10px] font-mono font-bold transition-all ${
                              isSelected
                                ? 'bg-cyan-600/30 border-cyan-500/40 text-cyan-300'
                                : 'bg-glass-bg border-glass-border text-gray-400 hover:text-gray-200 hover:border-gray-500/50'
                            }`}
                          >
                            {isSelected
                              ? lang === 'tr' ? 'SECILI' : 'SELECTED'
                              : lang === 'tr' ? 'SEC' : 'SELECT'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedTechnique(isExpanded ? null : tech.id);
                            }}
                            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t border-glass-border p-4 space-y-4">
                          {/* When to use */}
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 font-mono">
                              {lang === 'tr' ? 'NE ZAMAN KULLANILIR' : 'WHEN TO USE'}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(lang === 'tr' ? tech.whenToUseTr : tech.whenToUseEn).map((use, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-glass-bg border border-glass-border rounded text-[10px] text-gray-300"
                                >
                                  {use}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Prompt Template */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-[10px] text-gray-500 uppercase font-bold font-mono">
                                {lang === 'tr' ? 'PROMPT SABLONU' : 'PROMPT TEMPLATE'}
                              </p>
                              <button
                                onClick={() => handleCopyTemplate(tech)}
                                className="text-[10px] text-gray-500 hover:text-cyan-400 font-mono transition-colors"
                              >
                                {copiedId === tech.id
                                  ? lang === 'tr' ? 'KOPYALANDI' : 'COPIED'
                                  : lang === 'tr' ? 'KOPYALA' : 'COPY'}
                              </button>
                            </div>
                            <pre className="bg-glass-bg border border-glass-border rounded p-3 text-[11px] text-gray-300 font-mono whitespace-pre-wrap leading-relaxed max-h-[250px] overflow-y-auto">
                              {tech.promptTemplate}
                            </pre>
                          </div>

                          {/* Parameters */}
                          {tech.parameters.length > 0 && (
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 font-mono">
                                {lang === 'tr' ? 'PARAMETRELER' : 'PARAMETERS'}
                              </p>
                              <div className="grid gap-1">
                                {tech.parameters.map((p) => (
                                  <div
                                    key={p.name}
                                    className="flex items-center gap-3 bg-glass-bg rounded px-2 py-1"
                                  >
                                    <code className="text-[11px] text-cyan-400 font-mono">
                                      [{p.name}]
                                    </code>
                                    <span className="text-[10px] text-gray-500">{p.type}</span>
                                    {p.required && (
                                      <span className="text-[10px] text-red-400">*</span>
                                    )}
                                    <span className="text-[10px] text-gray-400 flex-1">
                                      {lang === 'tr' ? p.descriptionTr : p.descriptionEn}
                                    </span>
                                    {p.defaultValue && (
                                      <span className="text-[10px] text-gray-600 font-mono">
                                        = {p.defaultValue}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Compatible Techniques */}
                          {compatible.length > 0 && (
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 font-mono">
                                {lang === 'tr' ? 'UYUMLU TEKNIKLER' : 'COMPATIBLE TECHNIQUES'}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {compatible.map((ct) => (
                                  <button
                                    key={ct.id}
                                    onClick={() => setExpandedTechnique(ct.id)}
                                    className="px-2 py-0.5 bg-glass-bg border border-glass-border rounded text-[10px] text-gray-300 hover:border-cyan-500/30 hover:text-cyan-400 transition-colors cursor-pointer"
                                  >
                                    {ct.icon} {lang === 'tr' ? ct.nameTr : ct.nameEn}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Notebook Reference */}
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-700/20">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
                              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {lang === 'tr' ? 'Kaynak:' : 'Source:'} RAG_Techniques-main/{tech.notebook}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredTechniques.length === 0 && (
          <div className="text-center py-12 text-gray-500 font-mono text-sm">
            {lang === 'tr' ? 'Aramayla eslesen teknik bulunamadi.' : 'No techniques match your search.'}
          </div>
        )}
      </div>
    </div>
  );
}
