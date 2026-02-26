# SUPER REASONING — Meta-Prompt Architect v3.2

Belirsiz kullanıcı taleplerini (niyet), LLM'ler için optimize edilmiş **Usta İstemlere (Master Prompts)** dönüştüren stratejik muhakeme platformu. 9 sağlayıcılı çoklu model katmanı (Auto + Groq, Hugging Face, Gemini, OpenAI, DeepSeek, OpenRouter, Claude, Ollama), Judge Ensemble V3, Prompt QA/Lint, Semantic Cache, Budget Optimizer, Audit Log, multi-tenant SaaS mimarisi, **Supabase Auth (JWT)**, **Stripe ödeme** ($5/ay, $60/yıl), **Prompt Versioning & Diff Viewer**, **Custom Domain/Framework Builder**, **Auto-Benchmark**, **AI Lab Workbench**, **Auto-Enrichment**, **Prompt CI/CD & Regression Testing**, **Semantic Vector Search**, **RAG Entegrasyonu**, **AI Agent (OpenAI Agents SDK)**, **LangExtract**, **Optimizer** ve **Vibe Coding** entegrasyonu ile tam kapsamlı bir prompt mühendisliği platformu.

**Live:** [https://neomagic.org](https://neomagic.org)

---

## İçindekiler

- [Özellikler](#özellikler)
- [Yeni Özellikler (v3.1)](#yeni-özellikler-v31)
- [Yeni Özellikler (v3.2)](#yeni-özellikler-v32)
- [Algoritma ve Mimari](#algoritma-ve-mimari)
- [Stratejik Çerçeveler](#stratejik-çerçeveler-frameworks)
- [Uzmanlık Alanları](#uzmanlık-alanları-domains)
- [Auto Domain Kuralları](#auto-domain-kuralları-ve-kernelrtf-akışı)
- [Teknik Detaylar](#teknik-detaylar)
- [Proje Yapısı](#proje-yapısı)
- [API & CLI & SDK](#prompt-as-code-api--cli--sdk)
- [Deploy (VPS)](#deploy-vps)
- [Kurulum ve Çalıştırma](#kurulum-ve-çalıştırma)
- [Sorun Giderme](#sorun-giderme)
- [Dokümantasyon](#dokümantasyon)

---

## Özellikler

| Özellik | Açıklama |
|--------|----------|
| **9 AI sağlayıcı + Auto** | Auto seçim + Groq, Hugging Face, Gemini, OpenAI, DeepSeek, OpenRouter, Claude (Sonnet/Opus), Ollama. |
| **Girdi analizi** | Kelime/karakter sayısı, detay seviyesi (Kısa / Orta / Detaylı). |
| **Girdi sıkıştırma** | API'ye göndermeden önce niyet metni sıkıştırılır; panelde bilgi gösterilir. |
| **Çıktı analizi** | Usta istem ve reasoning kelime/karakter sayıları, Markdown bölüm listesi. |
| **Markdown çıktı** | Başlıklar, listeler, kod blokları, vurgu ile render. |
| **Çoklu dil (I18n)** | Türkçe (TR) ve İngilizce (EN); arayüz ve sistem talimatları dile göre değişir. |
| **Dosya ekleri** | PDF, görsel, metin dosyası yükleme (Gemini multimodal; HF metin-only). |
| **Thinking & Search** | Derin muhakeme ve Google Search grounding (yalnızca Gemini). |
| **Multi-step Agent** | Agent zinciri: araştır → özetle → prompt üret → test et. Pipeline preset'leri. |
| **Teaching Mode** | Örnek giriş/çıktı ile üslup profili oluşturma; tüm üretimlere enjekte edilir. |
| **AI Lab Workbench** | Prompt kütüphanesi destekli ajan akışı: arama, öneri, sentez ve uygulama (OpenAI Agents SDK tabanlı). |
| **Auto-Enrichment** | Üretim sonrası otomatik zenginleştirme: ambiguity detection + prompt library entegrasyonu (fast/deep). |
| **Code Optimizer + Vibe Coding** | Kod optimizasyonu ve plan/ajan modu odaklı ek paneller. |
| **Görüntü & Video** | DALL·E, Midjourney, Stable Diffusion, Flux, Runway, Sora için evrensel prompt. |
| **Prompt CI/CD** | Contract validation, golden test cases, LLM-powered regression testing, version lifecycle (draft→testing→staging→production). |
| **Semantic Search** | Vektör tabanlı prompt arama (embedding + cosine similarity). OpenAI text-embedding-3-small / zvec desteği. |
| **RAG Entegrasyonu** | Semantic Kernel Python mikroservisi ile RAG sentez ve arama. |
| **AI Agent** | OpenAI Agents SDK tabanlı ajan sistemi; prompt library tools ile araştırma, öneri, sentez. |
| **LangExtract** | Prompt analiz aracı; yapısal bileşen çıkarma ve otomatik analiz. |
| **Optimizer** | Çok turlu prompt optimizasyonu; INP, sigmoid eğrileri, convergence detection. |
| **Vibe Coding** | Plan/ajan modlu kod üretim paneli; çoklu LLM desteği. |
| **Erişilebilirlik** | WCAG 2.1 AA: klavye, ARIA, kontrast, prefers-reduced-motion. |

---

## Yeni Özellikler (v3.1)

### Judge Ensemble V3
5 kriterli prompt kalite değerlendirme sistemi (Clarity, Specificity, Structure, Safety, Reproducibility). V2 ile auto-revision loop (maks 2 iterasyon), V3 ile kalibrasyon desteği. Her kriter için ağırlık yüzdesi, detaylı puan breakdown, bölüm analizi (SYSTEM/DEVELOPER/USER), auto-fix önerileri ve iki dilli geri bildirim (TR/EN).

### Prompt QA / Lint
Promptlardaki yaygın hataları tespit eden kurallar: eksik bölüm, çelişkili talimat, kısa uzunluk, güvenlik açığı, vb. Her sorun için severity seviyesi ve öneriler.

### Semantic Cache
Benzer promptları hash tabanlı cache ile önbelleğe alma. Cache hit/miss istatistikleri, TTL yönetimi ve temizleme.

### Budget Optimizer
Token maliyeti tahmini ve optimizasyonu. Model bazında maliyet hesaplama, bütçe limitleri ve uyarılar.

### IR Extractor
Intermediate Representation: promptları yapısal IR formatına dönüştürme. Compiler pipeline desteği.

### Audit Log
Tüm API işlemlerinin org bazlı kaydı. Zaman damgası, kullanıcı, aksiyon, kaynak tipi ve metadata.

### Provenance Tracking
Prompt üretim geçmişi ve kaynak takibi. Hangi model, framework, domain ile üretildiğinin izlenmesi.

### Safety Guardrails
Güvenli prompt üretimi için koruma katmanı. Zararlı içerik, prompt injection ve data leak tespiti.

### Multi-Tenancy & SaaS
Organization bazlı tenant isolation. BYOK (Bring Your Own Key) ve Managed key desteği. Plan bazlı rate limiting (Free: 10/dk, Pro: 100/dk, Team: 300/dk).

### Supabase Auth (JWT)
Email/password ile kayıt ve giriş. Supabase GoTrue ile JWT token üretimi, `jose` ile sunucu tarafı HS256 doğrulama. Lazy provisioning: ilk girişte otomatik user + organization + membership oluşturma. Dual auth middleware: JWT (Bearer) ve API key (x-api-key) aynı anda desteklenir. Frontend'de AuthContext ile session yönetimi, auto token refresh ve AuthGate ile korumalı erişim.

### Stripe Ödeme ($5/ay — $60/yıl)
İki plan: Monthly ($5/ay) ve Yearly ($60/yıl). Stripe Checkout ile güvenli ödeme, webhook ile plan güncelleme. Org bazlı `stripe_customer_id` takibi. PricingPage ile plan seçimi ve Stripe'a yönlendirme.

### Design System
Cyberpunk tema tokenleri (`design-system.json`): renk paleti, tipografi, spacing, border-radius, animasyon.

---

## Yeni Özellikler (v3.2)

### Prompt Versioning & Diff Viewer
Prompt'ların tüm versiyonlarını git-like geçmişle listele. İki versiyon arasında satır bazlı diff görüntüle (added/removed/changed). Rollback desteği ile eski versiyonlara geri dön. API: `GET /v1/prompts/:id/versions`, `GET /v1/prompts/:id/diff?v1=x&v2=y`.

### Custom Domain/Framework Builder
Kullanıcılar kendi uzmanlık alanlarını (domain) ve stratejik çerçevelerini (framework) tanımlayabilir. JSON tabanlı context rules editörü, emoji ikon seçici, public/private paylaşım. DB: `custom_domains`, `custom_frameworks` tabloları. API: `GET/POST/DELETE /v1/domains/custom`, `GET/POST/DELETE /v1/frameworks/custom`.

### Auto-Prompt Benchmark
Üretilen prompt'u Judge Ensemble V3 + Prompt Lint + Budget Optimizer ile otomatik test eder. Score (0-100), lint pass/fail, token sayısı, maliyet tahmini ve süre metriklerini tek panelde gösterir. Sonuçlar `prompt_benchmarks` tablosuna kaydedilir.

### V4 Dashboard & Navigation
Yeni dashboard düzeni: Sidebar tabanlı sayfa akışı (`dashboard`, `prompts`, `ailab`, `optimizer`, `vibecoding`, `analytics`, `settings`, `testing`), üst durum çubuğu, çıktı terminali, agent pipeline görünümü ve canlı performans göstergeleri (latency / tokens-per-second / model etiketi).

### Prompt CI/CD System
Tam kapsamlı prompt kalite güvence pipeline'ı:
- **Contract Validation:** JSON schema, regex, keywords, sections, length kuralları ile prompt yapısı doğrulama.
- **Golden Test Cases:** 5 eşleştirme modu — exact, contains, regex, semantic (cosine similarity), contract.
- **LLM-Powered Regression Testing:** Groq/OpenAI/DeepSeek fallback zinciri ile otomatik regresyon testi.
- **Quality Gates:** Judge Ensemble V3 + Lint + Budget + Contract paralel çalıştırma.
- **Version Lifecycle:** `draft` → `testing` → `staging` → `production` gate-checked promotion akışı.
- API: `/v1/contracts`, `/v1/test-cases`, `/v1/regressions/run`, `/v1/versions/:id/promote`.

### Semantic Vector Search
Vektör tabanlı prompt arama sistemi:
- OpenAI `text-embedding-3-small` veya `zvec` ile embedding üretimi.
- In-memory vektör store ile cosine similarity arama.
- Embedding cache ile tekrarlayan sorguları hızlandırma.
- API: `POST /v1/prompts/semantic-search`, `GET /v1/prompts/vector-stats`, `POST /v1/prompts/seed-vectors`.

### RAG Entegrasyonu
Semantic Kernel (Python) mikroservisine proxy:
- `/v1/rag/ask` — RAG sentezli yanıt üretimi.
- `/v1/rag/search` — Semantik belge arama.
- Konfigüre edilebilir SK servis URL'i (`SK_SERVICE_URL`).

### AI Agent System
OpenAI Agents SDK tabanlı ajan sistemi:
- Prompt library üzerinden tool-based araştırma ve sentez.
- LangExtract entegrasyonu ile prompt yapısal analiz.
- Çoklu dil desteği (TR/EN).
- API: `POST /v1/agent/run`, `GET /v1/agent/status`.

### Optimizer & Vibe Coding
- **Optimizer Panel:** Çok turlu prompt optimizasyonu; INP metrikleri, sigmoid eğrileri, convergence detection, diff gösterimi.
- **Vibe Coding Panel:** Plan modu ve ajan modu ile kod üretimi; çoklu LLM sağlayıcı desteği (Groq, OpenAI, DeepSeek, Claude).

---

## Algoritma ve Mimari

### SR-MPG (Super Reasoning — Master Prompt Generator) Akışı

1. **Girdi toplama** — Niyet, domain, framework, dil ve dosya ekleri.
2. **Girdi sıkıştırma** — `compressIntent()` ile token azaltma.
3. **Context oluşturma** — Domain kuralları + RUNTIME INPUTS birleştirilir.
4. **Model çağrısı** — Seçilen AI motoru üzerinden Markdown çıktı üretimi.
5. **Yanıt ayrıştırma** — `parseMarkdownResponse()`: `## ` sınırı → reasoning / masterPrompt.
6. **Kalite değerlendirme** — Judge Ensemble V3 ile 5 kriterli puanlama (opsiyonel).
7. **Çıktı sunumu** — Reasoning + Master Prompt + analiz + judge sonuçları.

### 4-Fazlı Stratejik Süreç

- **Faz 1 — Yapısal analiz:** Niyet ve dosya içeriği analiz edilir.
- **Faz 2 — Arama ve keşif:** (Gemini Search) Güncel kaynaklar.
- **Faz 3 — Domain entegrasyonu:** Domain'e özgü kurallar.
- **Faz 4 — Optimizasyon:** Framework doğrultusunda nihai Master Prompt.

---

## Stratejik Çerçeveler (Frameworks)

| ID | Odak | Açıklama |
|----|------|----------|
| **AUTO** | Adaptif | Niyete göre en uygun çerçeve otomatik seçilir. |
| **KERNEL** | Kod & Teknoloji | Teknik mimari, SOLID, güvenlik öncelikli. |
| **CO_STAR** | Yaratıcı & Pazarlama | Context, Objective, Style, Tone, Audience, Response. |
| **RISEN** | Süreç & Ajanlar | Role, Instructions, Steps, End-Goal, Narrowing. |
| **RTF** | Standart & Yapı | Role, Task, Format. |
| **BAB** | İkna & Satış | Before, After, Bridge. |
| **TAG** | Hız & Verim | Task, Action, Goal. |
| **CARE** | Bağlam & Eğitim | Context, Action, Result, Example. |

---

## Uzmanlık Alanları (Domains)

| ID | Açıklama |
|----|----------|
| **auto** | Otomatik tespit; teknik alan ve aşama kuralları. |
| **general** | Genel, alan bağımsız. |
| **ui-design** | UI/UX; WCAG, Atomic Design, Design Tokens. |
| **architecture** | Sistem mimarisi; CAP, DDD, 12-Factor, C4, ADR. |
| **frontend** | Frontend; Core Web Vitals, TypeScript, bileşen mimarisi. |
| **backend** | Backend; OpenAPI, rate limiting, AuthN/AuthZ. |
| **analysis** | Analiz; IEEE 830, MoSCoW, Gherkin. |
| **testing** | Test; OWASP, Test Pyramid, STRIDE. |
| **image-video** | Görsel/video LLM'leri için evrensel prompt. |

---

## Auto Domain Kuralları ve KERNEL/RTF Akışı

**Domain: OTOMATİK TESPİT** seçildiğinde:

- Teknik alan (Frontend/Backend/Security/UI/UX/Architecture/Testing/General) belirlenir.
- Endüstri standartları (OpenAPI, WCAG, OWASP) uygulanır.
- Çıktı formatı alan tabanlı.
- KERNEL mantığı ile ayrıştırma, RTF framework'ü ile alan/aşama tabanlı master prompt.
- Varsayılan: Alan → General, Aşama → Standartlara uyum.

---

## Teknik Detaylar

### AI Motorları

| Motor | Endpoint / Not |
|-------|----------------|
| **Hugging Face** | `router.huggingface.co` (OpenAI uyumlu); Vite proxy `/api/hf` |
| **Gemini** | Google GenAI; gemini-3-pro (Thinking) / gemini-3-flash (standart) |
| **Groq** | Groq Cloud API (doğrudan çağrı) |
| **Claude** | Anthropic API; Vite proxy `/api/claude`; Sonnet/Opus |
| **OpenRouter** | Tek API ile birden fazla model; model listesi `data/openRouterModels.ts` |
| **OpenAI** | OpenAI API entegrasyonu (`services/openaiService.ts`) |
| **DeepSeek** | DeepSeek sağlayıcı entegrasyonu (`services/deepseekService.ts`) |
| **Ollama** | Lokal model desteği (sağlayıcı listesinde) |
| **Auto Provider** | İstek bağlamına göre sağlayıcı fallback/seçim |

### Temel Kütüphaneler

| Kategori | Kütüphane | Versiyon |
|----------|-----------|---------|
| Frontend | React | 19.2 |
| Bundler | Vite | 6.2 |
| Stil | Tailwind CSS | CDN |
| Backend | Express | 5.2 |
| Veritabanı | PostgreSQL (pg) | 8.13 |
| Auth | @supabase/supabase-js | 2.49 |
| JWT | jose | 6.0 |
| Ödeme | Stripe | 17.0 |
| Rate Limit | express-rate-limit | 8.2 |
| AI Agent | @openai/agents | 0.4 |
| Claude SDK | @anthropic-ai/sdk | 0.74 |
| Claude Agent | @anthropic-ai/claude-agent-sdk | 0.2 |
| Google ADK | @google/adk | 0.3 |
| Validation | zod | 4.3 |
| Charts | recharts | 3.7 |
| Test | Vitest | 4.0 |
| TypeScript | | 5.8 |

---

## Proje Yapısı

```
super-reasoning-v3.1/
├── App.tsx                     # Ana uygulama, state, motor seçimi
├── index.tsx                   # Giriş noktası, Error Boundary
├── index.html                  # HTML, Tailwind CDN
├── types.ts                    # Framework, Domain, Attachment tipleri
├── data.ts                     # Framework/domain meta (icon, color)
├── i18n.tsx                    # Dil provider ve useTranslation
├── locales.ts                  # TR/EN çeviriler ve domain contextRules
├── vite.config.ts              # Vite + React, proxy, env
├── tailwind.config.js          # Tailwind ayarları
│
├── components/
│   ├── AgentPipeline.tsx       # Agent pipeline görünümü
│   ├── AILabWorkbench.tsx      # AI Lab ajan akışı (OpenAI Agents SDK)
│   ├── AnalyticsDashboard.tsx  # Kullanım analitikleri
│   ├── ApiIntegrationPanel.tsx # API key & kullanım paneli
│   ├── AuthPage.tsx            # Login/Register sayfası (cyberpunk)
│   ├── BenchmarkPanel.tsx      # v3.2: Auto-benchmark (Judge+Lint+Budget)
│   ├── BudgetPanel.tsx         # Bütçe/maliyet tahmini
│   ├── CacheStatus.tsx         # Semantic cache istatistikleri
│   ├── CommandPalette.tsx      # Komut paleti (Ctrl+K)
│   ├── ConfirmationModal.tsx   # Üretim öncesi onay
│   ├── ContractEditor.tsx      # v3.2: Contract kural tanımlama
│   ├── CustomBuilderPanel.tsx  # v3.2: Custom domain/framework oluşturucu
│   ├── CyberButton.tsx         # Cyberpunk buton bileşeni
│   ├── DashboardHeader.tsx     # V4: Üst durum çubuğu
│   ├── DomainSelector.tsx      # Alan seçici
│   ├── EnhancePanel.tsx        # Prompt geliştirme paneli
│   ├── EnrichmentPanel.tsx     # Auto-enrichment paneli
│   ├── FrameworkSelector.tsx   # Çerçeve seçici
│   ├── InputAnalysisPanel.tsx  # Girdi analizi
│   ├── JudgePanel.tsx          # Judge Ensemble V3 paneli
│   ├── OptimizerPanel.tsx      # Prompt optimizer paneli
│   ├── OutputTerminal.tsx      # V4: Çıktı terminali
│   ├── PricingPage.tsx         # Abonelik planları ($5/ay, $60/yıl)
│   ├── PromptCICDPage.tsx      # v3.2: CI/CD pipeline UI
│   ├── PromptLibrary.tsx       # Prompt kütüphanesi
│   ├── PromptLintPanel.tsx     # Prompt QA/Lint sonuçları
│   ├── ProvenanceView.tsx      # Kaynak takibi görünümü
│   ├── RegressionPanel.tsx     # v3.2: Regression test çalıştırma
│   ├── RegressionReport.tsx    # v3.2: Test sonuçları görüntüleme
│   ├── ResultDisplay.tsx       # Sonuç gösterimi
│   ├── Sidebar.tsx             # V4: Sidebar navigasyon
│   ├── StatusFooter.tsx        # V4: Performans göstergeleri
│   ├── StyleProfileManager.tsx # Teaching Mode profil yönetimi
│   ├── TemplateSelector.tsx    # Şablon seçici
│   ├── TestCaseManager.tsx     # v3.2: Golden test case yönetimi
│   ├── ToastSystem.tsx         # Bildirim sistemi
│   ├── VersionHistoryPanel.tsx # v3.2: Prompt versiyon geçmişi & diff viewer
│   ├── VersionLifecycleBar.tsx # v3.2: Versiyon promotion workflow
│   ├── VibeCodingPanel.tsx     # Vibe coding modu
│   └── WorkflowPanel.tsx       # Agent pipeline paneli
│
├── contexts/
│   └── AuthContext.tsx          # Supabase Auth session + profil yönetimi
│
├── services/
│   ├── agentService.ts         # OpenAI Agents SDK ajan çalıştırma
│   ├── apiClient.ts            # Backend API istemcisi (JWT + API key)
│   ├── budgetOptimizer.ts      # Token maliyet optimizasyonu
│   ├── claudeService.ts        # Claude API
│   ├── contractValidator.ts    # Contract validation motoru
│   ├── deepseekService.ts      # DeepSeek API
│   ├── geminiService.ts        # Gemini API
│   ├── groqService.ts          # Groq API
│   ├── huggingFaceService.ts   # HF API
│   ├── irExtractor.ts          # Intermediate Representation
│   ├── judgeEnsemble.ts        # Judge Ensemble V3 (5 kriter, auto-revision, kalibrasyon)
│   ├── openaiService.ts        # OpenAI API
│   ├── openRouterService.ts    # OpenRouter API
│   ├── optimizerService.ts     # Prompt optimizer servisi
│   ├── optimizerPrompts.ts     # Optimizer sistem prompt'ları
│   ├── orchestrator.ts         # Multi-step agent zinciri
│   ├── promptLint.ts           # Prompt QA kuralları
│   ├── promptLifecycle.ts      # Version lifecycle & promotion
│   ├── regressionRunner.ts     # LLM-powered regression testing
│   ├── semanticCache.ts        # Hash tabanlı önbellek
│   ├── styleProfiles.ts        # Teaching Mode
│   ├── suggestionPool.ts       # Öneri havuzu
│   ├── supabaseClient.ts       # Frontend Supabase client
│   ├── telemetry.ts            # Telemetri
│   ├── unifiedProviderService.ts # Birleşik sağlayıcı katmanı
│   ├── vibeCodingService.ts    # Vibe coding servisi
│   ├── vibeCodingPrompts.ts    # Vibe coding prompt'ları
│   └── webVitalsAnalyzer.ts    # Core Web Vitals analizi
│
├── server/
│   ├── index.ts                # Express sunucu girişi (port 4000 / SR_API_PORT)
│   ├── app.ts                  # Express app setup, CORS, Stripe webhook
│   ├── routes/
│   │   ├── index.ts            # Ana route'lar (/generate, /prompts, /auth, /health)
│   │   ├── agent.ts            # AI Agent endpoint'leri (/agent/run, /agent/status)
│   │   ├── auth.ts             # Supabase Auth: /auth/provision, /auth/me
│   │   ├── builder.ts          # v3.2: Custom domains/frameworks/benchmarks
│   │   ├── payment.ts          # Stripe checkout & webhook (plan bazlı)
│   │   ├── quality.ts          # Judge, lint, budget, cache, audit
│   │   ├── rag.ts              # RAG proxy (SK mikroservisi)
│   │   ├── regression.ts       # v3.2: CI/CD (contracts, test cases, regression, lifecycle)
│   │   ├── runs.ts             # Workflow execution & history
│   │   └── vectorSearch.ts     # Semantik arama & vektör yönetimi
│   ├── middleware/
│   │   ├── auth.ts             # API key authentication (timing-safe)
│   │   ├── supabaseAuth.ts     # JWT verify + requireAnyAuth (dual auth)
│   │   ├── rateLimit.ts        # Rate limiting (plan bazlı)
│   │   └── index.ts            # Middleware barrel
│   ├── lib/
│   │   ├── generateAdapter.ts  # Sunucu tarafı prompt üretimi
│   │   ├── supabase.ts         # Server-side Supabase admin client
│   │   ├── keyManager.ts       # BYOK & Managed key validation
│   │   ├── auditLog.ts         # Audit log yazımı
│   │   ├── usage.ts            # Kullanım takibi
│   │   ├── embeddings.ts       # Embedding üretimi (OpenAI / zvec)
│   │   ├── vectorStore.ts      # In-memory vektör store
│   │   ├── enrichment/         # Auto-enrichment modülleri
│   │   ├── langextract/        # LangExtract client entegrasyonu
│   │   └── compilers/          # IR compiler pipeline
│   ├── db/
│   │   ├── client.ts           # PostgreSQL bağlantı havuzu
│   │   ├── schema.sql          # Ana şema (22 tablo/index)
│   │   ├── schema-rls.sql      # Row Level Security politikaları
│   │   └── migrations/         # DB migrasyonları
│   ├── store/
│   │   ├── index.ts            # Store factory (dosya/DB seçimi)
│   │   ├── promptStore.ts      # Dosya tabanlı prompt deposu
│   │   ├── dbPromptStore.ts    # PostgreSQL prompt deposu
│   │   └── prompts.ts          # Eski uyumluluk
│   ├── scripts/
│   │   ├── migrate-store-to-db.ts  # Dosya → DB migrasyon
│   │   ├── seed-default-org.ts     # Varsayılan org oluşturma
│   │   └── db-setup.ts             # DB kurulum
│   └── types/                  # Sunucu tip tanımları
│
├── cli/sr.ts                   # CLI aracı
├── sdk/client.ts               # TypeScript SDK
├── openapi.yaml                # OpenAPI 3.0.3 spec (v2.0.0)
│
├── data/
│   ├── openRouterModels.ts     # OpenRouter model listesi
│   ├── templates.ts            # Şablon tanımları
│   ├── workflows.ts            # Agent pipeline preset'leri
│   ├── datasetPrompts.ts       # Dataset prompt tanımları
│   └── notebookLmPrompts.ts    # NotebookLM prompt'ları
│
├── types/
│   ├── optimizer.ts            # Optimizer tip tanımları
│   ├── enrichment.ts           # Enrichment tip tanımları
│   └── regression.ts           # CI/CD tip tanımları (ContractRule, TestCase, vb.)
│
├── utils/
│   ├── analysis.ts             # Girdi/çıktı analizi
│   ├── cache.ts                # Genel cache yardımcıları
│   ├── compressIntent.ts       # Niyet sıkıştırma
│   ├── errors.ts               # Hata yardımcıları
│   ├── hooks.ts                # React hook'ları
│   ├── planGating.ts           # Plan bazlı erişim kontrolü
│   └── parseMarkdownResponse.ts # Markdown yanıt parser
│
├── deploy/
│   ├── setup-vps.sh            # VPS ilk kurulum scripti
│   └── update-vps.sh           # VPS güncelleme scripti
│
├── tests/
│   ├── api/                    # API testleri
│   ├── security/               # Güvenlik testleri (OWASP)
│   ├── performance/            # Performans testleri
│   └── ir-extractor.test.ts    # IR extractor testleri
│
├── docs/                       # Dokümantasyon (14 dosya)
└── docker-compose.yml          # Docker yapılandırması
```

---

## Prompt-as-Code API / CLI / SDK

### API (Express)

**Port:** 4000 (veya `SR_API_PORT`)
**Depo:** Dosya tabanlı (`.prompts/`) veya PostgreSQL (`SR_USE_DB_STORE=true`)

**Prompt Kütüphanesine Toplu İçe Aktarma (prompts.chat):** `prompts_chat_prompts` formatındaki JSON dosyasını kütüphane deposuna eklemek için: `data/prompts-chat-import.json` dosyasını bu formatta doldurup `npm run import:prompts-chat` çalıştırın (veya `npx tsx server/scripts/import-prompts-chat.ts [dosya.json]`). Her öğe `value` (prompt metni) ve `value_citation` (kaynak URL) içermelidir.

| Endpoint | Method | Auth | Açıklama |
|----------|--------|------|----------|
| `/v1/health` | GET | - | Sağlık kontrolü |
| `/v1/auth/provision` | POST | JWT | İlk giriş: user + org oluşturma (idempotent) |
| `/v1/auth/me` | GET | JWT | Mevcut kullanıcı profili |
| `/v1/auth/validate` | POST | - | API key doğrulama |
| `/v1/generate` | POST | JWT / API Key | Master prompt üretimi |
| `/v1/prompts` | GET | JWT / API Key | Prompt listesi |
| `/v1/prompts/:id` | GET | JWT / API Key | Tek prompt |
| `/v1/prompts` | POST | JWT / API Key | Prompt kaydet |
| `/v1/prompts/:id` | DELETE | JWT / API Key | Prompt sil |
| `/v1/orgs/:orgId/prompts` | GET | JWT / API Key | Org bazlı promptlar |
| `/v1/judge` | POST | JWT / API Key | Judge Ensemble V3 |
| `/v1/lint` | POST | JWT / API Key | Prompt lint/QA |
| `/v1/budget` | POST | JWT / API Key | Bütçe tahmini |
| `/v1/cache/stats` | GET | JWT / API Key | Cache istatistikleri |
| `/v1/cache/clear` | POST | JWT / API Key | Cache temizleme |
| `/v1/audit` | GET | JWT / API Key | Audit log listesi |
| `/v1/runs` | POST | JWT / API Key | Workflow çalıştırma |
| `/v1/runs` | GET | JWT / API Key | Çalışma geçmişi |
| `/v1/create-checkout-session` | POST | JWT | Stripe checkout ($5/ay veya $60/yıl) |
| `/v1/webhooks/stripe` | POST | - | Stripe webhook |
| `/v1/prompts/:id/versions` | GET | JWT / API Key | Prompt versiyon geçmişi |
| `/v1/prompts/:id/diff` | GET | JWT / API Key | İki versiyon arası diff (`?v1=x&v2=y`) |
| `/v1/domains/custom` | GET/POST | JWT / API Key | Custom domain listele/oluştur |
| `/v1/domains/custom/:id` | DELETE | JWT / API Key | Custom domain sil |
| `/v1/frameworks/custom` | GET/POST | JWT / API Key | Custom framework listele/oluştur |
| `/v1/frameworks/custom/:id` | DELETE | JWT / API Key | Custom framework sil |
| `/v1/benchmarks` | GET/POST | JWT / API Key | Benchmark sonuçları listele/kaydet |
| `/v1/agent/run` | POST | JWT / API Key | Agent çalıştır (OpenAI Agents SDK) |
| `/v1/agent/status` | GET | JWT / API Key | Agent durumu |
| `/v1/rag/ask` | POST | JWT / API Key | RAG sentezli yanıt |
| `/v1/rag/search` | POST | JWT / API Key | RAG arama |
| `/v1/rag/health` | GET | JWT / API Key | RAG servis sağlık kontrolü |
| `/v1/prompts/semantic-search` | POST | JWT / API Key | Vektör tabanlı prompt arama |
| `/v1/prompts/vector-stats` | GET | JWT / API Key | Vektör koleksiyon istatistikleri |
| `/v1/prompts/seed-vectors` | POST | JWT / API Key | Embedding üret + vektör DB doldur |
| `/v1/contracts` | GET/POST | JWT / API Key | Contract listele/oluştur |
| `/v1/contracts/:id` | PUT/DELETE | JWT / API Key | Contract güncelle/sil |
| `/v1/test-cases` | GET/POST | JWT / API Key | Golden test case listele/oluştur |
| `/v1/test-cases/:id` | PUT/DELETE | JWT / API Key | Test case güncelle/sil |
| `/v1/regressions/run` | POST | JWT / API Key | Regression testi çalıştır |
| `/v1/regressions` | GET | JWT / API Key | Regression geçmişi |
| `/v1/versions/:id/lifecycle` | GET | JWT / API Key | Versiyon lifecycle durumu |
| `/v1/versions/:id/promote` | POST | JWT / API Key | Versiyon promote et |

> **Dual Auth:** Tüm korumalı endpoint'ler hem JWT (Bearer token) hem API key (x-api-key header) kabul eder. JWT önceliklidir.

### CLI

```bash
# API'nin çalıştığından emin olun (npm run api)
npx tsx cli/sr.ts health
npx tsx cli/sr.ts generate --intent "REST API tasarla" --framework RTF --provider groq
npx tsx cli/sr.ts list
npx tsx cli/sr.ts get my-prompt --version 1.0.0
npx tsx cli/sr.ts save --id my-prompt --version 1.0.0 --masterPrompt "## SYSTEM\n..."
npx tsx cli/sr.ts delete my-prompt
```

### SDK (TypeScript)

```ts
import { createClient } from './sdk/client';

const client = createClient('http://localhost:4000');

// Prompt üretimi
const result = await client.generate({
  intent: 'WCAG 2.1 AA test planı',
  framework: 'TAG',
  provider: 'groq',
});
console.log(result.masterPrompt);

// Prompt kaydetme
await client.savePrompt({
  id: 'wcag-plan',
  version: '1.0.0',
  masterPrompt: result.masterPrompt,
});

// Prompt listeleme
const list = await client.listPrompts();
```

---

## Deploy (Hostinger VPS)

**Adım adım rehber:** [deploy/HOSTINGER.md](deploy/HOSTINGER.md)

### Mevcut Deployment (örnek)

| | Detay |
|---|---|
| **Sunucu** | Hostinger VPS, Ubuntu 24.04 |
| **Hostname** | neomagic.org |
| **Node.js** | v22 |
| **Tek servis** | `super-reasoning` (Express: API + frontend dist) |
| **Port** | 4000 (Nginx 80/443 → 4000) |
| **Dosya yolu** | `/opt/super-reasoning/` |

### Mimari (tek process)

```
Internet → Nginx (:80/:443) → Express (:4000)
                                ├── /      → dist (frontend)
                                └── /v1/*  → API
```

### İlk kurulum (VPS’te)

```bash
# Repo ve domain’i kendi değerlerinizle değiştirin
REPO_URL="https://github.com/KULLANICI/super-reasoning.git" \
DOMAIN="neomagic.org" \
bash deploy/setup-vps.sh
```

### Hızlı güncelleme

```bash
# VPS’e SSH ile girip
cd /opt/super-reasoning && bash deploy/update-vps.sh
```

### Servis ve log

```bash
systemctl status super-reasoning
journalctl -u super-reasoning -f
```

---

## Kurulum ve Çalıştırma

### Gereksinimler

- Node.js 18+ (önerilen: 22)
- npm
- PostgreSQL (opsiyonel, SaaS modu için)

### Adımlar

1. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

2. **Ortam değişkenleri:** `.env` dosyası oluşturun:
   ```env
   # Hugging Face (varsayılan motor)
   VITE_HUGGING_FACE_HUB_TOKEN=hf_xxxxx

   # Gemini
   VITE_GEMINI_API_KEY=your_gemini_key
   GEMINI_API_KEY=your_gemini_key

   # Groq
   VITE_GROQ_API_KEY=your_groq_key

   # Claude (Anthropic)
   VITE_ANTHROPIC_API_KEY=your_anthropic_key

   # OpenRouter
   VITE_OPENROUTER_API_KEY=your_openrouter_key

   # Platform API (sunucu modu)
   API_KEYS=your-api-key
   VITE_API_KEY=your-api-key

   # Veritabanı (opsiyonel)
   DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
   SR_USE_DB_STORE=true

   # Stripe (opsiyonel)
   STRIPE_SECRET_KEY=sk_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   STRIPE_PRICE_MONTHLY=price_xxx
   STRIPE_PRICE_YEARLY=price_xxx
   ```

   API key kaynakları:
   - Hugging Face: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
   - Gemini: [Google AI Studio](https://aistudio.google.com/apikey)
   - Groq: [console.groq.com](https://console.groq.com)
   - Claude: [console.anthropic.com](https://console.anthropic.com)
   - OpenRouter: [openrouter.ai/keys](https://openrouter.ai/keys)

3. **Geliştirme sunucusu:**
   ```bash
   npm run dev
   ```
   Tarayıcıda `http://localhost:3000` açın.

4. **API sunucusu (ayrı terminal):**
   ```bash
   npm run api
   ```

5. **Production build:**
   ```bash
   npm run build
   npm run preview
   ```

6. **Testler:**
   ```bash
   npm run test        # Vitest (watch)
   npm run test:run    # Tek seferlik
   ```

7. **Veritabanı kurulumu (SaaS modu):**
   ```bash
   npm run db:setup    # Tablo oluşturma
   npm run db:seed     # Varsayılan org
   ```

---

## SaaS Hızlı Başlangıç

| Ne | Nasıl |
|----|--------|
| **RLS uygulama** | `schema.sql` sonra `schema-rls.sql` çalıştırın. |
| **Key doğrulama** | `POST /v1/auth/validate` + header `x-api-key`. |
| **Org promptları** | `GET /v1/orgs/:orgId/prompts` (auth gerekli). |
| **Migrasyon** | `SR_DEFAULT_ORG_ID=... npm run migrate:store` |
| **Güvenlik testleri** | `npx vitest run tests/security/` |

---

## Sorun Giderme

| Sorun | Çözüm |
|-------|--------|
| Port 3000 meşgul | Vite otomatik olarak 3001, 3002 kullanır; terminaldeki adresi açın. |
| `Cannot find module '@babel/types'` | `npm install @babel/types` veya `node_modules` silin → `npm install`. |
| `Cannot find module @rollup/rollup-*` | `node_modules` ve `package-lock.json` silin → `npm install`. |
| API 401 hatası | `.env` dosyasında `API_KEYS` ayarlandığından emin olun. |
| Gemini "Sistem protokolü başarısız" | API key geçerliliğini kontrol edin; hata detayı response'ta görünür. |
| VPS deploy sonrası 403 | `vite.config.ts` → `preview.allowedHosts` listesine hostname ekleyin. |

---

## Dokümantasyon

| Dosya | İçerik |
|-------|--------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Teknik mimari, Mermaid diyagramları |
| [docs/OPTIMIZATION_ARCHITECTURE.md](docs/OPTIMIZATION_ARCHITECTURE.md) | Optimizasyon mimarisi (parametre uyarıları, diff, test) |
| [docs/COMMAND_OPTIMIZATION_ARCHITECTURE.md](docs/COMMAND_OPTIMIZATION_ARCHITECTURE.md) | Komut optimizasyon sistemi: C4, ADR, altyapı, kullanım |
| [docs/JUDGE_ENSEMBLE.md](docs/JUDGE_ENSEMBLE.md) | Judge Ensemble V3 detaylı dokümantasyon |
| [docs/IR_PIPELINE.md](docs/IR_PIPELINE.md) | IR (Intermediate Representation) pipeline |
| [docs/MULTI_TENANCY_AND_KEYS.md](docs/MULTI_TENANCY_AND_KEYS.md) | Multi-tenancy, BYOK vs Managed key |
| [docs/SAAS_TRANSFORMATION.md](docs/SAAS_TRANSFORMATION.md) | SaaS dönüşümü: RLS, migrasyon, checklist |
| [docs/SAAS_BUILD_PLAN.md](docs/SAAS_BUILD_PLAN.md) | SaaS build planı |
| [docs/PAYMENT_INTEGRATION.md](docs/PAYMENT_INTEGRATION.md) | Stripe / iyzico entegrasyon rehberi |
| [docs/KURULUM.md](docs/KURULUM.md) | Adım adım kurulum rehberi |
| [docs/KURULUM_SAAS.md](docs/KURULUM_SAAS.md) | SaaS modu kurulum rehberi |
| [docs/PROMPT_FEATURES_ROADMAP.md](docs/PROMPT_FEATURES_ROADMAP.md) | Prompt üretim özellikleri roadmap |
| [docs/PROMPT_LEADERSHIP_ROADMAP.md](docs/PROMPT_LEADERSHIP_ROADMAP.md) | Kategori lideri yetenekleri roadmap |
| [docs/WCAG_CHECKLIST.md](docs/WCAG_CHECKLIST.md) | WCAG 2.1 AA erişilebilirlik checklist |
| [docs/SECURITY_TEST_PLAN.md](docs/SECURITY_TEST_PLAN.md) | OWASP güvenlik test planı |
| [docs/design-system.json](docs/design-system.json) | Cyberpunk design system tokenleri |

---

## npm Scripts

| Script | Açıklama |
|--------|----------|
| `npm run dev` | Vite dev sunucusu |
| `npm run dev:all` | API + web birlikte çalıştırma (`concurrently`) |
| `npm run build` | Production build |
| `npm run preview` | Build preview |
| `npm run api` | Express API sunucusu (`tsx server/index.ts`) |
| `npm run start` | API başlatma (production benzeri) |
| `npm run test` | Vitest (watch mode) |
| `npm run test:run` | Tek seferlik test |
| `npm run migrate:store` | Dosya → DB migrasyon |
| `npm run db:setup` | DB tablo oluşturma |
| `npm run db:seed` | Varsayılan org seed |
| `npm run import:prompts-chat` | `prompts.chat` JSON içe aktarma |
| `npm run import:prompts-csv` | CSV prompt içe aktarma |
| `npm run import:system-prompts-leaks` | System prompts leaks dataseti içe aktarma |
| `npm run import:all-datasets` | Tüm datasetleri toplu içe aktarma |
| `npm run seed:vectors` | Vektör tohumlama / embedding hazırlama |
| `npm run export:prompts` | Promptları JSON olarak dışa aktarma |
| `npm run import:seed-all` | Toplu import + vektör seed + export zinciri |
| `npm run langextract:setup` | Python LangExtract kurulumu (`pip install -e`) |

---

**SUPER REASONING AI ARCHITECTURE v3.2 | 2026**

*Belirsiz niyetleri, alan ve aşama kurallarına uygun, yapısal Usta İstemlere dönüştüren stratejik muhakeme platformu.*
