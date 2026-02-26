# BUILD MASTER PROMPT — Super Reasoning / Meta-Prompt Architect v3.1 (SaaS)

**Sürüm:** 3.1 | **Tarih:** 2025-02-13

Bu doküman, Super Reasoning'ı lokal demodan çok kiracılı, kimlik doğrulamalı, ödeme entegreli prod-ready SaaS'a dönüştürmek için tasarım, mimari ve implementasyon planını tanımlar.

---

## Plan & Mimari

### Yüksek Seviye Mimari (C4 Level 1–2)

```mermaid
C4Context
    title Super Reasoning SaaS - Sistem Bağlamı
    Person(user, "Kullanıcı") --> WebApp
    Person(dev, "Geliştirici") --> API
    Person(dev) --> CLI
    System(WebApp, "Super Reasoning Web") --> API
    System(API, "SR API") --> LLM
    System(API, "SR API") --> DB
    System(API, "SR API") --> Stripe
    System(API, "SR API") --> Storage
    System(CLI, "SR CLI/SDK") --> API
    System_Ext(LLM, "Groq/Gemini/HF/Claude/OpenRouter")
    System_Ext(DB, "PostgreSQL")
    System_Ext(Stripe, "Stripe/iyzico")
    System_Ext(Storage, "S3/R2/GCS")
```

### Bileşen Diyagramı

```mermaid
flowchart TB
    subgraph Frontend["Frontend (Vite + React)"]
        UI[App.tsx]
        AuthFlow[Auth Flow]
        WorkflowPanel[WorkflowPanel]
        ResultDisplay[ResultDisplay]
        ConfirmationModal[ConfirmationModal]
    end

    subgraph API["Express API :4000"]
        Auth[Auth Middleware]
        RateLimit[Rate Limit]
        Routes[Routes]
        Generate[Generate Adapter]
        Runs[Runs Controller]
        Prompts[Prompts Controller]
        Usage[Usage Controller]
    end

    subgraph Workers["Background Workers"]
        Queue[BullMQ Queue]
        Worker[Orchestrator Worker]
    end

    subgraph Data["Veri Katmanı"]
        PG[(PostgreSQL)]
        Redis[(Redis)]
    end

    subgraph External["Harici"]
        StripeAPI[Stripe]
        LLMs[LLM Providers]
        StorageAPI[S3/R2]
    end

    UI --> AuthFlow
    UI --> Routes
    Auth --> RateLimit --> Routes
    Routes --> Generate
    Routes --> Runs --> Queue
    Queue --> Worker --> Generate
    Worker --> PG
    Routes --> Prompts --> PG
    Routes --> Usage --> PG
    Routes --> StripeAPI
    Generate --> LLMs
    Routes --> StorageAPI
```

### Geçiş Stratejisi

| Aşama | Hedef | Risk |
|-------|-------|------|
| 1 | DB migration (schema.sql mevcut); dosya store → DB | Düşük |
| 2 | Auth (JWT/Clerk) + org/project context | Orta |
| 3 | Runs + run_steps tabloları; async job queue | Orta |
| 4 | Usage metering + Stripe webhook DB güncelleme | Düşük |
| 5 | Attachment signed URL (S3/R2) | Orta |

---

## Veri Modeli (Multi-tenant)

### ER Diyagramı

```mermaid
erDiagram
    organizations ||--o{ org_members : has
    organizations ||--o{ projects : has
    organizations ||--o{ prompts : owns
    organizations ||--o{ runs : owns
    organizations ||--o{ usage : tracks
    organizations ||--o{ api_keys : has
    users ||--o{ org_members : member_of
    projects ||--o{ prompts : contains
    projects ||--o{ runs : scoped
    prompts ||--o{ prompt_versions : versioned
    runs ||--o{ run_steps : has
    runs }o--|| workflows : uses
```

### Eksik/Genişletilmiş Tablolar

Mevcut `schema.sql` ile BUILD gereksinimleri arasındaki farklar:

