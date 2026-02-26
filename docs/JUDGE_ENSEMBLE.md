# Judge Ensemble + Kalibrasyon

**LLM-as-a-Judge değil, hakem havuzu.** Tek bir hakem yerine çoklu kriter ve çoklu değerlendirici; uyuşmazlıkta otomatik iyileştirme; zamanla gerçek kullanıcı verisiyle kalibrasyon.

---

## 1. Kavramsal Karşılaştırma

| Yaklaşım | Tek LLM-as-Judge | Judge Ensemble |
|----------|------------------|----------------|
| Hakem sayısı | 1 | N (kriter bazlı veya model bazlı) |
| Skorlama | Tek genel skor | Kriter bazlı skorlar (netlik, test edilebilirlik, vb.) |
| Uyuşmazlık | Yok | Hakemler çakışırsa → revize döngüsü |
| Kalibrasyon | Sabit prompt | Gerçek kullanıcı verisiyle skor–sonuç korelasyonu |

---

## 2. Hakem Havuzu Yapısı

### 2.1 Kriter Bazlı Hakemler

Her kriter için ayrı değerlendirici (tek LLM çağrısında çoklu kriter veya ayrı prompt’lar):

| Kriter | Açıklama | Skor (0–100) | Örnek Soru |
|--------|----------|--------------|------------|
| **Netlik** | Amaç, kısıt ve çıktı formatı açık mı? | clarity | "Bu prompt’u alan dışı biri anlayabilir mi?" |
| **Test edilebilirlik** | Başarı/başarısızlık objektif ölçülebilir mi? | testability | "Geçti/kaldı kriterleri net mi?" |
| **Kısıt uyumu** | Domain/framework kurallarına uyuyor mu? | constraint_compliance | "IR’deki kısıtlar çıktıda yansıyor mu?" |
| **Güvenlik** | Prompt injection, PII, policy override riski? | security | "Zararlı girdiye dayanıklı mı?" |
| **Tekrar üretilebilirlik** | Aynı girdi → benzer çıktı? | reproducibility | "Deterministik / tutarlı mı?" |

### 2.2 Ağırlıklı Toplam Skor

```
total_score = w1*clarity + w2*testability + w3*constraint_compliance + w4*security + w5*reproducibility
```

Başlangıç ağırlıklar: `[0.25, 0.20, 0.25, 0.15, 0.15]` — kalibrasyonla güncellenir.

---

## 3. Uyuşmazlık ve Otomatik İyileştirme

### 3.1 Uyuşmazlık Tanımı

- **Kriter çakışması:** Bir kriter yüksek (≥80), diğeri düşük (<50).
- **Çapraz doğrulama:** Farklı modeller aynı prompt’u farklı skorluyor (varyans yüksek).
- **Güvenlik vs netlik:** Güvenlik yüksek ama netlik düşük → “fazla kısıtlayıcı” olabilir.

### 3.2 Otomatik Revize Döngüsü

```
1. Prompt P → Judge Ensemble → Skorlar S
2. Eğer uyuşmazlık (örn. clarity<50 VE security>80):
   a. "Revize talimatı" üret: "Netliği artır, güvenliği koru"
   b. P' → Revizyon (LLM veya kural tabanlı)
   c. P' → Judge Ensemble → S'
   d. Eğer S' > S → P' kabul; yoksa P koru (veya 1 iterasyon daha)
3. Max 2 iterasyon; sonra kullanıcıya "manuel iyileştirme öner" çıktısı
```

### 3.3 Disagreement Mining

Hakemler arası anlaşmazlıkta:
- Hangi kriterlerde fark var?
- Hangi cümleler/bölümler tartışmalı?
- Bu bilgiyi "netleştirme soruları" veya "iyileştirme önerileri" olarak kullanıcıya sun.

---

## 4. Kalibrasyon (Gerçek Kullanıcı Verisi)

### 4.1 Toplanacak Veri

