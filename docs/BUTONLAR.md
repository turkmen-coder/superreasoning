# Super Reasoning V4.0 — Buton & Kontrol Rehberi

> Uygulamadaki tum etkilesimli butonlarin ve kontrollerin aciklamasi.
> Toplam: **93+ etkilesimli eleman**

---

## 1. SIDEBAR (Sol Menu)

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 1 | **Dashboard** | `components/Sidebar.tsx` | Ana kontrol paneline gecis yapar |
| 2 | **Prompt Kutuphanesi** | `components/Sidebar.tsx` | Prompt kutuphanesi sayfasina gecis yapar |
| 3 | **Agent Zincirleri** | `components/Sidebar.tsx` | Agent pipeline sayfasina gecis yapar |
| 4 | **Analitik** | `components/Sidebar.tsx` | Analitik & istatistik sayfasina gecis yapar |
| 5 | **Ayarlar** | `components/Sidebar.tsx` | AI saglayici ve model ayarlari sayfasina gecis yapar |
| 6 | **Compute Power Slider** | `components/Sidebar.tsx` | Islem gucu yuzdesini ayarlar (0-100%) |

---

## 2. UST MENU (Dashboard Header)

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 7 | **EN / TR** | `components/DashboardHeader.tsx` | Dil degistirir (Ingilizce <-> Turkce) |
| 8 | **Kullanici Avatari** | `components/DashboardHeader.tsx` | Oturumu kapatir (Sign Out) |
| 9 | **Arama Kutusu** | `components/DashboardHeader.tsx` | Arayuzde arama (placeholder) |

---

## 3. GIRDI PANELI (Input)

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 10 | **Sablon Sec (Template)** | `components/TemplateSelector.tsx` | Hazir sablonlardan birini yukler; intent, domain ve framework otomatik dolar |
| 11 | **Upload (yukari ok ikonu)** | `App.tsx` | Dosya yukler (resim, PDF, metin — maks 3 dosya) |
| 12 | **Save (disket ikonu)** | `App.tsx` | Kaydet butonu (placeholder) |
| 13 | **X (Attachment sil)** | `App.tsx` | Yuklenen dosyayi kaldirir |
| 14 | **Generate Prompt** | `App.tsx` | Master prompt uretimini baslatir, onay modali acar |
| 15 | **Ctrl+Enter** | `App.tsx` | Generate Prompt klavye kisayolu |

---

## 4. DOMAIN SECICI (8 Kart)

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 16 | **Auto** | `components/DomainSelector.tsx` | Otomatik domain tespiti |
| 17 | **General** | `components/DomainSelector.tsx` | Genel amacli prompt |
| 18 | **Frontend** | `components/DomainSelector.tsx` | Frontend/React gelistirme odakli |
| 19 | **Backend** | `components/DomainSelector.tsx` | Backend/API/DB odakli |
| 20 | **Testing** | `components/DomainSelector.tsx` | QA & guvenlik testi odakli |
| 21 | **UI Design** | `components/DomainSelector.tsx` | UI/UX tasarim odakli |
| 22 | **Architecture** | `components/DomainSelector.tsx` | Yazilim mimari odakli |
| 23 | **Analysis** | `components/DomainSelector.tsx` | Is analizi & gereksinim muhendisligi odakli |

---

## 5. FRAMEWORK SECICI (4 Radio Buton)

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 24 | **RISEN** | `components/FrameworkSelector.tsx` | Role, Input, Steps, Expectation, Narrowing — yapisal gorevler icin |
| 25 | **RTF** | `components/FrameworkSelector.tsx` | Role, Task, Format — hizli ve kisa hizalama |
| 26 | **BAB** | `components/FrameworkSelector.tsx` | Before, After, Bridge — donusum senaryolari icin |
| 27 | **TAG** | `components/FrameworkSelector.tsx` | Task, Action, Goal — mantik odakli yurutme |

---

## 6. ONAY MODALI (Confirmation)

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 28 | **X (Kapat)** | `components/ConfirmationModal.tsx` | Modali kapatir, uretim iptal |
| 29 | **Iptal** | `components/ConfirmationModal.tsx` | Modali kapatir |
| 30 | **Onayla / Confirm** | `components/ConfirmationModal.tsx` | Prompt uretimini baslatir |

---

## 7. SONUC PANELI (Output Terminal & Result Display)

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 31 | **Edit** | `components/ResultDisplay.tsx` | Ciktiyi duzenleme moduna alir (textarea olur) |
| 32 | **Done** | `components/ResultDisplay.tsx` | Duzenlemeyi bitirir, degisiklikleri kaydeder |
| 33 | **Copy** | `components/ResultDisplay.tsx` | Master prompt'u panoya kopyalar |
| 34 | **Copy Master Prompt** | `components/ResultDisplay.tsx` | Buyuk kopyalama butonu (ayni islev) |
| 35 | **Add to Pool** | `components/ResultDisplay.tsx` | Prompt'u havuza ekler (onay ile) |
| 36 | **Retry** | `App.tsx` | Hata durumunda uretimi tekrar dener |

---

