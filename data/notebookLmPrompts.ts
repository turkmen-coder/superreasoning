/**
 * NotebookLM Prompt Kütüphanesi
 * Google NotebookLM (Chat + Studio) için optimize edilmiş prompt koleksiyonu.
 * Kaynak: Resmi dokümantasyon + web derlemesi
 */

export interface NotebookLmPrompt {
  id: string;
  category: string;
  categoryEn: string;
  name: string;
  nameEn: string;
  prompt: string;
  promptEn: string;
  tags: string[];
}

export const NOTEBOOKLM_PROMPTS: NotebookLmPrompt[] = [
  // ═══════════════════════════════════════════════════════════
  // 1) ALTIN KURAL — Hallucination Azaltan Prompt Ekleri
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-gold-source',
    category: 'Altın Kural',
    categoryEn: 'Golden Rules',
    name: 'Kaynak Disiplini',
    nameEn: 'Source Discipline',
    prompt: 'Sadece seçili kaynakları kullan. Kaynakta yoksa "Kaynaklarda geçmiyor" de.',
    promptEn: 'Sadece seçili kaynakları kullan. Kaynakta yoksa "Kaynaklarda geçmiyor" de.',
    tags: ['hallucination', 'kaynak', 'doğruluk'],
  },
  {
    id: 'nlm-gold-evidence',
    category: 'Altın Kural',
    categoryEn: 'Golden Rules',
    name: 'Kanıt Formatı',
    nameEn: 'Evidence Format',
    prompt: 'Her önemli iddia için tıklanabilir alıntı/citation ekle; mümkünse ilgili cümleyi kısa alıntıla (≤ 20 kelime).',
    promptEn: 'Her önemli iddia için tıklanabilir alıntı/citation ekle; mümkünse ilgili cümleyi kısa alıntıla (≤ 20 kelime).',
    tags: ['citation', 'alıntı', 'kanıt'],
  },
  {
    id: 'nlm-gold-uncertainty',
    category: 'Altın Kural',
    categoryEn: 'Golden Rules',
    name: 'Belirsizlik Yönetimi',
    nameEn: 'Uncertainty Management',
    prompt: 'Emin olmadığın noktaları madde madde "Belirsiz/Varsayım" diye işaretle.',
    promptEn: 'Emin olmadığın noktaları madde madde "Belirsiz/Varsayım" diye işaretle.',
    tags: ['belirsizlik', 'doğruluk', 'varsayım'],
  },
  {
    id: 'nlm-gold-output',
    category: 'Altın Kural',
    categoryEn: 'Golden Rules',
    name: 'Çıktı Standardı',
    nameEn: 'Output Standard',
    prompt: 'Cevabı: (1) Kısa özet, (2) Detay, (3) Kaynaklara dayalı alıntılar tablosu şeklinde ver.',
    promptEn: 'Cevabı: (1) Kısa özet, (2) Detay, (3) Kaynaklara dayalı alıntılar tablosu şeklinde ver.',
    tags: ['format', 'yapı', 'standart'],
  },

  // ═══════════════════════════════════════════════════════════
  // 2) ÖZET / ÇIKARIM PROMPTLARI
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-summary-exec',
    category: 'Özet / Çıkarım',
    categoryEn: 'Summary / Extraction',
    name: 'Yönetici Özeti',
    nameEn: 'Executive Summary',
    prompt: 'Bu kaynaklardan 8 maddeyi geçmeyen bir yönetici özeti çıkar. Her maddeye citation ekle.',
    promptEn: 'Bu kaynaklardan 8 maddeyi geçmeyen bir yönetici özeti çıkar. Her maddeye citation ekle.',
    tags: ['özet', 'yönetici', 'executive'],
  },
  {
    id: 'nlm-summary-tldr',
    category: 'Özet / Çıkarım',
    categoryEn: 'Summary / Extraction',
    name: 'TL;DR + Kritik Detaylar',
    nameEn: 'TL;DR + Critical Details',
    prompt: "Önce 5 satırlık TL;DR, sonra 'Kritik detaylar' (en fazla 10 madde). Her madde citation'lı.",
    promptEn: "Önce 5 satırlık TL;DR, sonra 'Kritik detaylar' (en fazla 10 madde). Her madde citation'lı.",
    tags: ['özet', 'tldr', 'detay'],
  },
  {
    id: 'nlm-summary-concept',
    category: 'Özet / Çıkarım',
    categoryEn: 'Summary / Extraction',
    name: 'Kavram Çerçevesi',
    nameEn: 'Concept Framework',
    prompt: 'Konuyu (a) Tanımlar, (b) Ana tezler, (c) Kanıtlar, (d) Karşı argümanlar şeklinde şemala.',
    promptEn: 'Konuyu (a) Tanımlar, (b) Ana tezler, (c) Kanıtlar, (d) Karşı argümanlar şeklinde şemala.',
    tags: ['kavram', 'çerçeve', 'analiz'],
  },
  {
    id: 'nlm-summary-changelog',
    category: 'Özet / Çıkarım',
    categoryEn: 'Summary / Extraction',
    name: '"Ne Değişti?" Özeti',
    nameEn: '"What Changed?" Summary',
    prompt: "Bu dokümanda önceki yaklaşıma göre neler değişmiş? 'Değişiklik → Etki → Kanıt' tablosu yap.",
    promptEn: "Bu dokümanda önceki yaklaşıma göre neler değişmiş? 'Değişiklik → Etki → Kanıt' tablosu yap.",
    tags: ['değişiklik', 'changelog', 'karşılaştırma'],
  },
  {
    id: 'nlm-summary-section',
    category: 'Özet / Çıkarım',
    categoryEn: 'Summary / Extraction',
    name: 'Belirli Bölüm Özeti',
    nameEn: 'Specific Section Summary',
    prompt: "Yalnızca 'Results/Findings' ve 'Discussion' kısımlarını özetle; geri kalanı es geç.",
    promptEn: "Yalnızca 'Results/Findings' ve 'Discussion' kısımlarını özetle; geri kalanı es geç.",
    tags: ['bölüm', 'seçici', 'findings'],
  },

  // ═══════════════════════════════════════════════════════════
  // 3) SINAV / ÖĞRENME PROMPTLARI
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-learn-note',
    category: 'Sınav / Öğrenme',
    categoryEn: 'Exam / Learning',
    name: 'Tek Sayfa Ders Notu',
    nameEn: 'One-Page Study Note',
    prompt: 'Bu kaynaklardan A4 tek sayfalık ders özeti hazırla: başlıklar + kısa açıklamalar + örnekler.',
    promptEn: 'Bu kaynaklardan A4 tek sayfalık ders özeti hazırla: başlıklar + kısa açıklamalar + örnekler.',
    tags: ['ders', 'not', 'özet'],
  },
  {
    id: 'nlm-learn-recall',
    category: 'Sınav / Öğrenme',
    categoryEn: 'Exam / Learning',
    name: 'Aktif Hatırlama Soruları',
    nameEn: 'Active Recall Questions',
    prompt: "20 adet aktif-hatırlama sorusu üret (kolay→zor). Cevap anahtarını en alta ekle; her cevaba citation.",
    promptEn: "20 adet aktif-hatırlama sorusu üret (kolay→zor). Cevap anahtarını en alta ekle; her cevaba citation.",
    tags: ['soru', 'sınav', 'hatırlama'],
  },
  {
    id: 'nlm-learn-flashcard',
    category: 'Sınav / Öğrenme',
    categoryEn: 'Exam / Learning',
    name: 'Flashcard Üretici',
    nameEn: 'Flashcard Generator',
    prompt: "30 flashcard üret: Ön yüz 'Soru/Kavram', arka yüz 'Kısa cevap + 1 örnek + citation'.",
    promptEn: "30 flashcard üret: Ön yüz 'Soru/Kavram', arka yüz 'Kısa cevap + 1 örnek + citation'.",
    tags: ['flashcard', 'öğrenme', 'kartlar'],
  },
  {
    id: 'nlm-learn-misconception',
    category: 'Sınav / Öğrenme',
    categoryEn: 'Exam / Learning',
    name: 'Yanılgı Avcısı',
    nameEn: 'Misconception Hunter',
    prompt: 'Bu konuda öğrencilerin yaptığı 10 yaygın hatayı çıkar; her biri için doğru açıklamayı kaynakla destekle.',
    promptEn: 'Bu konuda öğrencilerin yaptığı 10 yaygın hatayı çıkar; her biri için doğru açıklamayı kaynakla destekle.',
    tags: ['yanılgı', 'hata', 'düzeltme'],
  },
  {
    id: 'nlm-learn-feynman',
    category: 'Sınav / Öğrenme',
    categoryEn: 'Exam / Learning',
    name: 'Feynman Testi',
    nameEn: 'Feynman Test',
    prompt: 'Konuyu 12 yaşındaki birine anlatır gibi sadeleştir; sonra aynı içeriği üniversite düzeyinde tekrar anlat.',
    promptEn: 'Konuyu 12 yaşındaki birine anlatır gibi sadeleştir; sonra aynı içeriği üniversite düzeyinde tekrar anlat.',
    tags: ['feynman', 'basitleştirme', 'seviye'],
  },

  // ═══════════════════════════════════════════════════════════
  // 4) ARAŞTIRMA / LİTERATÜR TARAMASI
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-research-consensus',
    category: 'Araştırma / Literatür',
    categoryEn: 'Research / Literature',
    name: 'Uzlaşı / İhtilaf / Boşluk',
    nameEn: 'Consensus / Conflict / Gap',
    prompt: "Kaynakların (a) üzerinde uzlaştığı, (b) çeliştiği, (c) eksik bıraktığı noktaları çıkar. Her madde citation'lı.",
    promptEn: "Kaynakların (a) üzerinde uzlaştığı, (b) çeliştiği, (c) eksik bıraktığı noktaları çıkar. Her madde citation'lı.",
    tags: ['uzlaşı', 'çelişki', 'boşluk'],
  },
  {
    id: 'nlm-research-matrix',
    category: 'Araştırma / Literatür',
    categoryEn: 'Research / Literature',
    name: 'İddia–Kanıt Matrisi',
    nameEn: 'Claim–Evidence Matrix',
    prompt: "Her satır bir 'iddia' olsun: İddia | Kanıt (kısa alıntı) | Kaynak/citation | Güç (zayıf/orta/güçlü).",
    promptEn: "Her satır bir 'iddia' olsun: İddia | Kanıt (kısa alıntı) | Kaynak/citation | Güç (zayıf/orta/güçlü).",
    tags: ['matris', 'iddia', 'kanıt'],
  },
  {
    id: 'nlm-research-question',
    category: 'Araştırma / Literatür',
    categoryEn: 'Research / Literature',
    name: 'Araştırma Sorusu Netleştirme',
    nameEn: 'Research Question Refinement',
    prompt: 'Bu kaynaklara göre araştırma sorumu 3 alternatifle yeniden yaz: dar, orta, geniş kapsam.',
    promptEn: 'Bu kaynaklara göre araştırma sorumu 3 alternatifle yeniden yaz: dar, orta, geniş kapsam.',
    tags: ['soru', 'kapsam', 'netleştirme'],
  },
  {
    id: 'nlm-research-method',
    category: 'Araştırma / Literatür',
    categoryEn: 'Research / Literature',
    name: 'Metodoloji Karşılaştırması',
    nameEn: 'Methodology Comparison',
    prompt: 'Çalışmaların yöntemlerini karşılaştır: örneklem, ölçüm, sınırlılıklar, bias riskleri.',
    promptEn: 'Çalışmaların yöntemlerini karşılaştır: örneklem, ölçüm, sınırlılıklar, bias riskleri.',
    tags: ['metodoloji', 'karşılaştırma', 'yöntem'],
  },
  {
    id: 'nlm-research-paragraph',
    category: 'Araştırma / Literatür',
    categoryEn: 'Research / Literature',
    name: 'Alıntılanabilir Paragraf',
    nameEn: 'Citable Paragraph',
    prompt: "Bu kaynaklara dayanarak (akademik ton) 1 paragraf 'background' yaz; cümle sonlarında citation ver.",
    promptEn: "Bu kaynaklara dayanarak (akademik ton) 1 paragraf 'background' yaz; cümle sonlarında citation ver.",
    tags: ['akademik', 'paragraf', 'background'],
  },

  // ═══════════════════════════════════════════════════════════
  // 5) YAZMA / DÜZENLEME PROMPTLARI
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-write-outline',
    category: 'Yazma / Düzenleme',
    categoryEn: 'Writing / Editing',
    name: 'Makale İskeleti (Outline)',
    nameEn: 'Article Outline',
    prompt: "Şu başlıkla bir makale/rapor iskeleti çıkar: Giriş–Yöntem–Bulgular–Tartışma–Sonuç; her bölüm altına bullet'lar + citation.",
    promptEn: "Şu başlıkla bir makale/rapor iskeleti çıkar: Giriş–Yöntem–Bulgular–Tartışma–Sonuç; her bölüm altına bullet'lar + citation.",
    tags: ['iskelet', 'outline', 'makale'],
  },
  {
    id: 'nlm-write-argument',
    category: 'Yazma / Düzenleme',
    categoryEn: 'Writing / Editing',
    name: 'Argüman Güçlendirme',
    nameEn: 'Argument Strengthening',
    prompt: "Bu tezi destekleyen 5 kanıt ve 3 karşı argüman çıkar; her biri citation'lı.",
    promptEn: "Bu tezi destekleyen 5 kanıt ve 3 karşı argüman çıkar; her biri citation'lı.",
    tags: ['argüman', 'tez', 'kanıt'],
  },
  {
    id: 'nlm-write-tone',
    category: 'Yazma / Düzenleme',
    categoryEn: 'Writing / Editing',
    name: 'Ton Dönüşümü',
    nameEn: 'Tone Transformation',
    prompt: 'Aynı içeriği (a) teknik ekip, (b) yönetim, (c) müşteri için ayrı ayrı yeniden çerçevele.',
    promptEn: 'Aynı içeriği (a) teknik ekip, (b) yönetim, (c) müşteri için ayrı ayrı yeniden çerçevele.',
    tags: ['ton', 'hedef kitle', 'dönüşüm'],
  },

  // ═══════════════════════════════════════════════════════════
  // 6) TOPLANTI / AKSİYON / PROJE
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-project-actions',
    category: 'Toplantı / Proje',
    categoryEn: 'Meeting / Project',
    name: 'Aksiyon Maddeleri',
    nameEn: 'Action Items',
    prompt: "Kararları ve aksiyon maddelerini çıkar: Aksiyon | Sorumlu | Tarih | Risk | Citation.",
    promptEn: "Kararları ve aksiyon maddelerini çıkar: Aksiyon | Sorumlu | Tarih | Risk | Citation.",
    tags: ['aksiyon', 'toplantı', 'karar'],
  },
  {
    id: 'nlm-project-risk',
    category: 'Toplantı / Proje',
    categoryEn: 'Meeting / Project',
    name: 'Risk Kaydı',
    nameEn: 'Risk Register',
    prompt: "Bu kaynaklara göre proje risklerini listele: Risk | Olasılık | Etki | Azaltım | Kanıt/citation.",
    promptEn: "Bu kaynaklara göre proje risklerini listele: Risk | Olasılık | Etki | Azaltım | Kanıt/citation.",
    tags: ['risk', 'proje', 'yönetim'],
  },
  {
    id: 'nlm-project-requirements',
    category: 'Toplantı / Proje',
    categoryEn: 'Meeting / Project',
    name: 'Gereksinim Çıkarımı',
    nameEn: 'Requirements Extraction',
    prompt: "İş gereksinimlerini 'Must/Should/Could' olarak sınıflandır; her madde citation.",
    promptEn: "İş gereksinimlerini 'Must/Should/Could' olarak sınıflandır; her madde citation.",
    tags: ['gereksinim', 'moscow', 'önceliklendirme'],
  },

  // ═══════════════════════════════════════════════════════════
  // 7) KAYNAK YÖNETİMİ
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-source-single',
    category: 'Kaynak Yönetimi',
    categoryEn: 'Source Management',
    name: 'Tek Kaynak Filtresi',
    nameEn: 'Single Source Filter',
    prompt: "Yalnızca 'X.pdf' kaynağını kullanarak cevapla.",
    promptEn: "Yalnızca 'X.pdf' kaynağını kullanarak cevapla.",
    tags: ['kaynak', 'filtre', 'tek'],
  },
  {
    id: 'nlm-source-multi',
    category: 'Kaynak Yönetimi',
    categoryEn: 'Source Management',
    name: 'Çoklu Kaynak Seçimi',
    nameEn: 'Multi Source Selection',
    prompt: "Sadece 'Policy.docx' + 'Appendix A' kaynaklarını seç; diğerlerini kullanma.",
    promptEn: "Sadece 'Policy.docx' + 'Appendix A' kaynaklarını seç; diğerlerini kullanma.",
    tags: ['kaynak', 'filtre', 'çoklu'],
  },
  {
    id: 'nlm-source-limit',
    category: 'Kaynak Yönetimi',
    categoryEn: 'Source Management',
    name: 'Kaynak Sınırlaması',
    nameEn: 'Source Limitation',
    prompt: 'Bu soruyu yanıtlarken en fazla 3 kaynak kullan ve neden onları seçtiğini söyle.',
    promptEn: 'Bu soruyu yanıtlarken en fazla 3 kaynak kullan ve neden onları seçtiğini söyle.',
    tags: ['kaynak', 'sınır', 'seçim'],
  },

  // ═══════════════════════════════════════════════════════════
  // 8) STUDIO — AUDIO OVERVIEW
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-audio-expert',
    category: 'Audio Overview (Studio)',
    categoryEn: 'Audio Overview (Studio)',
    name: 'Uzman Seviyesi Deep Dive',
    nameEn: 'Expert Level Deep Dive',
    prompt: "Bu konunun temellerini biliyorum. X kısmındaki varsayımları ve Y kısmındaki zayıf noktaları derinlemesine açıkla.",
    promptEn: "Bu konunun temellerini biliyorum. X kısmındaki varsayımları ve Y kısmındaki zayıf noktaları derinlemesine açıkla.",
    tags: ['audio', 'uzman', 'deep-dive'],
  },
  {
    id: 'nlm-audio-exam',
    category: 'Audio Overview (Studio)',
    categoryEn: 'Audio Overview (Studio)',
    name: 'Sınav Modu',
    nameEn: 'Exam Mode',
    prompt: "X, Y, Z başlıklarına göre özetle; her başlık sonunda 3 tane 'çıkabilir soru' üret.",
    promptEn: "X, Y, Z başlıklarına göre özetle; her başlık sonunda 3 tane 'çıkabilir soru' üret.",
    tags: ['audio', 'sınav', 'hazırlık'],
  },
  {
    id: 'nlm-audio-beginner',
    category: 'Audio Overview (Studio)',
    categoryEn: 'Audio Overview (Studio)',
    name: 'Yeni Başlayan Modu',
    nameEn: 'Beginner Mode',
    prompt: "Sıfırdan anlat: önce terimler sözlüğü, sonra 3 basit örnek, sonra yaygın hatalar.",
    promptEn: "Sıfırdan anlat: önce terimler sözlüğü, sonra 3 basit örnek, sonra yaygın hatalar.",
    tags: ['audio', 'başlangıç', 'temel'],
  },
  {
    id: 'nlm-audio-critique',
    category: 'Audio Overview (Studio)',
    categoryEn: 'Audio Overview (Studio)',
    name: 'Eleştirel Değerlendirme',
    nameEn: 'Critical Evaluation',
    prompt: "Yazının argümanını değerlendir: netlik, kanıt kalitesi, eksikler, önerilen iyileştirmeler.",
    promptEn: "Yazının argümanını değerlendir: netlik, kanıt kalitesi, eksikler, önerilen iyileştirmeler.",
    tags: ['audio', 'eleştiri', 'değerlendirme'],
  },
  {
    id: 'nlm-audio-debate',
    category: 'Audio Overview (Studio)',
    categoryEn: 'Audio Overview (Studio)',
    name: 'Tartışma (Debate)',
    nameEn: 'Debate',
    prompt: "İki tarafı da güçlü kur: 'lehinde' 5 argüman, 'aleyhinde' 5 argüman; sonra uzlaşma öner.",
    promptEn: "İki tarafı da güçlü kur: 'lehinde' 5 argüman, 'aleyhinde' 5 argüman; sonra uzlaşma öner.",
    tags: ['audio', 'tartışma', 'debate'],
  },

  // ═══════════════════════════════════════════════════════════
  // 9) STUDIO — SLIDE DECK
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-slide-exec',
    category: 'Slide Deck (Studio)',
    categoryEn: 'Slide Deck (Studio)',
    name: 'Yönetim Sunumu',
    nameEn: 'Executive Presentation',
    prompt: "Hedef kitle: C-level. 8 slayt. Problem → Etki → Çözüm → Risk → Yol haritası. Az metin, net mesaj.",
    promptEn: "Hedef kitle: C-level. 8 slayt. Problem → Etki → Çözüm → Risk → Yol haritası. Az metin, net mesaj.",
    tags: ['sunum', 'yönetim', 'c-level'],
  },
  {
    id: 'nlm-slide-edu',
    category: 'Slide Deck (Studio)',
    categoryEn: 'Slide Deck (Studio)',
    name: 'Eğitici Sunum',
    nameEn: 'Educational Presentation',
    prompt: 'Hedef: yeni başlayanlar. Adım adım süreç anlatımı. Her bölümde 1 örnek senaryo.',
    promptEn: 'Hedef: yeni başlayanlar. Adım adım süreç anlatımı. Her bölümde 1 örnek senaryo.',
    tags: ['sunum', 'eğitim', 'öğretici'],
  },
  {
    id: 'nlm-slide-tech',
    category: 'Slide Deck (Studio)',
    categoryEn: 'Slide Deck (Studio)',
    name: 'Teknik Tasarım Sunumu',
    nameEn: 'Technical Design Presentation',
    prompt: "Hedef: mühendis ekibi. Mimari, veri akışı, trade-off'lar, açık sorular, next steps.",
    promptEn: "Hedef: mühendis ekibi. Mimari, veri akışı, trade-off'lar, açık sorular, next steps.",
    tags: ['sunum', 'teknik', 'mimari'],
  },

  // ═══════════════════════════════════════════════════════════
  // 10) KAYNAK KEŞFETME (Web Araştırması)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-discover-reliable',
    category: 'Kaynak Keşfetme',
    categoryEn: 'Source Discovery',
    name: 'Güvenilir Kaynak Önerisi',
    nameEn: 'Reliable Source Suggestion',
    prompt: "Şu araştırma sorusu için webden en güvenilir 8 kaynak öner: akademik + resmi kurum + sektör raporu dengeli olsun.",
    promptEn: "Şu araştırma sorusu için webden en güvenilir 8 kaynak öner: akademik + resmi kurum + sektör raporu dengeli olsun.",
    tags: ['keşfetme', 'kaynak', 'güvenilir'],
  },
  {
    id: 'nlm-discover-recent',
    category: 'Kaynak Keşfetme',
    categoryEn: 'Source Discovery',
    name: 'Güncel Kaynak Filtresi',
    nameEn: 'Recent Source Filter',
    prompt: "Sadece 2023 sonrası yayınları hedefle; pazarlama bloglarını ele.",
    promptEn: "Sadece 2023 sonrası yayınları hedefle; pazarlama bloglarını ele.",
    tags: ['keşfetme', 'güncel', 'filtre'],
  },
  {
    id: 'nlm-discover-evaluate',
    category: 'Kaynak Keşfetme',
    categoryEn: 'Source Discovery',
    name: 'Kaynak Değerlendirme',
    nameEn: 'Source Evaluation',
    prompt: "Kaynakları eklemeden önce her biri için: ne anlatıyor, neden güvenilir, hangi soruya cevap olur?",
    promptEn: "Kaynakları eklemeden önce her biri için: ne anlatıyor, neden güvenilir, hangi soruya cevap olur?",
    tags: ['keşfetme', 'değerlendirme', 'kalite'],
  },
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nlm-template-universal',
    category: 'Evrensel Şablon',
    categoryEn: 'Universal Template',
    name: 'Her İşe Uyar Şablon',
    nameEn: 'Universal Prompt Template',
    prompt: `AMAÇ: …
KAPSAM: (yalnızca seçili kaynaklar / yalnızca şu dosyalar: …)
ÇIKTI: (madde / tablo / outline / Q&A / flashcard)
KANIT: Her iddia citation'lı; kaynakta yoksa "kaynaklarda yok" de.
KISIT: (uzunluk, seviye, dil, ton)`,
    promptEn: `AMAÇ: …
KAPSAM: (yalnızca seçili kaynaklar / yalnızca şu dosyalar: …)
ÇIKTI: (madde / tablo / outline / Q&A / flashcard)
KANIT: Her iddia citation'lı; kaynakta yoksa "kaynaklarda yok" de.
KISIT: (uzunluk, seviye, dil, ton)`,
    tags: ['şablon', 'evrensel', 'universal'],
  },
];

