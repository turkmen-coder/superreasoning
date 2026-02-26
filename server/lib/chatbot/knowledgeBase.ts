/**
 * Chatbot Knowledge Base — Complete app knowledge for the AI assistant.
 * Contains page descriptions, framework info, domain info, provider info.
 */

import type { ChatbotContext, SidebarPage } from './types';

// ---------- Page Knowledge ----------

export interface PageInfo {
  id: SidebarPage;
  name: { en: string; tr: string };
  description: { en: string; tr: string };
  capabilities: string[];
  relatedPages: SidebarPage[];
  keywords: string[];
}

export const APP_PAGES: PageInfo[] = [
  {
    id: 'dashboard',
    name: { en: 'Dashboard', tr: 'Dashboard' },
    description: {
      en: 'Main workspace for prompt generation. Enter your intent, select a domain and framework, choose an AI provider, and generate master prompts. Includes quality analysis (Judge, Lint, Budget), enrichment, and version history.',
      tr: 'Prompt uretimi icin ana calisma alani. Niyetinizi girin, alan ve cerceve secin, AI saglayici secin ve master promptlar uretin. Kalite analizi, zenginlestirme ve versiyon gecmisi icerir.',
    },
    capabilities: ['Generate master prompts', 'Select frameworks and domains', 'Quality scoring (Judge/Lint/Budget)', 'Auto-enrichment from library', 'Template quick-start', 'File attachments (images/text/PDF)'],
    relatedPages: ['prompts', 'ailab', 'settings', 'testing'],
    keywords: ['generate', 'prompt', 'create', 'main', 'home', 'uret', 'olustur'],
  },
  {
    id: 'prompts',
    name: { en: 'Prompt Library', tr: 'Prompt Kutuphanesi' },
    description: {
      en: 'Browse, search, and use saved prompts from the 1040+ curated prompt library. Semantic search powered by vector embeddings.',
      tr: '1040+ prompt kutuphanesini gozatma, arama ve kullanma. Vektor embeddingleri ile semantik arama.',
    },
    capabilities: ['Browse 1040+ curated prompts', 'Semantic search', 'Filter by category', 'Load prompt into dashboard', 'Version history'],
    relatedPages: ['dashboard', 'marketplace'],
    keywords: ['library', 'browse', 'search', 'saved', 'kutuphane', 'arama'],
  },
  {
    id: 'testing',
    name: { en: 'Prompt CI/CD', tr: 'Prompt CI/CD' },
    description: {
      en: 'Full prompt CI/CD pipeline: create test cases, run regression tests, manage version lifecycle (draft/testing/staging/production), approval workflows, and signed releases.',
      tr: 'Tam prompt CI/CD pipeline: test caseleri olustur, regresyon testleri calistir, versiyon yasam dongusu yonet, onay is akislari ve imzali surumler.',
    },
    capabilities: ['Create test cases', 'Run regression suites', 'Version lifecycle management', 'Approval workflows', 'Signed releases', 'A/B variant testing'],
    relatedPages: ['dashboard', 'abtesting'],
    keywords: ['test', 'ci', 'cd', 'pipeline', 'regression', 'release', 'approve'],
  },
  {
    id: 'ailab',
    name: { en: 'AI Lab', tr: 'AI Lab' },
    description: {
      en: 'Agent-based workbench using OpenAI Agents SDK. Chain multi-step workflows (research, summarize, generate, test). Includes Style Profile Manager for brand voice teaching.',
      tr: 'OpenAI Agents SDK ile agent tabanli calisma ortami. Cok adimli is akislari. Marka sesi ogretimi icin Stil Profil Yoneticisi icerir.',
    },
    capabilities: ['Agent-based workflows', 'Multi-step pipelines', 'Style Profile Manager', 'Streaming agent output'],
    relatedPages: ['dashboard', 'settings'],
    keywords: ['agent', 'workflow', 'style', 'pipeline', 'lab'],
  },
  {
    id: 'optimizer',
    name: { en: 'Code Optimizer', tr: 'Kod Optimizer' },
    description: {
      en: 'Multi-round code optimization for frontend and backend. Supports React, Vue, Svelte, Python, Node.js, Go and more. Includes diff view, Web Vitals analysis, and composite scoring.',
      tr: 'Frontend ve backend icin cok turlu kod optimizasyonu. React, Vue, Python, Node.js ve daha fazlasini destekler. Diff gorunumu ve skor analizi icerir.',
    },
    capabilities: ['Multi-round optimization', 'Frontend/backend support', 'Code diff view', 'Web Vitals analysis', 'Composite scoring'],
    relatedPages: ['vibecoding'],
    keywords: ['optimize', 'code', 'performance', 'refactor', 'kod', 'optimizasyon'],
  },
  {
    id: 'vibecoding',
    name: { en: 'Vibe Coding', tr: 'Vibe Coding' },
    description: {
      en: 'Describe an app in natural language, get a full implementation plan and agent-generated code. Plan mode + agent execution.',
      tr: 'Dogal dille bir uygulama tanimlayin, tam uygulama plani ve agent tarafindan uretilen kodu alin.',
    },
    capabilities: ['Natural language to app plan', 'Agent-generated code', 'Step-by-step implementation'],
    relatedPages: ['optimizer', 'ailab'],
    keywords: ['vibe', 'coding', 'app', 'build', 'plan', 'uygulama'],
  },
  {
    id: 'genetik',
    name: { en: 'Genetic Lab', tr: 'Genetik Lab' },
    description: {
      en: 'Evolutionary prompt optimization using genetic algorithms. Mutation (rephrasing, constraint injection, compression) and crossover operations to evolve better prompts over generations.',
      tr: 'Genetik algoritmalar ile evrimsel prompt optimizasyonu. Mutasyon ve caprazlama operasyonlari ile nesiller boyunca daha iyi promptlar evrimlestirilir.',
    },
    capabilities: ['Genetic algorithm evolution', 'Mutation operations', 'Crossover operations', 'Fitness scoring', 'Population management'],
    relatedPages: ['dashboard', 'abtesting'],
    keywords: ['genetic', 'evolution', 'mutate', 'crossover', 'genetik', 'evrim'],
  },
  {
    id: 'analytics',
    name: { en: 'Analytics', tr: 'Analitik' },
    description: {
      en: 'Usage analytics dashboard with charts for generations, token usage, provider distribution, framework popularity, domain stats, and latency tracking. CSV export available.',
      tr: 'Uretimler, token kullanimi, saglayici dagilimi, cerceve populerligi, alan istatistikleri ve gecikme takibi icin analitik paneli.',
    },
    capabilities: ['Generation statistics', 'Token usage tracking', 'Provider distribution', 'Framework popularity', 'CSV export'],
    relatedPages: ['dashboard', 'settings'],
    keywords: ['analytics', 'stats', 'usage', 'chart', 'istatistik', 'kullanim'],
  },
  {
    id: 'collaboration',
    name: { en: 'Collaboration', tr: 'Is Birligi' },
    description: {
      en: 'Real-time multi-user prompt editing with cursor tracking, comments, and live updates via WebSocket.',
      tr: 'WebSocket ile gercek zamanli cok kullanicili prompt duzenleme, imlec takibi ve yorumlar.',
    },
    capabilities: ['Real-time editing', 'Cursor tracking', 'Comments', 'Session sharing'],
    relatedPages: ['dashboard', 'prompts'],
    keywords: ['collaborate', 'realtime', 'share', 'team', 'isbirligi', 'takim'],
  },
  {
    id: 'settings',
    name: { en: 'Settings', tr: 'Ayarlar' },
    description: {
      en: 'Configure AI provider selection (9 providers), model options, thinking mode, web search, auto-enrichment, API keys, and custom domains/frameworks.',
      tr: 'AI saglayici secimi (9 saglayici), model secenekleri, dusunme modu, web arama, otomatik zenginlestirme, API anahtarlari ve ozel alan/cerceve yapilandirmasi.',
    },
    capabilities: ['Provider selection', 'Model configuration', 'API key management', 'Custom domains/frameworks', 'Auto-enrichment toggle'],
    relatedPages: ['dashboard'],
    keywords: ['settings', 'config', 'provider', 'api', 'key', 'ayar', 'yapilandirma'],
  },
  {
    id: 'marketplace',
    name: { en: 'Marketplace', tr: 'Pazar Yeri' },
    description: {
      en: 'Browse and adopt community prompt templates. Filter by category, preview, and use templates directly.',
      tr: 'Topluluk prompt sablonlarini gozatin ve benimseyin. Kategori ile filtreleyin, onizleyin ve dogrudan kullanin.',
    },
    capabilities: ['Browse templates', 'Category filtering', 'Template adoption', 'Community sharing'],
    relatedPages: ['prompts', 'dashboard'],
    keywords: ['marketplace', 'template', 'community', 'sablon', 'topluluk'],
  },
  {
    id: 'abtesting',
    name: { en: 'A/B Testing', tr: 'A/B Test' },
    description: {
      en: 'Side-by-side comparison of two prompt variants across different providers and frameworks. Compare quality scores and outputs.',
      tr: 'Farkli saglayicilar ve cerceveler arasinda iki prompt varyantinin yan yana karsilastirmasi.',
    },
    capabilities: ['Side-by-side comparison', 'Multi-provider testing', 'Quality score comparison', 'Variant management'],
    relatedPages: ['testing', 'dashboard', 'genetik'],
    keywords: ['ab', 'test', 'compare', 'variant', 'karsilastirma'],
  },
  {
    id: 'scheduled',
    name: { en: 'Scheduled Jobs', tr: 'Zamanlanmis Gorevler' },
    description: {
      en: 'Schedule automated prompt generation tasks with cron expressions. Set up recurring generation jobs.',
      tr: 'Cron ifadeleri ile otomatik prompt uretim gorevleri zamanlama.',
    },
    capabilities: ['Cron scheduling', 'Automated generation', 'Job management'],
    relatedPages: ['dashboard'],
    keywords: ['schedule', 'cron', 'automate', 'job', 'zamanlama', 'otomasyon'],
  },
  {
    id: 'webhooks',
    name: { en: 'Webhooks', tr: 'Webhook' },
    description: {
      en: 'Configure webhook integrations for prompt events. Get notified when prompts are generated, tested, or promoted.',
      tr: 'Prompt olaylari icin webhook entegrasyonlari yapilandirin.',
    },
    capabilities: ['Webhook configuration', 'Event notifications', 'Integration endpoints'],
    relatedPages: ['settings'],
    keywords: ['webhook', 'integration', 'notify', 'event', 'entegrasyon'],
  },
  {
    id: 'mobile',
    name: { en: 'Mobile', tr: 'Mobil' },
    description: {
      en: 'Mobile-optimized app UI preview. View how prompts and features look on mobile devices.',
      tr: 'Mobil optimize uygulama UI onizlemesi.',
    },
    capabilities: ['Mobile preview', 'Responsive UI'],
    relatedPages: ['dashboard'],
    keywords: ['mobile', 'app', 'phone', 'mobil', 'telefon'],
  },
  {
    id: 'finetuning',
    name: { en: 'Fine-tuning', tr: 'Ince Ayar' },
    description: {
      en: 'Custom model fine-tuning interface. Upload training data and manage fine-tune jobs for personalized models.',
      tr: 'Ozel model ince ayar arayuzu. Egitim verisi yukleyin ve kisisellestirilmis modeller icin ince ayar islerini yonetin.',
    },
    capabilities: ['Training data upload', 'Fine-tune job management', 'Custom model creation'],
    relatedPages: ['settings', 'ailab'],
    keywords: ['finetune', 'train', 'custom', 'model', 'egitim', 'ince ayar'],
  },
  {
    id: 'security',
    name: { en: 'Security Scanner', tr: 'Guvenlik Tarayicisi' },
    description: {
      en: 'Scan prompts for injection attacks, PII exposure, guardrail violations, and policy compliance issues.',
      tr: 'Promptlari enjeksiyon saldirilari, PII ifsa, korkuluk ihlalleri ve politika uyumluluk sorunlari icin tarayin.',
    },
    capabilities: ['Injection detection', 'PII scanning', 'Guardrail checks', 'Policy compliance'],
    relatedPages: ['testing', 'dashboard'],
    keywords: ['security', 'scan', 'injection', 'pii', 'guvenlik', 'tarama'],
  },
  {
    id: 'export',
    name: { en: 'Export', tr: 'Disa Aktar' },
    description: {
      en: 'Export generated prompts in multiple formats: PDF, Word, Notion, JSON, YAML, and more.',
      tr: 'Uretilen promptlari farkli formatlarda disa aktarin: PDF, Word, Notion, JSON, YAML ve dahasi.',
    },
    capabilities: ['PDF export', 'Word export', 'Notion export', 'JSON/YAML export'],
    relatedPages: ['dashboard', 'prompts'],
    keywords: ['export', 'pdf', 'word', 'notion', 'json', 'yaml', 'disa aktar'],
  },
];