| Alan | Açıklama |
|------|----------|
| prompt_id | Üretilen prompt |
| scores | Judge Ensemble skorları (clarity, testability, …) |
| user_outcome | Kullanıcı davranışı: kopyaladı mı, düzenledi mi, öneri havuzuna ekledi mi, tekrar üretti mi? |
| was_edited | Kullanıcı çıktıyı düzenledi mi? (düşük = iyi) |
| feedback_add_to_pool | Öneri havuzuna ekleme (yüksek = iyi) |
| regenerate_count | Aynı niyetle tekrar üretim (yüksek = kötü) |

### 4.2 Kalibrasyon Modeli

Zamanla:
- Hangi skor kombinasyonları `feedback_add_to_pool=1` ve `was_edited=0` ile korelasyonlu?
- Hangi skorlar `regenerate_count` ile negatif korelasyonlu?
- Ağırlıkları güncelle: iyi sonuç veren kriterlere daha yüksek ağırlık.
- Eşikleri güncelle: "Kabul edilebilir" eşiği (örn. total≥70) gerçek başarı oranına göre ayarla.

### 4.3 Veri Akışı

```
Run → Prompt üret → Judge Ensemble skorla → Kullanıcıya göster
                ↓
Kullanıcı: kopyala / düzenle / öneri havuzuna ekle / tekrar üret
                ↓
Telemetri (anonim, tenant izolasyonlu) → Kalibrasyon pipeline
                ↓
Ağırlık ve eşik güncellemesi (haftalık/aylık batch)
```

---

## 5. Mimari Özet

```
┌─────────────────┐     ┌──────────────────────────────────────┐
│  Üretilen       │────▶│  Judge Ensemble                      │
│  Prompt P       │     │  - Clarity Judge                     │
└─────────────────┘     │  - Testability Judge                 │
                        │  - Constraint Compliance Judge       │
                        │  - Security Judge                    │
                        │  - Reproducibility Judge             │
                        └──────────────────┬───────────────────┘
                                           │
                                           ▼
                        ┌──────────────────────────────────────┐
                        │  Skorlar S + Uyuşmazlık Tespiti      │
                        └──────────────────┬───────────────────┘
                                           │
                        ┌──────────────────┴───────────────────┐
                        │                                      │
                        ▼                                      ▼
             ┌──────────────────┐                  ┌──────────────────┐
             │ Uyuşmazlık yok   │                  │ Uyuşmazlık var   │
             │ → Kullanıcıya    │                  │ → Revize döngüsü │
             │   sun            │                  │ → P' üret        │
             └──────────────────┘                  └────────┬─────────┘
                                                           │
                                                           ▼
                                                ┌──────────────────┐
                                                │ P' tekrar skorla │
                                                │ S' > S ? P' : P  │
                                                └──────────────────┘

                        ┌──────────────────────────────────────┐
                        │  Kullanıcı Davranışı (anonim)         │
                        │  → Kalibrasyon veritabanı             │
                        └──────────────────┬───────────────────┘
                                           │
                                           ▼
                        ┌──────────────────────────────────────┐
                        │  Ağırlık / Eşik Güncelleme (batch)    │
                        └──────────────────────────────────────┘
```

---

## 6. Mevcut Kodla Eşleme

| Bileşen | Mevcut | Planlanan |
|---------|--------|-----------|
| Test adımı | `orchestrator.ts` — basit bölüm/kelime kontrolü | Judge Ensemble skorlama |
| Çıktı analizi | `utils/analysis.ts` — `getOutputAnalysis` | Skor kartı + kriter breakdown |
| Öneri havuzu | `suggestionPool.ts` — localStorage | Kalibrasyon verisi kaynağı |
| Telemetri | `telemetry.ts` — edit, copy, feedback_add | Kalibrasyon pipeline entegrasyonu |

---

## 7. Uygulama Önceliği

1. **MVP:** 5 kriterlik skor kartı (tek LLM çağrısı, çoklu kriter prompt’u).
2. **V2:** Uyuşmazlık tespiti + 1 iterasyon revize döngüsü.
3. **V3:** Kalibrasyon verisi toplama (was_edited, feedback_add, regenerate).
4. **V4:** Batch kalibrasyon (ağırlık/eşik güncelleme).

---

**PROPRIETARY | SUPER REASONING — Judge Ensemble Tasarımı**