| Tablo | Mevcut | Eklenecek |
|-------|--------|-----------|
| runs | intent, step_outputs JSONB | intent_raw, intent_compressed, framework, domain_id, status, timings, cost_estimate, project_id |
| run_steps | — | **YENİ:** run_id, step_name, input, output, status, metrics |
| style_profiles | — | version alanı; created_by |
| audit_logs | — | **YENİ:** org_id, actor_id, action, target, created_at |

### Migration: run_steps + runs genişletme

```sql
-- server/db/migrations/002_runs_run_steps.sql
ALTER TABLE runs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS intent_raw TEXT;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS intent_compressed TEXT;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS framework TEXT;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS domain_id TEXT;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed'));
ALTER TABLE runs ADD COLUMN IF NOT EXISTS timings JSONB;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS cost_estimate NUMERIC(10,6);

CREATE TABLE IF NOT EXISTS run_steps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  step_name  TEXT NOT NULL,
  input      TEXT,
  output     TEXT,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  metrics    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_run_steps_run ON run_steps(run_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  target     TEXT,
  meta       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(org_id, created_at DESC);
```

### Tenant İzolasyonu Kuralları

- Her sorguda `WHERE org_id = $1` zorunlu (org üzerinden erişim)
- RLS (Row Level Security) opsiyonel; uygulama katmanında filtre yeterli MVP için
- `org_members` ile kullanıcı → org eşlemesi; rol: owner/admin/member/viewer

---

## API Tasarımı (OpenAPI uyumlu)

### Endpoint Özeti

| Method | Path | Açıklama | Auth |
|--------|------|----------|------|
| GET | /v1/health | Sağlık | — |
| POST | /v1/auth/validate | API key doğrula | — |
| POST | /v1/auth/login | Giriş (JWT) | — |
| GET | /v1/orgs | Org listesi | JWT |
| GET | /v1/orgs/:orgId/projects | Proje listesi | JWT + org |
| POST | /v1/runs | Run başlat (async) | JWT + API Key |
| GET | /v1/runs/:id | Run durumu + sonuç | JWT |
| GET | /v1/runs | Run listesi (projectId filtre) | JWT |
| POST | /v1/generate | Senkron generate (mevcut) | API Key |
| GET | /v1/prompts, POST, GET/:id, DELETE | Prompt CRUD | API Key |
| POST | /v1/style-profiles | Style profile kaydet | JWT |
| POST | /v1/attachments/upload-url | Signed upload URL | JWT |
| GET | /v1/usage | Org kullanım + kota | JWT |
| POST | /v1/billing/checkout | Stripe Checkout | JWT |
| POST | /v1/webhooks/stripe | Webhook | Stripe sig |

### Örnek: POST /v1/runs Request/Response

```yaml
# openapi.yaml eklentisi
  /v1/runs:
    post:
      summary: Async run başlat
      operationId: createRun
      tags: [Runs]
      security:
        - ApiKeyAuth: []
        - BearerAuth: []
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [intent]
              properties:
                intent: { type: string, maxLength: 50000 }
                framework: { type: string, enum: [AUTO, KERNEL, CO_STAR, RISEN, RTF, BAB, TAG, CARE] }
                domainId: { type: string }
                provider: { type: string }
                projectId: { type: string, format: uuid }
                workflowPreset: { type: string, enum: [full, quick, research_prompt, generate_only] }
      responses:
        '202':
          description: Run oluşturuldu, işlem arka planda
          content:
            application/json:
              schema:
                type: object
                properties:
                  runId: { type: string, format: uuid }
                  status: { type: string, example: pending }
```

### Rate Limit Headers

- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` (429)

---

## UI/UX (WCAG 2.1 AA)

### Auth Akışı

1. Login (Clerk/Auth.js) → JWT/session
2. Org seçimi/oluşturma (varsayılan org)
3. Proje seçimi (opsiyonel)

### Ekranlar

| Ekran | Bileşenler | WCAG Notları |
|-------|------------|--------------|
| Ana | DomainSelector, FrameworkSelector, WorkflowPanel, ResultDisplay | aria-label, focus trap |
| Confirmation | intent özeti, config, usage tahmini | aria-modal, aria-labelledby |
| Run History | Runs list, status badge | aria-live durum güncellemeleri |
| Style Profiles | Form, örnek listesi | label + htmlFor |
| Usage | Kota göstergesi, grafik | kontrast 4.5:1 |

### Klavye + Focus

- Ctrl+Enter: Generate (mevcut)
- Esc: Modal kapat
- Tab: Modal içinde focus trap
- Skip link: "Ana içeriğe atla"

### Renk Kontrastu

- cyber-primary (#00f0ff) vs cyber-black (#050505): hesaplanmalı
- `prefers-reduced-motion` ile animasyon azaltma

---

## Provider Katmanı (HF/Gemini/Groq/Claude/OpenRouter)

### Standart Provider Arayüzü

```ts
// types.ts veya providerTypes.ts
export interface ProviderResponse {
  text: string;           // Markdown
  model: string;
  provider: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  costEstimate?: number;
}
```

### Markdown-Only Kuralı

- Tüm provider system instruction'larında: "Reply in Markdown only. No JSON."
- `parseMarkdownResponse()` ile reasoning/masterPrompt ayrıştırma (mevcut)

### HF Text-Only

- Attachments: görsel/PDF varsa UI'da uyarı; HF seçiliyken multimodal devre dışı
- Server: `provider === 'huggingface' && attachments.some(a => !isText(a))` → 400

---

## Orchestrator (Multi-step Agent Pipeline)

### Mevcut Yapı

- `services/orchestrator.ts`: research → summarize → generate_prompt → test
- Preset'ler: full, quick, research_prompt, generate_only

### Server Tarafına Taşıma

- `server/jobs/orchestratorJob.ts`: runWorkflow benzeri; DB'ye run_steps yazar
- BullMQ job: `{ runId, intent, framework, domainId, provider, steps }`
- Worker: her adım sonrası `run_steps` INSERT, `runs.status` güncelle

### UI: Run Status

- Polling: `GET /v1/runs/:id` her 2s
- SSE (opsiyonel): `GET /v1/runs/:id/stream` — adım adım event

---

## Prompt-as-Code (API + CLI + SDK)

### API

- Mevcut `/v1/generate`, `/v1/prompts` OpenAPI ile belgeli
- `/v1/runs` eklenecek

### CLI Güncellemesi

```bash
# Org context (SR_ORG_ID veya login sonrası)
SR_API_URL=http://localhost:4000 SR_API_KEY=xxx npx tsx cli/sr.ts generate --intent "..." --orgId <uuid>
npx tsx cli/sr.ts runs list --projectId <uuid>
npx tsx cli/sr.ts runs get <runId>
```

### SDK (sdk/client.ts)

- `createRun()`, `getRun()`, `listRuns()`
- Auth: `x-api-key` veya `Authorization: Bearer <token>`

---

## Güvenlik (OWASP) & Abuse Kontrolleri

### OWASP Kontrolleri

| Kontrol | Uygulama |
|---------|----------|
| Input validation | intent max 50k, framework/domain enum whitelist |
| Injection | Parametreli sorgular (pg), prompt injection tespiti (basit pattern) |
| Auth | JWT + API key; timing-safe compare |
| Rate limit | Org + IP; plan bazlı (Free: 10/dk, Pro: 100/dk) |
| CORS | Sadece izin verilen origin |
| Secrets | ENV; loglarda key yok |

### Audit Log

- `audit_logs`: login, run_create, prompt_save, billing_change
- PII: email/org maskeleme (örn. `u***@domain.com`)

### Abuse

- Aynı intent 100+ kez/dk → throttle
- Şüpheli pattern (örn. script injection) → 400 + log

---

## Ödeme (Stripe / iyzico) & Metering

### Planlar

| Plan | Runs/ay | Rate limit |
|------|---------|------------|
| Free | 50 | 10/dk |
| Pro | 500 | 100/dk |
| Team | Sınırsız | 200/dk |

### Metering

- `usage` tablosu: org_id, period_start, period_end, request_count, token_count
- Her run sonrası: `INSERT ... ON CONFLICT DO UPDATE` (günlük/aylık toplam)

### Stripe Webhook

- `checkout.session.completed` → org/user plan=Pro, subscription_id kaydet
- `customer.subscription.deleted` → plan=Free

### iyzico (Opsiyonel)

- TR ödeme için alternatif; aynı checkout flow ile entegre

---

## Observability & Telemetry

### Telemetri Alanları

- Request: path, method, org_id, latency_ms, status
- Run: provider, model, step_count, total_latency
- Provider: latency, token (varsa), cost_estimate

### Loglama

- PII maskeleme
- Structured JSON log (örn. pino)

### Metrikler (Opsiyonel)

- Prometheus: `http_requests_total`, `run_duration_seconds`
- Grafana dashboard

---

## Test Stratejisi (Vitest + E2E opsiyonel)

### Birim Testleri

- `utils/compressIntent.test.ts`
- `utils/parseMarkdownResponse.test.ts`
- `utils/analysis.test.ts`

### API Integration

- `tests/api/security.test.ts` (mevcut)
- `tests/api/generate.test.ts`: mock provider, 200/400/401/429
- `tests/api/runs.test.ts`: createRun, getRun (mock queue)

### Orchestrator

- `tests/orchestrator.test.ts`: mock GenerateFn, step sonuçları doğrula

### CI

- `npm run test`
- `npm run lint` + `npm run typecheck`

### E2E (Opsiyonel)

- Playwright: login → intent → generate → sonuç

---

## Deployment (Dev/Staging/Prod)

### Ortamlar

| Ortam | URL | DB | Stripe |
|-------|-----|-----|--------|
| Dev | localhost:3000 / 4000 | local PostgreSQL | test mode |
| Staging | staging.superreasoning.app | Staging DB | test mode |
| Prod | app.superreasoning.app | Prod DB | live |

### .env.example

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sr_dev

# Auth (Clerk örnek)
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx

# API Keys (virgülle ayrılmış)
API_KEYS=key1,key2

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PRO=price_xxx

# Redis (BullMQ)
REDIS_URL=redis://localhost:6379

# Storage (S3/R2)
S3_BUCKET=sr-attachments
S3_REGION=eu-west-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Optional
DISABLE_API_KEY_AUTH=false
SR_API_PORT=4000
```

