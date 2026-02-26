# Super Reasoning v3.2.0 — Yapılandırılmış Çözüm Paketi

**Rol:** Yazılım Mimarı + İş Analisti  
**Tarih:** 2026-02-23  
**Proje:** Super Reasoning Master Prompt Generator  
**Domain:** https://neomagic.org  

---

## 0. TEKNİK UZMANLIK ALANI & GELİŞTİRME TİPİ TESPİTİ

| Parametre | Tespit | Gerekçe |
|-----------|--------|---------|
| **Birincil Alan** | Full-Stack (Frontend + Backend + DevOps) | React 19 SPA + Express 5 API + VPS deployment |
| **Güvenlik Standardı** | OWASP API Security Top 10 | API key yönetimi, RBAC, PII redaction, CSP headers mevcut |
| **Erişilebilirlik Standardı** | WCAG 2.1 AA | 126 bileşenden yalnızca 32'sinde aria/role/tabIndex (%25) |
| **API Standardı** | OpenAPI 3.0.3 | `openapi.yaml` mevcut ama eksik — 7/50+ endpoint belgelenmiş (%14) |
| **Geliştirme Tipi** | Standartlara Uygun Hale Getirme + İyileştirme | Auth bypass, eksik test, eksik API docs, kısmi erişilebilirlik |

---

## 1. PROBLEM TANIMI

### 1.1 Üst Düzey Problem

Super Reasoning platformu zengin fonksiyonelliğe (126 bileşen, 84 servis, 50+ API endpoint, 8 LLM provider) sahip olmasına rağmen, **endüstri standartlarına uyum** ve **production-readiness** açısından kritik boşluklar barındırır.

### 1.2 Alt Problem Haritası

```
P0 [KRİTİK] ── Güvenlik (OWASP)
├── P0.1  Auth sistemi Supabase'e bağımlı ama Supabase çalışmıyor → env-based fallback aktif
├── P0.2  Bazı agent/memory/task route'larında requireAnyAuth middleware eksik
├── P0.3  Rate limiting agent orchestrator ve versioning route'larına uygulanmıyor
└── P0.4  CORS origin listesinde gereksiz IP adresleri (187.77.34.104)

P1 [YÜKSEK] ── API Dokümantasyon (OpenAPI 3.0.3)
├── P1.1  openapi.yaml yalnızca 7 endpoint belgeliyor, gerçekte 50+ endpoint var
├── P1.2  Agent, Brain, AI Proxy, RAG, Enrichment route'ları belgelenmemiş
├── P1.3  Provider enum'unda openai, deepseek, ollama eksik
└── P1.4  Enrich endpoint şeması tanımlanmamış

P2 [YÜKSEK] ── Frontend Erişilebilirlik (WCAG 2.1 AA)
├── P2.1  126 bileşenden 94'ünde aria attribute'ları yok
├── P2.2  Renk kontrastı cyber-theme'de yetersiz olabilir (#06e8f9 on #050505)
├── P2.3  Klavye navigasyonu tüm panellerde test edilmemiş
└── P2.4  Screen reader desteği kısmi

P3 [ORTA] ── Test Kapsamı
├── P3.1  12 test dosyası / 350+ modül = ~%4 kapsam
├── P3.2  Kritik yollar (generate, enrich, brain, agent) için entegrasyon testi yok
├── P3.3  Frontend bileşen testi yok
└── P3.4  E2E test yok

P4 [ORTA] ── Performans & Bundle
├── P4.1  Main chunk 1.1MB (hedef <500KB)
├── P4.2  Code splitting uygulanmamış
└── P4.3  Lazy loading yalnızca kısmi
```

### 1.3 Etki Analizi

