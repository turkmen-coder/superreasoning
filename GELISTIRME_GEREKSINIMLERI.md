# Geliştirme Gereksinimleri — Super Reasoning v2.2+

Bu belge, platformun **Dosya Önizleme**, **İnteraktif Editör**, **Şablon Marketi** ve ilgili teknik kısıtlamalar ile çıktı örneklerini tanımlar.

---

## 1. Dosya Önizleme (Frontend / Backend)

### 1.1 Özellikler

| Özellik | Açıklama |
|--------|----------|
| **Sürükle-bırak (drag-and-drop)** | PDF, görsel, ZIP, metin dosyaları için tek bir yükleme alanı. |
| **Önizleme** | İlk 1–2 sayfa veya OCR metni kullanıcıya önizleme olarak gösterilsin. |
| **OCR entegrasyonu** | Tesseract (self-hosted) veya 3. parti OCR API: Google Vision, AWS Textract. |

### 1.2 Teknik Notlar

- Frontend: Mevcut sürükle-bırak bileşeni WCAG 2.1 AA uyumlu olacak şekilde genişletilmeli (klavye, `role`, `aria-label`).
- Backend: PDF sayfa çıkarma + OCR sonucu için endpoint(ler); güvenlik OWASP ZAP ile test edilmeli.
- Dosya türüne göre: PDF → ilk 1–2 sayfa metin/özet; görsel → OCR metni; ZIP → içerik listesi veya seçilen dosya önizlemesi; metin → ilk N karakter.

---

## 2. İnteraktif Editör (Frontend)

### 2.1 Özellikler

| Özellik | Açıklama |
|--------|----------|
| **Editör motoru** | Monaco (VS Code editörü) veya TipTap (Markdown için) ile WYSIWYG + Markdown düzenleme. |
| **Token karmaşıklık tahmini** | Değişiklikler anında gösterilsin. Referans: GPT-4 ~1 token/sözcük, GPT-3.5 ~0.75 token/sözcük. |

### 2.2 Teknik Notlar

- Niyet alanı veya “Usta İstem” çıktısı için editör modu (isteğe bağlı).
- Token tahmini: kelime sayısı × seçilen model katsayısı; isteğe bağlı system prompt token’ı eklenebilir.

---

## 3. Şablon Marketi (General / Frontend / Backend)

### 3.1 Özellikler

| Özellik | Açıklama |
|--------|----------|
| **Domain/Framework bazlı şablonlar** | Örn: "PDF Önizleme API", "WCAG Test Planı", "OpenAPI Spec" şablonları. |
| **Kullanıcı şablonları** | Kullanıcılar şablon oluşturup paylaşabilsin; versiyonlama + derecelendirme. |
| **Belgeleme formatı** | Şablonlar OpenAPI formatında belgelenebilir. |

### 3.2 Teknik Notlar

- Şablon meta: domainId, framework, isim, açıklama, versiyon, rating.
- OpenAPI 3.0 ile şablon API’leri (ör. önizleme endpoint’i) dokümante edilebilir.

---

## 4. Teknik Kısıtlamalar

| Alan | Kısıtlama | Not |
|------|-----------|-----|
| **Frontend / UI/UX** | WCAG 2.1 AA uyumlu; sürükle-bırak bileşeni erişilebilir olacak. | Klavye, odak, etiketler, kontrast. |
| **Backend** | OCR/önizleme API’leri OWASP ZAP ile güvenlik testleri. | Injection, yetkisiz erişim, rate limit. |
| **Security** | Veri koruma → OWASP Top 10 (A03: Veri Yönetimi). | Yüklenen dosyaların işlenmesi, saklanmaması, loglama. |
| **Testing** | Önizleme doğrulama → WCAG + OCR doğruluğu testleri. | E2E: yükleme + önizleme; OCR birim testleri. |

---

## 5. Çıktı Örnekleri

### 5.1 PDF Önizleme API Şablonu (OpenAPI)

```yaml
paths:
  /preview:
    post:
      summary: "PDF Önizleme"
      description: "Yüklenen PDF'in ilk 1-2 sayfa metnini veya OCR çıktısını döner."
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
      responses:
        "200":
          description: "İlk 2 sayfa metni veya OCR çıktısı"
          content:
            text/plain:
              schema:
                type: string
        "400":
          description: "Geçersiz dosya türü"
```

### 5.2 WCAG Uyumlu Sürükle-Bırak UI (React)

- Klavye ile tetiklenebilir buton; Enter/Space ile dosya seçici açılır.
- `role="button"`, `tabIndex={0}`, `aria-label` kullanımı.

```jsx
<div
  role="button"
  tabIndex={0}
  aria-label="Dosya yükle, sürükle bırak veya Enter ile seç"
  onClick={handleUpload}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleUpload();
    }
  }}
>
  Dosya Yükle (Sürükle-Bırak)
</div>
```

### 5.3 Test Planı (WCAG + OCR)

| Kategori | Test | Hedef |
|----------|------|--------|
| **WCAG** | Renk kontrastı | En az 4.5:1 (metin). |
| **WCAG** | Klavye navigasyonu | Tüm etkileşimler Tab/Enter/Space ile erişilebilir. |
| **OCR** | Metin doğruluğu | %95+ (referans metin ile karşılaştırma). |
| **OCR** | Tesseract ayarları | Dil/PSM parametreleri optimize edilsin. |

---

## 6. Uygulama Durumu (Mevcut)

