/**
 * Prompt Template Marketplace — Community-driven prompt templates.
 * Users can share, rate, and browse prompt templates.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '../services/apiClient';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  framework: string;
  prompt: string;
  authorId: string;
  authorName: string;
  rating: number;
  ratingCount: number;
  downloads: number;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  onUseTemplate?: (template: Template) => void;
}

const CATEGORIES = [
  { id: 'all', labelTr: 'Tümü', labelEn: 'All' },
  { id: 'coding', labelTr: 'Kodlama', labelEn: 'Coding' },
  { id: 'writing', labelTr: 'Yazı', labelEn: 'Writing' },
  { id: 'analysis', labelTr: 'Analiz', labelEn: 'Analysis' },
  { id: 'creative', labelTr: 'Yaratıcı', labelEn: 'Creative' },
  { id: 'education', labelTr: 'Eğitim', labelEn: 'Education' },
  { id: 'business', labelTr: 'İş', labelEn: 'Business' },
  { id: 'marketing', labelTr: 'Pazarlama', labelEn: 'Marketing' },
];

export default function PromptTemplateMarketplace({ onUseTemplate }: Props) {
  const { t, language } = useTranslation();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'rating' | 'downloads' | 'newest'>('rating');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'coding',
    framework: 'universal',
    prompt: '',
    tags: '',
    isPublic: true,
  });

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/templates`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load templates');
      setTemplates(data.templates || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const filtered = useMemo(() => {
    let list = [...templates];

    if (selectedCategory !== 'all') {
      list = list.filter(t => t.category === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    switch (sortBy) {
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'downloads':
        list.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'newest':
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return list;
  }, [templates, selectedCategory, search, sortBy]);

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUseTemplate = (template: Template) => {
    if (onUseTemplate) {
      onUseTemplate(template);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/templates`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTemplate,
          tags: newTemplate.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create template');
      setShowCreateModal(false);
      setNewTemplate({ name: '', description: '', category: 'coding', framework: 'universal', prompt: '', tags: '', isPublic: true });
      loadTemplates();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRateTemplate = async (templateId: string, rating: number) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/templates/${templateId}/rate`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      if (res.ok) loadTemplates();
    } catch (e: any) {
      console.error('Rating failed:', e.message);
    }
  };

  return (
    <div className="text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-cyber-primary">
            {t.ui.marketplaceTitle}
          </h1>
          <p className="text-gray-400 mt-1">
            {t.ui.marketplaceDesc}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-cyber-primary text-black font-semibold rounded-lg hover:bg-cyber-primary/80 transition-colors"
        >
          + {t.ui.marketplaceCreateBtn}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder={t.ui.marketplaceSearchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-cyber-dark border border-cyber-primary/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyber-primary"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-cyber-dark border border-cyber-primary/30 rounded-lg text-white focus:outline-none focus:border-cyber-primary"
        >
          {CATEGORIES.map(cat => (
            <option key={cat.id} value={cat.id}>
              {language === 'tr' ? cat.labelTr : cat.labelEn}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 bg-cyber-dark border border-cyber-primary/30 rounded-lg text-white focus:outline-none focus:border-cyber-primary"
        >
          <option value="rating">{t.ui.marketplaceSortRating}</option>
          <option value="downloads">{t.ui.marketplaceSortDownloads}</option>
          <option value="newest">{t.ui.marketplaceSortNewest}</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-cyber-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-400">{t.ui.marketplaceLoading}</p>
        </div>
      )}

      {/* Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(template => (
            <div
              key={template.id}
              className="bg-cyber-dark border border-cyber-primary/20 rounded-xl p-4 hover:border-cyber-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-white">{template.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                </div>
                <span className="px-2 py-1 bg-cyber-primary/20 text-cyber-primary text-xs rounded">
                  {template.category}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mt-3">
                {template.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400">★</span>
                    <span className="text-sm text-gray-300">{template.rating.toFixed(1)}</span>
                    <span className="text-xs text-gray-500">({template.ratingCount})</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span className="text-sm">{template.downloads}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(template.id, template.prompt)}
                    className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  >
                    {copiedId === template.id ? t.ui.marketplaceCopied : t.ui.marketplaceCopy}
                  </button>
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="px-3 py-1 text-sm bg-cyber-primary text-black font-semibold rounded hover:bg-cyber-primary/80 transition-colors"
                  >
                    {t.ui.marketplaceUse}
                  </button>
                </div>
              </div>

              {/* Expanded view */}
              {expandedId === template.id && (
                <div className="mt-4 p-3 bg-black/30 rounded-lg">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-auto max-h-48">
                    {template.prompt}
                  </pre>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => handleRateTemplate(template.id, star)}
                          className={`text-lg ${star <= Math.round(template.rating) ? 'text-yellow-400' : 'text-gray-600'}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      {template.authorName} • {new Date(template.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                className="w-full mt-3 text-sm text-cyber-primary hover:underline"
              >
                {expandedId === template.id ? t.ui.marketplaceHide : t.ui.marketplaceViewDetails}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">{t.ui.marketplaceNoResults}</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border border-cyber-primary/30 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold font-display text-white mb-4">
              {t.ui.marketplaceNewTitle}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t.ui.marketplaceNameLabel}</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full px-4 py-2 bg-black/30 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyber-primary"
                  placeholder={t.ui.marketplaceNamePlaceholder}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">{t.ui.marketplaceDescLabel}</label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  className="w-full px-4 py-2 bg-black/30 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyber-primary h-20"
                  placeholder={t.ui.marketplaceDescPlaceholder}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.ui.marketplaceCategoryLabel}</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                    className="w-full px-4 py-2 bg-black/30 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyber-primary"
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {language === 'tr' ? cat.labelTr : cat.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{'Framework'}</label>
                  <select
                    value={newTemplate.framework}
                    onChange={(e) => setNewTemplate({ ...newTemplate, framework: e.target.value })}
                    className="w-full px-4 py-2 bg-black/30 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyber-primary"
                  >
                    <option value="universal">Universal</option>
                    <option value="chain-of-thought">Chain of Thought</option>
                    <option value="react">ReAct</option>
                    <option value="tree-of-thought">Tree of Thought</option>
                    <option value="role-playing">Role Playing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">{t.ui.marketplaceTemplateLabel}</label>
                <textarea
                  value={newTemplate.prompt}
                  onChange={(e) => setNewTemplate({ ...newTemplate, prompt: e.target.value })}
                  className="w-full px-4 py-2 bg-black/30 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyber-primary h-40 font-mono text-sm"
                  placeholder={t.ui.marketplaceTemplatePlaceholder}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">{t.ui.marketplaceTagsLabel}</label>
                <input
                  type="text"
                  value={newTemplate.tags}
                  onChange={(e) => setNewTemplate({ ...newTemplate, tags: e.target.value })}
                  className="w-full px-4 py-2 bg-black/30 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyber-primary"
                  placeholder={t.ui.marketplaceTagsPlaceholder}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newTemplate.isPublic}
                  onChange={(e) => setNewTemplate({ ...newTemplate, isPublic: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-300">
                  {t.ui.marketplacePublic}
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                {t.ui.marketplaceCancel}
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={!newTemplate.name || !newTemplate.prompt}
                className="px-6 py-2 bg-cyber-primary text-black font-semibold rounded-lg hover:bg-cyber-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t.ui.marketplaceCreate}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