### Docker Compose (Dev)

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports: ["4000:4000"]
    env_file: .env
    depends_on: [db, redis]
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: sr_dev
      POSTGRES_USER: sr
      POSTGRES_PASSWORD: sr
  redis:
    image: redis:7-alpine
```

---

## Uygulama Checklist (Acceptance Criteria)

- [ ] Kullanıcı login olur, org seçer/kurar, proje açar
- [ ] Intent girip domain/framework seçer (AUTO çalışır), confirmation modal görür
- [ ] Generate run oluşturur; workflow çalışır; sonuç Markdown; reasoning/masterPrompt ayrışır
- [ ] Run history ve prompt versioning DB'de
- [ ] Rate limit ve usage ekranı çalışır
- [ ] WCAG temel kriterleri (klavye, focus, kontrast)
- [ ] Payment plan Pro değilse kota kısıtları
- [ ] CLI: generate/list/get/save/delete org bağlamında

---

## İlk Sprint Görev Listesi

### Sprint 1 (2 hafta) — Veri + Auth Temeli

| # | Görev | Dosya | Öncelik |
|---|-------|-------|---------|
| 1 | run_steps + audit_logs migration | server/db/migrations/002_*.sql | P0 |
| 2 | runs tablosu genişletme | aynı migration | P0 |
| 3 | POST /v1/runs endpoint (senkron MVP) | server/routes/runs.ts | P0 |
| 4 | GET /v1/runs/:id, GET /v1/runs | aynı | P0 |
| 5 | Auth middleware (JWT stub veya Clerk) | server/middleware/authJwt.ts | P1 |
| 6 | org_id context (req.orgId) | middleware | P1 |
| 7 | Usage tablosu güncelleme (run sonrası) | server/lib/usage.ts | P1 |
| 8 | Stripe webhook DB güncelleme | server/routes/payment.ts | P1 |

### Sprint 2 — Orchestrator + UI

| # | Görev | Öncelik |
|---|-------|---------|
| 9 | BullMQ + Redis kurulumu | P0 |
| 10 | Orchestrator worker (server/jobs/) | P0 |
| 11 | Runs listesi UI | P1 |
| 12 | Run status polling | P1 |
| 13 | Confirmation modal usage tahmini | P2 |

### Sprint 3 — MVP+ Özellikler

| # | Görev | Öncelik |
|---|-------|---------|
| 14 | Prompt QA (lint + skor) — en az 6'dan 1 | P2 |
| 15 | Semantic cache (fingerprint) | P2 |
| 16 | Signed upload URL (attachments) | P2 |
| 17 | WCAG skip link + modal focus trap | P2 |

---

## Örnek Kod İskeletleri

### POST /v1/runs Handler

```ts
// server/routes/runs.ts
import { Router } from 'express';
import { getPool } from '../db/client';
import { runWorkflow } from '../../services/orchestrator';
import { generateMasterPromptServer } from '../lib/generateAdapter';

