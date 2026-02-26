import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from '../i18n';
import {
  RAGFLOW_AGENT_TEMPLATES,
  WORKFLOW_COMPONENTS,
  CHUNK_METHODS,
  type ChunkMethodInfo,
} from '../services/ragflowService';

type TabId = 'agents' | 'chunking' | 'workflow' | 'knowledgebase';
type AgentCategory = 'all' | 'research' | 'customer' | 'content' | 'data' | 'automation' | 'specialized';

interface RAGFlowDashboardProps {
  onApplyAgent?: (template: typeof RAGFLOW_AGENT_TEMPLATES[number]) => void;
  onApplyChunkMethod?: (method: ChunkMethodInfo) => void;
}

const AGENT_CATEGORIES: Array<{ id: AgentCategory; labelTr: string; labelEn: string; icon: string; count: number }> = [
  { id: 'all', labelTr: 'Tumunu Gor', labelEn: 'View All', icon: '\u{1F4CB}', count: RAGFLOW_AGENT_TEMPLATES.length },
  { id: 'research', labelTr: 'Arastirma', labelEn: 'Research', icon: '\u{1F50D}', count: RAGFLOW_AGENT_TEMPLATES.filter(t => t.category === 'research').length },
  { id: 'customer', labelTr: 'Musteri', labelEn: 'Customer', icon: '\u{1F4DE}', count: RAGFLOW_AGENT_TEMPLATES.filter(t => t.category === 'customer').length },
  { id: 'content', labelTr: 'Icerik', labelEn: 'Content', icon: '\u{270D}', count: RAGFLOW_AGENT_TEMPLATES.filter(t => t.category === 'content').length },
  { id: 'data', labelTr: 'Veri & Analiz', labelEn: 'Data & Analysis', icon: '\u{1F4CA}', count: RAGFLOW_AGENT_TEMPLATES.filter(t => t.category === 'data').length },
  { id: 'automation', labelTr: 'Otomasyon', labelEn: 'Automation', icon: '\u{2699}', count: RAGFLOW_AGENT_TEMPLATES.filter(t => t.category === 'automation').length },
  { id: 'specialized', labelTr: 'Uzmanlik', labelEn: 'Specialized', icon: '\u{1F3AF}', count: RAGFLOW_AGENT_TEMPLATES.filter(t => t.category === 'specialized').length },
];