type CommunityTopic = {
  id: string;
  tr: string;
  en: string;
};

type CommunityPattern = {
  id: string;
  name: string;
  nameEn: string;
  prompt: string;
  promptEn: string;
  tags: string[];
};

const COMMUNITY_RESEARCH_TOPICS: CommunityTopic[] = [
  { id: 'ai', tr: 'Yapay Zeka', en: 'Artificial Intelligence' },
  { id: 'ml', tr: 'Makine Ogrenmesi', en: 'Machine Learning' },
  { id: 'llm', tr: 'Buyuk Dil Modelleri', en: 'Large Language Models' },
  { id: 'nlp', tr: 'Dogal Dil Isleme', en: 'Natural Language Processing' },
  { id: 'cv', tr: 'Bilgisayarli Goru', en: 'Computer Vision' },
  { id: 'data-eng', tr: 'Veri Muhendisligi', en: 'Data Engineering' },
  { id: 'analytics', tr: 'Veri Analitigi', en: 'Data Analytics' },
  { id: 'bi', tr: 'Is Zekasi', en: 'Business Intelligence' },
  { id: 'cloud', tr: 'Bulut Bilisim', en: 'Cloud Computing' },
  { id: 'devops', tr: 'DevOps', en: 'DevOps' },
  { id: 'sre', tr: 'SRE', en: 'SRE' },
  { id: 'kubernetes', tr: 'Kubernetes', en: 'Kubernetes' },
  { id: 'docker', tr: 'Docker', en: 'Docker' },
  { id: 'backend', tr: 'Backend Gelistirme', en: 'Backend Development' },
  { id: 'frontend', tr: 'Frontend Gelistirme', en: 'Frontend Development' },
  { id: 'mobile', tr: 'Mobil Gelistirme', en: 'Mobile Development' },
  { id: 'web-perf', tr: 'Web Performansi', en: 'Web Performance' },
  { id: 'qa', tr: 'Test ve QA', en: 'Testing and QA' },
  { id: 'security', tr: 'Siber Guvenlik', en: 'Cybersecurity' },
  { id: 'privacy', tr: 'Veri Gizliligi', en: 'Data Privacy' },
  { id: 'product', tr: 'Urun Yonetimi', en: 'Product Management' },
  { id: 'ux', tr: 'UX Arastirmasi', en: 'UX Research' },
  { id: 'ui', tr: 'UI Tasarimi', en: 'UI Design' },
  { id: 'growth', tr: 'Buyume Stratejileri', en: 'Growth Strategies' },
  { id: 'seo', tr: 'SEO', en: 'SEO' },
  { id: 'content', tr: 'Icerik Pazarlamasi', en: 'Content Marketing' },
  { id: 'sales', tr: 'Satis Operasyonlari', en: 'Sales Operations' },
  { id: 'support', tr: 'Musteri Destegi', en: 'Customer Support' },
  { id: 'hr', tr: 'IK Teknolojileri', en: 'HR Technology' },
  { id: 'fintech', tr: 'Fintech', en: 'Fintech' },
  { id: 'ecommerce', tr: 'E-Ticaret', en: 'E-Commerce' },
  { id: 'saas', tr: 'SaaS', en: 'SaaS' },
  { id: 'startup', tr: 'Startup Operasyonlari', en: 'Startup Operations' },
  { id: 'education', tr: 'Egitim Teknolojileri', en: 'Education Technology' },
  { id: 'healthtech', tr: 'Saglik Teknolojileri', en: 'Health Technology' },
  { id: 'gaming', tr: 'Oyun Gelistirme', en: 'Game Development' },
  { id: 'blockchain', tr: 'Blockchain', en: 'Blockchain' },
  { id: 'iot', tr: 'Nesnelerin Interneti', en: 'Internet of Things' },
  { id: 'robotics', tr: 'Robotik', en: 'Robotics' },
  { id: 'energy', tr: 'Enerji Teknolojileri', en: 'Energy Technology' },
  { id: 'climate', tr: 'Iklim Teknolojileri', en: 'Climate Technology' },
  { id: 'legaltech', tr: 'LegalTech', en: 'Legal Technology' },
  { id: 'govtech', tr: 'Kamu Teknolojileri', en: 'Government Technology' },
  { id: 'travel', tr: 'Seyahat Teknolojileri', en: 'Travel Technology' },
  { id: 'logistics', tr: 'Lojistik Teknolojileri', en: 'Logistics Technology' },
  { id: 'manufacturing', tr: 'Uretim Teknolojileri', en: 'Manufacturing Technology' },
  { id: 'real-estate', tr: 'Gayrimenkul Teknolojileri', en: 'Real Estate Technology' },
  { id: 'media', tr: 'Medya Teknolojileri', en: 'Media Technology' },
  { id: 'community', tr: 'Topluluk Yonetimi', en: 'Community Management' },
  { id: 'leadership', tr: 'Liderlik ve Yonetim', en: 'Leadership and Management' },
];

