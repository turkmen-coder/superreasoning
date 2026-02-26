# WCAG 2.1 AA Erişilebilirlik Kontrol Listesi

Super Reasoning frontend (Vite/React) için WCAG 2.1 AA uyumluluk checklist'i. Vercel/Netlify deploy öncesi kontrol edin.

---

## 1. Algılanabilirlik (Perceivable)

### 1.1 Metin Alternatifi

| # | Kriter | Durum | Not |
|---|--------|-------|-----|
| 1.1.1 | Görsellerde `alt` metni | ☐ | İçerik görselleri için anlamlı alt; dekoratif için `alt=""` |
| 1.1.1 | İkonlarda `aria-hidden="true"` veya `aria-label` | ☐ | Sadece dekoratif ise aria-hidden |

### 1.2 Zaman Tabanlı Medya

| # | Kriter | Durum | Not |
|---|--------|-------|-----|
| 1.2.1 | Sadece ses: alternatif (transkript) | ☐ | Uygulama video/audio içermiyorsa N/A |
| 1.2.2 | Altyazı | ☐ | N/A |

### 1.3 Uyarlanabilir

| # | Kriter | Durum | Not |
|---|--------|-------|-----|
| 1.3.1 | Bilgi ve ilişkiler (semantik HTML) | ☐ | `header`, `main`, `nav`, `section`, `footer` kullanımı |
| 1.3.2 | Anlamlı sıra | ☐ | DOM sırası mantıklı; CSS ile görsel sıra değişebilir |
| 1.3.3 | Duyusal özellikler | ☐ | "Yeşil butona tıkla" yerine "Onayla butonuna tıkla" |

### 1.4 Ayırt Edilebilir

| # | Kriter | Durum | Not |
|---|--------|-------|-----|
| 1.4.1 | Renk kullanımı | ☐ | Bilgi sadece renkle iletiliyorsa başka ipucu da olmalı |
| 1.4.3 | Kontrast (minimum) | ☐ | Normal metin 4.5:1, büyük metin 3:1 |
| 1.4.4 | Metin yeniden boyutlandırma | ☐ | 200% zoom'da işlevsellik bozulmamalı |
| 1.4.10 | Yeniden akış | ☐ | 320px genişlikte yatay scroll olmamalı |
| 1.4.11 | Görsel sunum | ☐ | UI bileşenleri en az 44×44 CSS px |

---

## 2. Kullanılabilirlik (Operable)

### 2.1 Klavye Erişilebilirliği

| # | Kriter | Durum | Not |
|---|--------|-------|-----|
| 2.1.1 | Klavye | ☐ | Tüm işlevler klavye ile erişilebilir |
| 2.1.2 | Klavye tuzakları yok | ☐ | Modal'da Tab ile çıkış mümkün; Esc kapanır |
| 2.1.4 | Kısayol tuşları | ☐ | Tek tuş kısayolu varsa kapatılabilir veya değiştirilebilir |

### 2.2 Yeterli Zaman

| # | Kriter | Durum | Not |
|---|--------|-------|-----|
| 2.2.1 | Zaman ayarı | ☐ | Otomatik yenileme/süre sınırı varsa devre dışı bırakılabilir |
| 2.2.2 | Duraklat, Durdur, Gizle | ☐ | Hareketli içerik durdurulabilir |

### 2.4 Navigasyon

| # | Kriter | Durum | Not |
|---|--------|-------|-----|
| 2.4.1 | Blokları atla | ☐ | "Ana içeriğe atla" linki (skip link) |
| 2.4.2 | Sayfa başlığı | ☐ | `<title>` anlamlı ve güncel |
| 2.4.3 | Odak sırası | ☐ | Tab sırası mantıklı |
| 2.4.4 | Bağlantı amacı | ☐ | "Buraya tıkla" yerine açıklayıcı metin |
| 2.4.6 | Başlıklar ve etiketler | ☐ | Form alanları `<label>`, bölümler `heading` |
| 2.4.7 | Görünür odak | ☐ | `:focus-visible` ile 2px outline; outline-offset |

### 2.5 Giriş Modaliteleri

| # | Kriter | Durum | Not |
|---|--------|-------|-----|
| 2.5.1 | İşaretçi hareketleri | ☐ | Tek hareketle zorunlu işlem yok |
| 2.5.2 | İşaretçi iptali | ☐ | Tıklamada down + up gerekli |
| 2.5.3 | Etiketleme | ☐ | Form alanları doğru etiketli |

---

## 3. Anlaşılabilirlik (Understandable)

### 3.1 Okunabilir

| # | Kriter | Durum | Not |
|---|--------|-------|-----|
| 3.1.1 | Sayfa dili | ☐ | `<html lang="tr">` veya `lang="en"` |
| 3.1.2 | Dil değişikliği | ☐ | Dil değişen bölümlerde `lang` attr |

### 3.2 Öngörülebilir

| # | Kriter | Durum | Not |
|---|--------|-------|-----|
| 3.2.1 | Odakta | ☐ | Odak değişince beklenmedik bağlam değişimi yok |
| 3.2.2 | Girdide | ☐ | Girdi yapınca otomatik submit vb. yok |
| 3.2.4 | Tutarlı tanımlama | ☐ | Aynı işlev için aynı etiket/ikon |

### 3.3 Girdi Yardımı

| # | Kriter | Durum | Not |
|---|--------|-------|-----|
| 3.3.1 | Hata tanımlama | ☐ | Hata mesajları açık ve ilgili alana bağlı |
| 3.3.2 | Etiketler veya talimatlar | ☐ | Gerekli alanlar `required`, `aria-required` |
| 3.3.3 | Hata düzeltme önerisi | ☐ | Geçersiz girdide ne yapılacağı belirtilmeli |

---

## 4. Sağlamlık (Robust)

### 4.1 Uyumluluk

| # | Kriter | Durum | Not |
|---|--------|-------|-----|
| 4.1.1 | Ayrıştırma | ☐ | Geçerli HTML (id benzersiz, tag'ler kapalı) |
| 4.1.2 | İsim, Rol, Değer | ☐ | Özel widget'lar ARIA ile tanımlı |
| 4.1.3 | Durum mesajları | ☐ | Dinamik içerik için `aria-live` |

---

## 5. Otomatik Test Araçları

| Araç | Kullanım |
|------|----------|
| **axe DevTools** | Tarayıcı uzantısı; sayfa taraması |
| **Lighthouse** | Chrome DevTools → Lighthouse → Accessibility |
| **WAVE** | [wave.webaim.org](https://wave.webaim.org) |
| **pa11y** | CI/CD: `npx pa11y http://localhost:3000` |

---

## 6. Super Reasoning Özel Kontroller

| Bileşen | Kontrol |
|---------|---------|
| Skip link | `.skip-link` var mı, focus'ta görünüyor mu? |
| Modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| Form alanları | `id` + `htmlFor` veya `aria-label` |
| Canlı bölge | `aria-live="polite"` işlem durumu için |
| `prefers-reduced-motion` | Animasyonlar azaltılmış mı? |
| Renk kontrastı | cyber-primary (#00f0ff) vs cyber-black (#050505) — hesapla |

---

## 7. Deploy Öncesi Kontrol

```bash
# Lighthouse (Headless)
npx lighthouse http://localhost:3000 --only-categories=accessibility --output=html

# pa11y
npx pa11y http://localhost:3000 --standard WCAG2AA
```

Tüm kriterler geçtikten sonra production'a deploy edin.

---

**PROPRIETARY | SUPER REASONING v2.2**
