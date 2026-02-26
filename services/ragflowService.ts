/**
 * RAGFlow Service - TypeScript API Client
 * Integrates RAGFlow's knowledge base, chat, agent, and document APIs
 * into the Super Reasoning dashboard.
 *
 * Based on: ragflow-main/sdk/python/ragflow_sdk/
 * API spec: ragflow-main/api/apps/sdk/
 */

const RAGFLOW_BASE = import.meta.env?.VITE_RAGFLOW_URL || 'http://localhost:9380/api/v1';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RagflowDataset {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  embedding_model: string;
  chunk_method: string;
  chunk_count: number;
  document_count: number;
  permission: 'me' | 'team';
  create_time: string;
  update_time: string;
  parser_config?: Record<string, unknown>;
}

export interface RagflowDocument {
  id: string;
  name: string;
  dataset_id: string;
  size: number;
  type: string;
  chunk_count: number;
  token_count: number;
  progress: number;
  status: 'UNSTART' | 'RUNNING' | 'CANCEL' | 'DONE' | 'FAIL';
  run: string;
  create_time: string;
  update_time: string;
}

export interface RagflowChunk {
  id: string;
  content: string;
  document_id: string;
  dataset_id: string;
  important_keywords: string[];
  positions: number[][];
  available: boolean;
}

export interface RagflowChat {
  id: string;
  name: string;
  description?: string;
  dataset_ids: string[];
  llm: {
    model_name: string;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
  };
  prompt?: {
    system?: string;
    similarity_threshold?: number;
    top_n?: number;
  };
  create_time: string;
}

export interface RagflowAgent {
  id: string;
  title: string;
  description?: string;
  canvas_type?: string;
  dsl?: Record<string, unknown>;
  create_time: string;
  update_time: string;
}

export interface RagflowMessage {
  role: 'user' | 'assistant';
  content: string;
  reference?: {
    chunks: Array<{
      content: string;
      document_name: string;
      dataset_id: string;
      similarity: number;
    }>;
  };
}

export interface RagflowSession {
  id: string;
  name: string;
  chat_id?: string;
  agent_id?: string;
  messages: RagflowMessage[];
  create_time: string;
}

export interface RagflowSearchResult {
  chunks: Array<{
    content: string;
    document_name: string;
    dataset_id: string;
    similarity: number;
    highlight?: string;
  }>;
  total: number;
}

export type ChunkMethod =
  | 'naive'
  | 'hierarchical'
  | 'semantic'
  | 'qa'
  | 'manual'
  | 'table'
  | 'paper'
  | 'book'
  | 'laws'
  | 'presentation'
  | 'picture'
  | 'one'
  | 'email';

export interface RagflowAgentTemplate {
  id: number;
  title: Record<string, string>;
  description: Record<string, string>;
  canvas_type: string;
  dsl: Record<string, unknown>;
}

// ── 24 Pre-built Agent Templates (from ragflow-main/agent/templates/) ─────────