// ---------- Provider Knowledge ----------

export interface ProviderInfo {
  id: string;
  name: string;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'standard' | 'high' | 'premium';
  costTier: 'free' | 'low' | 'medium' | 'high';
  bestFor: string[];
}

export const PROVIDER_INFO: ProviderInfo[] = [
  { id: 'auto', name: 'Auto (Smart Routing)', speed: 'fast', quality: 'high', costTier: 'free', bestFor: ['general use', 'automatic provider selection based on task'] },
  { id: 'groq', name: 'Groq (Llama 3.3 70B)', speed: 'fast', quality: 'standard', costTier: 'free', bestFor: ['quick iterations', 'prototyping', 'high volume'] },
  { id: 'gemini', name: 'Google Gemini', speed: 'medium', quality: 'high', costTier: 'free', bestFor: ['multimodal', 'creative writing', 'web search grounding'] },
  { id: 'huggingface', name: 'HuggingFace (Mistral)', speed: 'medium', quality: 'standard', costTier: 'free', bestFor: ['open-source models', 'experimentation'] },
  { id: 'openai', name: 'OpenAI (GPT-4o-mini)', speed: 'medium', quality: 'high', costTier: 'low', bestFor: ['coding', 'data science', 'structured output'] },
  { id: 'deepseek', name: 'DeepSeek V3', speed: 'medium', quality: 'high', costTier: 'low', bestFor: ['coding', 'math', 'algorithms', 'reasoning'] },
  { id: 'openrouter', name: 'OpenRouter (100+ models)', speed: 'medium', quality: 'high', costTier: 'medium', bestFor: ['model variety', 'specific model access'] },
  { id: 'claude', name: 'Anthropic Claude', speed: 'medium', quality: 'premium', costTier: 'medium', bestFor: ['legal', 'medical', 'compliance', 'long-form', 'nuanced writing'] },
  { id: 'ollama', name: 'Ollama (Local)', speed: 'slow', quality: 'standard', costTier: 'free', bestFor: ['privacy', 'offline use', 'local development'] },
];