## 8. KALITE PANELI (Quality)

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 37 | **Quality (acar/kapatir)** | `App.tsx` | Judge + Lint + Budget sonuclarini gosterir/gizler |

---

## 9. ENHANCE PANELI (Prompt Gelistirici)

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 38 | **KALITEYI YUKSELT** | `components/EnhancePanel.tsx` | Python enhancer'i calistirir, eksik bolumleri analiz eder |
| 39 | **ONIZLEME / PREVIEW** | `components/EnhancePanel.tsx` | Gelistirilmis prompt'un onizlemesini gosterir/gizler |
| 40 | **GELISTIRILMIS PROMPTU UYGULA** | `components/EnhancePanel.tsx` | Enhanced prompt'u ana sonuca uygular ve skorlari gunceller |

### Enhance Akisi
```
1. Kullanici "KALITEYI YUKSELT" tiklar
2. Backend POST /api/v1/enhance cagrilir
3. Python prompt_enhancer.py eksik bolumleri analiz eder
4. Sonuc: degisiklik listesi, onceki/sonraki analiz, tahmini puan artisi
5. "ONIZLEME" ile sonuc goruntulenir
6. "UYGULA" ile master prompt guncellenir ve Judge/Lint yeniden calisir
```

---

## 10. BENCHMARK PANELI

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 41 | **OTOMATIK BENCHMARK (acar/kapatir)** | `components/BenchmarkPanel.tsx` | Paneli acar/kapatir |
| 42 | **BENCHMARK CALISTIR** | `components/BenchmarkPanel.tsx` | Judge + Lint + Budget analizlerini paralel calistirir |

### Benchmark Ciktilari
- **Judge Score**: 5 kriter uzerinden agirlikli toplam (0-100)
- **Lint Result**: Hata/uyari sayisi
- **Budget Analysis**: Token/maliyet tahmini

---

## 11. VERSIYON GECMISI

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 43 | **VERSIYON GECMISI (acar/kapatir)** | `components/VersionHistoryPanel.tsx` | Paneli acar, versiyonlari yukler |
| 44 | **Goster / Gizle** | `components/VersionHistoryPanel.tsx` | Bir versiyonun tam icerigini gosterir/gizler |
| 45 | **Geri Yukle** | `components/VersionHistoryPanel.tsx` | Eski bir versiyonu geri yukler |
| 46 | **DIFF** | `components/VersionHistoryPanel.tsx` | Iki versiyon arasindaki farklari gosterir |
| 47 | **V1 / V2 Dropdown** | `components/VersionHistoryPanel.tsx` | Karsilastirilacak versiyonlari secer |

---

## 12. OZEL DOMAIN / FRAMEWORK OLUSTURUCU

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 48 | **DOMAINLER tab** | `components/CustomBuilderPanel.tsx` | Ozel domain listesine gecer |
| 49 | **FRAMEWORKLER tab** | `components/CustomBuilderPanel.tsx` | Ozel framework listesine gecer |
| 50 | **Emoji secici (16 ikon)** | `components/CustomBuilderPanel.tsx` | Ozel domain/framework icin ikon secer |
| 51 | **DOMAIN KAYDET** | `components/CustomBuilderPanel.tsx` | Yeni ozel domain'i API'ye kaydeder |
| 52 | **FRAMEWORK KAYDET** | `components/CustomBuilderPanel.tsx` | Yeni ozel framework'u API'ye kaydeder |
| 53 | **X (Sil)** | `components/CustomBuilderPanel.tsx` | Ozel domain veya framework'u siler |

---

## 13. AYARLAR SAYFASI

### AI Saglayici Secimi

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 54 | **HF (HuggingFace)** | `App.tsx` | HuggingFace saglayicisini secer (ucretsiz) |
| 55 | **Groq** | `App.tsx` | Groq saglayicisini secer (hizli) |
| 56 | **Gemini** | `App.tsx` | Google Gemini saglayicisini secer |
| 57 | **Claude** | `App.tsx` | Anthropic Claude saglayicisini secer |
| 58 | **OpenRouter** | `App.tsx` | OpenRouter saglayicisini secer (coklu model) |

### Model Secimi

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 59 | **Sonnet** | `App.tsx` | Claude Sonnet modelini secer |
| 60 | **Opus 4.6** | `App.tsx` | Claude Opus modelini secer (en guclu) |
| 61 | **OpenRouter Model Dropdown** | `App.tsx` | OpenRouter modelini secer |

### Mod Butonlari

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 62 | **Thinking** | `App.tsx` | Dusunme modunu acar/kapatir (Gemini & Claude) |
| 63 | **Search** | `App.tsx` | Web arama modunu acar/kapatir (Gemini & Claude) |

---

## 14. WORKFLOW PANELI

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 64 | **Workflow Preset Dropdown** | `components/WorkflowPanel.tsx` | Is akisi sablonu secer (quick, detailed vb.) |
| 65 | **Run Workflow** | `components/WorkflowPanel.tsx` | Secili is akisini calistirir |

---

