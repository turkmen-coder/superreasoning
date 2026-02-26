# Docs Klasörü — Tam Kurulum Rehberi

Bu rehber, `docs/` altındaki tüm dokümanlarda belirtilen kurulumları tek adımda uygular.

---

## Genel sıra

1. Bağımlılıklar
2. Ortam değişkenleri (.env)
3. Veritabanı (PostgreSQL) — schema + RLS
4. Ödeme (Stripe / iyzico) — opsiyonel
5. API ve frontend
6. Testler ve doğrulama

---

## 1. Bağımlılıklar

```bash
npm install
```

**Docs'a göre ek paketler (isteğe bağlı):**

| Doc | Paket | Amaç |
|-----|--------|------|
| [PAYMENT_INTEGRATION.md](./PAYMENT_INTEGRATION.md) | `stripe` | Stripe checkout + webhook |
| [PAYMENT_INTEGRATION.md](./PAYMENT_INTEGRATION.md) | `iyzipay` | iyzico (Türkiye) |

```bash
npm install stripe
# İsteğe bağlı: npm install iyzipay
```

---

## 2. Ortam değişkenleri

Proje kökünde `.env` oluşturun; `.env.example` şablon olarak kullanılabilir.

**Tüm doc'larda geçen değişkenler:**

| Kaynak | Değişkenler |
|--------|-------------|
| [README](../README.md) | `VITE_HUGGING_FACE_HUB_TOKEN`, `GEMINI_API_KEY`, `VITE_GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY` |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | `SR_API_PORT`, `API_KEYS`, `API_KEYS_HASH` |
| [MULTI_TENANCY_AND_KEYS.md](./MULTI_TENANCY_AND_KEYS.md) | `SR_USE_DB_STORE`, `DATABASE_URL` veya `SR_DATABASE_URL`, `SR_DEFAULT_ORG_ID` |
| [SAAS_TRANSFORMATION.md](./SAAS_TRANSFORMATION.md) | Aynı + RLS için DB |
| [PAYMENT_INTEGRATION.md](./PAYMENT_INTEGRATION.md) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`, `IYZICO_*` |
| [SECURITY_TEST_PLAN.md](./SECURITY_TEST_PLAN.md) | `API_KEYS`, `DISABLE_API_KEY_AUTH`, `RATE_LIMIT_FREE`, `RATE_LIMIT_PRO` |

Örnek minimal `.env` (DB + API key):

```env
API_KEYS=your-api-key-here
DATABASE_URL=postgresql://user:pass@localhost:5432/superreasoning
SR_DEFAULT_ORG_ID=<organizations tablosundan bir UUID>
SR_USE_DB_STORE=true
```

---

## 3. Veritabanı (PostgreSQL)

**Şema (tenant + prompt store):**

1. Veritabanı oluşturun (örn. `superreasoning`).
2. Sırayla çalıştırın:

```bash
psql -U user -d superreasoning -f server/db/schema.sql
psql -U user -d superreasoning -f server/db/schema-rls.sql
```

3. Varsayılan org ekleyin (migrasyon ve tek tenant için):

```sql
INSERT INTO organizations (id, name, slug, plan)
VALUES (gen_random_uuid(), 'Default', 'default', 'free')
RETURNING id;
```

Bu `id` değerini `.env` içinde `SR_DEFAULT_ORG_ID` olarak kullanın.

**Migrasyon (dosya store → DB):**

```bash
SR_DEFAULT_ORG_ID=<uuid> DATABASE_URL=postgresql://... npm run migrate:store
```

---

## 4. Ödeme (Stripe — opsiyonel)

[Bkz. PAYMENT_INTEGRATION.md](./PAYMENT_INTEGRATION.md)

- Stripe Dashboard'dan API key ve webhook secret alın.
- `.env` içine `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` ekleyin.
- Webhook URL: `https://api.example.com/v1/webhooks/stripe`
- API başlatıldığında `STRIPE_SECRET_KEY` varsa ödeme route'ları açılır.

---

## 5. API ve frontend

**API:**

```bash
npm run api
```

- Health: `GET http://localhost:4000/v1/health`
- Key doğrulama: `POST /v1/auth/validate` + header `x-api-key`
- Org promptları: `GET /v1/orgs/:orgId/prompts` (auth gerekli)

**Frontend:**

```bash
npm run dev
```

Tarayıcı: `http://localhost:3000` (veya terminalde yazan port).

**Frontend + API birlikte (entegrasyon):**

1. Bir terminalde: `npm run api` (port 4000)
2. Başka terminalde: `npm run dev` (port 3000)
3. Tarayıcıda uygulamayı açın; aşağı kaydırıp **"API & SaaS ▶"** butonuna tıklayın.
4. API key girin (backend'deki `API_KEYS` ile aynı), **"API Key doğrula"** ve **"Kaydedilen promptları getir"** ile istekler proxy üzerinden `http://localhost:4000/v1` adresine gider.

---

## 6. Testler ve doğrulama

**Güvenlik testleri (SECURITY_TEST_PLAN + SAAS_TRANSFORMATION):**

```bash
npx vitest run tests/security/
npx vitest run tests/api/
```

*(API testleri `server/app` ve `supertest` kullanır.)*

**Tüm testler:**

```bash
npm run test:run
```

**Manuel kontroller:**

| Doc | Kontrol |
|-----|--------|
| [SECURITY_TEST_PLAN.md](./SECURITY_TEST_PLAN.md) | Eksik key → 401; geçersiz key → 401; 11+ istek → 429 |
| [WCAG_CHECKLIST.md](./WCAG_CHECKLIST.md) | Erişilebilirlik maddeleri (manuel veya axe-core) |

---

## Sorun giderme

| Sorun | Çözüm |
|--------|--------|
| **dunder-proto get.js MODULE_NOT_FOUND** | `node_modules/dunder-proto` içinde `get.js` bazen npm ile gelmeyebilir. `npm install` tekrar deneyin; gerekirse [es-shims/dunder-proto](https://github.com/es-shims/dunder-proto/blob/main/get.js) içeriğini `node_modules/dunder-proto/get.js` olarak ekleyin. |
| **Build: EPERM dist/assets** | `dist` klasörü başka bir süreç (IDE, antivirus) tarafından kilitlenmiş olabilir. Tüm ilgili programları kapatıp `dist` klasörünü silin ve `npm run build` tekrar çalıştırın. Kod derlemesi (transform) başarılıysa sorun yalnızca dosya yazma iznidir. |

---

## Doc'lara hızlı link

| Doc | İçerik |
|-----|--------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Mimari diyagramlar, güvenlik katmanları |
| [MULTI_TENANCY_AND_KEYS.md](./MULTI_TENANCY_AND_KEYS.md) | Tenant = Org, BYOK vs Managed |
| [SAAS_TRANSFORMATION.md](./SAAS_TRANSFORMATION.md) | RLS, KeyManager, migrasyon, test planı, checklist |
| [PAYMENT_INTEGRATION.md](./PAYMENT_INTEGRATION.md) | Stripe / iyzico kurulum ve kod |
| [SECURITY_TEST_PLAN.md](./SECURITY_TEST_PLAN.md) | API key, rate limit, OWASP ZAP |
| [WCAG_CHECKLIST.md](./WCAG_CHECKLIST.md) | Erişilebilirlik (WCAG 2.1 AA) |

---

**PROPRIETARY | SUPER REASONING v3.1**