export const RAGFLOW_AGENT_TEMPLATES: Array<{
  id: string;
  filename: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  category: 'research' | 'customer' | 'content' | 'data' | 'automation' | 'specialized';
  icon: string;
  complexity: 'basic' | 'intermediate' | 'advanced';
}> = [
  {
    id: 'deep_research',
    filename: 'deep_research.json',
    nameTr: 'Derin Arastirma',
    nameEn: 'Deep Research',
    descriptionTr: 'Cok adimli, cok kaynakli stratejik arastirma raporu olusturur.',
    descriptionEn: 'Multi-step, multi-source strategic research report generation.',
    category: 'research',
    icon: '\u{1F50D}',
    complexity: 'advanced',
  },
  {
    id: 'deep_search_r',
    filename: 'deep_search_r.json',
    nameTr: 'Derin Arama (R)',
    nameEn: 'Deep Search (R)',
    descriptionTr: 'Gelismis arama ve retrieval ile derin arastirma.',
    descriptionEn: 'Advanced search and retrieval for deep research.',
    category: 'research',
    icon: '\u{1F9ED}',
    complexity: 'advanced',
  },
  {
    id: 'web_search_assistant',
    filename: 'web_search_assistant.json',
    nameTr: 'Web Arama Asistani',
    nameEn: 'Web Search Assistant',
    descriptionTr: 'Internet uzerinden bilgi arama ve derleme.',
    descriptionEn: 'Web-based information search and compilation.',
    category: 'research',
    icon: '\u{1F310}',
    complexity: 'basic',
  },
  {
    id: 'customer_service',
    filename: 'customer_service.json',
    nameTr: 'Musteri Hizmeti',
    nameEn: 'Customer Service',
    descriptionTr: 'Otomatik musteri destek ve yonlendirme.',
    descriptionEn: 'Automated customer support and routing.',
    category: 'customer',
    icon: '\u{1F4DE}',
    complexity: 'intermediate',
  },
  {
    id: 'customer_support',
    filename: 'customer_support.json',
    nameTr: 'Musteri Destek (Gelismis)',
    nameEn: 'Customer Support (Advanced)',
    descriptionTr: 'Gelismis musteri destek is akislari ve eskalasyon.',
    descriptionEn: 'Advanced customer support workflows with escalation.',
    category: 'customer',
    icon: '\u{1F3E2}',
    complexity: 'advanced',
  },
  {
    id: 'customer_review_analysis',
    filename: 'customer_review_analysis.json',
    nameTr: 'Musteri Yorum Analizi',
    nameEn: 'Customer Review Analysis',
    descriptionTr: 'Musteri yorumlari sentiment ve trend analizi.',
    descriptionEn: 'Customer review sentiment and trend analysis.',
    category: 'customer',
    icon: '\u{2B50}',
    complexity: 'intermediate',
  },
  {
    id: 'ecommerce_customer_service',
    filename: 'ecommerce_customer_service_workflow.json',
    nameTr: 'E-Ticaret Musteri Hizmeti',
    nameEn: 'E-Commerce Customer Service',
    descriptionTr: 'E-ticaret siparis/iade/sorgulama is akisi.',
    descriptionEn: 'E-commerce order/return/inquiry workflow.',
    category: 'customer',
    icon: '\u{1F6D2}',
    complexity: 'advanced',
  },
  {
    id: 'seo_blog',
    filename: 'seo_blog.json',
    nameTr: 'SEO Blog Yazari',
    nameEn: 'SEO Blog Writer',
    descriptionTr: 'SEO optimizeli blog icerigi uretimi.',
    descriptionEn: 'SEO-optimized blog content generation.',
    category: 'content',
    icon: '\u{270D}',
    complexity: 'basic',
  },
  {
    id: 'generate_seo_blog',
    filename: 'generate_SEO_blog.json',
    nameTr: 'SEO Blog Uretici',
    nameEn: 'SEO Blog Generator',
    descriptionTr: 'Anahtar kelime bazli otomatik SEO blog olusturma.',
    descriptionEn: 'Keyword-based automatic SEO blog generation.',
    category: 'content',
    icon: '\u{1F4DD}',
    complexity: 'intermediate',
  },
  {
    id: 'market_seo_blog',
    filename: 'market_generate_seo_blog.json',
    nameTr: 'Pazar Odakli SEO Blog',
    nameEn: 'Market-Focused SEO Blog',
    descriptionTr: 'Pazar arastirmasi + SEO blog birlesiik uretimi.',
    descriptionEn: 'Market research + SEO blog combined generation.',
    category: 'content',
    icon: '\u{1F4C8}',
    complexity: 'advanced',
  },
  {
    id: 'image_lingo',
    filename: 'image_lingo.json',
    nameTr: 'Gorsel Analiz & Metin',
    nameEn: 'Image Analysis & Text',
    descriptionTr: 'Gorsellerden metin uretimi ve analiz.',
    descriptionEn: 'Image-to-text generation and analysis.',
    category: 'content',
    icon: '\u{1F5BC}',
    complexity: 'intermediate',
  },
  {
    id: 'sql_assistant',
    filename: 'sql_assistant.json',
    nameTr: 'SQL Asistani',
    nameEn: 'SQL Assistant',
    descriptionTr: 'Dogal dilde SQL sorgu olusturma ve calistirma.',
    descriptionEn: 'Natural language SQL query generation and execution.',
    category: 'data',
    icon: '\u{1F4BE}',
    complexity: 'intermediate',
  },
  {
    id: 'stock_research_report',
    filename: 'stock_research_report.json',
    nameTr: 'Hisse Senedi Arastirma Raporu',
    nameEn: 'Stock Research Report',
    descriptionTr: 'Finansal veri analizi ve yatirim raporu.',
    descriptionEn: 'Financial data analysis and investment report.',
    category: 'data',
    icon: '\u{1F4B9}',
    complexity: 'advanced',
  },
  {
    id: 'knowledge_base_report',
    filename: 'knowledge_base_report.json',
    nameTr: 'Bilgi Tabani Raporu',
    nameEn: 'Knowledge Base Report',
    descriptionTr: 'Bilgi tabanindan otomatik rapor olusturma.',
    descriptionEn: 'Automatic report generation from knowledge base.',
    category: 'data',
    icon: '\u{1F4DA}',
    complexity: 'intermediate',
  },
  {
    id: 'knowledge_base_report_r',
    filename: 'knowledge_base_report_r.json',
    nameTr: 'Bilgi Tabani Raporu (R)',
    nameEn: 'Knowledge Base Report (R)',
    descriptionTr: 'Gelismis retrieval ile bilgi tabani raporu.',
    descriptionEn: 'Knowledge base report with advanced retrieval.',
    category: 'data',
    icon: '\u{1F4D6}',
    complexity: 'advanced',
  },
  {
    id: 'technical_docs_qa',
    filename: 'technical_docs_qa.json',
    nameTr: 'Teknik Dokumantasyon QA',
    nameEn: 'Technical Docs Q&A',
    descriptionTr: 'Teknik belgeler uzerinden soru-yanit sistemi.',
    descriptionEn: 'Question-answer system over technical documentation.',
    category: 'specialized',
    icon: '\u{1F4CB}',
    complexity: 'intermediate',
  },
  {
    id: 'cv_analysis',
    filename: 'cv_analysis_and_candidate_evaluation.json',
    nameTr: 'CV Analiz & Aday Degerlendirme',
    nameEn: 'CV Analysis & Candidate Evaluation',
    descriptionTr: 'Ozgecmis analizi ve aday puanlama sistemi.',
    descriptionEn: 'Resume analysis and candidate scoring system.',
    category: 'specialized',
    icon: '\u{1F464}',
    complexity: 'advanced',
  },
  {
    id: 'trip_planner',
    filename: 'trip_planner.json',
    nameTr: 'Seyahat Planlayici',
    nameEn: 'Trip Planner',
    descriptionTr: 'Kisisellestirilmis seyahat planlama ve oneri.',
    descriptionEn: 'Personalized travel planning and recommendations.',
    category: 'specialized',
    icon: '\u{2708}',
    complexity: 'intermediate',
  },
  {
    id: 'advanced_ingestion',
    filename: 'advanced_ingestion_pipeline.json',
    nameTr: 'Gelismis Veri Alma Pipeline',
    nameEn: 'Advanced Ingestion Pipeline',
    descriptionTr: 'Cok katmanli belge isleme ve indeksleme.',
    descriptionEn: 'Multi-layer document processing and indexing.',
    category: 'automation',
    icon: '\u{2699}',
    complexity: 'advanced',
  },
  {
    id: 'choose_kb_agent',
    filename: 'choose_your_knowledge_base_agent.json',
    nameTr: 'Bilgi Tabani Secici Ajan',
    nameEn: 'Knowledge Base Selector Agent',
    descriptionTr: 'Sorguya uygun bilgi tabanini otomatik secer.',
    descriptionEn: 'Automatically selects the right knowledge base for queries.',
    category: 'automation',
    icon: '\u{1F4E6}',
    complexity: 'intermediate',
  },
  {
    id: 'choose_kb_workflow',
    filename: 'choose_your_knowledge_base_workflow.json',
    nameTr: 'Bilgi Tabani Secici Workflow',
    nameEn: 'Knowledge Base Selector Workflow',
    descriptionTr: 'Workflow tabanli bilgi tabani yonlendirme.',
    descriptionEn: 'Workflow-based knowledge base routing.',
    category: 'automation',
    icon: '\u{1F500}',
    complexity: 'intermediate',
  },
  {
    id: 'chunk_summary',
    filename: 'chunk_summary.json',
    nameTr: 'Chunk Ozetleme',
    nameEn: 'Chunk Summary',
    descriptionTr: 'Chunk bazli otomatik ozet olusturma.',
    descriptionEn: 'Chunk-based automatic summary generation.',
    category: 'automation',
    icon: '\u{1F4C3}',
    complexity: 'basic',
  },
  {
    id: 'title_chunker',
    filename: 'title_chunker.json',
    nameTr: 'Baslik Tabanli Chunking',
    nameEn: 'Title-Based Chunking',
    descriptionTr: 'Baslik yapisi ile akilli belge bolme.',
    descriptionEn: 'Smart document splitting based on title structure.',
    category: 'automation',
    icon: '\u{1F4D1}',
    complexity: 'basic',
  },
  {
    id: 'user_interaction',
    filename: 'user_interaction.json',
    nameTr: 'Kullanici Etkilesimi',
    nameEn: 'User Interaction',
    descriptionTr: 'Kullanici etkiselim akisini yoneten ajan.',
    descriptionEn: 'Agent managing user interaction flow.',
    category: 'automation',
    icon: '\u{1F465}',
    complexity: 'basic',
  },
];

