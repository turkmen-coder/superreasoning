# Super Reasoning SaaS — Kurulum

BUILD planı entegrasyonu sonrası kurulum adımları.

## 1. Gereksinimler

- Node.js 18+
- PostgreSQL 16 (veya Docker)
- (Opsiyonel) Redis — BullMQ için (gelecek sürüm)

## 2. Hızlı Başlangıç

```bash
# Bağımlılıklar
npm install

# PostgreSQL ile Docker
docker compose up -d

# .env oluştur
cp .env.example .env
# DATABASE_URL=postgresql://sr:sr@localhost:5432/sr_dev
# SR_USE_DB_STORE=true
# API_KEYS=super-reasoning-test-key-2024

# Schema + varsayılan org
npm run db:setup
# Çıktıdaki SR_DEFAULT_ORG_ID değerini .env'e ekleyin

# API + Frontend
npm run api &
npm run dev
```

## 3. Ortam Değişkenleri

| Değişken | Açıklama |
|----------|----------|
| DATABASE_URL | PostgreSQL bağlantı URL'si |
| SR_USE_DB_STORE | `true` → DB prompt/runs store |
| SR_DEFAULT_ORG_ID | Runs/Usage için varsayılan org UUID |
| API_KEYS | Virgülle ayrılmış API anahtarları |
| STRIPE_SECRET_KEY | Ödeme (opsiyonel) |
| STRIPE_WEBHOOK_SECRET | Webhook doğrulama |

## 4. Runs API (DB gerekli)

```bash
# x-org-id header veya SR_DEFAULT_ORG_ID zorunlu
curl -X POST http://localhost:4000/v1/runs \
  -H "Content-Type: application/json" \
  -H "x-api-key: super-reasoning-test-key-2024" \
  -H "x-org-id: <SR_DEFAULT_ORG_ID>" \
  -d '{"intent":"REST API tasarla","workflowPreset":"quick"}'
```

## 5. CLI

```bash
export SR_API_KEY=super-reasoning-test-key-2024
export SR_ORG_ID=<SR_DEFAULT_ORG_ID>

npx tsx cli/sr.ts runs create --intent "API tasarla"
npx tsx cli/sr.ts runs list
npx tsx cli/sr.ts usage
```