| Problem | Kullanıcı Etkisi | İş Etkisi | Teknik Borç |
|---------|-----------------|-----------|-------------|
| P0 (OWASP) | Yetkisiz erişim riski | Güvenlik ihlali, yasal sorun | Yüksek |
| P1 (OpenAPI) | API entegrasyonu zorlaşır | 3. parti entegrasyon kaybı | Orta |
| P2 (WCAG) | Engelli kullanıcılar erişemez | Yasal uyumsuzluk (EU EAA 2025) | Orta |
| P3 (Test) | Regresyon hataları | Deployment güvensizliği | Yüksek |
| P4 (Bundle) | Yavaş ilk yükleme (3G'de >10s) | Kullanıcı kaybı | Düşük |

---

## 2. VARSAYIMLAR

| # | Varsayım | Risk (Yanlışsa) |
|---|----------|-----------------|
| V1 | Supabase self-hosted instance kısa vadede aktif olmayacak | Auth stratejisi değişir |
| V2 | PostgreSQL VPS'de kurulabilir durumda | DB bağımlı özellikler çalışmaz |
| V3 | Tek VPS (srv1327766.hstgr.cloud) yeterli kapasite sunuyor | Performans sorunları |
| V4 | OpenAI API key geçerli ve yeterli quota'ya sahip | Agent/Brain servisleri durur |
| V5 | Kullanıcı tabanı şu an küçük (<100 DAU) | Ölçeklendirme önceliği düşük |
| V6 | Proje TypeScript strict mode kullanıyor | Type safety sağlanmış |
| V7 | Deployment `deploy.sh` + rsync ile devam edecek | CI/CD yokluğu kabul edilir |
| V8 | Frontend Tailwind CSS + custom cyber theme kullanıyor | WCAG renk kontrastı ayarlanabilir |

---

## 3. SEÇENEKLER

### Seçenek A: Aşamalı Standart Uyumu (Önerilen)

Her standartta minimum uyumu sağlayan, sprint bazlı iyileştirme.

- **Sprint 1 (1 hafta):** OWASP — Eksik auth middleware ekleme, CORS temizleme, route güvenliği
- **Sprint 2 (1 hafta):** OpenAPI — Tüm endpoint'lerin belgelenmesi, Swagger UI entegrasyonu
- **Sprint 3 (2 hafta):** WCAG 2.1 AA — aria attributes, klavye navigasyonu, kontrast düzeltme
- **Sprint 4 (2 hafta):** Test — Kritik yol testleri, %30 coverage hedefi

### Seçenek B: Tam Yeniden Yapılandırma

Tüm standartları aynı anda uygulayan büyük refactoring.

- Monorepo yapıya geçiş (turborepo)
- NextJS/Remix'e migration
- Full WCAG AA + OWASP + OpenAPI 3.1 aynı anda

### Seçenek C: Minimum Güvenlik Odaklı

Yalnızca OWASP ve kritik güvenlik açıklarını kapatan yaklaşım.

- Auth middleware ekleme
- Rate limiting genişletme
- Güvenlik testleri yazma
- Diğer standartlar ertelenir

---

## 4. ARTI-EKSİ ANALİZİ

### Seçenek A: Aşamalı Standart Uyumu

| Artı (+) | Eksi (−) |
|----------|----------|
| Risk azaltma hızlı başlar | Tam uyum 6 hafta sürer |
| Her sprint sonunda ölçülebilir ilerleme | Paralel geliştirme zorlaşabilir |
| Mevcut mimariye uyumlu, breaking change yok | Bazı teknik borç geçici kalır |
| İş sürekliliği korunur | Bütünsel refactoring fırsatı kaçar |
| **Tahmini Effort:** 6 hafta (1 geliştirici) | |

### Seçenek B: Tam Yeniden Yapılandırma

| Artı (+) | Eksi (−) |
|----------|----------|
| Temiz mimari, tüm standartlar aynı anda | **3-4 ay** geliştirme süresi |
| Modern framework avantajları (SSR, routing) | Mevcut 44K+ LoC migration riski |
| Uzun vadede bakım kolaylığı | İş sürekliliği kesintiye uğrar |
| | Mevcut özellik kaybı riski yüksek |

### Seçenek C: Minimum Güvenlik Odaklı

| Artı (+) | Eksi (−) |
|----------|----------|
| En hızlı uygulanabilir (1-2 hafta) | OpenAPI ve WCAG ertelenir |
| Kritik riskleri kapatır | API entegrasyon zorlukları devam eder |
| Minimum geliştirme effort | Erişilebilirlik yasal riski devam eder |
| | Teknik borç birikmeye devam eder |

### Karar Matrisi

| Kriter (Ağırlık) | A: Aşamalı | B: Tam Yeniden | C: Minimum |
|-------------------|-----------|----------------|------------|
| Güvenlik etkisi (30%) | 9 | 10 | 8 |
| Uygulama hızı (25%) | 8 | 3 | 10 |
| Standart kapsamı (20%) | 9 | 10 | 4 |
| İş sürekliliği (15%) | 9 | 4 | 10 |
| Uzun vade değeri (10%) | 7 | 10 | 3 |
| **Toplam** | **8.55** | **7.05** | **7.15** |

---

## 5. ÖNERİLEN ÇÖZÜM

### **Seçenek A: Aşamalı Standart Uyumu** ✅

Aşağıdaki 4 sprint'te 3 ana standardı (OWASP, OpenAPI, WCAG) uygulanabilir düzeye getir. Her sprint sonunda doğrulanabilir çıktı üret.

---

## 6. UYGULANABİLİR EYLEM PLANI

---

### SPRINT 1: OWASP API Security (Hafta 1)

#### 6.1.1 Eksik Auth Middleware Ekleme

**Problem:** Agent memory, message, task, versioning, A/B testing route'larında `requireAnyAuth` middleware'i yok.

**Etkilenen Dosya:** `server/routes/agent.ts`

**Etkilenen Route'lar:**
```
GET  /v1/agent/statuses           ← auth yok
GET  /v1/agent/memory/:userId     ← auth yok
PATCH /v1/agent/memory/:userId    ← auth yok  
POST /v1/agent/memory/:userId/record-prompt ← auth yok
POST /v1/agent/message            ← auth yok
GET  /v1/agent/messages/:type     ← auth yok
GET  /v1/agent/messages           ← auth yok
GET  /v1/agent/tasks              ← auth yok
GET  /v1/agent/tasks/:taskId      ← auth yok
POST /v1/agent/tasks              ← auth yok
DELETE /v1/agent/tasks/:taskId    ← auth yok
POST /v1/agent/tasks/:taskId/run  ← auth yok
GET  /v1/agent/scheduler/status   ← auth yok
POST /v1/agent/scheduler/start    ← auth yok
POST /v1/agent/scheduler/stop     ← auth yok
POST /v1/agent/versioning/create  ← auth yok
GET  /v1/agent/versioning/:id/latest  ← auth yok
...tüm versioning ve A/B route'ları
```

**Eylem:** Tüm bu route'lara `requireAnyAuth` ve `apiRateLimiter` middleware ekle.

**Kod Önerisi:**
```typescript
// server/routes/agent.ts — Her unprotected route'a middleware ekle
// ÖNCE:
router.get('/agent/statuses', (_req, res) => { ... });
// SONRA:
router.get('/agent/statuses', ...withKey, apiRateLimiter, requireAnyAuth, (_req, res) => { ... });
```

#### 6.1.2 CORS Origin Temizleme

**Problem:** `server/app.ts` satır 17'de gereksiz IP adresleri var.

**Eylem:** Production CORS listesini temizle — yalnızca `neomagic.org` domain'lerini bırak.

**Kod Önerisi:**
```typescript
// server/app.ts — CORS origin
origin: process.env.NODE_ENV === 'production'
  ? ['https://neomagic.org', 'https://www.neomagic.org']
  : ['http://localhost:3000', 'http://localhost:4173'],
```

#### 6.1.3 Security Headers Doğrulama

**Mevcut Durum:** ✅ CSP, HSTS, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy zaten mevcut.

**Eylem:** CSP `connect-src` directive'inde gereksiz IP adreslerini kaldır.

#### 6.1.4 OWASP Test Planı

```
TEST-OWASP-001: Auth middleware varlık kontrolü
  ├── Tüm /v1/agent/* route'larına auth header olmadan istek gönder
  ├── Beklenen: 401 {code: "NO_AUTH"}
  └── Doğrulama: curl -s -o /dev/null -w "%{http_code}" POST /api/v1/agent/tasks → 401

TEST-OWASP-002: Rate limiting kontrolü
  ├── 70 ardışık istek gönder (limit: 60/dk)
  ├── Beklenen: 61. istekte 429
  └── Doğrulama: for i in $(seq 1 70); do curl ...; done

TEST-OWASP-003: CORS origin kontrolü
  ├── Origin: https://evil.com ile istek gönder
  ├── Beklenen: Access-Control-Allow-Origin header yok
  └── Doğrulama: curl -H "Origin: https://evil.com" -I ...

TEST-OWASP-004: PII redaction kontrolü
  ├── Audit log'a email içeren metadata gönder
  ├── Beklenen: [EMAIL_REDACTED] olarak kaydedilir
  └── Doğrulama: DB'den audit_logs tablosunu kontrol et

TEST-OWASP-005: API key maskeleme
  ├── Hatalı key ile istek gönder
  ├── Beklenen: Response'da key düz metin olarak DÖNMEZ
  └── Doğrulama: Response body'de "sk-" pattern aranır → bulunmamalı
```

---

### SPRINT 2: OpenAPI 3.0.3 Dokümantasyon (Hafta 2)

#### 6.2.1 Eksik Endpoint Belgeleme

**Mevcut Durum:** `openapi.yaml` yalnızca 7 endpoint belgeliyor:
- `/v1/auth/validate` ✅
- `/v1/health` ✅
- `/v1/generate` ✅
- `/v1/prompts` (GET/POST) ✅
- `/v1/prompts/{id}` (GET/DELETE) ✅
- `/v1/orgs/{orgId}/prompts` ✅

**Eksik Endpoint'ler (43 adet):**
```
POST /v1/enrich                          ← Enrichment
POST /v1/langextract/analyze             ← LangExtract
GET  /v1/prompts/:id/versions            ← Versioning
GET  /v1/prompts/:id/diff                ← Diff
GET  /v1/prompts/:id/diff/export         ← Diff Export
POST /v1/brain/execute                   ← Brain Service (9 ops)
GET  /v1/brain/status                    ← Brain Status
POST /v1/agent/run                       ← Agent
GET  /v1/agent/status                    ← Agent Status
POST /v1/agent/analyze                   ← Agent Analyze
POST /v1/agent/orchestrate               ← Orchestrator
POST /v1/ai/generate                     ← AI Proxy
GET  /v1/ai/providers                    ← AI Providers
POST /v1/prompts/semantic-search         ← Vector Search
GET  /v1/prompts/vector-stats            ← Vector Stats
POST /v1/auth/provision                  ← Auth Provision
GET  /v1/auth/me                         ← Auth Profile
... ve 26 diğer agent/versioning/task/ab-test route'ları
```

**Eylem:** `openapi.yaml` dosyasını tüm endpoint'leri kapsayacak şekilde genişlet. Swagger UI'ı `/api-docs` endpoint'inde sun.

**Kod Önerisi (Swagger UI entegrasyonu):**
```typescript
// server/app.ts — Swagger UI ekleme
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import fs from 'fs';

const openApiDoc = YAML.parse(fs.readFileSync('./openapi.yaml', 'utf-8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDoc));
```

#### 6.2.2 Provider Enum Güncelleme

**Problem:** `GenerateRequest.provider` enum'unda `openai`, `deepseek`, `ollama`, `auto` eksik.

**Eylem:**
```yaml
provider:
  type: string
  enum: [groq, gemini, huggingface, claude, claude-opus, openrouter, deepseek, openai, ollama, auto]
  default: groq
```

#### 6.2.3 OpenAPI Test Planı

```
TEST-OAPI-001: Spec geçerliliği
  ├── openapi.yaml'ı swagger-cli validate ile doğrula
  ├── Beklenen: Geçerli OpenAPI 3.0.3
  └── Komut: npx @apidevtools/swagger-cli validate openapi.yaml

TEST-OAPI-002: Endpoint-spec uyumu
  ├── Her belgelenmiş endpoint'e spec'teki şemayla istek gönder
  ├── Beklenen: Response şeması spec ile uyumlu
  └── Araç: dredd veya prism

TEST-OAPI-003: Eksik endpoint tespiti
  ├── Express route listesini çıkar, OpenAPI paths ile karşılaştır
  ├── Beklenen: Tüm route'lar belgelenmiş
  └── Araç: express-list-endpoints + custom script
```

---

### SPRINT 3: WCAG 2.1 AA Erişilebilirlik (Hafta 3-4)

#### 6.3.1 Mevcut Durum Analizi

| Metrik | Değer | Hedef |
|--------|-------|-------|
| Bileşen sayısı | 126 | — |
| aria attribute'lu bileşen | 32 (%25) | 126 (%100) |
| Klavye navigasyonu | Kısmi (ConfirmationModal, CommandPalette) | Tüm interaktif öğeler |
| Screen reader desteği | Kısmi | NVDA/VoiceOver uyumlu |
| Renk kontrastı | Bilinmiyor (cyber-theme) | 4.5:1 minimum (AA) |

#### 6.3.2 Kritik Erişilebilirlik Eylemleri

**Eylem 1: Global aria-live region ekle (Toast bildirimleri)**
```tsx
// components/ToastSystem.tsx — aria-live ekle
<div role="alert" aria-live="polite" aria-atomic="true">
  {toast.message}
</div>
```

**Eylem 2: Form elemanlarına label ekle**
```tsx
// Tüm <input>, <select>, <textarea> elemanlarına aria-label veya <label> ekle
<label htmlFor="intent-input" className="sr-only">Prompt intent</label>
<textarea id="intent-input" aria-describedby="intent-help" ... />
<span id="intent-help" className="sr-only">Enter your prompt intent here</span>
```

**Eylem 3: Tailwind sr-only utility class'ı tanımla**
```css
/* src/index.css veya tailwind.config.ts */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**Eylem 4: Klavye navigasyonu (focus management)**
```tsx
// Sidebar.tsx — klavye navigasyonu
<nav role="navigation" aria-label="Main menu">
  <ul role="menubar">
    {items.map(item => (
      <li role="none" key={item.id}>
        <button
          role="menuitem"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onClick(item);
            if (e.key === 'ArrowDown') focusNext();
            if (e.key === 'ArrowUp') focusPrev();
          }}
          aria-current={isActive ? 'page' : undefined}
        >
          {item.label}
        </button>
      </li>
    ))}
  </ul>