// ---------- Framework Knowledge ----------

export interface FrameworkInfo {
  id: string;
  name: string;
  bestFor: string[];
}

export const FRAMEWORK_INFO: FrameworkInfo[] = [
  { id: 'AUTO', name: 'Auto', bestFor: ['general', 'any task'] },
  { id: 'KERNEL', name: 'Kernel', bestFor: ['system design', 'architecture', 'API design', 'technical specs'] },
  { id: 'CO_STAR', name: 'CO-STAR', bestFor: ['structured prompts', 'context-objective-style-tone-audience-response'] },
  { id: 'RISEN', name: 'RISEN', bestFor: ['role-based', 'instructions', 'scenarios'] },
  { id: 'RTF', name: 'RTF', bestFor: ['role-task-format', 'quick structured'] },
  { id: 'BAB', name: 'BAB', bestFor: ['before-after-bridge', 'transformation'] },
  { id: 'TAG', name: 'TAG', bestFor: ['task-action-goal', 'goal-oriented'] },
  { id: 'CARE', name: 'CARE', bestFor: ['context-action-result-example'] },
  { id: 'REACT', name: 'ReAct', bestFor: ['reasoning + acting', 'tool use', 'agents'] },
  { id: 'CHAIN_OF_THOUGHT', name: 'Chain of Thought', bestFor: ['step-by-step reasoning', 'math', 'logic'] },
  { id: 'TREE_OF_THOUGHT', name: 'Tree of Thought', bestFor: ['complex problem solving', 'branching analysis'] },
  { id: 'REWOO', name: 'ReWOO', bestFor: ['reasoning without observation', 'planning'] },
  { id: 'DSP', name: 'DSP', bestFor: ['demonstrate-search-predict', 'retrieval'] },
  { id: 'SELF_REFINE', name: 'Self-Refine', bestFor: ['iterative improvement', 'self-critique'] },
  { id: 'CRITIC_REVISE', name: 'Critic-Revise', bestFor: ['quality improvement', 'review loops'] },
  { id: 'SCENARIO_PLANNING', name: 'Scenario Planning', bestFor: ['future scenarios', 'strategy', 'risk'] },
  { id: 'OODA_LOOP', name: 'OODA Loop', bestFor: ['decision making', 'observe-orient-decide-act'] },
  { id: 'RED_TEAM', name: 'Red Team', bestFor: ['adversarial testing', 'security', 'vulnerability finding'] },
  { id: 'SOCRATIC', name: 'Socratic', bestFor: ['teaching', 'guided discovery', 'Q&A'] },
  { id: 'SWOT', name: 'SWOT', bestFor: ['strengths/weaknesses/opportunities/threats analysis'] },
  { id: 'FIVE_WHYS', name: '5 Whys', bestFor: ['root cause analysis', 'debugging'] },
  { id: 'MECE', name: 'MECE', bestFor: ['mutually exclusive, collectively exhaustive analysis'] },
  { id: 'SCAMPER', name: 'SCAMPER', bestFor: ['creative ideation', 'innovation'] },
  { id: 'PDCA', name: 'PDCA', bestFor: ['plan-do-check-act', 'continuous improvement'] },
  { id: 'STAR', name: 'STAR', bestFor: ['situation-task-action-result', 'behavioral'] },
  { id: 'SMART', name: 'SMART', bestFor: ['specific-measurable-achievable-relevant-timebound goals'] },
  { id: 'DIALECTIC', name: 'Dialectic', bestFor: ['thesis-antithesis-synthesis', 'debate'] },
  { id: 'STEP_BACK', name: 'Step Back', bestFor: ['abstraction', 'big picture thinking'] },
  { id: 'ANALOGICAL', name: 'Analogical', bestFor: ['reasoning by analogy', 'creative connections'] },
  { id: 'MORPHOLOGICAL', name: 'Morphological', bestFor: ['morphological analysis', 'combinatorial exploration'] },
  { id: 'DELPHI', name: 'Delphi', bestFor: ['expert consensus', 'forecasting'] },
  { id: 'SIX_HATS', name: 'Six Thinking Hats', bestFor: ['multi-perspective analysis', 'group thinking'] },
  { id: 'TRIZ', name: 'TRIZ', bestFor: ['inventive problem solving', 'contradiction resolution'] },
  { id: 'PESTEL', name: 'PESTEL', bestFor: ['political/economic/social/tech/environmental/legal analysis'] },
  { id: 'PORTER', name: "Porter's Five Forces", bestFor: ['competitive analysis', 'industry analysis'] },
  { id: 'LEAN', name: 'Lean', bestFor: ['waste reduction', 'efficiency', 'lean methodology'] },
  { id: 'AGILE', name: 'Agile', bestFor: ['iterative development', 'sprints', 'user stories'] },
  { id: 'FIRST_PRINCIPLES', name: 'First Principles', bestFor: ['fundamental reasoning', 'breaking down assumptions'] },
  { id: 'INVERSION', name: 'Inversion', bestFor: ['reverse thinking', 'avoiding failure'] },
  { id: 'FUTURES_WHEEL', name: 'Futures Wheel', bestFor: ['impact analysis', 'consequence mapping'] },
  { id: 'BACKCASTING', name: 'Backcasting', bestFor: ['working backwards from goals', 'strategic planning'] },
  { id: 'KANO', name: 'Kano Model', bestFor: ['feature prioritization', 'customer satisfaction'] },
  { id: 'JOBS_TO_BE_DONE', name: 'Jobs To Be Done', bestFor: ['customer needs', 'product development'] },
  { id: 'DESIGN_THINKING', name: 'Design Thinking', bestFor: ['empathize-define-ideate-prototype-test', 'UX'] },
  { id: 'SYSTEMS_THINKING', name: 'Systems Thinking', bestFor: ['complex systems', 'feedback loops', 'holistic analysis'] },
  { id: 'GAME_THEORY', name: 'Game Theory', bestFor: ['strategic interactions', 'competitive strategies'] },
  { id: 'BAYESIAN', name: 'Bayesian', bestFor: ['probabilistic reasoning', 'evidence updating'] },
  { id: 'META_PROMPT', name: 'Meta-Prompt', bestFor: ['prompt about prompts', 'meta-level optimization'] },
  { id: 'LATERAL', name: 'Lateral Thinking', bestFor: ['creative solutions', 'unconventional approaches'] },
  { id: 'CATWOE', name: 'CATWOE', bestFor: ['stakeholder analysis', 'system definition'] },
  { id: 'DECISION_MATRIX', name: 'Decision Matrix', bestFor: ['multi-criteria decision making', 'weighted scoring'] },
  { id: 'MIND_MAP', name: 'Mind Map', bestFor: ['brainstorming', 'idea organization'] },
  { id: 'RAPID', name: 'RAPID', bestFor: ['decision-making roles', 'organizational clarity'] },
  { id: 'MOSCOW', name: 'MoSCoW', bestFor: ['prioritization', 'must/should/could/wont'] },
  { id: 'OKR', name: 'OKR', bestFor: ['objectives and key results', 'goal setting'] },
  { id: 'HYPOTHESIS', name: 'Hypothesis', bestFor: ['scientific method', 'experimentation', 'validation'] },
  { id: 'PREMORTEM', name: 'Premortem', bestFor: ['risk identification', 'failure prevention'] },
];