## 15. STIL PROFIL YONETICISI

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 66 | **+ Yeni Profil** | `components/StyleProfileManager.tsx` | Yeni stil profili olusturma formunu acar |
| 67 | **Profil Olustur** | `components/StyleProfileManager.tsx` | Stil profilini kaydeder |
| 68 | **Iptal** | `components/StyleProfileManager.tsx` | Profil formunu kapatir |
| 69 | **Profili Kullan** | `components/StyleProfileManager.tsx` | Bir stil profilini aktif eder |
| 70 | **+/- (Genislet)** | `components/StyleProfileManager.tsx` | Profil detaylarini acar/kapatir |
| 71 | **SIL** | `components/StyleProfileManager.tsx` | Stil profilini siler |
| 72 | **+ Ornek Ekle** | `components/StyleProfileManager.tsx` | Stil profiline ornek ekler |
| 73 | **Ornek Kaydet** | `components/StyleProfileManager.tsx` | Ornegi kaydeder |

---

## 16. API ENTEGRASYON PANELI

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 74 | **Health Check** | `components/ApiIntegrationPanel.tsx` | API sunucusunun durumunu kontrol eder |
| 75 | **API Key Dogrula** | `components/ApiIntegrationPanel.tsx` | Girilen API anahtarini dogrular |
| 76 | **Promptlari Getir** | `components/ApiIntegrationPanel.tsx` | Kaydedilmis promptlari API'den ceker |

---

## 17. ANALITIK SAYFASI

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 77 | **Analitik Verilerini Topla (checkbox)** | `App.tsx` | Telemetri veri toplamayi acar/kapatir |

---

## 18. AUTH (Giris/Kayit)

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 78 | **Giris Yap / Login** | `components/AuthPage.tsx` | Hesaba giris yapar |
| 79 | **Kayit Ol / Register** | `components/AuthPage.tsx` | Yeni hesap olusturur |
| 80 | **Login <-> Register** | `components/AuthPage.tsx` | Giris/kayit formlari arasinda gecis |

---

## 19. ODEME SAYFASI (Pricing)

| # | Buton | Dosya | Islev |
|---|-------|-------|-------|
| 81 | **Geri** | `components/PricingPage.tsx` | Odeme sayfasindan geri doner |
| 82 | **Sign Out** | `components/PricingPage.tsx` | Oturumu kapatir |
| 83 | **SUBSCRIBE (Free)** | `components/PricingPage.tsx` | Ucretsiz plan (mevcut plan ise devre disi) |
| 84 | **SUBSCRIBE (Pro)** | `components/PricingPage.tsx` | Stripe odeme sayfasina yonlendirir |

---

## 20. AGENT PIPELINE (Gorsel)

| # | Eleman | Dosya | Islev |
|---|--------|-------|-------|
| 85 | **Prompt Gen** | `components/AgentPipeline.tsx` | Pipeline 1. adim — prompt uretimi (gorsel gosterge) |
| 86 | **Test & Validation** | `components/AgentPipeline.tsx` | Pipeline 2. adim — test ve dogrulama (gorsel gosterge) |
| 87 | **Refine** | `components/AgentPipeline.tsx` | Pipeline 3. adim — iyilestirme (gorsel gosterge) |

> Not: Agent Pipeline butonlari tiklanabilir degil, pipeline durumunu gorsel olarak gosterir.

---

## KLAVYE KISAYOLLARI

| Kisayol | Islev |
|---------|-------|
| `Ctrl + Enter` | Generate Prompt (uretimi baslatir) |

---

## TEKNIK NOTLAR

### API Endpointleri (Butonlarin Baglandigi)

| Endpoint | Buton | Metod |
|----------|-------|-------|
| `/api/v1/enhance` | Kaliteyi Yukselt | POST |
| `/api/v1/judge` | Benchmark (Judge) | POST |
| `/api/v1/lint` | Benchmark (Lint) | POST |
| `/api/v1/budget` | Benchmark (Budget) | POST |
| `/api/v1/cache/stats` | Cache Status | GET |
| `/api/v1/cache/clear` | Cache Temizle | POST |
| `/api/v1/audit` | Audit Log | GET |
| `/api/v1/domains/custom` | Domain Kaydet | POST |
| `/api/v1/frameworks/custom` | Framework Kaydet | POST |
| `/api/v1/versions` | Versiyon Gecmisi | GET |
| `/api/v1/versions/diff` | Versiyon Diff | POST |
| `/api/health` | Health Check | GET |

### Judge V3 Skorlama Kriterleri (Kalite Paneli)

| Kriter | Agirlik | Analiz Edilen |
|--------|---------|---------------|
| Clarity (Netlik) | %25 | Yapi, hedefler, kisitlar, cikti formati |
| Testability (Test Edilebilirlik) | %20 | Basari kriterleri, ornekler, durdurma kosullari |
| Constraint Compliance (Kisit Uyumu) | %25 | Domain/framework uyumu, rol tanimi, dil |
| Security (Guvenlik) | %15 | Guardrail'ler, injection savunmasi, PII koruma |
| Reproducibility (Tekrar Uretilebilirlik) | %15 | Determinizm, yapi tutarliligi, butce kisitlari |

Gecme esigi: **65/100**