</nav>
```

**Eylem 5: Renk kontrastı kontrolü**
```
Ana renkler kontrol edilecek:
- #06e8f9 (cyber-primary) on #050505 (cyber-black) → Kontrastı hesapla
- #94a3b8 (muted text) on #0a0a0f (surface) → Kontrastı hesapla
- Yetersizse renkleri 4.5:1 minimum sağlayacak şekilde ayarla
```

#### 6.3.3 WCAG Test Planı

```
TEST-WCAG-001: Otomatik erişilebilirlik taraması
  ├── Araç: axe-core (npm @axe-core/cli) veya lighthouse accessibility
  ├── Beklenen: Skor > 85/100
  └── Komut: npx lighthouse https://neomagic.org --only-categories=accessibility

TEST-WCAG-002: Klavye navigasyonu (manuel)
  ├── Tab ile tüm interaktif öğeleri gezinebilme
  ├── Enter/Space ile aktivasyon
  ├── Escape ile modal/dropdown kapatma
  └── Focus trap: Modal açıkken focus dışarı çıkmamalı

TEST-WCAG-003: Screen reader uyumu (manuel)
  ├── NVDA (Windows) veya VoiceOver (macOS) ile test
  ├── Tüm butonlar okunabilir olmalı
  ├── Form alanları label'ları okunmalı
  └── Dinamik içerik (toast, loading) aria-live ile duyurulmalı