| Gereksinim | Durum | Not |
|------------|--------|-----|
| Sürükle-bırak yükleme | ✅ Var | PDF/görsel/metin/ZIP; WCAG (role, tabIndex, Enter/Space, aria-label). |
| İlk sayfa önizleme | ✅ Var | Metin: ilk 500 karakter; görsel: thumbnail. PDF/ZIP: dosya adı (OCR/backend sonrası genişletilebilir). |
| OCR (Tesseract/API) | ❌ Yok | Backend + OCR entegrasyonu gerekli. |
| İnteraktif editör (çıktı) | ✅ Var | Usta istem çıktısı için "Düzenle" → textarea + anlık Markdown önizleme. |
| Token tahmini | ✅ Var | Girdi panelinde ~X (GPT-3.5) · ~Y (GPT-4) (0.75 ve 1 token/sözcük). |
| Şablon marketi (hazır şablonlar) | ✅ Var | Domain/Framework bazlı 6 şablon (PDF Önizleme API, WCAG Test Planı, OpenAPI Spec, vb.); seçilince niyet/alan/çerçeve doldurulur. |
| Kullanıcı şablonu / versiyonlama / derecelendirme | ❌ Yok | Backend + auth gerekli. |
| OpenAPI şablon belgeleme | 🔶 Kısmi | Şablon metinleri var; şablon başına OpenAPI spec export isteğe bağlı. |
| Kullanım telemetri & A/B analitik | ✅ Var | Anonim eventler (generation, edited, copy, feedback); consent ile sessionStorage; dashboard: düzenleme oranı, domain başarısı, token tahmini. GDPR gözetilir. |
| Otomatik iyileştirme (RFHF) | ✅ Var | "Öneri havuzuna ekle" butonu; onay ile başarılı varyant localStorage’a eklenir; minimal insan-in-the-loop. |
| Benchmark suite / regresyon testleri | ✅ Var | Vitest ile `tests/prompt-regression.test.ts`: parseMarkdownResponse, çıktı yapısı (## başlıklar, JSON olmama). |
| Prompt-as-Code API & CLI | ✅ Var | REST API (Express), OpenAPI 3.0 spec, CLI (generate/list/get/save/delete), TypeScript SDK. Prompt deposu `.prompts/` ile versionlama; CI/CD entegrasyonu. |
| Multi-step Agent Orchestration | ✅ Var | Agent zinciri: araştır → özetle → prompt üret → test et. Preset pipeline’lar (Tam / Hızlı / Araştırma+Prompt / Sadece üret); `services/orchestrator.ts` + `WorkflowPanel`; adım çıktısı sonrakine aktarılır. |

| Interactive Teaching Mode | ✅ Var | Stil profilleri (ad, açıklama, tone anahtar kelimeleri, örnek giriş/çıktı çiftleri); localStorage; aktif profil `buildStyleContext()` ile tüm generate ve workflow çağrılarına enjekte edilir. `StyleProfileManager` + `services/styleProfiles.ts`. |
| Görüntü & Video Üretimi | ✅ Var | Domain `image-video`: DALL·E, Midjourney, SD, Flux, Runway, Sora vb. için evrensel prompt tasarımı. Çıktı: UNIVERSAL PROMPT + Yapısal Ayrım + Negatif Prompt + Model ipuçları. `locales.ts` domains.image-video, `data.ts` DOMAIN_META. |

---

## 7. Kullanım Telemetri, RFHF ve Benchmark

### 7.1 Telemetri (GDPR/Anonimleştirme)

- **Toplanan veriler:** domainId, framework, provider (HF/Gemini), inputTokenEst, outputTokenEst, wasEdited, event tipi (generation / edited / copy / feedback_add_to_pool). Kişisel veri toplanmaz.
- **Consent:** Kullanıcı checkbox ile onay verirse sessionStorage’da saklanır; aksi halde yalnızca bellek (session).
- **Dashboard:** Düzenleme oranı, domain bazlı başarı (1 − düzenleme oranı), toplam token tahmini, öneri havuzuna ekleme sayısı.

### 7.2 Otomatik İyileştirme (Reinforcement via Human Feedback)

- Kullanıcı sonuç ekranında "Öneri havuzuna ekle" ile onaylarsa: masterPrompt, reasoning, domainId, framework anonim olarak `sr_suggestion_pool` (localStorage) içine eklenir.
- Havuz ileride "önerilen şablonlar" veya benzeri özelliklerde kullanılabilir; minimal insan-in-the-loop.

### 7.3 Benchmark Suite (Prompt Regresyon)

- **Konum:** `tests/prompt-regression.test.ts`
- **İçerik:** `parseMarkdownResponse` birim testleri; Gherkin-tarzı senaryolar: "Given valid master prompt, When we analyze, Then section count ≥ 1, sections include SYSTEM/USER"; çıktının JSON olmaması kontrolü.
- **Çalıştırma:** `npm run test:run` veya `npm test`

---

---

## 8. Prompt-as-Code API & CLI

### 8.1 API (Express)

- **Port:** 4000 (`SR_API_PORT`)
- **Endpoints:** `GET /v1/health`, `POST /v1/generate`, `GET/POST/DELETE /v1/prompts`, `GET/DELETE /v1/prompts/:id`
- **Depo:** `.prompts/index.json` (`SR_PROMPTS_DIR` ile değiştirilebilir); CI/CD’de bu dizin versionlanabilir.

### 8.2 OpenAPI & SDK

- **openapi.yaml:** OpenAPI 3.0 spec; Swagger UI veya kod üretici ile kullanılır.
- **sdk/client.ts:** TypeScript SDK (`SuperReasoningClient`); tarayıcı veya Node’da kullanılabilir.

### 8.3 CLI

- **cli/sr.ts:** Komutlar `health`, `generate`, `list`, `get`, `save`, `delete`. Ortam: `SR_API_URL`.

---

**Belge sürümü:** 1.2  
**İlgili standartlar:** WCAG 2.1 AA, OWASP Top 10, OpenAPI 3.0, GDPR (anonimleştirme, consent).
