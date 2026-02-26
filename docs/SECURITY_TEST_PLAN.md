# Güvenlik Test Planı

OWASP uyumlu API için test adımları: API key doğrulama, rate limiting, key rotation.

---

## 1. API Key Testleri

### 1.1 Geçersiz / Eksik Key

| Test | Beklenen |
|------|----------|
| `POST /v1/generate` header olmadan | 401 Unauthorized |
| `POST /v1/generate` `x-api-key: invalid` | 401 Unauthorized |
| `POST /v1/generate` `x-api-key: <valid>` | 200 OK (veya 400 intent eksik) |

**Postman / cURL:**
```bash
# Eksik key
curl -X POST http://localhost:4000/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"intent":"test"}'
# Beklenen: 401

# Geçerli key (API_KEYS=testkey123)
curl -X POST http://localhost:4000/v1/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: testkey123" \
  -d '{"intent":"REST API tasarla"}'
# Beklenen: 200
```

### 1.2 Geliştirme Modu

| Ortam | Beklenen |
|-------|----------|
| `DISABLE_API_KEY_AUTH=true` | Key olmadan 200 |
| `DISABLE_API_KEY_AUTH=false` veya yok | Key gerekli |

---

## 2. Rate Limit Testleri

### 2.1 Postman / cURL ile

```bash
# 11+ istek (Free limit 10/dk)
for i in {1..12}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:4000/v1/generate \
    -H "x-api-key: testkey123" \
    -H "Content-Type: application/json" \
    -d '{"intent":"test"}'
done
# İlk 10 → 200 veya 400; 11–12 → 429
```

### 2.2 429 Yanıtı

- `Retry-After` header mevcut olmalı
- Body: `{ "error": "...", "code": "GENERATE_RATE_LIMIT", "retryAfter": 60 }`

---

## 3. OWASP ZAP Taraması

### 3.1 Kurulum

```bash
# Docker
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:4000 \
  -r zap-report.html
```

### 3.2 Kontrol Listesi

- [ ] API key loglarda görünmüyor
- [ ] CORS sadece izin verilen origin'lere
- [ ] SQL/NoSQL injection yok (store basit dosya tabanlı)
- [ ] XSS: JSON response, HTML içermemeli

---

## 4. Key Rotation Doğrulaması

1. **API_KEYS** env'deki bir key'i kaldır
2. O key ile istek at → 401
3. Yeni key ekle → 200
4. Eski key ile tekrar dene → 401

---

## 5. Ortam Değişkenleri Güvenliği

- [ ] `.env` `.gitignore`'da
- [ ] Production'da env'ler platform (Railway/Render) üzerinden
- [ ] `console.log(req.headers['x-api-key'])` yok

---

**PROPRIETARY | SUPER REASONING v2.2**