// ── Workflow Component Definitions ────────────────────────────────────────────

export interface WorkflowComponent {
  id: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  icon: string;
  category: 'core' | 'control' | 'data' | 'output';
}

export const WORKFLOW_COMPONENTS: WorkflowComponent[] = [
  { id: 'llm', nameTr: 'LLM', nameEn: 'LLM', descriptionTr: 'Dil modeli cagirma', descriptionEn: 'Language model invocation', icon: '\u{1F9E0}', category: 'core' },
  { id: 'agent_with_tools', nameTr: 'Aracli Ajan', nameEn: 'Agent with Tools', descriptionTr: 'Arac cagiran otonom ajan', descriptionEn: 'Autonomous agent with tool calling', icon: '\u{1F916}', category: 'core' },
  { id: 'message', nameTr: 'Mesaj', nameEn: 'Message', descriptionTr: 'Kullaniciya mesaj gonder', descriptionEn: 'Send message to user', icon: '\u{1F4AC}', category: 'output' },
  { id: 'categorize', nameTr: 'Kategorilestir', nameEn: 'Categorize', descriptionTr: 'Metni kategorilere ayir', descriptionEn: 'Classify text into categories', icon: '\u{1F3F7}', category: 'core' },
  { id: 'switch', nameTr: 'Kosullu Dallanma', nameEn: 'Switch', descriptionTr: 'Kosul bazli yonlendirme', descriptionEn: 'Conditional branching', icon: '\u{1F500}', category: 'control' },
  { id: 'loop', nameTr: 'Dongu', nameEn: 'Loop', descriptionTr: 'Yinelemeli dongu islemi', descriptionEn: 'Iterative loop processing', icon: '\u{1F501}', category: 'control' },
  { id: 'iteration', nameTr: 'Iterasyon', nameEn: 'Iteration', descriptionTr: 'Liste uzerinde iterasyon', descriptionEn: 'Iterate over a list', icon: '\u{1F504}', category: 'control' },
  { id: 'invoke', nameTr: 'HTTP Cagri', nameEn: 'HTTP Invoke', descriptionTr: 'Harici API cagirma', descriptionEn: 'External API invocation', icon: '\u{1F310}', category: 'data' },
  { id: 'excel_processor', nameTr: 'Excel Islemci', nameEn: 'Excel Processor', descriptionTr: 'Excel dosya islemleri', descriptionEn: 'Excel file operations', icon: '\u{1F4CA}', category: 'data' },
  { id: 'docs_generator', nameTr: 'Belge Uretici', nameEn: 'Docs Generator', descriptionTr: 'Belge olusturma', descriptionEn: 'Document generation', icon: '\u{1F4C4}', category: 'output' },
  { id: 'data_operations', nameTr: 'Veri Islemleri', nameEn: 'Data Operations', descriptionTr: 'Veri donusturme islemleri', descriptionEn: 'Data transformation operations', icon: '\u{2699}', category: 'data' },
  { id: 'list_operations', nameTr: 'Liste Islemleri', nameEn: 'List Operations', descriptionTr: 'Liste manipulasyon', descriptionEn: 'List manipulation', icon: '\u{1F4CB}', category: 'data' },
  { id: 'string_transform', nameTr: 'Metin Donusturme', nameEn: 'String Transform', descriptionTr: 'Metin formatini degistir', descriptionEn: 'Text format transformation', icon: '\u{1F524}', category: 'data' },
  { id: 'variable_assigner', nameTr: 'Degisken Atama', nameEn: 'Variable Assigner', descriptionTr: 'Degisken deger atama', descriptionEn: 'Assign variable values', icon: '\u{1F4DD}', category: 'control' },
  { id: 'begin', nameTr: 'Baslangic', nameEn: 'Begin', descriptionTr: 'Workflow baslangic noktasi', descriptionEn: 'Workflow start point', icon: '\u{25B6}', category: 'control' },
];