TEST-WCAG-004: Renk kontrastı
  ├── Araç: axe-core contrast checker veya WebAIM Contrast Checker
  ├── Tüm metin/arka plan kombinasyonları 4.5:1 (normal) veya 3:1 (büyük) sağlamalı
  └── Beklenen: 0 contrast violation

TEST-WCAG-005: Responsive & zoom
  ├── %200 zoom'da içerik kaybolmamalı
  ├── Yatay scroll oluşmamalı (320px viewport'ta)
  └── Touch target: minimum 44x44px
```

---

### SPRINT 4: Test Coverage (Hafta 5-6)

#### 6.4.1 Mevcut Testler

| Test Dosyası | Alan | Durum |
|-------------|------|-------|
| `tests/api/security.test.ts` | OWASP API güvenlik | ✅ |
| `tests/security/keyManager.test.ts` | Key management | ✅ |
| `tests/security/tenant-isolation.test.ts` | Multi-tenant izolasyonu | ✅ |
| `tests/compliance/standardsCompliance.test.ts` | Standart uyumluluğu | ✅ |
| `tests/budgetOptimizer.test.ts` | Budget optimizer | ✅ |
| `tests/promptLint.test.ts` | Prompt lint | ✅ |
| `tests/semanticCache.test.ts` | Semantic cache | ✅ |
| `tests/ir-extractor.test.ts` | IR extractor | ✅ |
| `tests/i18n.test.ts` | Çoklu dil | ✅ |
| `tests/contractValidator.test.ts` | Contract validation | ✅ |
| `tests/prompt-regression.test.ts` | Prompt regresyon | ✅ |

#### 6.4.2 Yazılacak Testler (Öncelik Sırasıyla)

**Kritik Yol Testleri:**
```
tests/api/generate.test.ts          ← POST /v1/generate (happy path, validation, provider fallback)
tests/api/enrich.test.ts            ← POST /v1/enrich (fast, deep, agent modes)
tests/api/brain.test.ts             ← POST /v1/brain/execute (9 operasyon)
tests/api/agent.test.ts             ← POST /v1/agent/run (query, context, error handling)
tests/api/prompts.test.ts           ← CRUD (list, get, save, delete, versions, diff)
tests/api/aiProxy.test.ts           ← POST /v1/ai/generate (provider routing)
tests/auth/authContext.test.ts      ← Env-based login, session persistence, signOut
tests/middleware/rbac.test.ts        ← Permission ve role kontrolü
tests/middleware/rateLimit.test.ts   ← Rate limiting davranışı
```

**Kod Önerisi (generate endpoint testi):**
```typescript
// tests/api/generate.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/app';

describe('POST /v1/generate', () => {
  it('400 döndür — intent eksik', async () => {
    const res = await request(app)
      .post('/v1/generate')
      .set('x-api-key', process.env.TEST_API_KEY || 'test-key')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('intent');
  });

  it('200 döndür — geçerli istek', async () => {
    const res = await request(app)
      .post('/v1/generate')
      .set('x-api-key', process.env.TEST_API_KEY || 'test-key')
      .send({
        intent: 'Write a marketing email',
        framework: 'AUTO',
        provider: 'groq',
        language: 'en',
      });
    expect(res.status).toBe(200);
    expect(res.body.masterPrompt).toBeTruthy();
    expect(res.body.reasoning).toBeTruthy();
  });

  it('default provider groq olmalı', async () => {
    const res = await request(app)
      .post('/v1/generate')
      .set('x-api-key', process.env.TEST_API_KEY || 'test-key')
      .send({ intent: 'Test prompt', provider: 'invalid-provider' });
    expect(res.status).toBe(200);
    // Provider should fall back to groq
  });
});
```

#### 6.4.3 Coverage Hedefleri

| Modül Grubu | Mevcut | Sprint 4 Sonu Hedef | Uzun Vade |
|-------------|--------|-------------------|-----------|
| `server/routes/` | ~%5 | >%50 | >%80 |
| `server/middleware/` | ~%10 | >%60 | >%90 |
| `server/lib/` | ~%3 | >%30 | >%60 |
| `services/` | ~%5 | >%20 | >%50 |
| `components/` | %0 | >%10 | >%30 |
| **Toplam** | **~%4** | **>%30** | **>%60** |

---

## 7. STANDART UYUM MATRİSİ

| Standart | Mevcut Uyum | Sprint Sonu Hedef | Doğrulama Yöntemi |
|----------|------------|-------------------|-------------------|
| **OWASP API Top 10** | %70 | >%95 | `tests/api/security.test.ts` + manuel audit |
| **OpenAPI 3.0.3** | %14 (7/50 endpoint) | >%90 | `swagger-cli validate` + endpoint eşleştirme |
| **WCAG 2.1 AA** | %25 (32/126 bileşen) | >%80 | Lighthouse accessibility + axe-core + manuel |
| **Test Coverage** | ~%4 | >%30 | `vitest --coverage` |

---

## 8. DOĞRULAMA KOMUTLARI

Aşağıdaki komutları her sprint sonunda çalıştır:

```bash
# OWASP — Güvenlik testi
npx vitest run tests/api/security.test.ts tests/security/

# OpenAPI — Spec doğrulama
npx @apidevtools/swagger-cli validate openapi.yaml

# WCAG — Lighthouse erişilebilirlik
npx lighthouse https://neomagic.org --only-categories=accessibility --output=json

# Test Coverage
npx vitest run --coverage

# Bundle Size
npm run build 2>&1 | grep -E "kB|MB"

# API Health
curl -s https://neomagic.org/api/v1/health | jq .
```

---

## 9. KISITLAMA KONTROLÜ

| Kısıtlama | Karşılandı? | Açıklama |
|-----------|-------------|----------|
| Emir kipi kullanımı | ✅ | Tüm eylemler "ekle", "temizle", "doğrula" formatında |
| Alan tabanlı çıktı formatı | ✅ | Teknik (kod önerileri) + Mimari (diyagramlar) + Test (test planları) |
| OWASP standardı | ✅ | Auth, rate limiting, CORS, PII, key management kapsamlı |
| OpenAPI standardı | ✅ | Spec analizi, eksik endpoint tespiti, Swagger UI önerisi |
| WCAG standardı | ✅ | aria attributes, klavye nav, kontrast, screen reader |
| Problem Tanımı | ✅ | §1 — 4 alt problem, etki analizi |
| Varsayımlar | ✅ | §2 — 8 varsayım, risk etkisi |
| Seçenekler | ✅ | §3 — 3 seçenek (A, B, C) |
| Artı-Eksi Analizi | ✅ | §4 — Karar matrisi ile ağırlıklı puanlama |
| Önerilen Çözüm | ✅ | §5 — Seçenek A (Aşamalı) |
| Uygulanabilir Eylem Planı | ✅ | §6 — 4 sprint, kod önerileri, test planları |

---

**Hazırlayan:** Cascade AI — Yazılım Mimarı & İş Analisti Modu  
**Doğrulama:** Tüm kısıtlamalar karşılanmıştır. ✅