const COMMUNITY_RESEARCH_PATTERNS: CommunityPattern[] = [
  {
    id: 'trend-scan',
    name: 'Trend Taramasi',
    nameEn: 'Trend Scan',
    prompt: '{topic} konusunda Reddit, X ve Stack Overflow paylasimlarini derle. Son 12 ayin en cok tekrar eden 10 trendini cikar ve her trend icin ornek alinti/citation ver.',
    promptEn: '{topic} konusunda Reddit, X ve Stack Overflow paylasimlarini derle. Son 12 ayin en cok tekrar eden 10 trendini cikar ve her trend icin ornek alinti/citation ver.',
    tags: ['reddit', 'x', 'stackoverflow', 'trend'],
  },
  {
    id: 'pain-points',
    name: 'Sorun Noktalari',
    nameEn: 'Pain Points',
    prompt: '{topic} ile ilgili kullanici sikayetlerini Reddit, X ve Stack Overflow kaynaklarindan topla. Sorunlari etki-buyukluk ve tekrar sayisina gore sirala.',
    promptEn: '{topic} ile ilgili kullanici sikayetlerini Reddit, X ve Stack Overflow kaynaklarindan topla. Sorunlari etki-buyukluk ve tekrar sayisina gore sirala.',
    tags: ['pain-point', 'problem', 'community'],
  },
  {
    id: 'faq',
    name: 'Topluluk SSS',
    nameEn: 'Community FAQ',
    prompt: '{topic} icin Reddit, X ve Stack Overflow uzerinden 25 soruluk bir SSS listesi olustur. Her soruya kisa cevap ve kaynak referansi ekle.',
    promptEn: '{topic} icin Reddit, X ve Stack Overflow uzerinden 25 soruluk bir SSS listesi olustur. Her soruya kisa cevap ve kaynak referansi ekle.',
    tags: ['faq', 'qa', 'sources'],
  },
  {
    id: 'myths-vs-facts',
    name: 'Mitler ve Gercekler',
    nameEn: 'Myths vs Facts',
    prompt: '{topic} konusunda toplulukta dolasan yanlis inanislari belirle. Reddit, X ve Stack Overflow delilleriyle "Mit -> Gercek" tablosu yap.',
    promptEn: '{topic} konusunda toplulukta dolasan yanlis inanislari belirle. Reddit, X ve Stack Overflow delilleriyle "Mit -> Gercek" tablosu yap.',
    tags: ['myth', 'fact-check', 'evidence'],
  },
  {
    id: 'beginner-guide',
    name: 'Baslangic Rehberi',
    nameEn: 'Beginner Guide',
    prompt: '{topic} icin yeni baslayanlara yonelik adim adim rehber yaz. Reddit, X ve Stack Overflowdan gelen pratik ipuclarini dahil et.',
    promptEn: '{topic} icin yeni baslayanlara yonelik adim adim rehber yaz. Reddit, X ve Stack Overflowdan gelen pratik ipuclarini dahil et.',
    tags: ['beginner', 'guide', 'learning'],
  },
  {
    id: 'advanced-patterns',
    name: 'Ileri Duzey Kaliplar',
    nameEn: 'Advanced Patterns',
    prompt: '{topic} konusunda uzmanlarin kullandigi ileri teknikleri Reddit, X ve Stack Overflowdan cikar. "Ne zaman kullanilir / riskleri" ile sun.',
    promptEn: '{topic} konusunda uzmanlarin kullandigi ileri teknikleri Reddit, X ve Stack Overflowdan cikar. "Ne zaman kullanilir / riskleri" ile sun.',
    tags: ['advanced', 'patterns', 'experts'],
  },
  {
    id: 'tool-comparison',
    name: 'Arac Karsilastirma',
    nameEn: 'Tool Comparison',
    prompt: '{topic} alaninda en cok karsilastirilan araclari Reddit, X ve Stack Overflow verileriyle karsilastir. Arti-eksi ve kullanim senaryosu yaz.',
    promptEn: '{topic} alaninda en cok karsilastirilan araclari Reddit, X ve Stack Overflow verileriyle karsilastir. Arti-eksi ve kullanim senaryosu yaz.',
    tags: ['comparison', 'tools', 'tradeoff'],
  },
  {
    id: 'career-skills',
    name: 'Kariyer Yetkinlikleri',
    nameEn: 'Career Skills',
    prompt: '{topic} icin is gorusmelerinde sorulan becerileri Reddit, X ve Stack Overflow tartismalarindan cikar. 90 gunluk gelisim plani olustur.',
    promptEn: '{topic} icin is gorusmelerinde sorulan becerileri Reddit, X ve Stack Overflow tartismalarindan cikar. 90 gunluk gelisim plani olustur.',
    tags: ['career', 'skills', 'interview'],
  },
  {
    id: 'debug-playbook',
    name: 'Debug Playbook',
    nameEn: 'Debug Playbook',
    prompt: '{topic} ile ilgili en yaygin hatalar icin Stack Overflow cozumlerini ve Reddit/X deneyimlerini birlestirerek bir debug playbook yaz.',
    promptEn: '{topic} ile ilgili en yaygin hatalar icin Stack Overflow cozumlerini ve Reddit/X deneyimlerini birlestirerek bir debug playbook yaz.',
    tags: ['debug', 'troubleshooting', 'stack-overflow'],
  },
  {
    id: 'decision-framework',
    name: 'Karar Cercevesi',
    nameEn: 'Decision Framework',
    prompt: '{topic} secimlerinde karar vermek icin "baglam -> secenek -> kriter -> karar" cercevesi olustur; Reddit, X, Stack Overflowdan alintilar ekle.',
    promptEn: '{topic} secimlerinde karar vermek icin "baglam -> secenek -> kriter -> karar" cercevesi olustur; Reddit, X, Stack Overflowdan alintilar ekle.',
    tags: ['decision', 'framework', 'options'],
  },
  {
    id: 'anti-patterns',
    name: 'Anti-Pattern Avcisi',
    nameEn: 'Anti-Pattern Hunter',
    prompt: '{topic} konusunda toplulukta sik gorulen anti-patternleri tespit et. Her anti-pattern icin daha iyi alternatif ve kaynak kaniti ver.',
    promptEn: '{topic} konusunda toplulukta sik gorulen anti-patternleri tespit et. Her anti-pattern icin daha iyi alternatif ve kaynak kaniti ver.',
    tags: ['anti-pattern', 'best-practice', 'quality'],
  },
  {
    id: 'implementation-checklist',
    name: 'Uygulama Kontrol Listesi',
    nameEn: 'Implementation Checklist',
    prompt: '{topic} projesi icin uygulama kontrol listesi olustur. Maddeleri Reddit, X ve Stack Overflowdan gelen gercek sorunlara gore onceliklendir.',
    promptEn: '{topic} projesi icin uygulama kontrol listesi olustur. Maddeleri Reddit, X ve Stack Overflowdan gelen gercek sorunlara gore onceliklendir.',
    tags: ['checklist', 'implementation', 'priority'],
  },
  {
    id: 'risk-register',
    name: 'Topluluk Risk Kaydi',
    nameEn: 'Community Risk Register',
    prompt: '{topic} uygulamalarinda karsilasilan riskleri topluluk kaynaklarindan derle. Risk, olasilik, etki ve azaltim tablosu olustur.',
    promptEn: '{topic} uygulamalarinda karsilasilan riskleri topluluk kaynaklarindan derle. Risk, olasilik, etki ve azaltim tablosu olustur.',
    tags: ['risk', 'mitigation', 'project'],
  },
  {
    id: 'cost-performance',
    name: 'Maliyet-Performans Analizi',
    nameEn: 'Cost-Performance Analysis',
    prompt: '{topic} cozumlerinde maliyet ve performans dengesini Reddit, X ve Stack Overflow yorumlarina dayanarak analiz et.',
    promptEn: '{topic} cozumlerinde maliyet ve performans dengesini Reddit, X ve Stack Overflow yorumlarina dayanarak analiz et.',
    tags: ['cost', 'performance', 'tradeoff'],
  },
  {
    id: 'security-review',
    name: 'Guvenlik Incelemesi',
    nameEn: 'Security Review',
    prompt: '{topic} ile ilgili guvenlik aciklari ve kotu pratikleri topluluk kaynaklarindan cikar. Onlem listesini etki sirasina gore ver.',
    promptEn: '{topic} ile ilgili guvenlik aciklari ve kotu pratikleri topluluk kaynaklarindan cikar. Onlem listesini etki sirasina gore ver.',
    tags: ['security', 'pitfall', 'hardening'],
  },
  {
    id: 'benchmarking',
    name: 'Topluluk Benchmark Ozeti',
    nameEn: 'Community Benchmark Summary',
    prompt: '{topic} hakkindaki benchmark paylasimlarini Reddit, X ve Stack Overflow uzerinden topla. Sonuclari metodoloji farklariyla birlikte ozetle.',
    promptEn: '{topic} hakkindaki benchmark paylasimlarini Reddit, X ve Stack Overflow uzerinden topla. Sonuclari metodoloji farklariyla birlikte ozetle.',
    tags: ['benchmark', 'metrics', 'comparison'],
  },
  {
    id: 'roadmap',
    name: '90 Gunluk Yol Haritasi',
    nameEn: '90-Day Roadmap',
    prompt: '{topic} icin topluluk bilgisine dayali 90 gunluk uygulama yol haritasi cikar: hafta hafta hedef, cikti, risk, olcum metrigi.',
    promptEn: '{topic} icin topluluk bilgisine dayali 90 gunluk uygulama yol haritasi cikar: hafta hafta hedef, cikti, risk, olcum metrigi.',
    tags: ['roadmap', 'planning', 'execution'],
  },
  {
    id: 'debate-map',
    name: 'Tartisma Haritasi',
    nameEn: 'Debate Map',
    prompt: '{topic} konusunda Reddit, X ve Stack Overflowdaki gorus ayriliklarini haritala: lehinde, aleyhinde, uzlasi noktasi.',
    promptEn: '{topic} konusunda Reddit, X ve Stack Overflowdaki gorus ayriliklarini haritala: lehinde, aleyhinde, uzlasi noktasi.',
    tags: ['debate', 'arguments', 'consensus'],
  },
  {
    id: 'resource-pack',
    name: 'Kaynak Paketi',
    nameEn: 'Resource Pack',
    prompt: '{topic} ogrenimi icin topluluk tarafindan en cok onerilen 20 kaynaklik bir paket hazirla. Her kaynak icin neden onemli oldugunu acikla.',
    promptEn: '{topic} ogrenimi icin topluluk tarafindan en cok onerilen 20 kaynaklik bir paket hazirla. Her kaynak icin neden onemli oldugunu acikla.',
    tags: ['resources', 'learning', 'curation'],
  },
  {
    id: 'action-summary',
    name: 'Aksiyon Ozeti',
    nameEn: 'Action Summary',
    prompt: '{topic} konusunda Reddit, X ve Stack Overflow arastirmasini "simdi ne yapmali?" odakli ozetle: 10 net aksiyon maddesi ver.',
    promptEn: '{topic} konusunda Reddit, X ve Stack Overflow arastirmasini "simdi ne yapmali?" odakli ozetle: 10 net aksiyon maddesi ver.',
    tags: ['action', 'execution', 'summary'],
  },
];