// ── Chunking Method Definitions ───────────────────────────────────────────────

export interface ChunkMethodInfo {
  id: ChunkMethod;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  icon: string;
  bestFor: string[];
}

export const CHUNK_METHODS: ChunkMethodInfo[] = [
  { id: 'naive', nameTr: 'Standart', nameEn: 'General', descriptionTr: 'Genel amacli recursive chunking', descriptionEn: 'General-purpose recursive chunking', icon: '\u{1F4C4}', bestFor: ['txt', 'md', 'html'] },
  { id: 'hierarchical', nameTr: 'Hiyerarsik', nameEn: 'Hierarchical', descriptionTr: 'Baslik yapisina gore bolme', descriptionEn: 'Split by heading structure', icon: '\u{1F332}', bestFor: ['md', 'docx', 'pdf'] },
  { id: 'semantic', nameTr: 'Anlamsal', nameEn: 'Semantic', descriptionTr: 'Anlamsal sinirlara gore bolme', descriptionEn: 'Split by semantic boundaries', icon: '\u{1F9E9}', bestFor: ['txt', 'pdf', 'docx'] },
  { id: 'qa', nameTr: 'Soru-Yanit', nameEn: 'Q&A', descriptionTr: 'Soru-cevap ciftleri cikar', descriptionEn: 'Extract question-answer pairs', icon: '\u{2753}', bestFor: ['faq', 'docs'] },
  { id: 'table', nameTr: 'Tablo', nameEn: 'Table', descriptionTr: 'Tablo verileri icin optimize', descriptionEn: 'Optimized for tabular data', icon: '\u{1F4CA}', bestFor: ['xlsx', 'csv'] },
  { id: 'paper', nameTr: 'Akademik Makale', nameEn: 'Academic Paper', descriptionTr: 'Bilimsel makale yapisi', descriptionEn: 'Scientific paper structure', icon: '\u{1F4DC}', bestFor: ['pdf'] },
  { id: 'book', nameTr: 'Kitap', nameEn: 'Book', descriptionTr: 'Kitap bolumlendirme', descriptionEn: 'Book chapter splitting', icon: '\u{1F4D6}', bestFor: ['pdf', 'epub'] },
  { id: 'laws', nameTr: 'Hukuk', nameEn: 'Legal', descriptionTr: 'Yasal metin yapisi', descriptionEn: 'Legal text structure', icon: '\u{2696}', bestFor: ['pdf', 'docx'] },
  { id: 'presentation', nameTr: 'Sunum', nameEn: 'Presentation', descriptionTr: 'Slayt bazli bolme', descriptionEn: 'Slide-based splitting', icon: '\u{1F4CA}', bestFor: ['pptx'] },
  { id: 'picture', nameTr: 'Gorsel', nameEn: 'Picture', descriptionTr: 'Gorsel icerik analizi', descriptionEn: 'Image content analysis', icon: '\u{1F5BC}', bestFor: ['png', 'jpg', 'pdf'] },
  { id: 'one', nameTr: 'Tek Chunk', nameEn: 'One Chunk', descriptionTr: 'Tum belgeyi tek chunk', descriptionEn: 'Entire document as one chunk', icon: '\u{1F4E6}', bestFor: ['small files'] },
  { id: 'email', nameTr: 'E-posta', nameEn: 'Email', descriptionTr: 'E-posta yapisi ile bolme', descriptionEn: 'Split by email structure', icon: '\u{1F4E7}', bestFor: ['eml'] },
];