// ---------- Domain Categories ----------

export const DOMAIN_CATEGORIES: Record<string, { en: string; tr: string; items: string[] }> = {
  core: { en: 'Core', tr: 'Temel', items: ['auto', 'general', 'frontend', 'backend', 'architecture', 'testing', 'ui-design', 'analysis', 'image-video'] },
  ai: { en: 'AI & Data', tr: 'Yapay Zeka & Veri', items: ['ml-ai', 'nlp-llm', 'computer-vision', 'audio-speech', 'conversational-ai', 'data-engineering', 'database-admin'] },
  engineering: { en: 'Engineering', tr: 'Muhendislik', items: ['devops-sre', 'cloud-native', 'networking', 'iot-embedded', 'cybersecurity', 'api-integration', 'mobile-dev'] },
  product: { en: 'Product & Growth', tr: 'Urun & Buyume', items: ['saas-product', 'ecommerce-growth', 'content-marketing', 'developer-experience', 'game-dev'] },
  industry: { en: 'Industry', tr: 'Sektorel', items: ['fintech', 'healthcare', 'education-edtech', 'legal-compliance', 'blockchain-web3', 'automotive', 'aerospace-defense', 'insurance', 'pharmaceutical', 'energy-cleantech'] },
  operations: { en: 'Operations', tr: 'Operasyon', items: ['hr-talent', 'supply-chain', 'sustainability', 'robotics-automation', 'construction', 'mining-resources', 'government', 'telecom'] },
  lifestyle: { en: 'Lifestyle', tr: 'Yasam', items: ['travel-hospitality', 'food-beverage', 'fashion-retail', 'sports-fitness', 'media-entertainment', 'social-impact', 'mental-health', 'research-academia', 'real-estate', 'agriculture', 'accessibility', 'localization-i18n', 'data-privacy'] },
};

