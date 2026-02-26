# SaaS Dönüşümü — Mimari Taslak, Kod Önerileri, Test Planları

Backend + Security (OWASP, OpenAPI, WCAG) odaklı kritik kararlar ve uygulama rehberi.

---

## İçindekiler

1. [Tenant modeli (multi-tenancy)](#1-tenant-modeli-multi-tenancy)
2. [API key yönetimi (BYOK + Managed)](#2-api-key-yönetimi-byok--managed)
3. [Veritabanı migrasyonu (Store → DB)](#3-veritabanı-migrasyonu-store--db)
4. [OpenAPI ve endpoint belgeleme](#4-openapi-ve-endpoint-belgeleme)
5. [Test planları](#5-test-planları)
6. [Validation checklist](#6-validation-checklist)

---

## 1. Tenant modeli (multi-tenancy)

### DB şeması

- **Tenant = Organization** (`organizations` tablosu).
- Tablolar: `organizations`, `users`, `org_members`, `projects`, `prompts`, `prompt_versions`, `workflows`, `runs`, `attachments`, `style_profiles`, `api_keys`, `usage`.
- Tüm içerik tablolarında **org_id** (ve gerekiyorsa **project_id**) ile tenant izolasyonu.

**Dosyalar:**

| Dosya | Açıklama |
|-------|----------|
| [server/db/schema.sql](../server/db/schema.sql) | Temel tablolar |
| [server/db/schema-rls.sql](../server/db/schema-rls.sql) | Row-Level Security (RLS), audit_log, prompt_versions.deleted_at (soft delete) |

### Tenant izolasyonu: RLS

- **Yöntem:** PostgreSQL Row-Level Security (RLS).
- Her istekte uygulama: `SET LOCAL app.current_org_id = '<uuid>';` (JWT/API key’den türetilir).
- RLS politikaları: `USING (org_id::text = current_setting('app.current_org_id', true))`.
- **Schema-per-tenant** alternatifi: Çok yüksek tenant sayısında ileride değerlendirilebilir; MVP için RLS yeterli.

### Kod önerisi: tenant_id filtreleme

- **DB store:** [server/store/dbPromptStore.ts](../server/store/dbPromptStore.ts) tüm sorgularda `org_id = $1`.
- **RLS kullanıldığında:** Bağlantı/transaction başında `SET LOCAL app.current_org_id = ...` (middleware veya pool wrapper ile).

---

## 2. API key yönetimi (BYOK + Managed)

### BYOK (Bring Your Own Key)

- Kullanıcı kendi API key’ini girer; doğrulama + **limit mantığı** (dakika başına istek).
- **Kod:** [server/lib/keyManager.ts](../server/lib/keyManager.ts): `validateByokKey`, timing-safe compare, key maskeleme (log’da düz metin yok).

### Managed (platform key’leri)

- Platform key’leri ile metered billing; **abuse kontrol:** IP başına limit, org quota.
- **Kod:** `validateManagedKey`, `validateApiKey` (önce Managed, sonra BYOK fallback).

### OWASP uyumluluk

- **API Security Top 10:** Key’ler yanıtta/logda açıklanmaz; timing-safe karşılaştırma; rate limit (429); 401 tutarlı.
- **Rate limiting:** [server/middleware/rateLimit.ts](../server/middleware/rateLimit.ts) — plan bazlı (Free/Pro), key veya IP bazlı sayaç.

---

## 3. Veritabanı migrasyonu (Store → DB)

### Şema

- `prompts`, `prompt_versions`, `workflows`, `style_profiles`, `attachments` (bkz. [server/db/schema.sql](../server/db/schema.sql)).
- **Versiyon / audit:** `prompt_versions.deleted_at` (soft delete); `audit_log` tablosu (kim, ne zaman, ne yaptı).

### Migration script

- **Dosya:** [server/scripts/migrate-store-to-db.ts](../server/scripts/migrate-store-to-db.ts).
- **Çalıştırma:** `SR_DEFAULT_ORG_ID=<uuid> DATABASE_URL=... npm run migrate:store`.
- Tek transaction; hata durumunda rollback. Veri bütünlüğü: kaynak dosyadaki her satır → bir `prompt_versions` kaydı.

---

## 4. OpenAPI ve endpoint belgeleme

### Security scheme

- **x-api-key** (header): API key doğrulama; OWASP uyumlu kullanım açıklaması.

### Endpoint’ler

| Endpoint | Açıklama |
|----------|----------|
| **POST /v1/auth/validate** | API key doğrula; 200 (valid, mode, orgId?, plan?), 401 (geçersiz), 429 (limit). |
| **GET /v1/orgs/{orgId}/prompts** | Tenant (org) promptlarını listele; tenant izolasyonu. |
| **GET/POST/DELETE /v1/prompts** | Mevcut prompt CRUD (orgId opsiyonel; req.tenantId ile). |

**Spec:** [openapi.yaml](../openapi.yaml) — OpenAPI 3.0+, `/v1/auth/validate` ve `/v1/orgs/{orgId}/prompts` tanımlı.

---

## 5. Test planları

### Güvenlik testleri

| Senaryo | Dosya / Açıklama |
|--------|-------------------|
| **Key doğrulama** | [tests/security/keyManager.test.ts](../tests/security/keyManager.test.ts): Geçersiz key → 401, eksik key → MISSING_API_KEY, limit → 429, secureCompare, maskKey. |
| **Tenant sızıntısı** | [tests/security/tenant-isolation.test.ts](../tests/security/tenant-isolation.test.ts): RLS senaryosu (SQL dokümantasyonu); store katmanında orgId ayrımı. |
| **Key suistimali (DDoS / usage spike)** | Rate limit: aynı IP/key ile limit üstü istek → 429. Test: artillery/k6 veya manuel. |

### Performans testleri

| Senaryo | Hedef |
|--------|--------|
| **Migrasyon** | 100k prompt version → < 5s (bkz. [tests/performance/README.md](../tests/performance/README.md)). |
| **DB store list** | 1000 kayıt listeleme < 500ms (index ile). |

### WCAG (UI/UX)

- Mevcut doküman: [docs/WCAG_CHECKLIST.md](./WCAG_CHECKLIST.md). SaaS UI’da erişilebilirlik aynı kriterlere göre test edilir.

---

## 6. Validation checklist

SaaS dönüşümü için mini kontrol listesi:

- [ ] **Tenant izolasyonu** RLS veya schema-per-tenant ile sağlanıyor mu? (RLS: [server/db/schema-rls.sql](../server/db/schema-rls.sql))
- [ ] **BYOK** için key doğrulama + limit mantığı OWASP uyumlu mu? ([server/lib/keyManager.ts](../server/lib/keyManager.ts))
- [ ] **Managed** key seçeneği metered billing ve abuse kontrol (IP/usage limit) ile destekleniyor mu?
- [ ] **Migrasyon script’i** veri bütünlüğünü koruyor mu? (tek transaction, rollback) ([server/scripts/migrate-store-to-db.ts](../server/scripts/migrate-store-to-db.ts))
- [ ] **OpenAPI spec** `/v1/auth/validate` ve tenant-scoped endpoint’leri kapsıyor mu? ([openapi.yaml](../openapi.yaml))
- [ ] **Test planı** DDoS, tenant sızıntısı, performans senaryolarını içiyor mu? ([tests/security/](../tests/security/), [tests/performance/](../tests/performance/))

---

## Test inputları (referans)

**Tenant izolasyonu (RLS):**
```sql
-- Tenant B bağlamında Tenant A verisi görünmemeli
SET LOCAL app.current_org_id = 'tenant-b-uuid';
SELECT * FROM prompts WHERE org_id = 'tenant-a-uuid'::uuid;
-- Beklenen: 0 satır
```

**BYOK key doğrulama:**
- Geçersiz key → **401 Unauthorized**, body: `{ "error": "Invalid API key", "code": "INVALID_API_KEY" }`.
- Kullanıcı limiti aşılırsa → **429 Too Many Requests**, `rateLimitExceeded: true`.

**Migrasyon performansı:**
- 100k prompt verisi → hedef **< 5s** migrasyon süresi; exit code 0, migrated count = 100k.

---

**PROPRIETARY | SUPER REASONING v3.1 | Backend + Security (OWASP, OpenAPI, WCAG)**
