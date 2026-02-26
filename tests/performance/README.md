# Performans test planı — DB migrasyonu

## Hedef

- **100k prompt verisi** → migrasyon süresi **< 5 saniye** (hedef).
- Veri bütünlüğü: migrasyon sonrası satır sayısı = kaynak dosyadaki prompt version sayısı.

## Senaryolar

1. **Migration script süresi**
   - `.prompts/index.json` içinde N adet prompt version (veya fixture ile 100k satır).
   - `npm run migrate:store` çalıştır; süreyi ölç (örn. `time npm run migrate:store`).
   - Assert: exit code 0, hata yok, migrated count = N.

2. **DB store list/get performansı**
   - Migrasyon sonrası `GET /v1/orgs/{orgId}/prompts` ile listeleme.
   - Hedef: 1000 kayıt < 500ms (index kullanımı ile).

3. **Rate limit / abuse**
   - Aynı IP’den dakikada limit üstü istek → 429.
   - Key olmadan yüksek istek → 429 (anonymous limit).

## Araçlar

- Manuel: `time npm run migrate:store`
- Otomasyon: Vitest ile migration script’i mock’layıp süre assert (opsiyonel).
- Load test: `artillery` veya `k6` ile `/v1/generate` / `/v1/prompts` rate limit doğrulama.