export default function RAGFlowDashboard({ onApplyAgent, onApplyChunkMethod }: RAGFlowDashboardProps) {
  const { language } = useTranslation();
  const lang = language as 'tr' | 'en';

  const [activeTab, setActiveTab] = useState<TabId>('agents');
  const [agentCategory, setAgentCategory] = useState<AgentCategory>('all');
  const [agentSearch, setAgentSearch] = useState('');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [ragflowUrl, setRagflowUrl] = useState('http://localhost:9380');
  const [ragflowApiKey, setRagflowApiKey] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');

  // Filtered agents
  const filteredAgents = useMemo(() => {
    let result = RAGFLOW_AGENT_TEMPLATES;
    if (agentCategory !== 'all') {
      result = result.filter(t => t.category === agentCategory);
    }
    if (agentSearch) {
      const q = agentSearch.toLowerCase();
      result = result.filter(t => {
        const name = lang === 'tr' ? t.nameTr : t.nameEn;
        const desc = lang === 'tr' ? t.descriptionTr : t.descriptionEn;
        return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
      });
    }
    return result;
  }, [agentCategory, agentSearch, lang]);

  const testConnection = useCallback(async () => {
    setConnectionStatus('testing');
    try {
      const res = await fetch(`${ragflowUrl}/api/v1/datasets?page=1&page_size=1`, {
        headers: { Authorization: `Bearer ${ragflowApiKey}` },
      });
      if (res.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch {
      setConnectionStatus('error');
    }
  }, [ragflowUrl, ragflowApiKey]);

  const complexityBadge = (c: 'basic' | 'intermediate' | 'advanced') => {
    const colors = {
      basic: 'bg-green-500/20 text-green-400 border-green-500/30',
      intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    const labels = {
      basic: { tr: 'Temel', en: 'Basic' },
      intermediate: { tr: 'Orta', en: 'Intermediate' },
      advanced: { tr: 'Gelismis', en: 'Advanced' },
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${colors[c]}`}>
        {labels[c][lang]}
      </span>
    );
  };

  const tabs: Array<{ id: TabId; labelTr: string; labelEn: string; icon: string }> = [
    { id: 'agents', labelTr: 'Ajan Sablonlari', labelEn: 'Agent Templates', icon: '\u{1F916}' },
    { id: 'chunking', labelTr: 'Chunking Yontemleri', labelEn: 'Chunking Methods', icon: '\u{1F4C4}' },
    { id: 'workflow', labelTr: 'Workflow Bilesenleri', labelEn: 'Workflow Components', icon: '\u{2699}' },
    { id: 'knowledgebase', labelTr: 'Bilgi Tabani', labelEn: 'Knowledge Base', icon: '\u{1F4DA}' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold text-orange-400 font-display tracking-wider">
              {lang === 'tr' ? 'RAGFLOW ENTEGRASYON' : 'RAGFLOW INTEGRATION'}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {lang === 'tr'
                ? 'RAG motoru | 24 ajan sablonu | 12 chunking yontemi | 15 workflow bileseni'
                : 'RAG engine | 24 agent templates | 12 chunking methods | 15 workflow components'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-400' :
              connectionStatus === 'error' ? 'bg-red-400' :
              connectionStatus === 'testing' ? 'bg-yellow-400 animate-pulse' :
              'bg-gray-500'
            }`} />
            <span className="text-[10px] text-gray-500 font-mono uppercase">
              {connectionStatus === 'connected' ? (lang === 'tr' ? 'Bagli' : 'Connected') :
               connectionStatus === 'error' ? (lang === 'tr' ? 'Hata' : 'Error') :
               connectionStatus === 'testing' ? (lang === 'tr' ? 'Test ediliyor...' : 'Testing...') :
               (lang === 'tr' ? 'Baglantiyi test edin' : 'Test connection')}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 glass-card p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 rounded text-xs font-mono font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-orange-600/30 text-orange-300 border border-orange-500/30'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {lang === 'tr' ? tab.labelTr : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* ── Agent Templates Tab ─────────────────────────────────────────── */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          {/* Search + Category Filter */}
          <div className="flex gap-3">
            <input
              type="text"
              value={agentSearch}
              onChange={(e) => setAgentSearch(e.target.value)}
              placeholder={lang === 'tr' ? 'Ajan sablonu ara...' : 'Search agent templates...'}
              className="flex-1 glass-input px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-orange-500/50 focus:outline-none font-mono"
            />
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap gap-2">
            {AGENT_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setAgentCategory(cat.id)}
                className={`px-3 py-1.5 rounded border text-xs font-mono transition-all ${
                  agentCategory === cat.id
                    ? 'bg-orange-600/30 text-orange-300 border-orange-500/30'
                    : 'bg-gray-800/40 text-gray-500 border-glass-border hover:text-gray-300 hover:border-glass-border'
                }`}
              >
                {cat.icon} {lang === 'tr' ? cat.labelTr : cat.labelEn}
                <span className="ml-1.5 text-[10px] opacity-60">({cat.count})</span>
              </button>
            ))}
          </div>

          {/* Agent Cards */}
          <div className="grid gap-3">
            {filteredAgents.map(template => {
              if (!template) return null;
              const isExpanded = expandedAgent === template.id;
              return (
                <div
                  key={template.id}
                  className="glass-card hover:border-glass-border transition-all"
                >
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedAgent(isExpanded ? null : template.id)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">{template.icon || '🤖'}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-gray-200 font-mono">
                            {lang === 'tr' ? template.nameTr : template.nameEn}
                          </h4>
                          {complexityBadge(template.complexity)}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {lang === 'tr' ? template.descriptionTr : template.descriptionEn}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {onApplyAgent && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onApplyAgent(template); }}
                          className="px-3 py-1 bg-orange-600/30 hover:bg-orange-600/50 border border-orange-500/30 rounded text-[10px] text-orange-300 font-mono font-bold transition-colors"
                        >
                          {lang === 'tr' ? 'KULLAN' : 'USE'}
                        </button>
                      )}
                      <svg
                        width="14" height="14" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2"
                        className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-glass-border p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-glass-bg rounded p-2">
                          <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">
                            {lang === 'tr' ? 'Kategori' : 'Category'}
                          </p>
                          <p className="text-xs text-gray-300 font-mono capitalize">{template.category}</p>
                        </div>
                        <div className="bg-glass-bg rounded p-2">
                          <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">
                            {lang === 'tr' ? 'Karmasiklik' : 'Complexity'}
                          </p>
                          <p className="text-xs text-gray-300 font-mono capitalize">{template.complexity}</p>
                        </div>
                        <div className="bg-glass-bg rounded p-2">
                          <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">
                            {lang === 'tr' ? 'Dosya' : 'File'}
                          </p>
                          <p className="text-xs text-gray-400 font-mono truncate">{template.filename}</p>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        {lang === 'tr' ? 'Kaynak:' : 'Source:'} ragflow-main/agent/templates/{template.filename}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredAgents.length === 0 && (
              <div className="text-center py-8 text-gray-500 font-mono text-sm">
                {lang === 'tr' ? 'Aramayla eslesen sablon bulunamadi.' : 'No templates match your search.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Chunking Methods Tab ────────────────────────────────────────── */}
      {activeTab === 'chunking' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CHUNK_METHODS.map(method => (
            <div
              key={method.id}
              className="glass-card p-4 hover:border-orange-500/30 transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{method.icon}</span>
                <div>
                  <h4 className="text-sm font-bold text-gray-200 font-mono">
                    {lang === 'tr' ? method.nameTr : method.nameEn}
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {lang === 'tr' ? method.descriptionTr : method.descriptionEn}
                  </p>
                </div>
              </div>
              <div className="mb-3">
                <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">
                  {lang === 'tr' ? 'En Iyi:' : 'Best For:'}
                </p>
                <div className="flex flex-wrap gap-1">
                  {method.bestFor.map(bf => (
                    <span key={bf} className="px-1.5 py-0.5 bg-glass-bg border border-glass-border rounded text-[10px] text-gray-400 font-mono">
                      {bf}
                    </span>
                  ))}
                </div>
              </div>
              {onApplyChunkMethod && (
                <button
                  onClick={() => onApplyChunkMethod(method)}
                  className="w-full px-3 py-1.5 bg-glass-bg hover:bg-orange-600/30 border border-glass-border hover:border-orange-500/30 rounded text-[10px] text-gray-400 hover:text-orange-300 font-mono font-bold transition-all opacity-0 group-hover:opacity-100"
                >
                  {lang === 'tr' ? 'PROMPT OLARAK KULLAN' : 'USE AS PROMPT'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Workflow Components Tab ──────────────────────────────────────── */}
      {activeTab === 'workflow' && (
        <div className="space-y-4">
          {(['core', 'control', 'data', 'output'] as const).map(category => {
            const components = WORKFLOW_COMPONENTS.filter(c => c.category === category);
            const categoryLabels: Record<string, Record<'tr' | 'en', string>> = {
              core: { tr: 'Temel Bilesenler', en: 'Core Components' },
              control: { tr: 'Kontrol Akisi', en: 'Control Flow' },
              data: { tr: 'Veri Islemleri', en: 'Data Operations' },
              output: { tr: 'Cikti', en: 'Output' },
            };
            const categoryColors: Record<string, string> = {
              core: '#f59e0b',
              control: '#3b82f6',
              data: '#10b981',
              output: '#8b5cf6',
            };
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1 h-4 rounded" style={{ backgroundColor: categoryColors[category] }} />
                  <h3 className="text-xs font-bold text-gray-400 font-mono uppercase">
                    {categoryLabels[category][lang]}
                  </h3>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {components.map(comp => (
                    <div
                      key={comp.id}
                      className="glass-card p-3 flex items-center gap-3 hover:border-glass-border transition-all"
                    >
                      <span className="text-lg">{comp.icon}</span>
                      <div>
                        <h5 className="text-xs font-bold text-gray-200 font-mono">
                          {lang === 'tr' ? comp.nameTr : comp.nameEn}
                        </h5>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {lang === 'tr' ? comp.descriptionTr : comp.descriptionEn}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Knowledge Base Tab (Connection) ──────────────────────────────── */}
      {activeTab === 'knowledgebase' && (
        <div className="space-y-4">
          {/* Connection Settings */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-orange-400 font-mono">
              {lang === 'tr' ? 'RAGFLOW SUNUCU BAGLANTISI' : 'RAGFLOW SERVER CONNECTION'}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] text-gray-500 font-mono uppercase mb-1">
                  {lang === 'tr' ? 'Sunucu URL' : 'Server URL'}
                </label>
                <input
                  type="text"
                  value={ragflowUrl}
                  onChange={(e) => setRagflowUrl(e.target.value)}
                  placeholder="http://localhost:9380"
                  className="w-full glass-input px-3 py-2 text-sm text-gray-200 font-mono focus:border-orange-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 font-mono uppercase mb-1">
                  {lang === 'tr' ? 'API Anahtari' : 'API Key'}
                </label>
                <input
                  type="password"
                  value={ragflowApiKey}
                  onChange={(e) => setRagflowApiKey(e.target.value)}
                  placeholder="ragflow-xxxxxxxx"
                  className="w-full glass-input px-3 py-2 text-sm text-gray-200 font-mono focus:border-orange-500/50 focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={testConnection}
              disabled={connectionStatus === 'testing' || !ragflowApiKey}
              className="px-4 py-2 bg-orange-600/30 hover:bg-orange-600/50 border border-orange-500/30 rounded text-orange-300 text-xs font-mono font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {connectionStatus === 'testing'
                ? (lang === 'tr' ? 'TEST EDILIYOR...' : 'TESTING...')
                : (lang === 'tr' ? 'BAGLANTIYI TEST ET' : 'TEST CONNECTION')}
            </button>
          </div>

          {/* Feature Overview */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-gray-300 font-mono mb-3">
              {lang === 'tr' ? 'RAGFLOW YETENEKLERI' : 'RAGFLOW CAPABILITIES'}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: '\u{1F4DA}', titleTr: 'Bilgi Tabani Yonetimi', titleEn: 'Knowledge Base Management', descTr: 'Dataset olusturma, belge yukleme, chunk yonetimi', descEn: 'Dataset creation, document upload, chunk management' },
                { icon: '\u{1F50D}', titleTr: 'Derin Belge Anlama', titleEn: 'Deep Document Understanding', descTr: 'PDF, DOCX, gorsel, tablo, OCR destegi', descEn: 'PDF, DOCX, images, tables, OCR support' },
                { icon: '\u{1F578}', titleTr: 'GraphRAG & RAPTOR', titleEn: 'GraphRAG & RAPTOR', descTr: 'Bilgi grafi olusturma ve hiyerarsik ozetleme', descEn: 'Knowledge graph creation and hierarchical summarization' },
                { icon: '\u{1F916}', titleTr: 'Ajan Workflow Motoru', titleEn: 'Agent Workflow Engine', descTr: '24 hazir sablon, surukle-birak canvas', descEn: '24 ready templates, drag-drop canvas' },
                { icon: '\u{1F4AC}', titleTr: 'RAG Sohbet', titleEn: 'RAG Chat', descTr: 'Bilgi tabanina dayali sohbet ve alinti', descEn: 'Knowledge-based chat with citations' },
                { icon: '\u{1F310}', titleTr: 'Veri Konnektorleri', titleEn: 'Data Connectors', descTr: 'Confluence, S3, Notion, Google Drive, Web', descEn: 'Confluence, S3, Notion, Google Drive, Web' },
                { icon: '\u{1F9E9}', titleTr: 'Akilli Chunking', titleEn: 'Smart Chunking', descTr: '12 farkli chunking yontemi ile gorsellestirme', descEn: '12 different chunking methods with visualization' },
                { icon: '\u{1F50C}', titleTr: 'MCP Protokolu', titleEn: 'MCP Protocol', descTr: 'Model Context Protocol sunucu destegi', descEn: 'Model Context Protocol server support' },
              ].map((feat, i) => (
                <div key={i} className="bg-glass-bg rounded-lg p-3 flex items-start gap-3">
                  <span className="text-lg mt-0.5">{feat.icon}</span>
                  <div>
                    <h5 className="text-xs font-bold text-gray-200 font-mono">
                      {lang === 'tr' ? feat.titleTr : feat.titleEn}
                    </h5>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {lang === 'tr' ? feat.descTr : feat.descEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Docker Setup Guide */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-gray-300 font-mono mb-3">
              {lang === 'tr' ? 'HIZLI KURULUM' : 'QUICK SETUP'}
            </h3>
            <pre className="bg-glass-bg border border-glass-border rounded p-3 text-[11px] text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
{`# RAGFlow Docker kurulumu
cd ragflow-main/docker

# .env dosyasini ayarlayin
# DOC_ENGINE=elasticsearch
# RAGFLOW_IMAGE=infiniflow/ragflow:latest

# Servisleri baslatin
docker compose up -d

# Varsayilan erisim:
# Web UI:  http://localhost
# API:     http://localhost:9380/api/v1
# Admin:   http://localhost:9381`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