const applyTopic = (text: string, topic: CommunityTopic) => text.replaceAll('{topic}', topic.tr);
const applyTopicEn = (text: string, topic: CommunityTopic) => text.replaceAll('{topic}', topic.en);

const NOTEBOOKLM_COMMUNITY_PROMPTS: NotebookLmPrompt[] = COMMUNITY_RESEARCH_TOPICS.flatMap(topic =>
  COMMUNITY_RESEARCH_PATTERNS.map(pattern => ({
    id: `nlm-community-${topic.id}-${pattern.id}`,
    category: 'Topluluk Arastirmasi',
    categoryEn: 'Community Research',
    name: `${topic.tr} — ${pattern.name}`,
    nameEn: `${topic.en} — ${pattern.nameEn}`,
    prompt: applyTopic(pattern.prompt, topic),
    promptEn: applyTopicEn(pattern.promptEn, topic),
    tags: [...pattern.tags, topic.id, 'topluluk-arastirmasi'],
  }))
);

// 50 konu x 20 desen = 1000 yeni prompt
NOTEBOOKLM_PROMPTS.push(...NOTEBOOKLM_COMMUNITY_PROMPTS);

// ═══════════════════════════════════════════════════════════════
// VERİ SETİ PROMPT'LARI — Tüm dataset kaynaklarından entegre
// ═══════════════════════════════════════════════════════════════
import { ALL_DATASET_PROMPTS } from './datasetPrompts';
NOTEBOOKLM_PROMPTS.push(...ALL_DATASET_PROMPTS);

/** Kategorileri benzersiz olarak çıkar */
export const NOTEBOOKLM_CATEGORIES = [...new Set(NOTEBOOKLM_PROMPTS.map(p => p.category))];
export const NOTEBOOKLM_CATEGORIES_EN = [...new Set(NOTEBOOKLM_PROMPTS.map(p => p.categoryEn))];