// ── API Client Functions ──────────────────────────────────────────────────────

function getHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

// ── Datasets ──────────────────────────────────────────────────────────────────

export async function listDatasets(
  apiKey: string,
  params?: { page?: number; page_size?: number; name?: string }
): Promise<{ data: RagflowDataset[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.page_size) query.set('page_size', String(params.page_size));
  if (params?.name) query.set('name', params.name);

  const res = await fetch(`${RAGFLOW_BASE}/datasets?${query}`, { headers: getHeaders(apiKey) });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Failed to list datasets');
  return { data: json.data || [], total: json.data?.length || 0 };
}

export async function createDataset(
  apiKey: string,
  payload: {
    name: string;
    description?: string;
    embedding_model?: string;
    chunk_method?: ChunkMethod;
    permission?: 'me' | 'team';
  }
): Promise<RagflowDataset> {
  const res = await fetch(`${RAGFLOW_BASE}/datasets`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Failed to create dataset');
  return json.data;
}

export async function deleteDatasets(apiKey: string, ids: string[]): Promise<void> {
  const res = await fetch(`${RAGFLOW_BASE}/datasets`, {
    method: 'DELETE',
    headers: getHeaders(apiKey),
    body: JSON.stringify({ ids }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Failed to delete datasets');
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function listDocuments(
  apiKey: string,
  datasetId: string,
  params?: { page?: number; page_size?: number }
): Promise<{ data: RagflowDocument[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.page_size) query.set('page_size', String(params.page_size));

  const res = await fetch(`${RAGFLOW_BASE}/datasets/${datasetId}/documents?${query}`, {
    headers: getHeaders(apiKey),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Failed to list documents');
  return { data: json.data || [], total: json.data?.length || 0 };
}

export async function uploadDocument(
  apiKey: string,
  datasetId: string,
  file: File
): Promise<RagflowDocument> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${RAGFLOW_BASE}/datasets/${datasetId}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Failed to upload document');
  return json.data;
}

export async function deleteDocuments(
  apiKey: string,
  datasetId: string,
  ids: string[]
): Promise<void> {
  const res = await fetch(`${RAGFLOW_BASE}/datasets/${datasetId}/documents`, {
    method: 'DELETE',
    headers: getHeaders(apiKey),
    body: JSON.stringify({ ids }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Failed to delete documents');
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function listChats(
  apiKey: string,
  params?: { page?: number; page_size?: number }
): Promise<RagflowChat[]> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.page_size) query.set('page_size', String(params.page_size));

  const res = await fetch(`${RAGFLOW_BASE}/chats?${query}`, { headers: getHeaders(apiKey) });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Failed to list chats');
  return json.data || [];
}

export async function createChat(
  apiKey: string,
  payload: {
    name: string;
    dataset_ids: string[];
    llm?: { model_name: string; temperature?: number; max_tokens?: number };
    prompt?: { system?: string; similarity_threshold?: number; top_n?: number };
  }
): Promise<RagflowChat> {
  const res = await fetch(`${RAGFLOW_BASE}/chats`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Failed to create chat');
  return json.data;
}

// ── Agents ────────────────────────────────────────────────────────────────────

export async function listAgents(apiKey: string): Promise<RagflowAgent[]> {
  const res = await fetch(`${RAGFLOW_BASE}/agents`, { headers: getHeaders(apiKey) });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Failed to list agents');
  return json.data || [];
}

export async function createAgent(
  apiKey: string,
  payload: { title: string; description?: string; dsl?: Record<string, unknown> }
): Promise<RagflowAgent> {
  const res = await fetch(`${RAGFLOW_BASE}/agents`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Failed to create agent');
  return json.data;
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function createSession(
  apiKey: string,
  payload: { chat_id?: string; agent_id?: string; name?: string }
): Promise<RagflowSession> {
  const path = payload.agent_id
    ? `/agents/${payload.agent_id}/sessions`
    : `/chats/${payload.chat_id}/sessions`;

  const res = await fetch(`${RAGFLOW_BASE}${path}`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify({ name: payload.name }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Failed to create session');
  return json.data;
}

export async function chatCompletion(
  apiKey: string,
  chatId: string,
  sessionId: string,
  message: string,
  stream = false
): Promise<RagflowMessage | ReadableStream> {
  const res = await fetch(`${RAGFLOW_BASE}/chats/${chatId}/completions`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify({
      session_id: sessionId,
      question: message,
      stream,
    }),
  });

  if (stream) return res.body as ReadableStream;
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Chat completion failed');
  return json.data;
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchKnowledgeBase(
  apiKey: string,
  payload: {
    dataset_ids: string[];
    question: string;
    similarity_threshold?: number;
    top_k?: number;
  }
): Promise<RagflowSearchResult> {
  const res = await fetch(`${RAGFLOW_BASE}/retrieval`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify({
      dataset_ids: payload.dataset_ids,
      question: payload.question,
      similarity_threshold: payload.similarity_threshold ?? 0.2,
      top_k: payload.top_k ?? 6,
    }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Search failed');
  return json.data;
}

// ── GraphRAG ──────────────────────────────────────────────────────────────────

export async function runGraphRAG(apiKey: string, datasetId: string): Promise<void> {
  const res = await fetch(`${RAGFLOW_BASE}/datasets/${datasetId}/run_graphrag`, {
    method: 'POST',
    headers: getHeaders(apiKey),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Failed to run GraphRAG');
}

export async function runRaptor(apiKey: string, datasetId: string): Promise<void> {
  const res = await fetch(`${RAGFLOW_BASE}/datasets/${datasetId}/run_raptor`, {
    method: 'POST',
    headers: getHeaders(apiKey),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Failed to run RAPTOR');
}

// ── Helper: Template Categories ───────────────────────────────────────────────

export function getTemplatesByCategory(category: string) {
  return RAGFLOW_AGENT_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateById(id: string) {
  return RAGFLOW_AGENT_TEMPLATES.find((t) => t.id === id);
}
