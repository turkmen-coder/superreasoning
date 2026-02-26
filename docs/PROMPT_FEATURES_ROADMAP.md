# Üst Düzey “Prompt Üretme” Özellikleri — SaaS Roadmap

SaaS’ta fark yaratan prompt üretim özellikleri: mevcut durum ve planlanan geliştirmeler.

---

## İçindekiler

- [12 ana özellik](#12-ana-özellik)
- [Premium 5 paketi (öncelik önerisi)](#premium-5-paketi-öncelik-önerisi)
- [Mevcut koda eşleme](#mevcut-koda-eşleme)

---

## 12 ana özellik

### 1) Akıllı niyet çözümleme (Intent Intelligence)

| Alt başlık | Açıklama |
|------------|----------|
| Belirsizlik tespiti + netleştirme | Eksik alan/aşama/çıktı formatı varsa 1–3 hedefli soru üretir. |
| Amaç–kısıt–bağlam ayrıştırma | Niyetten “hedef”, “kısıtlar”, “çıktı tüketicisi” (insan/agent/CI) çıkarır. |
| Çelişki yakalama | “JSON yok” derken “JSON şema üret” gibi çatışmaları işaretler. |
| Risk bayrakları | PII, telif, güvenlik (prompt injection) riski uyarıları. |

**Mevcut:** Girdi analizi (kelime/karakter, detay seviyesi) — `utils/analysis.ts`, `components/InputAnalysisPanel.tsx`.  
**Planlanan:** Netleştirme soruları, amaç/kısıt parser, çelişki ve risk analizi (LLM veya kural tabanlı).

---

### 2) Domain & Framework otomasyonu (Prompt Engineering Copilot)

| Alt başlık | Açıklama |
|------------|----------|
| Auto-domain tespiti | frontend/backend/security/ui-ux/testing/architecture vb. + alan kurallarını enjekte etme. |
| Framework seçici | AUTO → KERNEL/RTF/CO-STAR/RISEN vb. en uygun çerçeveyi seçer. |
| Aşama tabanlı prompt | Keşif → tasarım → üretim → test → release gibi safhalara göre farklı şablonlar. |

**Mevcut:** Domain seçici (`DomainSelector`), Framework seçici (`FrameworkSelector`), AUTO domain + KERNEL/RTF kuralları (`locales.ts`, Auto Domain bölümü).  
**Planlanan:** Tam otomatik domain/framework tahmini (model veya sınıflandırıcı), aşama (phase) seçimi ve şablonlar.

---

### 3) Prompt kalite güvence (Prompt QA) ⭐ Premium

| Alt başlık | Açıklama |
|------------|----------|
| Linting | Belirsiz fiiller (“yap”, “iyileştir”), ölçütsüz başarı tanımı, eksik format talebi. |
| Skor kartı | Netlik, kısıt uyumu, test edilebilirlik, güvenlik, tekrar üretilebilirlik puanları. |
| Diff/versiyonlama | Prompt versiyonları, değişiklik karşılaştırması, “neden değişti” açıklaması. |

**Mevcut:** Çıktı analizi (kelime/karakter, bölüm listesi) — `utils/analysis.ts`, `getOutputAnalysis`. Prompt versiyonlama (API/store: id + version).  
**Planlanan:** Prompt lint kuralları, skor kartı (LLM veya heuristik), diff UI ve “neden değişti” alanı.

---

### 4) Çoklu model uyarlama (Model-Aware Prompting) ⭐ Premium

| Alt başlık | Açıklama |
|------------|----------|
| Provider/model profilleri | Gemini/Claude/Groq/HF/OpenRouter için “en iyi pratik” varyantları. |
| Tek prompt → çoklu çıktı | Aynı niyetten her modele özel optimize edilmiş sürümler. |
| Model limit yönetimi | Context window’a göre otomatik kısaltma, özetleme, parçalama. |

**Mevcut:** Beş motor seçimi, provider bazlı çağrı (`services/*.ts`), OpenRouter model listesi.  
**Planlanan:** Model profilleri (best-practice talimatları), “tüm modellere uyarla” tek tık, context window’a göre kısaltma/parçalama.

---

### 5) Evrensel çıktı formatları (Copy/Paste + Machine-Readable)

| Alt başlık | Açıklama |
|------------|----------|
| Düz Markdown + seçenekler | SYSTEM/DEVELOPER/USER blokları; agent-ready (tool, adım, stop conditions); spec-ready (OpenAPI, Gherkin, test iskeleti). |
| Tek tık export | .md, .txt, .prompt; ileride repo’ya PR. |

**Mevcut:** Markdown çıktı, `##` ile ayrıştırma (`utils/parseMarkdownResponse.ts`), Markdown render (`ResultDisplay`).  
**Planlanan:** Çıktı formatı seçici (Markdown / SYSTEM–USER blokları / Agent-ready / Spec-ready), export butonları (.md, .txt, .prompt).

---

### 6) Multi-step orchestration (Agent pipeline)

| Alt başlık | Açıklama |
|------------|----------|
| Hazır pipeline’lar | Research → Synthesize → Generate → Validate → Test. |
| Her adım için | Ara çıktı (trace), adım bazlı yeniden çalıştırma, bütçe (token/time/cost) limiti. |

**Mevcut:** `services/orchestrator.ts`, `data/workflows.ts` (Tam / Hızlı / Araştırma+Prompt / Sadece üret), `WorkflowPanel`, adım çıktıları.  
**Planlanan:** Validate adımı, adım bazlı retry, token/cost bütçe limiti ve UI.

---

### 7) “Test et ve düzelt” döngüsü (Self-Improving Prompts) ⭐ Premium

| Alt başlık | Açıklama |
|------------|----------|
| Simülasyon | Üretilen master prompt’u sentetik örnek girdilerle simüle eder. |
| Otomatik revize | Başarısızsa 2–3 iterasyonla düzeltir. |
| Golden set | Belirli niyetler için beklenen çıktı kriterleri. |

**Mevcut:** Workflow’da “test” adımı (`generate_prompt` + `test`), test sonucu gösterimi.  
**Planlanan:** Sentetik örneklerle otomatik test, başarısızsa revize döngüsü, golden set tanımı ve karşılaştırma.

---

### 8) Prompt bileşenleri ve yeniden kullanılabilirlik (Prompt-as-Code) ⭐ Premium

| Alt başlık | Açıklama |
|------------|----------|
| Modüler bloklar | tone, format, guardrails, domain rules, examples. |
| Şablon marketi | Org içi paylaşım, kürasyon, etiketleme. |
| CI entegrasyonu | Prompt değişince lint + golden set testleri koşar. |

**Mevcut:** API/CLI prompt CRUD, versiyonlama (`server/store`, `cli/sr.ts`), `TemplateSelector`, `data/templates.ts`.  
**Planlanan:** Blok bazlı bileşenler (tone, format, guardrails), org şablon marketi, CI hook (webhook veya CLI).

---

### 9) Style/Tone eğitimi (Brand Voice) ⭐ Premium

| Alt başlık | Açıklama |
|------------|----------|
| Örneklerden üslup profili | Kullanıcının verdiği örneklerden profil çıkarma. |
| Tüm üretimlere enjekte | Profili tüm üretimlere “STYLE/TONE (user-taught)” olarak ekleme. |
| Ton sapması | Çıktı markadan uzaksa uyarı veya otomatik düzeltme. |

**Mevcut:** `services/styleProfiles.ts`, `components/StyleProfileManager.tsx`, örnekler + tone anahtar kelimeleri; aktif profil üretimlere enjekte edilir.  
**Planlanan:** Ton sapması tespiti (çıktı vs profil karşılaştırması), otomatik düzeltme veya uyarı.

---

### 10) Güvenlik ve uyumluluk (Enterprise-grade)

| Alt başlık | Açıklama |
|------------|----------|
| Prompt injection savunması | Girdi talimatları / sistem kuralları ayrımı; kaçış denemelerini filtreleme. |
| PII redaction | Loglarda maskeleme. |
| Audit log | Kim, ne zaman, hangi niyetle, hangi modele gönderdi. |

**Mevcut:** API key doğrulama, rate limit (`server/middleware`), KeyManager; DB’de `audit_log` şeması (`server/db/schema-rls.sql`).  
**Planlanan:** Girdi/sistem ayrımı ve injection filtreleri, PII maskeleme (log pipeline), audit log yazımı (runs + audit_log).

---

### 11) Kullanım analitiği (Product + Billing)

| Alt başlık | Açıklama |
|------------|----------|
| Domain/framework kullanımı | Hangi domain/framework daha çok kullanılıyor. |
| Başarı metrikleri | “Kopyalandı”, “yeniden çalıştırıldı”, “kısaltma tetiklendi”. |
| Maliyet/latency panosu | Provider bazlı. |

**Mevcut:** `services/telemetry.ts`, `AnalyticsDashboard`, `usage` tablosu (org bazlı).  
**Planlanan:** Domain/framework istatistikleri, olay bazlı metrikler (kopyala, retry, kısaltma), maliyet/latency dashboard.

---

### 12) Kolaylaştırıcı UX “power features”

| Alt başlık | Açıklama |
|------------|----------|
| Ctrl+Enter, hızlı preset | Klavye kısayolu, preset seçimi. |
| Token tahmini + sıkıştırma etkisi | Prompt içinde token tahmini, “sıkıştırma etkisi” gösterimi. |
| Tek tık varyantlar | “Daha kısa / daha detaylı / daha teknik / daha yaratıcı” varyantları. |

**Mevcut:** Ctrl+Enter (`App.tsx`), preset’ler (workflow, domain, framework), girdi sıkıştırma ve bilgisi.  
**Planlanan:** Token tahmini (model bazlı), “daha kısa/detaylı/teknik/yaratıcı” tek tık varyant üretimi.

---

## Premium 5 paketi (öncelik önerisi)

En çok “premium” hissettiren beşli paket:

| # | Özellik | Kısa açıklama |
|---|---------|----------------|
| 1 | **Prompt QA** | Lint + skor kartı + öneri; diff/versiyonlama. |
| 2 | **Çoklu model uyarlama** | Tek niyet → her modele özel optimize sürüm; context limit yönetimi. |
| 3 | **Test et–düzelt döngüsü** | Sentetik test, başarısızsa otomatik revize, golden set. |
| 4 | **Prompt-as-Code + versiyon/diff** | Modüler bloklar, şablon marketi, CI, versiyon karşılaştırma. |
| 5 | **Style/Tone profilleri + sapma kontrolü** | Marka sesi enjeksiyonu, ton sapması tespiti ve uyarı/düzeltme. |

---

## Mevcut koda eşleme

| Özellik | Dosya / modül |
|---------|----------------|
| Girdi/çıktı analizi | `utils/analysis.ts`, `InputAnalysisPanel`, `ResultDisplay` |
| Domain / Framework | `DomainSelector`, `FrameworkSelector`, `locales.ts` (contextRules) |
| Multi-step pipeline | `services/orchestrator.ts`, `data/workflows.ts`, `WorkflowPanel` |
| Style profilleri | `services/styleProfiles.ts`, `StyleProfileManager.tsx` |
| Prompt versiyonlama / store | `server/store/`, `prompt_versions`, API CRUD |
| Şablonlar | `data/templates.ts`, `TemplateSelector` |
| Telemetry / kullanım | `services/telemetry.ts`, `AnalyticsDashboard`, `usage` tablosu |
| Güvenlik / audit | `server/middleware/auth.ts`, `rateLimit.ts`, `keyManager.ts`, `audit_log` şeması |

---

---

## Sonraki seviye: Kategori lideri

“Daha üstün” yetenekler (Prompt Compiler + IR, Adversarial Lab, Judge Ensemble, Auto-RAG, Semantic Cache, Live Monitoring, Policy DSL, Multimodal Studio vb.) ve **Premium 6** kombinasyonu için:  
**[PROMPT_LEADERSHIP_ROADMAP.md](./PROMPT_LEADERSHIP_ROADMAP.md)**

---

**PROPRIETARY | SUPER REASONING v3.1 | Prompt Features Roadmap**
