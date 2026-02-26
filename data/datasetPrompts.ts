/**
 * Dataset Prompt Kütüphanesi
 * Projedeki tüm veri setlerinden çıkarılan prompt'lar.
 *
 * Kaynaklar:
 *  - archive (5)/data/llm_system_prompts_lookup.csv   → 6 benzersiz LLM sistem talimatı
 *  - archive (5)/data/llm_system_interactions.csv      → Kullanım kalıpları ve şablonlar
 *  - archive (5)/data/llm_system_sessions_summary.csv  → Oturum analitik meta-prompt'ları
 *  - data/prompts-chat-import.json                     → prompts.chat sistem prompt'ları
 *  - train_v2_drcat_02.csv                             → Makale yazım prompt kalıpları
 *  - archive (4)/*.csv                                 → Eğitim veri seti kalıpları
 */

import type { NotebookLmPrompt } from './notebookLmPrompts';

// ═══════════════════════════════════════════════════════════════
// 1) LLM SİSTEM TALİMAT PROMPT'LARI (llm_system_prompts_lookup.csv)
//    6 benzersiz instruction_text — Üretim ortamında test edilmiş
// ═══════════════════════════════════════════════════════════════
export const LLM_SYSTEM_INSTRUCTION_PROMPTS: NotebookLmPrompt[] = [
  {
    id: 'ds-llm-brainstorming',
    category: 'LLM Sistem Talimatları',
    categoryEn: 'LLM System Instructions',
    name: 'Yaratıcı Beyin Fırtınası Asistanı',
    nameEn: 'Creative Brainstorming Assistant',
    prompt: 'Kullanıcıların fikirleri ve seçenekleri keşfetmesine yardımcı olan yaratıcı bir asistansın. Birden fazla alternatif öner, bunları net bir şekilde yapılandır ve pratik kal.',
    promptEn: 'Kullanıcıların fikirleri ve seçenekleri keşfetmesine yardımcı olan yaratıcı bir asistansın. Birden fazla alternatif öner, bunları net bir şekilde yapılandır ve pratik kal.',
    tags: ['llm-system', 'brainstorming', 'yaratıcılık', 'fikir-üretme', 'production-tested'],
  },
  {
    id: 'ds-llm-coding',
    category: 'LLM Sistem Talimatları',
    categoryEn: 'LLM System Instructions',
    name: 'Kıdemli Yazılım Mühendisi Asistanı',
    nameEn: 'Senior Software Engineer Assistant',
    prompt: 'Kullanıcılara kod, hata ayıklama ve en iyi uygulamalar konusunda yardımcı olan kıdemli bir yazılım mühendisisin. Net açıklamalar, yapılandırılmış adımlar ve ilgili olduğunda yüksek kaliteli kod örnekleri sun.',
    promptEn: 'Kullanıcılara kod, hata ayıklama ve en iyi uygulamalar konusunda yardımcı olan kıdemli bir yazılım mühendisisin. Net açıklamalar, yapılandırılmış adımlar ve ilgili olduğunda yüksek kaliteli kod örnekleri sun.',
    tags: ['llm-system', 'coding', 'debugging', 'yazılım', 'best-practices', 'production-tested'],
  },
  {
    id: 'ds-llm-content-writing',
    category: 'LLM Sistem Talimatları',
    categoryEn: 'LLM System Instructions',
    name: 'İçerik Yazım Asistanı',
    nameEn: 'Content Writing Assistant',
    prompt: 'Kullanıcıların açık, ilgi çekici ve iyi yapılandırılmış içerik oluşturmasına yardımcı olan bir yazım asistanısın. Tonu doğal, okunabilir ve kullanıcının amacına uygun tut.',
    promptEn: 'Kullanıcıların açık, ilgi çekici ve iyi yapılandırılmış içerik oluşturmasına yardımcı olan bir yazım asistanısın. Tonu doğal, okunabilir ve kullanıcının amacına uygun tut.',
    tags: ['llm-system', 'writing', 'içerik', 'copywriting', 'production-tested'],
  },
  {
    id: 'ds-llm-customer-support',
    category: 'LLM Sistem Talimatları',
    categoryEn: 'LLM System Instructions',
    name: 'Müşteri Destek Asistanı',
    nameEn: 'Customer Support Assistant',
    prompt: 'Bir SaaS ürünü için yardımcı müşteri destek asistanısın. Açıkça, empatik ve adım adım yanıt ver, yanıtı kısa ve pratik tut.',
    promptEn: 'Bir SaaS ürünü için yardımcı müşteri destek asistanısın. Açıkça, empatik ve adım adım yanıt ver, yanıtı kısa ve pratik tut.',
    tags: ['llm-system', 'customer-support', 'müşteri-destek', 'saas', 'production-tested'],
  },
  {
    id: 'ds-llm-data-analysis',
    category: 'LLM Sistem Talimatları',
    categoryEn: 'LLM System Instructions',
    name: 'Veri Analizi Asistanı',
    nameEn: 'Data Analysis Assistant',
    prompt: 'Kullanıcıların veri, metrikler ve modeller hakkında akıl yürütmesine yardımcı olan bir veri analizi asistanısın. Ödünleşimleri açıkla, adımları belirt ve dili erişilebilir ama kesin tut.',
    promptEn: 'Kullanıcıların veri, metrikler ve modeller hakkında akıl yürütmesine yardımcı olan bir veri analizi asistanısın. Ödünleşimleri açıkla, adımları belirt ve dili erişilebilir ama kesin tut.',
    tags: ['llm-system', 'data-analysis', 'veri-analizi', 'metrikler', 'production-tested'],
  },
  {
    id: 'ds-llm-internal-qa',
    category: 'LLM Sistem Talimatları',
    categoryEn: 'LLM System Instructions',
    name: 'Dahili Bilgi Asistanı',
    nameEn: 'Internal Knowledge Assistant',
    prompt: 'Ekip arkadaşlarının dokümantasyon, politikalar ve dahili araçlarda gezinmesine yardımcı olan dahili bilgi asistanısın. Kesin, özlü ol ve ilgili bilgilere ve sonraki adımlara yönlendir.',
    promptEn: 'Ekip arkadaşlarının dokümantasyon, politikalar ve dahili araçlarda gezinmesine yardımcı olan dahili bilgi asistanısın. Kesin, özlü ol ve ilgili bilgilere ve sonraki adımlara yönlendir.',
    tags: ['llm-system', 'internal-qa', 'dokümantasyon', 'bilgi-yönetimi', 'production-tested'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 2) TALİMAT ŞABLONU META-PROMPT'LARI (instruction_template patterns)
//    6 farklı şablon stratejisi
// ═══════════════════════════════════════════════════════════════
export const LLM_INSTRUCTION_TEMPLATE_PROMPTS: NotebookLmPrompt[] = [
  {
    id: 'ds-template-analytics-helper',
    category: 'LLM Talimat Şablonları',
    categoryEn: 'LLM Instruction Templates',
    name: 'Analitik Yardımcı Şablonu',
    nameEn: 'Analytics Helper Template',
    prompt: 'Analitik yardımcı şablonu: Verilere dayalı içgörüler sunmak, metrikleri açıklamak ve karar verme süreçlerini desteklemek için tasarlanmış LLM talimat kalıbı. Kullanım alanları: brainstorming, kodlama, içerik yazımı, müşteri desteği, veri analizi, dahili bilgi yönetimi.',
    promptEn: 'Analitik yardımcı şablonu: Verilere dayalı içgörüler sunmak, metrikleri açıklamak ve karar verme süreçlerini desteklemek için tasarlanmış LLM talimat kalıbı. Kullanım alanları: brainstorming, kodlama, içerik yazımı, müşteri desteği, veri analizi, dahili bilgi yönetimi.',
    tags: ['template', 'analytics', 'instruction-design', 'llm-ops'],
  },
  {
    id: 'ds-template-code-assistant-secure',
    category: 'LLM Talimat Şablonları',
    categoryEn: 'LLM Instruction Templates',
    name: 'Güvenli Kod Asistanı Şablonu',
    nameEn: 'Secure Code Assistant Template',
    prompt: 'Güvenli kod asistanı şablonu: Güvenlik odaklı kodlama pratiği sunan, güvenlik açıklarını önleyen ve en iyi güvenlik uygulamalarını takip eden LLM talimat kalıbı. Input doğrulama, output encoding ve güvenli API kullanımını vurgular.',
    promptEn: 'Secure Code Assistant Template: An LLM instruction pattern that delivers security-focused coding practices, prevents vulnerabilities, and follows security best practices. Emphasizes input validation, output encoding, and secure API usage.',
    tags: ['template', 'security', 'secure-coding', 'instruction-design', 'llm-ops'],
  },
  {
    id: 'ds-template-creative-writer',
    category: 'LLM Talimat Şablonları',
    categoryEn: 'LLM Instruction Templates',
    name: 'Yaratıcı Yazar Şablonu',
    nameEn: 'Creative Writer Template',
    prompt: 'Yaratıcı yazar şablonu: Yaratıcı ve özgün içerik üretimi için tasarlanmış LLM talimat kalıbı. Hikaye anlatımı, senaryo yazımı, blog yazıları ve pazarlama metinleri için kullanılır. Ton, stil ve hedef kitle uyumu sağlar.',
    promptEn: 'Creative Writer Template: An LLM instruction pattern designed for creative and original content generation. Used for storytelling, screenwriting, blog posts, and marketing copy. Ensures tone, style, and audience alignment.',
    tags: ['template', 'creative-writing', 'yaratıcı-yazım', 'instruction-design', 'llm-ops'],
  },
  {
    id: 'ds-template-general-assistant',
    category: 'LLM Talimat Şablonları',
    categoryEn: 'LLM Instruction Templates',
    name: 'Genel Amaçlı Asistan Şablonu',
    nameEn: 'General Assistant Template',
    prompt: 'Genel amaçlı asistan şablonu: Geniş kullanım alanları için esnek, adaptif bir LLM talimat kalıbı. Tüm kullanım durumlarına (kodlama, yazım, analiz, destek) tek bir şablonla uyum sağlar. Bağlam farkındalığı ve dinamik yanıt stratejisi kullanır.',
    promptEn: 'General Assistant Template: A flexible, adaptive LLM instruction pattern for broad use cases. Adapts to all scenarios (coding, writing, analysis, support) via a single template. Uses context awareness and dynamic response strategy.',
    tags: ['template', 'general-purpose', 'genel-amaçlı', 'instruction-design', 'llm-ops'],
  },
  {
    id: 'ds-template-internal-policy-qa',
    category: 'LLM Talimat Şablonları',
    categoryEn: 'LLM Instruction Templates',
    name: 'Dahili Politika Soru-Cevap Şablonu',
    nameEn: 'Internal Policy QA Template',
    prompt: 'Dahili politika soru-cevap şablonu: Şirket politikaları, prosedürler ve dahili dokümantasyon üzerinde doğru yanıtlar sunan LLM talimat kalıbı. Sadece yetkili kaynaklara dayanır, hallüsinasyonu minimize eder.',
    promptEn: 'Internal Policy QA Template: An LLM instruction pattern that delivers accurate answers about company policies, procedures, and internal documentation. Relies only on authorized sources, minimizes hallucination.',
    tags: ['template', 'policy', 'internal-qa', 'instruction-design', 'llm-ops'],
  },
  {
    id: 'ds-template-support-strict',
    category: 'LLM Talimat Şablonları',
    categoryEn: 'LLM Instruction Templates',
    name: 'Sıkı Destek Şablonu',
    nameEn: 'Strict Support Template',
    prompt: 'Sıkı destek şablonu: Katı kurallar ve SLA\'lar çerçevesinde müşteri desteği sunan LLM talimat kalıbı. Yanıt süresi, ton tutarlılığı ve eskalasyon kurallarını sıkı bir şekilde takip eder. Uyumsuz istekleri nazikçe reddeder.',
    promptEn: 'Strict Support Template: An LLM instruction pattern that delivers customer support within strict rules and SLAs. Strictly follows response time, tone consistency, and escalation rules. Politely declines non-compliant requests.',
    tags: ['template', 'support', 'strict', 'sla', 'instruction-design', 'llm-ops'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 3) PROMPTS.CHAT SİSTEM PROMPT'LARI
// ═══════════════════════════════════════════════════════════════
export const PROMPTS_CHAT_SYSTEM_PROMPTS: NotebookLmPrompt[] = [
  {
    id: 'ds-pchat-system-architect',
    category: 'Sistem Prompt\'ları',
    categoryEn: 'System Prompts',
    name: 'Deneyimli Sistem Mimarı',
    nameEn: 'Experienced System Architect',
    prompt: '25+ yıllık deneyime sahip bir sistem mimarısın. Verilen fikir için çalışabilir bir sistem tasarla: problemi açıkla, bileşenleri tanımla, adım adım süreç belirle, kaynakları listele, riskleri değerlendir, ölçeklendirme planla ve uygulama planı sun. Sadece kanıtlanmış yaklaşımları kullan.',
    promptEn: 'You are an experienced System Architect with 25+ years of expertise in designing practical, real-world systems across multiple domains. Your task is to design a fully workable system for the given idea: explain the problem, define components, describe step-by-step process, list resources, identify risks, explain scaling, and provide implementation plan. Use only existing, proven approaches.',
    tags: ['system-prompt', 'architecture', 'sistem-tasarım', 'prompts-chat'],
  },
  {
    id: 'ds-pchat-wfgy-reasoning-os',
    category: 'Sistem Prompt\'ları',
    categoryEn: 'System Prompts',
    name: 'WFGY Akıl Yürütme İşletim Sistemi',
    nameEn: 'WFGY Self-Healing Reasoning OS',
    prompt: 'WFGY Core\'sun — herhangi bir LLM üzerinde çalışan hafif bir akıl yürütme işletim sistemi. Yanıtları: kullanıcının gerçek hedefiyle uyumlu tut, bilinen/bilinmeyen ayrımını açık yap, sonradan hata ayıklamayı kolay kıl.',
    promptEn: 'You are WFGY Core — a lightweight reasoning operating system that runs on top of any strong LLM (ChatGPT, Claude, Gemini, local models). Keep answers: aligned with the user\'s actual goal, explicit about what is known vs unknown, easy to debug later.',
    tags: ['system-prompt', 'reasoning', 'akıl-yürütme', 'meta-prompt', 'prompts-chat'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 4) LLM ANALİTİK KULLANIM KALIPLARI (interactions + sessions)
//    Gerçek kullanım verisinden çıkarılan prompt kalıpları
// ═══════════════════════════════════════════════════════════════
export const LLM_ANALYTICS_USE_CASE_PROMPTS: NotebookLmPrompt[] = [
  {
    id: 'ds-usecase-brainstorming',
    category: 'LLM Kullanım Kalıpları',
    categoryEn: 'LLM Use Case Patterns',
    name: 'Beyin Fırtınası Kullanım Kalıbı',
    nameEn: 'Brainstorming Use Case Pattern',
    prompt: 'Beyin fırtınası kullanım kalıbı: Ürün fikirleri, kampanya sloganları, özellik alternatifleri üretmek için. Optimum ayarlar: temperature 0.7-0.9, max_tokens 768-1024. Başarı metriği: kullanıcı memnuniyeti (CSAT) ve üretilen alternatif sayısı.',
    promptEn: 'Brainstorming Use Case Pattern: For generating product ideas, campaign slogans, feature alternatives. Optimal settings: temperature 0.7-0.9, max_tokens 768-1024. Success metrics: CSAT and number of alternatives generated.',
    tags: ['use-case', 'brainstorming', 'analytics', 'llm-ops'],
  },
  {
    id: 'ds-usecase-coding-assistant',
    category: 'LLM Kullanım Kalıpları',
    categoryEn: 'LLM Use Case Patterns',
    name: 'Kodlama Asistanı Kullanım Kalıbı',
    nameEn: 'Coding Assistant Use Case Pattern',
    prompt: 'Kodlama asistanı kullanım kalıbı: Hata ayıklama, kod üretimi, code review için. Optimum ayarlar: temperature 0.2-0.4, max_tokens 1024-2048. En sık araçlar: code execution, linting. Başarı metriği: çözüm doğruluğu ve ilk seferde çözüm oranı.',
    promptEn: 'Coding Assistant Use Case Pattern: For debugging, code generation, code review. Optimal settings: temperature 0.2-0.4, max_tokens 1024-2048. Most used tools: code execution, linting. Success metrics: solution accuracy and first-attempt resolution rate.',
    tags: ['use-case', 'coding', 'analytics', 'llm-ops'],
  },
  {
    id: 'ds-usecase-content-writing',
    category: 'LLM Kullanım Kalıpları',
    categoryEn: 'LLM Use Case Patterns',
    name: 'İçerik Yazım Kullanım Kalıbı',
    nameEn: 'Content Writing Use Case Pattern',
    prompt: 'İçerik yazım kullanım kalıbı: Blog, e-posta, sosyal medya, pazarlama metni için. Optimum ayarlar: temperature 0.5-0.7, max_tokens 1024. Ton ve stil tutarlılığı kritik. Başarı metriği: yeniden yazım oranı ve kullanıcı onay hızı.',
    promptEn: 'Content Writing Use Case Pattern: For blogs, emails, social media, marketing copy. Optimal settings: temperature 0.5-0.7, max_tokens 1024. Tone and style consistency are critical. Success metrics: rewrite rate and user approval speed.',
    tags: ['use-case', 'content-writing', 'analytics', 'llm-ops'],
  },
  {
    id: 'ds-usecase-customer-support',
    category: 'LLM Kullanım Kalıpları',
    categoryEn: 'LLM Use Case Patterns',
    name: 'Müşteri Destek Kullanım Kalıbı',
    nameEn: 'Customer Support Use Case Pattern',
    prompt: 'Müşteri destek kullanım kalıbı: Bilet çözümü, FAQ yanıtlama, eskalasyon yönetimi için. Optimum ayarlar: temperature 0.1-0.3, max_tokens 512. Empati ve adım-adım yanıt önemli. En yüksek etkileşim hacmi bu kategoride. Başarı metriği: çözüm oranı ve CSAT.',
    promptEn: 'Customer Support Use Case Pattern: For ticket resolution, FAQ answering, escalation management. Optimal settings: temperature 0.1-0.3, max_tokens 512. Empathy and step-by-step responses are important. Highest interaction volume in this category. Success metrics: resolution rate and CSAT.',
    tags: ['use-case', 'customer-support', 'analytics', 'llm-ops'],
  },
  {
    id: 'ds-usecase-data-analysis',
    category: 'LLM Kullanım Kalıpları',
    categoryEn: 'LLM Use Case Patterns',
    name: 'Veri Analizi Kullanım Kalıbı',
    nameEn: 'Data Analysis Use Case Pattern',
    prompt: 'Veri analizi kullanım kalıbı: Metrik yorumlama, trend analizi, model değerlendirme için. Optimum ayarlar: temperature 0.1-0.3, max_tokens 1024. Kesinlik ve ödünleşim açıklamaları kritik. Başarı metriği: içgörü doğruluğu ve uygulama oranı.',
    promptEn: 'Data Analysis Use Case Pattern: For metric interpretation, trend analysis, model evaluation. Optimal settings: temperature 0.1-0.3, max_tokens 1024. Precision and trade-off explanations are critical. Success metrics: insight accuracy and implementation rate.',
    tags: ['use-case', 'data-analysis', 'analytics', 'llm-ops'],
  },
  {
    id: 'ds-usecase-internal-qa',
    category: 'LLM Kullanım Kalıpları',
    categoryEn: 'LLM Use Case Patterns',
    name: 'Dahili Bilgi Yönetimi Kullanım Kalıbı',
    nameEn: 'Internal QA Use Case Pattern',
    prompt: 'Dahili bilgi yönetimi kullanım kalıbı: Dokümantasyon arama, politika açıklama, araç kullanım rehberliği için. Optimum ayarlar: temperature 0.1, max_tokens 512. Kaynak referansı zorunlu. En düşük etkileşim hacmi ama en yüksek doğruluk beklentisi.',
    promptEn: 'Internal QA Use Case Pattern: For documentation search, policy clarification, tool usage guidance. Optimal settings: temperature 0.1, max_tokens 512. Source references are mandatory. Lowest interaction volume but highest accuracy expectation.',
    tags: ['use-case', 'internal-qa', 'analytics', 'llm-ops'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 5) LLM OPS & PERFORMANS PROMPT'LARI (analytics-derived)
//    Oturum ve etkileşim verilerinden çıkarılan operasyonel kalıplar
// ═══════════════════════════════════════════════════════════════
export const LLM_OPS_PROMPTS: NotebookLmPrompt[] = [
  {
    id: 'ds-ops-quality-scoring',
    category: 'LLMOps Kalıpları',
    categoryEn: 'LLMOps Patterns',
    name: 'Yanıt Kalite Puanlama Sistemi',
    nameEn: 'Response Quality Scoring System',
    prompt: 'LLM yanıt kalitesi puanlama sistemi tasarla: (1) Doğruluk — hallüsinasyon, toksiklik, güvenlik bloğu kontrolü, (2) Format — yapısal hata, araç hatası kontrolü, (3) Performans — gecikme, token/saniye, maliyet analizi. 0-1 arası bileşik skor üret.',
    promptEn: 'Design an LLM response quality scoring system: (1) Accuracy — hallucination, toxicity, safety block checks, (2) Format — structural error, tool error checks, (3) Performance — latency, tokens/second, cost analysis. Generate a composite score between 0-1.',
    tags: ['llm-ops', 'quality', 'scoring', 'monitoring'],
  },
  {
    id: 'ds-ops-failure-analysis',
    category: 'LLMOps Kalıpları',
    categoryEn: 'LLMOps Patterns',
    name: 'Hata Analizi ve Onarım Stratejisi',
    nameEn: 'Failure Analysis & Repair Strategy',
    prompt: 'LLM hata analizi ve onarım stratejisi: Hata türleri — formatting_error, safety_block, hallucination, tool_error, latency_timeout. Her hata türü için: (1) Tespit yöntemi, (2) Kök neden analizi, (3) Otomatik onarım stratejisi (retry, enable_tools, manual_post_edit), (4) Eskalasyon kuralı.',
    promptEn: 'LLM failure analysis and repair strategy: Failure types — formatting_error, safety_block, hallucination, tool_error, latency_timeout. For each failure type: (1) Detection method, (2) Root cause analysis, (3) Auto-repair strategy (retry, enable_tools, manual_post_edit), (4) Escalation rule.',
    tags: ['llm-ops', 'failure-analysis', 'repair', 'monitoring'],
  },
  {
    id: 'ds-ops-cost-optimization',
    category: 'LLMOps Kalıpları',
    categoryEn: 'LLMOps Patterns',
    name: 'LLM Maliyet Optimizasyonu',
    nameEn: 'LLM Cost Optimization',
    prompt: 'LLM maliyet optimizasyonu stratejisi: (1) Token kullanımı analizi — prompt/completion oranı, (2) Model seçimi — görev karmaşıklığına göre model routing, (3) Cache stratejisi — benzer sorgular için yanıt önbelleği, (4) Batch işleme — düşük öncelikli istekleri gruplama. Hedef: istek başına %30 maliyet düşüşü.',
    promptEn: 'LLM cost optimization strategy: (1) Token usage analysis — prompt/completion ratio, (2) Model selection — model routing by task complexity, (3) Cache strategy — response caching for similar queries, (4) Batch processing — grouping low-priority requests. Target: 30% cost reduction per request.',
    tags: ['llm-ops', 'cost', 'optimization', 'maliyet'],
  },
  {
    id: 'ds-ops-user-segmentation',
    category: 'LLMOps Kalıpları',
    categoryEn: 'LLMOps Patterns',
    name: 'Kullanıcı Segmentasyonu ve Risk Analizi',
    nameEn: 'User Segmentation & Risk Analysis',
    prompt: 'LLM kullanıcı segmentasyonu: Segment türleri — individual, team, enterprise_team. Risk bayrakları: yüksek hata oranı (>%20), düşük CSAT (<3.0), yüksek eskalasyon oranı. Hesap seviyeleri: free, pro, enterprise. Her segment için özel prompt stratejisi ve SLA tanımla.',
    promptEn: 'LLM user segmentation: Segment types — individual, team, enterprise_team. Risk flags: high failure rate (>20%), low CSAT (<3.0), high escalation rate. Account tiers: free, pro, enterprise. Define custom prompt strategy and SLA for each segment.',
    tags: ['llm-ops', 'segmentation', 'risk-analysis', 'kullanıcı'],
  },
  {
    id: 'ds-ops-ab-testing',
    category: 'LLMOps Kalıpları',
    categoryEn: 'LLMOps Patterns',
    name: 'Prompt A/B Test Çerçevesi',
    nameEn: 'Prompt A/B Testing Framework',
    prompt: 'Prompt A/B test çerçevesi: (1) Hipotez — hangi prompt varyantı daha iyi performans gösterir, (2) Metrikler — CSAT, çözüm oranı, token maliyeti, gecikme, (3) Trafik bölüşümü — %50/%50 veya kademeli dağıtım, (4) İstatistiksel anlamlılık — minimum örneklem büyüklüğü hesabı, (5) Karar kuralı — hangi varyant kazandığını belirleme.',
    promptEn: 'Prompt A/B testing framework: (1) Hypothesis — which prompt variant performs better, (2) Metrics — CSAT, resolution rate, token cost, latency, (3) Traffic split — 50/50 or gradual rollout, (4) Statistical significance — minimum sample size calculation, (5) Decision rule — determining the winning variant.',
    tags: ['llm-ops', 'ab-testing', 'optimization', 'deneysel'],
  },
  {
    id: 'ds-ops-multi-model-routing',
    category: 'LLMOps Kalıpları',
    categoryEn: 'LLMOps Patterns',
    name: 'Çok Modelli Yönlendirme Stratejisi',
    nameEn: 'Multi-Model Routing Strategy',
    prompt: 'Çok modelli yönlendirme: Model sağlayıcıları (OpenAI, Anthropic, Google, Meta) arasında akıllı yönlendirme. Karar faktörleri: (1) Görev türü — kodlama→claude, yaratıcı→gpt4, analiz→gemini, (2) Maliyet bütçesi, (3) Gecikme gereksinimleri, (4) Bölge kısıtlamaları. Fallback zinciri ve circuit breaker kalıbı uygula.',
    promptEn: 'Multi-model routing: Intelligent routing between model providers (OpenAI, Anthropic, Google, Meta). Decision factors: (1) Task type — coding→claude, creative→gpt4, analysis→gemini, (2) Cost budget, (3) Latency requirements, (4) Region constraints. Implement fallback chain and circuit breaker pattern.',
    tags: ['llm-ops', 'routing', 'multi-model', 'architecture'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 6) SFT / TALİMAT AYARLAMA PROMPT'LARI (instruction_tuning_samples)
//    Eğitim verisi kalıplarından çıkarılan prompt mühendisliği kalıpları
// ═══════════════════════════════════════════════════════════════
export const SFT_PROMPT_PATTERNS: NotebookLmPrompt[] = [
  {
    id: 'ds-sft-structured-request',
    category: 'SFT Prompt Kalıpları',
    categoryEn: 'SFT Prompt Patterns',
    name: 'Yapılandırılmış İstek Formatı',
    nameEn: 'Structured Request Format',
    prompt: 'Yapılandırılmış istek formatı: Bağlam → İstek → Gereksinimler → Format şeklinde 4 bölümlü prompt yapısı. Bağlam üretim sistemi bilgisi verir, İstek spesifik görevi tanımlar, Gereksinimler kısıtlamaları belirtir, Format çıktı şeklini belirler. Bu yapı SFT eğitiminde en yüksek kalite puanını almıştır.',
    promptEn: 'Structured Request Format: A 4-section prompt structure of Context → Request → Requirements → Format. Context provides production system info, Request defines the specific task, Requirements specify constraints, Format determines output shape. This structure achieved the highest quality scores in SFT training.',
    tags: ['sft', 'prompt-engineering', 'structured', 'best-practice'],
  },
  {
    id: 'ds-sft-chain-of-thought',
    category: 'SFT Prompt Kalıpları',
    categoryEn: 'SFT Prompt Patterns',
    name: 'Düşünce Zinciri Kalıbı',
    nameEn: 'Chain of Thought Pattern',
    prompt: 'Düşünce zinciri kalıbı: Karmaşık görevler için adım adım akıl yürütme talimatı. "Adım adım düşün ve her adımı açıkla" ifadesi ekle. Sonuca doğrudan atlamak yerine ara adımları göster. Hata ayıklama ve doğrulama için kritik.',
    promptEn: 'Chain of Thought Pattern: Step-by-step reasoning instruction for complex tasks. Add "Think step by step and explain each step." Show intermediate steps instead of jumping to conclusions. Critical for debugging and verification.',
    tags: ['sft', 'chain-of-thought', 'reasoning', 'prompt-engineering'],
  },
  {
    id: 'ds-sft-guardrails',
    category: 'SFT Prompt Kalıpları',
    categoryEn: 'SFT Prompt Patterns',
    name: 'Güvenlik Rayları Kalıbı',
    nameEn: 'Guardrails Pattern',
    prompt: 'Güvenlik rayları kalıbı: (1) Girdi doğrulama — zararlı içerik filtreleme, (2) Çıktı doğrulama — format kontrolü, hallüsinasyon tespiti, (3) Konu sınırları — ilgisiz sorgulara nazik reddetme, (4) Eskalasyon — belirsiz durumlarda insana yönlendirme. Üretim sistemlerinde %15 hata azalması sağlar.',
    promptEn: 'Guardrails Pattern: (1) Input validation — harmful content filtering, (2) Output validation — format checking, hallucination detection, (3) Topic boundaries — polite decline for irrelevant queries, (4) Escalation — routing to human for uncertain cases. Reduces errors by 15% in production systems.',
    tags: ['sft', 'guardrails', 'safety', 'prompt-engineering'],
  },
  {
    id: 'ds-sft-few-shot',
    category: 'SFT Prompt Kalıpları',
    categoryEn: 'SFT Prompt Patterns',
    name: 'Az Örnekli Öğrenme Kalıbı',
    nameEn: 'Few-Shot Learning Pattern',
    prompt: 'Az örnekli öğrenme kalıbı: 2-5 örnek giriş/çıkış çifti sunarak modeli yönlendir. Örnekler: (1) Farklı zorluklarda olmalı, (2) Beklenen formatı göstermeli, (3) Uç durumları kapsamalı. Prompt boyutu artsa da doğruluk %20-40 artar.',
    promptEn: 'Few-Shot Learning Pattern: Guide the model by providing 2-5 example input/output pairs. Examples should: (1) Vary in difficulty, (2) Demonstrate expected format, (3) Cover edge cases. While prompt size increases, accuracy improves by 20-40%.',
    tags: ['sft', 'few-shot', 'öğrenme', 'prompt-engineering'],
  },
  {
    id: 'ds-sft-self-consistency',
    category: 'SFT Prompt Kalıpları',
    categoryEn: 'SFT Prompt Patterns',
    name: 'Öz-Tutarlılık Doğrulama Kalıbı',
    nameEn: 'Self-Consistency Verification Pattern',
    prompt: 'Öz-tutarlılık doğrulama kalıbı: (1) Aynı soruya 3 farklı yaklaşımla yanıt üret, (2) Yanıtları karşılaştır, (3) Tutarsızlıkları belirle, (4) Çoğunluk oyuyla final yanıtı seç. Kritik kararlar ve yüksek riskli senaryolar için kullan.',
    promptEn: 'Self-Consistency Verification Pattern: (1) Generate 3 responses with different approaches to the same question, (2) Compare responses, (3) Identify inconsistencies, (4) Select final answer by majority vote. Use for critical decisions and high-risk scenarios.',
    tags: ['sft', 'self-consistency', 'verification', 'prompt-engineering'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 7) MAKALE YAZIM PROMPT KALIPLARI (train_v2_drcat_02.csv)
//    Eğitim veri setinden çıkarılan yazım prompt kalıpları
// ═══════════════════════════════════════════════════════════════
export const ESSAY_WRITING_PROMPTS: NotebookLmPrompt[] = [
  {
    id: 'ds-essay-persuasive',
    category: 'Makale Yazım Kalıpları',
    categoryEn: 'Essay Writing Patterns',
    name: 'İkna Edici Makale Yazımı',
    nameEn: 'Persuasive Essay Writing',
    prompt: 'İkna edici makale yaz: Verilen konu hakkında güçlü bir tez cümlesi oluştur, destekleyici argümanlar sun, karşıt görüşleri çürüt ve güçlü bir sonuçla bitir. Yapı: Giriş→Tez→3 Argüman→Karşıt Görüş→Çürütme→Sonuç. AI-tespit edilemez doğal bir stil kullan.',
    promptEn: 'Write a persuasive essay: Create a strong thesis statement about the given topic, present supporting arguments, refute opposing views, and end with a powerful conclusion. Structure: Introduction→Thesis→3 Arguments→Counter-argument→Refutation→Conclusion. Use a natural style that is AI-undetectable.',
    tags: ['essay', 'persuasive', 'writing', 'eğitim-verisi'],
  },
  {
    id: 'ds-essay-argumentative',
    category: 'Makale Yazım Kalıpları',
    categoryEn: 'Essay Writing Patterns',
    name: 'Tartışmacı Makale Yazımı',
    nameEn: 'Argumentative Essay Writing',
    prompt: 'Tartışmacı makale yaz: Lehte ve aleyhte argümanları dengeli bir şekilde sun. Her argümanı kanıtlarla destekle. Tarafsız bir ton kullanarak okuyucunun kendi kararını vermesine izin ver. Kaynak gösterimi ve mantıksal tutarlılık kritik.',
    promptEn: 'Write an argumentative essay: Present arguments for and against in a balanced manner. Support each argument with evidence. Use a neutral tone allowing the reader to form their own judgment. Source citation and logical consistency are critical.',
    tags: ['essay', 'argumentative', 'writing', 'eğitim-verisi'],
  },
  {
    id: 'ds-essay-expository',
    category: 'Makale Yazım Kalıpları',
    categoryEn: 'Essay Writing Patterns',
    name: 'Açıklayıcı Makale Yazımı',
    nameEn: 'Expository Essay Writing',
    prompt: 'Açıklayıcı makale yaz: Verilen konuyu objektif ve bilgilendirici bir şekilde açıkla. Tanım, sınıflandırma, karşılaştırma, neden-sonuç ilişkisi gibi yöntemleri kullan. Kişisel görüş belirtme, sadece olgulara dayanarak bilgi sun.',
    promptEn: 'Write an expository essay: Explain the given topic objectively and informatively. Use methods like definition, classification, comparison, cause-and-effect. Do not express personal opinions, present information based only on facts.',
    tags: ['essay', 'expository', 'writing', 'eğitim-verisi'],
  },
  {
    id: 'ds-essay-technology-impact',
    category: 'Makale Yazım Kalıpları',
    categoryEn: 'Essay Writing Patterns',
    name: 'Teknoloji Etki Analizi Makalesi',
    nameEn: 'Technology Impact Analysis Essay',
    prompt: 'Teknolojinin toplum üzerindeki etkisini analiz eden bir makale yaz: Telefon kullanımı, sosyal medya, yapay zeka gibi konularda olumlu ve olumsuz etkileri tartış. Gerçek veriler ve istatistiklerle destekle. Geleceğe yönelik öngörüler sun.',
    promptEn: 'Write an essay analyzing the impact of technology on society: Discuss positive and negative effects on topics like phone usage, social media, AI. Support with real data and statistics. Provide forward-looking predictions.',
    tags: ['essay', 'technology', 'impact', 'analysis', 'eğitim-verisi'],
  },
  {
    id: 'ds-essay-ai-detection-resistant',
    category: 'Makale Yazım Kalıpları',
    categoryEn: 'Essay Writing Patterns',
    name: 'Doğal Dil Yazım Kalıbı',
    nameEn: 'Natural Language Writing Pattern',
    prompt: 'Doğal ve insan benzeri bir yazım stili kullan: (1) Değişken cümle uzunlukları, (2) Günlük dil ifadeleri, (3) Kişisel deneyim referansları, (4) Küçük dilbilgisi çeşitlilikleri, (5) Tutarlı ton ama robotik olmayan akış. AI-üretilmiş içerik tespitinden kaçınmak için organik yapı kur.',
    promptEn: 'Use a natural and human-like writing style: (1) Varied sentence lengths, (2) Colloquial expressions, (3) Personal experience references, (4) Minor grammatical variations, (5) Consistent tone but non-robotic flow. Build organic structure to avoid AI-generated content detection.',
    tags: ['essay', 'natural-language', 'ai-detection', 'writing-style'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 8) EĞİTİM VERİ SETİ ANALİZ PROMPT'LARI (archive 4 & 5)
//    Veri seti analiz ve işleme kalıpları
// ═══════════════════════════════════════════════════════════════
export const DATASET_ANALYSIS_PROMPTS: NotebookLmPrompt[] = [
  {
    id: 'ds-analysis-csv-explorer',
    category: 'Veri Seti Analizi',
    categoryEn: 'Dataset Analysis',
    name: 'CSV Veri Keşif Analizi',
    nameEn: 'CSV Data Exploration Analysis',
    prompt: 'Verilen CSV veri setini analiz et: (1) Sütun türlerini ve istatistiklerini çıkar, (2) Eksik veri oranlarını hesapla, (3) Aykırı değerleri tespit et, (4) Korelasyon matrisini oluştur, (5) İlk 5 satırlık örnek göster. Pandas kodu ile birlikte metin özet sun.',
    promptEn: 'Analyze the given CSV dataset: (1) Extract column types and statistics, (2) Calculate missing data rates, (3) Detect outliers, (4) Create correlation matrix, (5) Show sample of first 5 rows. Provide text summary along with Pandas code.',
    tags: ['dataset', 'csv', 'eda', 'analiz'],
  },
  {
    id: 'ds-analysis-label-distribution',
    category: 'Veri Seti Analizi',
    categoryEn: 'Dataset Analysis',
    name: 'Etiket Dağılımı Analizi',
    nameEn: 'Label Distribution Analysis',
    prompt: 'Eğitim veri setindeki etiket dağılımını analiz et: (1) Sınıf başına örnek sayısı, (2) Dengesizlik oranı, (3) Düzeltme stratejileri — oversampling, undersampling, SMOTE, class weights. Dağılım grafiği için matplotlib/seaborn kodu üret.',
    promptEn: 'Analyze label distribution in the training dataset: (1) Sample count per class, (2) Imbalance ratio, (3) Correction strategies — oversampling, undersampling, SMOTE, class weights. Generate matplotlib/seaborn code for distribution chart.',
    tags: ['dataset', 'labels', 'imbalance', 'analiz'],
  },
  {
    id: 'ds-analysis-text-classification',
    category: 'Veri Seti Analizi',
    categoryEn: 'Dataset Analysis',
    name: 'Metin Sınıflandırma Pipeline',
    nameEn: 'Text Classification Pipeline',
    prompt: 'Metin sınıflandırma pipeline oluştur: (1) Veri ön işleme — temizleme, tokenizasyon, (2) Özellik çıkarımı — TF-IDF, word embeddings, (3) Model seçimi — naive bayes, SVM, transformer, (4) Eğitim/doğrulama bölünmesi, (5) Değerlendirme — accuracy, F1, precision, recall. Scikit-learn ve Hugging Face kodu sun.',
    promptEn: 'Create a text classification pipeline: (1) Data preprocessing — cleaning, tokenization, (2) Feature extraction — TF-IDF, word embeddings, (3) Model selection — naive bayes, SVM, transformer, (4) Train/validation split, (5) Evaluation — accuracy, F1, precision, recall. Provide scikit-learn and Hugging Face code.',
    tags: ['dataset', 'classification', 'nlp', 'ml-pipeline'],
  },
  {
    id: 'ds-analysis-session-analytics',
    category: 'Veri Seti Analizi',
    categoryEn: 'Dataset Analysis',
    name: 'LLM Oturum Analitik Raporu',
    nameEn: 'LLM Session Analytics Report',
    prompt: 'LLM oturum analitik raporu oluştur: (1) Ortalama oturum süresi ve istek sayısı, (2) Hata oranları — kanal ve kullanım durumuna göre, (3) Gecikme dağılımı — P50/P95/P99, (4) Maliyet analizi — oturum başına/istek başına, (5) Risk oturumları — yüksek hata veya eskalasyon oranı olan oturumlar. Dashboard tasarımı öner.',
    promptEn: 'Create an LLM session analytics report: (1) Average session duration and request count, (2) Failure rates — by channel and use case, (3) Latency distribution — P50/P95/P99, (4) Cost analysis — per session/per request, (5) Risk sessions — sessions with high failure or escalation rate. Suggest dashboard design.',
    tags: ['dataset', 'analytics', 'session', 'llm-ops'],
  },
  {
    id: 'ds-analysis-user-behavior',
    category: 'Veri Seti Analizi',
    categoryEn: 'Dataset Analysis',
    name: 'Kullanıcı Davranış Analizi',
    nameEn: 'User Behavior Analysis',
    prompt: 'LLM kullanıcı davranış analizi yap: (1) Kullanım kalıpları — saat, gün, kanal tercih, (2) Churn riski — düşen CSAT, azalan kullanım, (3) Power user segmenti — yüksek hacim, çoklu kullanım durumu, (4) Özellik benimseme — araç kullanımı, retry oranı, (5) Kohort analizi — zaman içinde davranış değişimi.',
    promptEn: 'Perform LLM user behavior analysis: (1) Usage patterns — hour, day, channel preference, (2) Churn risk — declining CSAT, decreasing usage, (3) Power user segment — high volume, multiple use cases, (4) Feature adoption — tool usage, retry rate, (5) Cohort analysis — behavior changes over time.',
    tags: ['dataset', 'user-behavior', 'analytics', 'segmentation'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 9) TÜM VERİ SETİ PROMPT'LARI (BİRLEŞİK)
// ═══════════════════════════════════════════════════════════════
export const ALL_DATASET_PROMPTS: NotebookLmPrompt[] = [
  ...LLM_SYSTEM_INSTRUCTION_PROMPTS,
  ...LLM_INSTRUCTION_TEMPLATE_PROMPTS,
  ...PROMPTS_CHAT_SYSTEM_PROMPTS,
  ...LLM_ANALYTICS_USE_CASE_PROMPTS,
  ...LLM_OPS_PROMPTS,
  ...SFT_PROMPT_PATTERNS,
  ...ESSAY_WRITING_PROMPTS,
  ...DATASET_ANALYSIS_PROMPTS,
];
