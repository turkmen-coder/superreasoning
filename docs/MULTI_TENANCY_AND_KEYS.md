# Multi-Tenancy ve API Key Stratejisi

Bu doküman, Super Reasoning’in MVP’den SaaS’a geçişinde **tenant (organizasyon) modeli** ile **BYOK / Managed API key** stratejisini tanımlar.

---

## İçindekiler

- [A) Tenant modeli (multi-tenancy)](#a-tenant-modeli-multi-tenancy)
- [B) BYOK vs Managed keys](#b-byok-vs-managed-keys)
- [Veritabanı şeması (özet)](#veritabanı-şeması-özet)
- [Mevcut koddan geçiş](#mevcut-koddan-geçiş)
- [Kod entegrasyonu](#kod-entegrasyonu)

---

## A) Tenant modeli (multi-tenancy)

**Öneri: Tenant = Organization (org)** yaklaşımı.

### Temel kavramlar

| Kavram | Açıklama |
|--------|----------|
| **Tenant** | Bir **Organization (org)**. Tüm projeler, çalıştırmalar ve faturalandırma org bazındadır. |
| **Kullanıcı** | Bir veya daha fazla org’a **üye** olabilir; rollere göre (owner, admin, member) yetkilendirilir. |
| **Org altı veri** | Projects, Runs/History, Billing & Usage org’a bağlıdır. |

### Organizasyon altında neler tutulur?

| Alan | İçerik |
|------|--------|
| **Projects** | Prompt setleri, workflow tanımları, style profile’lar. Proje = mantıksal gruplama (örn. “Ürün X master prompt’ları”). |
| **Runs / History** | Orchestrator adım çıktıları, audit log. Hangi niyet, hangi model, ne zaman, kim çalıştırdı. |
| **Billing & Usage** | Kota, kullanım (token/istek), plan (Free/Pro/Team), faturalandırma. |

### Uygulama etkisi

- **Mevcut durum:** `server/store/prompts.ts` dosya tabanlı depo (`.prompts/index.json`). MVP ve CI/CD “prompt-as-code” senaryosu için uygundur.
- **SaaS’ta:** Aynı model hızla tıkanır: eşzamanlı yazma, org/kullanıcı izolasyonu, ölçek ve yedekleme zorlaşır.
- **Hedef:** Prompt deposunu **veritabanına** taşımak; tablolar: `prompts`, `prompt_versions`, `workflows`, `runs`, `attachments`, `style_profiles` (ve org/user tabloları).

---

## B) BYOK vs Managed keys

LLM maliyeti ve risk yönetimi için iki seçenek:

### BYOK (Bring Your Own Key)

Kullanıcı kendi API key’ini girer (Gemini, Groq, Claude, OpenRouter, HF).

| Artı | Eksi |
|------|------|
| Maliyet kullanıcıda; platform maliyeti düşük. | UX daha zor: key girişi, doğrulama, limit/uyumluluk. |
| Hızlı ölçek; kullanıcı kendi kotasıyla çalışır. | Key doğrulama (geçerli mi, hangi model erişimi var) karmaşık. |
| Gizlilik: key’ler kullanıcıda (veya şifreli org vault’ta). | Limit/abuse yönetimi kullanıcı tarafında. |

### Managed (platform key’leri, metered billing)

Platform kendi key’leriyle LLM çağrısı yapar; kullanım kotaya/ölçüme bağlanır.

| Artı | Eksi |
|------|------|
| En iyi UX: tek tık çalışır, key yönetimi yok. | Maliyet ve suistimal riski platformda. |
| Tutarlı rate limit ve abuse kontrolü. | Güçlü rate limit, quota, abuse tespiti şart. |
| Pro/Team planları için doğal faturalandırma. | Key sızıntısı / kötüye kullanım senaryoları. |

### Pratik öneri

- **MVP:** **BYOK** ile başla; maliyet ve operasyonel yük düşük kalır.
- **Pro plan:** **Managed** key’leri aç; “Pro aboneler platform key’i kullanabilsin” ile daha iyi UX ve metered billing.
- **Uygulama:**  
  - BYOK: key’ler frontend’de veya şifreli org vault’ta; LLM çağrısı kullanıcı/org key’i ile.  
  - Managed: backend’de platform key’i; istek öncesi org/quota kontrolü ve rate limit zorunlu.

---

## Veritabanı şeması (özet)

Prompt deposunu DB’ye taşırken önerilen tablolar (org/user tabloları ile birlikte):

| Tablo | Amaç |
|-------|------|
| **organizations** | Tenant (org) bilgisi: ad, slug, plan, ayarlar. |
| **users** | Kimlik, email, auth provider. |
| **org_members** | user_id, org_id, role (owner, admin, member). |
| **projects** | org_id, ad, slug; prompt seti / workflow grupları. |
| **prompts** | project_id (veya org_id), id, name; güncel “head” sürümü referansı. |
| **prompt_versions** | prompt_id, version, master_prompt, reasoning, meta (intent, framework, domain, provider, language), created_at. |
| **workflows** | org_id veya project_id; pipeline tanımları (Tam / Hızlı / Araştırma+Prompt / Sadece üret). |
| **runs** | org_id, user_id, workflow/prompt bilgisi, adım çıktıları, model, token/usage, created_at (audit + history). |
| **attachments** | run veya prompt ile ilişkili; dosya ref veya object storage key. |
| **style_profiles** | org_id (veya user_id); Interactive Teaching Mode profilleri. |
| **api_keys** (BYOK) | org_id veya user_id, provider (gemini, groq, claude, openrouter, hf), encrypted_key, last_used. |
| **usage** | org_id, plan, dönem, token/request sayıları (metered billing için). |

İlişkiler: tüm “içerik” tabloları (`prompts`, `workflows`, `runs`, …) bir **org_id** (ve gerekiyorsa **project_id**) ile tenant’a bağlanır; listeleme ve yazma her zaman org (ve rol) bazlı filtrelenir.

---

## Mevcut koddan geçiş

| Mevcut | Hedef |
|--------|--------|
| `server/store/prompts.ts` (dosya tabanlı) | DB tabanlı store: `prompts`, `prompt_versions`; API aynı contract’ı (list/get/save/delete) koruyabilir, implementasyon DB’ye geçer. |
| Tek kullanıcı / key (x-api-key) | Org + member; BYOK key’ler org/user’a bağlı; Managed için org quota + platform key. |
| Runs/History yok | `runs` tablosu + orchestrator’dan loglama. |
| Style profiles (frontend/local) | `style_profiles` tablosu, org (veya user) bazlı. |

Bu dokümandaki tercihler (Tenant = Org, MVP BYOK + Pro’da Managed) mevcut [ARCHITECTURE.md](./ARCHITECTURE.md) ve [PAYMENT_INTEGRATION.md](./PAYMENT_INTEGRATION.md) ile uyumlu şekilde ileride uygulanabilir.

---

## Kod entegrasyonu

Aşağıdaki dosyalar bu dokümandaki modele göre entegre edilmiştir:

| Dosya | Açıklama |
|-------|----------|
| [../server/types/tenant.ts](../server/types/tenant.ts) | Tenant tipleri: `Organization`, `User`, `OrgMember`, `Project`, `Run`, `StyleProfileRecord`, `ApiKeyRecord`, `UsageRecord`, `TenantContext`. |
| [../server/store/promptStore.ts](../server/store/promptStore.ts) | `IPromptStore` arayüzü; `getPromptStore()` dosya tabanlı (varsayılan) veya DB store döndürür. |
| [../server/store/dbPromptStore.ts](../server/store/dbPromptStore.ts) | **DB store implementasyonu:** PostgreSQL `prompts` + `prompt_versions`; org_id ile tenant izolasyonu. |
| [../server/db/client.ts](../server/db/client.ts) | PostgreSQL pool; `DATABASE_URL` veya `SR_DATABASE_URL` ile yapılandırılır. |
| [../server/db/schema.sql](../server/db/schema.sql) | PostgreSQL şeması: `organizations`, `users`, `org_members`, `projects`, `prompts`, `prompt_versions`, `workflows`, `runs`, `attachments`, `style_profiles`, `api_keys`, `usage`. |

API route'ları `getPromptStore()` kullanır; `req.tenantId` (ileride auth middleware ile set edilecek) ile org bazlı filtreleme hazırdır.

### DB store kullanımı

1. **Şemayı uygulayın:** PostgreSQL'de `server/db/schema.sql` dosyasını çalıştırın.
2. **Varsayılan org oluşturun (tek tenant):** `organizations` tablosuna en az bir kayıt ekleyin; UUID'yi `SR_DEFAULT_ORG_ID` olarak ayarlayın.
3. **Ortam değişkenleri:**
   - `SR_USE_DB_STORE=true` — Prompt deposu olarak DB kullanılır.
   - `DATABASE_URL` veya `SR_DATABASE_URL` — PostgreSQL bağlantı dizesi (örn. `postgresql://user:pass@localhost:5432/superreasoning`).
   - `SR_DEFAULT_ORG_ID` — (Opsiyonel) Tenant context yokken kullanılacak org UUID; tek tenant MVP için zorunlu.

---

**PROPRIETARY | SUPER REASONING v3.1**