const router = Router();

router.post('/runs', requireAuth, async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const { intent, framework, domainId, provider, projectId, workflowPreset } = req.body ?? {};
  const orgId = (req as any).orgId;
  if (!orgId) return res.status(401).json({ error: 'Org required' });
  if (!intent || typeof intent !== 'string') return res.status(400).json({ error: 'intent required' });

  const runResult = await pool.query(
    `INSERT INTO runs (org_id, project_id, intent_raw, intent_compressed, framework, domain_id, provider, status)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, 'running')
     RETURNING id`,
    [orgId, projectId || null, intent, compressIntent(intent), framework || 'AUTO', domainId || 'auto', provider || 'groq']
  );
  const runId = runResult.rows[0].id;

  // Senkron MVP: doğrudan orchestrate et
  try {
    const workflow = getWorkflowPreset(workflowPreset || 'quick');
    const result = await runWorkflow({ ... });
    await pool.query(
      `UPDATE runs SET status = 'completed', step_outputs = $2 WHERE id = $1`,
      [runId, JSON.stringify(result.stepResults)]
    );
    return res.status(202).json({ runId, status: 'completed', result });
  } catch (e) {
    await pool.query(`UPDATE runs SET status = 'failed' WHERE id = $1`, [runId]);
    throw e;
  }
});
```

### Provider Response Standardı

```ts
// server/lib/generateAdapter.ts — dönüş tipi
export async function generateMasterPromptServer(req: GenerateRequest): Promise<ProviderResponse> {
  const start = Date.now();
  const parsed = await callProvider(req);
  return {
    text: parsed.masterPrompt,
    model: getModelForProvider(req.provider),
    provider: req.provider,
    latencyMs: Date.now() - start,
    inputTokens: undefined,  // provider'dan gelirse
    outputTokens: undefined,
    costEstimate: undefined,
  };
}
```

### Usage Güncelleme

```ts
// server/lib/usage.ts
export async function recordRunUsage(pool: Pool, orgId: string, requestCount = 1, tokenCount = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  await pool.query(
    `INSERT INTO usage (org_id, plan, period_start, period_end, request_count, token_count)
     VALUES ($1::uuid, (SELECT plan FROM organizations WHERE id = $1::uuid), $2, $3, $4, $5)
     ON CONFLICT (org_id, period_start) DO UPDATE SET
       request_count = usage.request_count + $4,
       token_count = usage.token_count + $5`,
    [orgId, start, end, requestCount, tokenCount]
  );
}
```

---

**PROPRIETARY | SUPER REASONING v3.1 — SaaS Build Plan**
