# IR (Intermediate Representation) Pipeline

Prompt'u metin değil, derlenebilir spesifikasyon olarak ele alan mimari.

## Akış

```
Niyet (metin) → IR Çıkarıcı → IR (JSON benzeri yapı) → Provider Derleyici → Model'e özel prompt
```

## Bileşenler

| Dosya | Rol |
|-------|-----|
| `types/ir.ts` | IR şema tipleri (goals, constraints, format_schema, security_policies, vb.) |
| `services/irExtractor.ts` | Niyet + framework + domain → IR (kural tabanlı) |
| `server/lib/compilers/irToPrompt.ts` | IR → system/user metinleri |
| `server/lib/compilers/index.ts` | Provider'a göre derleme yönlendirmesi |
| `server/lib/generateAdapter.ts` | IR pipeline entegrasyonu |

## IR Şeması

- **goals:** Amaçlar (öncelik sırasıyla)
- **constraints:** format, scope, budget, security, output kuralları
- **format_schema:** reasoning + master_prompt bölüm yapısı
- **security_policies:** Yetkisiz talimat yok sayma, eksik bilgide durma
- **stop_conditions:** Alan belirlenmeden çıktı üretmeme
- **examples:** (opsiyonel) Alan bazlı örnekler

## Kullanım

Varsayılan: IR pipeline aktif. `/v1/generate` ve runs API bu pipeline'ı kullanır.

Devre dışı bırakmak için:
```env
SR_USE_IR=false
```

## Kazançlar

- **Taşınabilirlik:** Aynı IR → Claude, Gemini, Groq, HF için optimize edilmiş prompt
- **Determinizm:** Kısıtlar ve şema IR'de sabit; model değişse bile davranış daha tutarlı
- **Bakım:** IR güncellemesi → tüm modeller otomatik etkilenir