// ---------- System Prompt Builder ----------

export function buildChatbotSystemPrompt(language: 'en' | 'tr', context?: ChatbotContext): string {
  const tr = language === 'tr';

  const pageList = APP_PAGES.map(p =>
    `- **${p.name[language]}** (id: ${p.id}): ${p.description[language]}`
  ).join('\n');

  const providerList = PROVIDER_INFO.map(p =>
    `- **${p.name}** (id: ${p.id}): Speed=${p.speed}, Quality=${p.quality}, Cost=${p.costTier}. Best for: ${p.bestFor.join(', ')}`
  ).join('\n');

  const frameworkList = FRAMEWORK_INFO.slice(0, 20).map(f =>
    `- **${f.name}** (id: ${f.id}): Best for ${f.bestFor.join(', ')}`
  ).join('\n');

  const domainList = Object.entries(DOMAIN_CATEGORIES).map(([, cat]) =>
    `- ${cat[language]}: ${cat.items.join(', ')}`
  ).join('\n');

  const contextBlock = context ? `
CURRENT USER CONTEXT:
- Page: ${context.currentPage || 'unknown'}
- Domain: ${context.domainId || 'not selected'}
- Framework: ${context.framework || 'not selected'}
- Provider: ${context.provider || 'not selected'}
- Has prompt: ${context.currentPrompt ? 'yes' : 'no'}` : '';

  return `You are the Super Reasoning Platform Assistant — an expert guide for the Super Reasoning prompt engineering platform.
${tr ? 'Always respond in Turkish.' : 'Always respond in English.'}

${contextBlock}

PLATFORM OVERVIEW:
Super Reasoning is an enterprise prompt engineering platform with 18 pages, 57 strategic frameworks, 60+ domain expertise areas, 9 LLM providers, and a 1040+ curated prompt library.

PAGES:
${pageList}

PROVIDERS (9):
${providerList}

FRAMEWORKS (top 20 of 57):
${frameworkList}
(Use get_app_context tool to list all frameworks)

DOMAIN CATEGORIES:
${domainList}

YOUR TOOLS AND WHEN TO USE THEM:
1. **navigate_to_page**: When user asks about a feature or wants to go somewhere → navigate them
2. **search_prompts**: When user asks for prompts about a topic → semantic search the library
3. **recommend_framework**: When user asks which framework to use → analyze intent and recommend
4. **recommend_domain**: When user asks which domain to pick → match their use case
5. **trigger_generation**: When user explicitly asks to generate a prompt → set up params
6. **quality_check**: When user has a prompt and wants quality feedback → run judge + lint
7. **explain_feature**: When user asks what a feature/page does → give detailed explanation
8. **get_app_context**: When user asks about available providers, frameworks, or domains → list them

RESPONSE RULES:
- Be concise and actionable — use bullet points
- Always suggest next steps using tools
- For navigation suggestions, use navigate_to_page tool
- For framework/domain advice, use recommend tools
- Include 2-3 follow-up suggestion phrases at the end wrapped in [SUGGESTIONS] block like:
  [SUGGESTIONS]
  suggestion 1
  suggestion 2
  suggestion 3
  [/SUGGESTIONS]
- When returning actions, wrap them in [ACTIONS] blocks like:
  [ACTIONS]
  {"type":"navigate","label":"Go to Dashboard","params":{"page":"dashboard"}}
  [/ACTIONS]
`;
}

// ---------- Helpers ----------

export function findPageByKeyword(query: string): PageInfo | undefined {
  const q = query.toLowerCase();
  return APP_PAGES.find(p =>
    p.keywords.some(k => q.includes(k)) ||
    p.name.en.toLowerCase().includes(q) ||
    p.name.tr.toLowerCase().includes(q)
  );
}

export function findFrameworksByIntent(intent: string): FrameworkInfo[] {
  const q = intent.toLowerCase();
  return FRAMEWORK_INFO
    .filter(f => f.bestFor.some(b => q.includes(b.split(' ')[0].toLowerCase())))
    .slice(0, 5);
}
