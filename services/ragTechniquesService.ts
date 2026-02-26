/**
 * RAG Techniques Service
 * 34 advanced RAG techniques from RAG_Techniques-main repository
 * Integrated into the prompt generation system for strategy-aware prompt creation.
 */

export type RAGCategory =
  | 'foundational'
  | 'query_enhancement'
  | 'context_enrichment'
  | 'advanced_retrieval'
  | 'iterative'
  | 'evaluation'
  | 'advanced_architecture';

export type RAGComplexity = 'low' | 'medium' | 'high';

export interface RAGParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  descriptionTr: string;
  descriptionEn: string;
  defaultValue?: string;
}

export interface RAGTechnique {
  id: string;
  nameTr: string;
  nameEn: string;
  category: RAGCategory;
  icon: string;
  descriptionTr: string;
  descriptionEn: string;
  promptTemplate: string;
  whenToUseTr: string[];
  whenToUseEn: string[];
  compatibleWith: string[];
  parameters: RAGParameter[];
  complexity: RAGComplexity;
  effectiveness: number; // 0-1
  notebook: string;
}

export interface RAGCategoryInfo {
  id: RAGCategory;
  nameTr: string;
  nameEn: string;
  icon: string;
  descriptionTr: string;
  descriptionEn: string;
  color: string;
}

// ── Category Definitions ──────────────────────────────────────────────────────

export const RAG_CATEGORIES: RAGCategoryInfo[] = [
  {
    id: 'foundational',
    nameTr: 'Temel RAG',
    nameEn: 'Foundational',
    icon: '\u{1F331}',
    descriptionTr: 'Temel retrieval-augmented generation teknikleri',
    descriptionEn: 'Basic retrieval-augmented generation techniques',
    color: '#10b981',
  },
  {
    id: 'query_enhancement',
    nameTr: 'Sorgu Gelistirme',
    nameEn: 'Query Enhancement',
    icon: '\u{1F50D}',
    descriptionTr: 'Sorgu kalitesini artiran transformasyon ve embedding teknikleri',
    descriptionEn: 'Query transformation and embedding techniques for better matching',
    color: '#3b82f6',
  },
  {
    id: 'context_enrichment',
    nameTr: 'Baglam Zenginlestirme',
    nameEn: 'Context Enrichment',
    icon: '\u{1F4DA}',
    descriptionTr: 'Retrieval sonuclarini zenginlestiren baglam teknikleri',
    descriptionEn: 'Techniques to enrich retrieved context for better answers',
    color: '#8b5cf6',
  },
  {
    id: 'advanced_retrieval',
    nameTr: 'Gelismis Erisim',
    nameEn: 'Advanced Retrieval',
    icon: '\u{1F680}',
    descriptionTr: 'Fusion, reranking ve cok boyutlu filtreleme',
    descriptionEn: 'Fusion retrieval, reranking, and multi-faceted filtering',
    color: '#f59e0b',
  },
  {
    id: 'iterative',
    nameTr: 'Yinelemeli Teknikler',
    nameEn: 'Iterative Techniques',
    icon: '\u{1F501}',
    descriptionTr: 'Geri bildirim ve adaptif retrieval yontemleri',
    descriptionEn: 'Feedback loops and adaptive retrieval methods',
    color: '#ef4444',
  },
  {
    id: 'evaluation',
    nameTr: 'Degerlendirme',
    nameEn: 'Evaluation',
    icon: '\u{1F4CA}',
    descriptionTr: 'RAG sistem kalitesini olcen metrikler ve frameworkler',
    descriptionEn: 'Metrics and frameworks for measuring RAG system quality',
    color: '#06b6d4',
  },
  {
    id: 'advanced_architecture',
    nameTr: 'Gelismis Mimari',
    nameEn: 'Advanced Architecture',
    icon: '\u{1F3D7}',
    descriptionTr: 'Graph RAG, RAPTOR, Self-RAG gibi ileri duzey mimariler',
    descriptionEn: 'Advanced architectures like Graph RAG, RAPTOR, Self-RAG',
    color: '#ec4899',
  },
];

// ── All 34 RAG Techniques ─────────────────────────────────────────────────────

export const RAG_TECHNIQUES: RAGTechnique[] = [
  // ── FOUNDATIONAL ─────────────────────────────────────
  {
    id: 'rag-simple-001',
    nameTr: 'Simple RAG',
    nameEn: 'Simple RAG',
    category: 'foundational',
    icon: '\u{1F331}',
    descriptionTr: 'Temel retrieval ve generation birlesimi. Belgeleri alir ve sorguya yanit uretir.',
    descriptionEn: 'Basic retrieval and generation combination. Retrieves documents and generates answers.',
    promptTemplate: `Verilen belgelerden [{context}] bilgilerini kullanarak [{query}] sorusunu yanitla. Yaniti sadece saglanan baglamda bulunan bilgilerle sinirla.

## Talimatlar
1. Saglanan baglami dikkatlice oku
2. Sorguyla dogrudan ilgili bilgileri belirle
3. Sadece baglamdaki bilgileri kullanarak yanit olustur
4. Baglamda bulunmayan bilgileri ekleme
5. Kaynaklari belirt`,
    whenToUseTr: ['Basit sorgular', 'Belirli bilgi arama', 'Hizli yanit gereken durumlar'],
    whenToUseEn: ['Simple queries', 'Specific information lookup', 'Quick response scenarios'],
    compatibleWith: ['rag-semantic-chunking-001', 'rag-compression-001'],
    parameters: [
      { name: 'context', type: 'string', required: true, descriptionTr: 'Retrieval sonuclari', descriptionEn: 'Retrieved documents' },
      { name: 'query', type: 'string', required: true, descriptionTr: 'Kullanici sorgusu', descriptionEn: 'User query' },
    ],
    complexity: 'low',
    effectiveness: 0.7,
    notebook: 'simple_rag.ipynb',
  },
  {
    id: 'rag-csv-001',
    nameTr: 'CSV RAG',
    nameEn: 'CSV RAG',
    category: 'foundational',
    icon: '\u{1F4CB}',
    descriptionTr: 'CSV dosyalarindan retrieval ve analiz. Tablo verileriyle calisir.',
    descriptionEn: 'Retrieval and analysis from CSV files. Works with tabular data.',
    promptTemplate: `Tablo verilerinden [{csv_data}] sutunlarini analiz et. [{query}] icin ilgili satirlari bul ve ozetle.

## Talimatlar
1. Tablo yapisini anla (sutun adlari, veri tipleri)
2. Sorguyla ilgili satirlari filtrele
3. Sayisal veriler icin toplama/ortalama hesapla
4. Sonuclari tablo formatinda sun`,
    whenToUseTr: ['Tablo verileri sorgulama', 'CSV analiz', 'Yapilandirilmis veri'],
    whenToUseEn: ['Tabular data queries', 'CSV analysis', 'Structured data'],
    compatibleWith: ['rag-simple-001'],
    parameters: [
      { name: 'csv_data', type: 'string', required: true, descriptionTr: 'CSV veri icerigi', descriptionEn: 'CSV data content' },
      { name: 'query', type: 'string', required: true, descriptionTr: 'Kullanici sorgusu', descriptionEn: 'User query' },
    ],
    complexity: 'low',
    effectiveness: 0.72,
    notebook: 'simple_csv_rag.ipynb',
  },
  {
    id: 'rag-reliable-001',
    nameTr: 'Reliable RAG',
    nameEn: 'Reliable RAG',
    category: 'foundational',
    icon: '\u{2705}',
    descriptionTr: 'Dogrulama ve iyilestirme ekli RAG. Belge alakaliligini degerlendirir.',
    descriptionEn: 'RAG with validation and refinement. Evaluates document relevancy.',
    promptTemplate: `Verilen belgelerden [{context}] bilgilerini kullan. Once belgelerin sorgu [{query}] ile alakaliligini degerlendir (1-10). Sadece alakali belgeleri kullanarak yanit olustur. Kaynaklari belirt.

## Dogrulama Adimlari
1. Her belge icin alakalilik skoru hesapla (1-10)
2. Skor < 5 olan belgeleri disla
3. Kalan belgelerden yanit olustur
4. Yanittaki her iddia icin kaynak belirt
5. Dogrulanamayanlar icin "kaynak bulunamadi" notu ekle`,
    whenToUseTr: ['Yuksek dogruluk gerektiren sorgular', 'Kritik bilgi erisimleri', 'Kaynak dogrulama'],
    whenToUseEn: ['High accuracy queries', 'Critical information retrieval', 'Source verification'],
    compatibleWith: ['rag-simple-001', 'rag-reranking-001'],
    parameters: [
      { name: 'context', type: 'string', required: true, descriptionTr: 'Retrieval sonuclari', descriptionEn: 'Retrieved documents' },
      { name: 'query', type: 'string', required: true, descriptionTr: 'Kullanici sorgusu', descriptionEn: 'User query' },
    ],
    complexity: 'medium',
    effectiveness: 0.82,
    notebook: 'reliable_rag.ipynb',
  },
  {
    id: 'rag-chunk-size-001',
    nameTr: 'Chunk Boyutu Optimizasyonu',
    nameEn: 'Chunk Size Optimization',
    category: 'foundational',
    icon: '\u{1F4CF}',
    descriptionTr: 'Optimal chunk boyutu belirleme. Icerik butunlugu ve hiz arasinda denge.',
    descriptionEn: 'Optimal chunk size determination. Balance between content integrity and speed.',
    promptTemplate: `Metni [{text}] analiz et. Amac: [{purpose}]. Chunk boyutu: [{size}], overlap: [{overlap}]. Icerik butunlugu ve retrieval hizi arasindaki dengeyi optimize et.

## Optimizasyon Kriterleri
1. Anlamsal butunluk: Her chunk kendi basina anlamli mi?
2. Bilgi kaybi: Bolme noktalarinda bilgi kayboluyor mu?
3. Redundans: Overlap gereksiz tekrar yaratiyor mu?
4. Retrieval hassasiyeti: Chunk boyutu aramayi etkiliyor mu?`,
    whenToUseTr: ['Yeni RAG sistemi kurulumu', 'Performans iyilestirme', 'Farkli icerik tipleri'],
    whenToUseEn: ['New RAG system setup', 'Performance tuning', 'Different content types'],
    compatibleWith: ['rag-semantic-chunking-001', 'rag-proposition-001'],
    parameters: [
      { name: 'text', type: 'string', required: true, descriptionTr: 'Analiz edilecek metin', descriptionEn: 'Text to analyze' },
      { name: 'purpose', type: 'string', required: true, descriptionTr: 'Kullanim amaci', descriptionEn: 'Usage purpose' },
      { name: 'size', type: 'number', required: false, descriptionTr: 'Chunk boyutu', descriptionEn: 'Chunk size', defaultValue: '512' },
      { name: 'overlap', type: 'number', required: false, descriptionTr: 'Overlap miktari', descriptionEn: 'Overlap amount', defaultValue: '50' },
    ],
    complexity: 'low',
    effectiveness: 0.68,
    notebook: 'choose_chunk_size.ipynb',
  },
  {
    id: 'rag-proposition-001',
    nameTr: 'Onerme Chunking',
    nameEn: 'Proposition Chunking',
    category: 'foundational',
    icon: '\u{26D3}',
    descriptionTr: 'Metni kendi basina anlamli, eksikiz onermelere boler.',
    descriptionEn: 'Breaks text into self-contained, complete propositions.',
    promptTemplate: `[{text}] metnini, kendi basina anlamli, eksiksiz onermelere (propositions) bol. Her onerme: {"proposition": "...", "complete": true, "context_independent": true}

## Kurallar
1. Her onerme tek bir gercegi ifade etmeli
2. Onerme disardan ek baglam gerektirmemeli
3. Zamirleri acik referanslarla degistir
4. Karmasik cumleleri basit onermelere ayir`,
    whenToUseTr: ['Bilgi cikartma', 'Hassas arama', 'Kucuk birim retrieval'],
    whenToUseEn: ['Knowledge extraction', 'Precise search', 'Fine-grained retrieval'],
    compatibleWith: ['rag-simple-001', 'rag-fusion-001'],
    parameters: [
      { name: 'text', type: 'string', required: true, descriptionTr: 'Bolunecek metin', descriptionEn: 'Text to split' },
    ],
    complexity: 'medium',
    effectiveness: 0.78,
    notebook: 'proposition_chunking.ipynb',
  },

  // ── QUERY ENHANCEMENT ────────────────────────────────
  {
    id: 'rag-query-transform-001',
    nameTr: 'Sorgu Donusturmeler',
    nameEn: 'Query Transformations',
    category: 'query_enhancement',
    icon: '\u{1F504}',
    descriptionTr: 'Sorguyu genisletme, ozetleme ve cok dilli donusturme.',
    descriptionEn: 'Query expansion, summarization, and multilingual transformation.',
    promptTemplate: `Orijinal sorgu: [{query}]. Su donusumleri uygula:
1) Genisletilmis: [{query}] + es anlamlilar ve ilgili terimler
2) Ozetlenmis: anahtar terimler cikar
3) Cok dilli: gerekirse cevir (en/tr)
4) Alt-sorgular: Karmasik sorguyu bilesenlerine ayir

Sonuclari birlestir ve en iyi eslesen retrieval stratejisini belirle.`,
    whenToUseTr: ['Belirsiz sorgular', 'Genis kapsamli arama', 'Cok dilli icerik'],
    whenToUseEn: ['Ambiguous queries', 'Broad search', 'Multilingual content'],
    compatibleWith: ['rag-hyde-001', 'rag-fusion-001', 'rag-reranking-001'],
    parameters: [
      { name: 'query', type: 'string', required: true, descriptionTr: 'Orijinal sorgu', descriptionEn: 'Original query' },
    ],
    complexity: 'medium',
    effectiveness: 0.8,
    notebook: 'query_transformations.ipynb',
  },
  {
    id: 'rag-hyde-001',
    nameTr: 'HyDE - Hayali Belge Embedding',
    nameEn: 'HyDE - Hypothetical Document Embedding',
    category: 'query_enhancement',
    icon: '\u{1F4DD}',
    descriptionTr: 'Sorguyu yanitlayan hayali bir belge olusturarak daha iyi embedding eslesmesi saglar.',
    descriptionEn: 'Creates a hypothetical document answering the query for better embedding matching.',
    promptTemplate: `Sorgu: [{query}]. Bu sorguyu yanitlayan ideal, kapsamli bir belge paragrafi yaz. Bu hipotetik belgeyi embedding olarak kullanarak gercek belgelerle eslestirme yap.

## Adimlar
1. Sorguyu tam olarak yanitlayan 2-3 paragraflik belge olustur
2. Belge gercekci ve bilgi yogun olmali
3. Bu hipotetik belgenin embedding'ini hesapla
4. Gercek belge koleksiyonundaki en yakin esleri bul
5. Bulunan gercek belgelerle nihai yanit olustur`,
    whenToUseTr: ['Kisa sorgular', 'Es anlamli arama', 'Semantik eslestirme'],
    whenToUseEn: ['Short queries', 'Synonym-aware search', 'Semantic matching'],
    compatibleWith: ['rag-fusion-001', 'rag-reranking-001'],
    parameters: [
      { name: 'query', type: 'string', required: true, descriptionTr: 'Orijinal sorgu', descriptionEn: 'Original query' },
    ],
    complexity: 'medium',
    effectiveness: 0.85,
    notebook: 'HyDe_Hypothetical_Document_Embedding.ipynb',
  },
  {
    id: 'rag-hype-001',
    nameTr: 'HyPE - Hayali Prompt Embedding',
    nameEn: 'HyPE - Hypothetical Prompt Embedding',
    category: 'query_enhancement',
    icon: '\u{1F4A1}',
    descriptionTr: 'Sorgu varyasyonlari olusturarak coklu embedding eslestirmesi yapar.',
    descriptionEn: 'Creates query variations for multi-embedding matching.',
    promptTemplate: `Sorgu: [{query}]. Bu sorgunun varyasyonlarini uret:
1) Daha spesifik versiyon
2) Daha genel versiyon
3) Alternatif acidan soru
4) Ters soru (karsi bakis acisi)

Tum varyasyonlari embedding olarak kullan ve sonuclari birlestir.`,
    whenToUseTr: ['Sorgu zenginlestirme', 'Coklu bakis acisi arama', 'Indeksleme optimizasyonu'],
    whenToUseEn: ['Query enrichment', 'Multi-perspective search', 'Indexing optimization'],
    compatibleWith: ['rag-hyde-001', 'rag-query-transform-001'],
    parameters: [
      { name: 'query', type: 'string', required: true, descriptionTr: 'Orijinal sorgu', descriptionEn: 'Original query' },
    ],
    complexity: 'medium',
    effectiveness: 0.83,
    notebook: 'HyPE_Hypothetical_Prompt_Embeddings.ipynb',
  },

  // ── CONTEXT ENRICHMENT ──────────────────────────────
  {
    id: 'rag-contextual-headers-001',
    nameTr: 'Baglamsal Chunk Basliklari',
    nameEn: 'Contextual Chunk Headers',
    category: 'context_enrichment',
    icon: '\u{1F4D1}',
    descriptionTr: 'Her chunk icin belge ve bolum baglami ekler.',
    descriptionEn: 'Adds document and section context to each chunk.',
    promptTemplate: `Her chunk icin:
1) Belge basligi: [{doc_title}]
2) Bolum: [{section}]
3) Onceki/Sonraki baglam ozeti
Format: [Baglam: {header}] {chunk}

Bu basliklar retrieval sirasinda daha iyi eslestirme saglar.`,
    whenToUseTr: ['Uzun belgeler', 'Cok bolumlu icerik', 'Baglam kaybini onleme'],
    whenToUseEn: ['Long documents', 'Multi-section content', 'Context loss prevention'],
    compatibleWith: ['rag-semantic-chunking-001', 'rag-compression-001'],
    parameters: [
      { name: 'doc_title', type: 'string', required: true, descriptionTr: 'Belge basligi', descriptionEn: 'Document title' },
      { name: 'section', type: 'string', required: true, descriptionTr: 'Bolum adi', descriptionEn: 'Section name' },
    ],
    complexity: 'low',
    effectiveness: 0.75,
    notebook: 'contextual_chunk_headers.ipynb',
  },
  {
    id: 'rag-segment-extraction-001',
    nameTr: 'Ilgili Segment Cikartma',
    nameEn: 'Relevant Segment Extraction',
    category: 'context_enrichment',
    icon: '\u{2702}',
    descriptionTr: 'Belgeden sorguyla ilgili bolumleri dinamik olarak cikarir.',
    descriptionEn: 'Dynamically extracts query-relevant segments from documents.',
    promptTemplate: `[{document}] icinden [{query}] ile ilgili bolumleri bul. Ilgili segmentleri cikar ve ilgisiz kisimlari filtrele. Sadece dogrudan yanitlayan segmentleri tut.

## Cikarma Kurallari
1. Her segment 1-5 cumle uzunlugunda
2. Segmentler arasi mantiksal baglanti koru
3. Tekrarlanan bilgileri eleme
4. Onem sirasina gore sirala`,
    whenToUseTr: ['Buyuk belgeler', 'Odakli bilgi cikartma', 'Token tasarrufu'],
    whenToUseEn: ['Large documents', 'Focused extraction', 'Token savings'],
    compatibleWith: ['rag-compression-001', 'rag-reliable-001'],
    parameters: [
      { name: 'document', type: 'string', required: true, descriptionTr: 'Kaynak belge', descriptionEn: 'Source document' },
      { name: 'query', type: 'string', required: true, descriptionTr: 'Kullanici sorgusu', descriptionEn: 'User query' },
    ],
    complexity: 'medium',
    effectiveness: 0.79,
    notebook: 'relevant_segment_extraction.ipynb',
  },
  {
    id: 'rag-context-window-001',
    nameTr: 'Baglam Penceresi Gelistirme',
    nameEn: 'Context Window Enhancement',
    category: 'context_enrichment',
    icon: '\u{1F5BC}',
    descriptionTr: 'Chunk etrafindaki komsu cumleleri ekleyerek baglami genisletir.',
    descriptionEn: 'Expands context by adding neighboring sentences around the chunk.',
    promptTemplate: `Chunk: [{chunk}]. Onceki [{n}] chunk ve sonraki [{n}] chunk'i al. Genisletilmis baglam: {window_before} + {chunk} + {window_after}

Genisletilmis baglam orijinal chunk'in anlamini korumali ve ek bilgi saglamali.`,
    whenToUseTr: ['Baglam yetersizligi', 'Kesik cumle sorunu', 'Anlam kaybini onleme'],
    whenToUseEn: ['Insufficient context', 'Truncated sentences', 'Meaning loss prevention'],
    compatibleWith: ['rag-simple-001', 'rag-contextual-headers-001'],
    parameters: [
      { name: 'chunk', type: 'string', required: true, descriptionTr: 'Merkez chunk', descriptionEn: 'Center chunk' },
      { name: 'n', type: 'number', required: false, descriptionTr: 'Pencere boyutu', descriptionEn: 'Window size', defaultValue: '2' },
    ],
    complexity: 'low',
    effectiveness: 0.73,
    notebook: 'context_enrichment_window_around_chunk.ipynb',
  },
  {
    id: 'rag-semantic-chunking-001',
    nameTr: 'Anlamsal Chunking',
    nameEn: 'Semantic Chunking',
    category: 'context_enrichment',
    icon: '\u{1F9E9}',
    descriptionTr: 'Metni anlamsal sinirlara gore boler. Her chunk tek bir konuya odaklanir.',
    descriptionEn: 'Divides text by semantic boundaries. Each chunk focuses on a single topic.',
    promptTemplate: `[{text}] metnini anlamsal sinirlara gore bol:
1) Konu degisimleri
2) Paragraf yapisi
3) Anlamsal tutarlilik
Her chunk tek bir konuya odaklansin.

## Bolme Stratejisi
- Embedding benzerligi ile ardisik cumleler arasi mesafeyi olc
- Buyuk farklar = dogal bolme noktasi
- Her chunk min 100, max 500 token`,
    whenToUseTr: ['Karisik icerikli belgeler', 'Cok konulu metinler', 'Kaliteli chunk olusturma'],
    whenToUseEn: ['Mixed content documents', 'Multi-topic texts', 'Quality chunk creation'],
    compatibleWith: ['rag-contextual-headers-001', 'rag-proposition-001'],
    parameters: [
      { name: 'text', type: 'string', required: true, descriptionTr: 'Bolunecek metin', descriptionEn: 'Text to segment' },
    ],
    complexity: 'medium',
    effectiveness: 0.81,
    notebook: 'semantic_chunking.ipynb',
  },
  {
    id: 'rag-compression-001',
    nameTr: 'Baglamsal Sikistirma',
    nameEn: 'Contextual Compression',
    category: 'context_enrichment',
    icon: '\u{1F5DC}',
    descriptionTr: 'Retrieval sonuclarini sorgyla ilgili kalarak sikistirir.',
    descriptionEn: 'Compresses retrieved context while preserving query relevance.',
    promptTemplate: `[{retrieved_context}] icerigini sikistir:
1) Sorgu [{query}] ile ilgili cumleleri tut
2) Gereksiz detaylari kaldir
3) Token limiti: [{max_tokens}]

## Sikistirma Kurallari
- Temel bilgileri koru
- Ornek ve aciklamalari kisalt
- Tekrarlari eleme
- Onemli sayilari/tarihleri koru`,
    whenToUseTr: ['Token limiti asimi', 'Cok fazla retrieval sonucu', 'Maliyet optimizasyonu'],
    whenToUseEn: ['Token limit exceeded', 'Too many retrieval results', 'Cost optimization'],
    compatibleWith: ['rag-segment-extraction-001', 'rag-reranking-001'],
    parameters: [
      { name: 'retrieved_context', type: 'string', required: true, descriptionTr: 'Alinan icerik', descriptionEn: 'Retrieved content' },
      { name: 'query', type: 'string', required: true, descriptionTr: 'Kullanici sorgusu', descriptionEn: 'User query' },
      { name: 'max_tokens', type: 'number', required: false, descriptionTr: 'Maks token', descriptionEn: 'Max tokens', defaultValue: '2000' },
    ],
    complexity: 'medium',
    effectiveness: 0.77,
    notebook: 'contextual_compression.ipynb',
  },
  {
    id: 'rag-doc-augmentation-001',
    nameTr: 'Belge Zenginlestirme',
    nameEn: 'Document Augmentation',
    category: 'context_enrichment',
    icon: '\u{1F4C4}',
    descriptionTr: 'Belgeye ozet, anahtar kelimeler ve soru-cevap ciftleri ekler.',
    descriptionEn: 'Adds summary, keywords, and QA pairs to documents.',
    promptTemplate: `[{document}] icin:
1) Ozet ekle (2-3 cumle)
2) Anahtar kelimeleri cikar (5-10 terim)
3) Soru-cikarim ciftleri olustur (3-5 cift)

Cikti: {summary, keywords, qa_pairs}`,
    whenToUseTr: ['Belge onisleme', 'Indeksleme iyilestirme', 'Arama kalitesi artirma'],
    whenToUseEn: ['Document preprocessing', 'Indexing improvement', 'Search quality boost'],
    compatibleWith: ['rag-contextual-headers-001', 'rag-semantic-chunking-001'],
    parameters: [
      { name: 'document', type: 'string', required: true, descriptionTr: 'Zenginlestirilecek belge', descriptionEn: 'Document to augment' },
    ],
    complexity: 'medium',
    effectiveness: 0.76,
    notebook: 'document_augmentation.ipynb',
  },

  // ── ADVANCED RETRIEVAL ──────────────────────────────
  {
    id: 'rag-fusion-001',
    nameTr: 'Fusion Retrieval',
    nameEn: 'Fusion Retrieval',
    category: 'advanced_retrieval',
    icon: '\u{1F300}',
    descriptionTr: 'Vektor ve anahtar kelime arama sonuclarini RRF ile birlestirir.',
    descriptionEn: 'Combines vector and keyword search results using RRF.',
    promptTemplate: `Sorgu: [{query}].
1) Vektor aramasi yap (semantik benzerlik)
2) Anahtar kelime aramasi yap (BM25)
3) Sonuclari RRF (Reciprocal Rank Fusion) ile birlestir: score = Sum(1/(k + rank))

## Birlestirme Parametreleri
- k = 60 (RRF sabiti)
- Vektor agirlik: 0.5, BM25 agirlik: 0.5
- En iyi [{top_k}] sonucu dondur`,
    whenToUseTr: ['Hem semantik hem anahtar kelime arasi', 'Dengeli retrieval', 'Hibrit arama'],
    whenToUseEn: ['Both semantic and keyword search', 'Balanced retrieval', 'Hybrid search'],
    compatibleWith: ['rag-reranking-001', 'rag-ensemble-001'],
    parameters: [
      { name: 'query', type: 'string', required: true, descriptionTr: 'Arama sorgusu', descriptionEn: 'Search query' },
      { name: 'top_k', type: 'number', required: false, descriptionTr: 'Sonuc sayisi', descriptionEn: 'Number of results', defaultValue: '10' },
    ],
    complexity: 'medium',
    effectiveness: 0.84,
    notebook: 'fusion_retrieval.ipynb',
  },
  {
    id: 'rag-reranking-001',
    nameTr: 'Akilli Yeniden Siralama',
    nameEn: 'Intelligent Reranking',
    category: 'advanced_retrieval',
    icon: '\u{1F3AF}',
    descriptionTr: 'Retrieval sonuclarini LLM, Cross-Encoder veya metadata ile yeniden siralar.',
    descriptionEn: 'Reranks results using LLM, Cross-Encoder, or metadata scoring.',
    promptTemplate: `Ilk [{k}] retrieval sonucunu al. Her sonuc icin [{query}] ile alaka duzeyini degerlendir (1-10). En yuksek skorlu [{n}] sonucu dondur.

## Skorlama Kriterleri
1. Dogrudan alakalilik (0-4 puan)
2. Bilgi yogunlugu (0-2 puan)
3. Guncellik (0-2 puan)
4. Kaynak guvenilirligi (0-2 puan)

Aciklama: [neden alakali] ekle.`,
    whenToUseTr: ['Sonuc kalitesini artirma', 'Gurultulu retrieval', 'Hassas siralama'],
    whenToUseEn: ['Improving result quality', 'Noisy retrieval', 'Precise ranking'],
    compatibleWith: ['rag-fusion-001', 'rag-filtering-001'],
    parameters: [
      { name: 'query', type: 'string', required: true, descriptionTr: 'Sorgu', descriptionEn: 'Query' },
      { name: 'k', type: 'number', required: false, descriptionTr: 'Ilk kac sonuc', descriptionEn: 'Initial results', defaultValue: '20' },
      { name: 'n', type: 'number', required: false, descriptionTr: 'Son kac sonuc', descriptionEn: 'Final results', defaultValue: '5' },
    ],
    complexity: 'medium',
    effectiveness: 0.86,
    notebook: 'reranking.ipynb',
  },
  {
    id: 'rag-filtering-001',
    nameTr: 'Cok Yonlu Filtreleme',
    nameEn: 'Multi-faceted Filtering',
    category: 'advanced_retrieval',
    icon: '\u{1F50E}',
    descriptionTr: 'Metadata, benzerlik esigi, icerik ve cesitlilik filtreleri.',
    descriptionEn: 'Metadata, similarity threshold, content, and diversity filters.',
    promptTemplate: `[{results}] uzerinde filtrele:
1) Tarih araligi: [{date_range}]
2) Kaynak turu: [{source_type}]
3) Guvenilirlik skoru: [{min_score}]
4) Cesitlilik: Benzer sonuclari gruplayarak cesitliligi artir

Filtrelenmis sonuclari dondur.`,
    whenToUseTr: ['Zaman duyarli sorgular', 'Kaynak filtreleme', 'Kalite kontrolu'],
    whenToUseEn: ['Time-sensitive queries', 'Source filtering', 'Quality control'],
    compatibleWith: ['rag-reranking-001', 'rag-fusion-001'],
    parameters: [
      { name: 'results', type: 'string', required: true, descriptionTr: 'Filtrelenecek sonuclar', descriptionEn: 'Results to filter' },
      { name: 'date_range', type: 'string', required: false, descriptionTr: 'Tarih araligi', descriptionEn: 'Date range' },
      { name: 'source_type', type: 'string', required: false, descriptionTr: 'Kaynak turu', descriptionEn: 'Source type' },
      { name: 'min_score', type: 'number', required: false, descriptionTr: 'Min skor', descriptionEn: 'Min score', defaultValue: '0.5' },
    ],
    complexity: 'medium',
    effectiveness: 0.78,
    notebook: 'multi_faceted_filtering.ipynb',
  },
  {
    id: 'rag-hierarchical-001',
    nameTr: 'Hiyerarsik Indeksler',
    nameEn: 'Hierarchical Indices',
    category: 'advanced_retrieval',
    icon: '\u{1F332}',
    descriptionTr: 'Iki katmanli indeks: ozetler ve detayli chunklar.',
    descriptionEn: 'Two-tiered indexing: summaries and detailed chunks.',
    promptTemplate: `Belgeyi hiyerarsiye ayir:
1) Ust duzey: ozet (belge basina 2-3 cumle)
2) Orta duzey: bolum ozetleri
3) Alt duzey: detayli chunklar

Sorgu: [{query}]. Once ust duzeyden basla, gerekirse detaya in.

## Navigasyon Stratejisi
- Ust duzey eslerse -> orta duzeye in
- Orta duzey eslerse -> alt duzeye in
- Dogrudan esleme bulunamazsa -> ust duzey ozet don`,
    whenToUseTr: ['Buyuk belge koleksiyonlari', 'Cok katmanli arama', 'Ozetten detaya navigasyon'],
    whenToUseEn: ['Large document collections', 'Multi-level search', 'Summary-to-detail navigation'],
    compatibleWith: ['rag-compression-001', 'rag-reranking-001'],
    parameters: [
      { name: 'query', type: 'string', required: true, descriptionTr: 'Kullanici sorgusu', descriptionEn: 'User query' },
    ],
    complexity: 'high',
    effectiveness: 0.82,
    notebook: 'hierarchical_indices.ipynb',
  },
  {
    id: 'rag-ensemble-001',
    nameTr: 'Ensemble Retrieval',
    nameEn: 'Ensemble Retrieval',
    category: 'advanced_retrieval',
    icon: '\u{1F91D}',
    descriptionTr: 'Birden fazla retrieval modelini birlestirerek sonuc kalitesini arttirir.',
    descriptionEn: 'Combines multiple retrieval models for better result quality.',
    promptTemplate: `[{query}] icin farkli retrieval stratejilerini calistir:
1) Dense embedding (semantik)
2) Sparse BM25 (anahtar kelime)
3) Hybrid (karisik)

Sonuclari agirlikli olarak birlestir:
- Dense: 0.4, Sparse: 0.3, Hybrid: 0.3
- Oylama ile en cok gelen sonuclara oncelik ver`,
    whenToUseTr: ['Yuksek kalite retrieval', 'Coklu model avantaji', 'Genis arama'],
    whenToUseEn: ['High quality retrieval', 'Multi-model advantage', 'Broad search'],
    compatibleWith: ['rag-fusion-001', 'rag-reranking-001'],
    parameters: [
      { name: 'query', type: 'string', required: true, descriptionTr: 'Arama sorgusu', descriptionEn: 'Search query' },
    ],
    complexity: 'high',
    effectiveness: 0.85,
    notebook: 'ensemble_retrieval.ipynb',
  },
  {
    id: 'rag-dartboard-001',
    nameTr: 'Dartboard Retrieval',
    nameEn: 'Dartboard Retrieval',
    category: 'advanced_retrieval',
    icon: '\u{1F3AF}',
    descriptionTr: 'Bilgi kazanci optimizasyonu - alakalilik + cesitlilik dengesi.',
    descriptionEn: 'Information gain optimization - relevance + diversity balance.',
    promptTemplate: `[{query}] icin cesitli retrieval yontemlerini kullan. Her yontemden en iyi sonuclari sec ve cesitlilik skoru ile birlestir.

## Skor Hesaplama
- Alakalilik skoru: cosine_similarity(query, doc)
- Cesitlilik skoru: 1 - max(cosine_similarity(doc, selected_docs))
- Final skor: alpha * alakalilik + (1-alpha) * cesitlilik
- alpha = 0.7`,
    whenToUseTr: ['Cesitli bakis acisi gerektiren sorgular', 'Bilgi kesfi', 'Dengeli sonuclar'],
    whenToUseEn: ['Queries needing diverse perspectives', 'Information discovery', 'Balanced results'],
    compatibleWith: ['rag-ensemble-001', 'rag-reranking-001'],
    parameters: [
      { name: 'query', type: 'string', required: true, descriptionTr: 'Arama sorgusu', descriptionEn: 'Search query' },
    ],
    complexity: 'high',
    effectiveness: 0.81,
    notebook: 'dartboard.ipynb',
  },
  {
    id: 'rag-multimodal-001',
    nameTr: 'Cok Modlu RAG',
    nameEn: 'Multi-modal RAG',
    category: 'advanced_retrieval',
    icon: '\u{1F3A8}',
    descriptionTr: 'Metin, gorsel ve tablo verilerinden birlestik retrieval.',
    descriptionEn: 'Unified retrieval from text, images, and tables.',
    promptTemplate: `Metin: [{text}], Gorsel: [{image}], Tablo: [{table}].
Tum modalitelerden [{query}] ile ilgili bilgileri cikar ve birlestir.

## Modalite Stratejisi
1. Metin: Standart embedding + retrieval
2. Gorsel: Vision model ile caption olustur, sonra embed
3. Tablo: Sutun adlarini ve degerlerini yapisal olarak embed
4. Birlestirme: Tum sonuclari tekil skor ile sirala`,
    whenToUseTr: ['Karisik icerik tipleri', 'Gorsel + metin arama', 'Tablo iceren belgeler'],
    whenToUseEn: ['Mixed content types', 'Image + text search', 'Documents with tables'],
    compatibleWith: ['rag-fusion-001', 'rag-compression-001'],
    parameters: [
      { name: 'text', type: 'string', required: false, descriptionTr: 'Metin icerigi', descriptionEn: 'Text content' },
      { name: 'image', type: 'string', required: false, descriptionTr: 'Gorsel icerigi', descriptionEn: 'Image content' },
      { name: 'table', type: 'string', required: false, descriptionTr: 'Tablo icerigi', descriptionEn: 'Table content' },
      { name: 'query', type: 'string', required: true, descriptionTr: 'Kullanici sorgusu', descriptionEn: 'User query' },
    ],
    complexity: 'high',
    effectiveness: 0.8,
    notebook: 'multi_model_rag_with_captioning.ipynb',
  },

  // ── ITERATIVE TECHNIQUES ────────────────────────────
  {
    id: 'rag-feedback-loop-001',
    nameTr: 'Geri Bildirim Dongusu Retrieval',
    nameEn: 'Retrieval with Feedback Loop',
    category: 'iterative',
    icon: '\u{1F503}',
    descriptionTr: 'Kullanici etkilesimlerinden ogrenerek retrieval kalitesini arttirir.',
    descriptionEn: 'Improves retrieval quality by learning from user interactions.',
    promptTemplate: `1) Ilk retrieval: [{query}] icin [{k}] sonuc al
2) Yanit uret
3) Yanittaki eksik bilgileri tespit et
4) Yeni sorgu: [eksik bilgiler] olustur
5) Tekrar retrieval yap
6) Birlestir ve iyilestir

## Geri Bildirim Metrikleri
- Kullanici tiklamalari
- Dwell time (okuma suresi)
- Explicit feedback (iyi/kotu)
- Sorgu iyilestirmesi`,
    whenToUseTr: ['Eksik bilgi tamamlama', 'Kullanici etkiesimine dayali iyilestirme', 'Surekli ogrenme'],
    whenToUseEn: ['Missing info completion', 'User interaction improvement', 'Continuous learning'],
    compatibleWith: ['rag-iterative-001', 'rag-adaptive-001'],
    parameters: [
      { name: 'query', type: 'string', required: true, descriptionTr: 'Ilk sorgu', descriptionEn: 'Initial query' },
      { name: 'k', type: 'number', required: false, descriptionTr: 'Sonuc sayisi', descriptionEn: 'Result count', defaultValue: '5' },
    ],
    complexity: 'high',
    effectiveness: 0.83,
    notebook: 'retrieval_with_feedback_loop.ipynb',
  },
  {
    id: 'rag-adaptive-001',
    nameTr: 'Adaptif Retrieval',
    nameEn: 'Adaptive Retrieval',
    category: 'iterative',
    icon: '\u{1F9E0}',
    descriptionTr: 'Sorgu karmasikligina gore strateji secer.',
    descriptionEn: 'Selects strategy based on query complexity.',
    promptTemplate: `Sorgu karmasikligina gore strateji sec:
1) Basit sorgu -> tek retrieval yeterli
2) Karmasik sorgu -> multi-hop + query decomposition
3) Belirsiz sorgu -> query expansion + iterative

[{query}] icin uygun strateji: [otomatik sec]

## Karar Agaci
- Sorgu uzunlugu < 10 kelime VE belirli -> Basit
- Sorgu "neden", "nasil", "karsilastir" iceriyorsa -> Karmasik
- Sorgu belirsiz veya cok anlamli -> Belirsiz`,
    whenToUseTr: ['Farkli karmasiklikta sorgular', 'Otomatik strateji secimi', 'Verimli kaynak kullanimi'],
    whenToUseEn: ['Varying complexity queries', 'Automatic strategy selection', 'Efficient resource use'],
    compatibleWith: ['rag-query-transform-001', 'rag-iterative-001'],
    parameters: [
      { name: 'query', type: 'string', required: true, descriptionTr: 'Analiz edilecek sorgu', descriptionEn: 'Query to analyze' },
    ],
    complexity: 'high',
    effectiveness: 0.84,
    notebook: 'adaptive_retrieval.ipynb',
  },
  {
    id: 'rag-iterative-001',
    nameTr: 'Yinelemeli Retrieval',
    nameEn: 'Iterative Retrieval',
    category: 'iterative',
    icon: '\u{1F501}',
    descriptionTr: 'Birden fazla retrieval turu ile bilgiyi kademeli olarak toplar.',
    descriptionEn: 'Gathers information incrementally through multiple retrieval rounds.',
    promptTemplate: `[{query}] icin:
1) Ilk retrieval yap
2) Bulunan bilgileri analiz et
3) Yeni alt-sorgular olustur
4) Yine retrieval yap
5) Sonuclari zincirle
Max iterasyon: [{max_iter}]

## Durdurma Kosullari
- Yeni bilgi kazanimi < %10
- Max iterasyon sayisina ulasildi
- Tum alt-sorgular yanit buldu`,
    whenToUseTr: ['Cok adimli sorgular', 'Derinlemesine arastirma', 'Bilgi toplama'],
    whenToUseEn: ['Multi-step queries', 'Deep research', 'Information gathering'],
    compatibleWith: ['rag-feedback-loop-001', 'rag-adaptive-001'],
    parameters: [
      { name: 'query', type: 'string', required: true, descriptionTr: 'Ana sorgu', descriptionEn: 'Main query' },
      { name: 'max_iter', type: 'number', required: false, descriptionTr: 'Max iterasyon', descriptionEn: 'Max iterations', defaultValue: '3' },
    ],
    complexity: 'high',
    effectiveness: 0.82,
    notebook: 'iterative_retrieval.ipynb',
  },

  // ── EVALUATION ──────────────────────────────────────
  {
    id: 'rag-deepeval-001',
    nameTr: 'DeepEval Degerlendirme',
    nameEn: 'DeepEval Evaluation',
    category: 'evaluation',
    icon: '\u{1F4CA}',
    descriptionTr: 'RAG yanitlarini faithfulness, relevance ve precision ile degerlendirir.',
    descriptionEn: 'Evaluates RAG answers with faithfulness, relevance, and precision.',
    promptTemplate: `Yanit: [{response}], Referans: [{reference}], Context: [{context}].

Metrikler:
1) Faithfulness: context'e uygunluk (0-1)
2) Answer Relevance: sorguya uygunluk (0-1)
3) Contextual Precision: kullanilan context dogrulugu (0-1)
4) Contextual Recall: ilgili bilgilerin ne kadari kullanildi (0-1)

Her metrik icin aciklama ekle.`,
    whenToUseTr: ['RAG kalite olcumu', 'Sistem degerlendirme', 'A/B testi'],
    whenToUseEn: ['RAG quality measurement', 'System evaluation', 'A/B testing'],
    compatibleWith: ['rag-grouse-001', 'rag-explainable-001'],
    parameters: [
      { name: 'response', type: 'string', required: true, descriptionTr: 'Uretilen yanit', descriptionEn: 'Generated response' },
      { name: 'reference', type: 'string', required: false, descriptionTr: 'Referans yanit', descriptionEn: 'Reference answer' },
      { name: 'context', type: 'string', required: true, descriptionTr: 'Kullanilan baglam', descriptionEn: 'Used context' },
    ],
    complexity: 'medium',
    effectiveness: 0.88,
    notebook: 'evaluation_deep_eval.ipynb',
  },
  {
    id: 'rag-grouse-001',
    nameTr: 'GroUSE Degerlendirme',
    nameEn: 'GroUSE Evaluation',
    category: 'evaluation',
    icon: '\u{1F4CB}',
    descriptionTr: 'Gercek kullanici senaryolarinda RAG performansini degerlendirir.',
    descriptionEn: 'Evaluates RAG performance in real user scenarios.',
    promptTemplate: `[{response}] icin gercek kullanici senaryolarini degerlendir:
1) Gorev tamamlama (0-5)
2) Bilgi dogrulugu (0-5)
3) Kullanici memnuniyeti (0-5)
4) Yanit bicimlendirmesi (0-5)
5) Kaynak gostergesi (0-5)
6) Zararsizlik (0-5)

Toplam skor: ortalama / 5`,
    whenToUseTr: ['Kullanici odakli degerlendirme', 'Gercek senaryo testi', 'Kalite metrikleri'],
    whenToUseEn: ['User-centric evaluation', 'Real scenario testing', 'Quality metrics'],
    compatibleWith: ['rag-deepeval-001'],
    parameters: [
      { name: 'response', type: 'string', required: true, descriptionTr: 'Degerlendirilecek yanit', descriptionEn: 'Response to evaluate' },
    ],
    complexity: 'medium',
    effectiveness: 0.85,
    notebook: 'evaluation_grouse.ipynb',
  },
  {
    id: 'rag-explainable-001',
    nameTr: 'Aciklanabilir Retrieval',
    nameEn: 'Explainable Retrieval',
    category: 'evaluation',
    icon: '\u{1F52C}',
    descriptionTr: 'Retrieval surecinde seffaflik saglar. Neden bu sonuc secildi?',
    descriptionEn: 'Provides transparency in retrieval. Why was this result selected?',
    promptTemplate: `Her retrieval sonucu icin aciklama uret:
1) Neden bu sonuc? (eslestirme nedeni)
2) Sorgu ile baglantisi nedir? (ilgili terimler)
3) Guvenilirlik skoru? (0-1)

Format: {result, explanation, confidence, matching_terms}`,
    whenToUseTr: ['Seffaf RAG sistemleri', 'Aciklanabilirlik gereksinimleri', 'Hata ayiklama'],
    whenToUseEn: ['Transparent RAG systems', 'Explainability requirements', 'Debugging'],
    compatibleWith: ['rag-deepeval-001', 'rag-grouse-001'],
    parameters: [],
    complexity: 'medium',
    effectiveness: 0.79,
    notebook: 'explainable_retrieval.ipynb',
  },

  // ── ADVANCED ARCHITECTURE ───────────────────────────
  {
    id: 'rag-graph-001',
    nameTr: 'Graph RAG (LangChain)',
    nameEn: 'Graph RAG (LangChain)',
    category: 'advanced_architecture',
    icon: '\u{1F578}',
    descriptionTr: 'Bilgi grafi olusturarak varliklar ve iliskiler uzerinden retrieval.',
    descriptionEn: 'Creates knowledge graph for entity and relationship-based retrieval.',
    promptTemplate: `Belgeden [{document}] bilgi grafigi cikar:
- Varliklar: Kisi, Organizasyon, Konsept, Tarih, Yer
- Iliskiler: (varlik1) -[iliski]-> (varlik2)

Sorgu: [{query}]. Grafta sorgu ile ilgili yollari bul ve yanit olustur.

## Graf Olusturma
1. NER ile varliklari cikar
2. Varliklar arasi iliskileri tanimla
3. Triplestore formatinda sakla: (subject, predicate, object)
4. Sorguya en yaktin alt-grafi bul`,
    whenToUseTr: ['Iliski agirlikli sorgular', 'Karmasik veri yapilari', 'Bilgi kesfi'],
    whenToUseEn: ['Relationship-heavy queries', 'Complex data structures', 'Knowledge discovery'],
    compatibleWith: ['rag-ms-graphrag-001', 'rag-reranking-001'],
    parameters: [
      { name: 'document', type: 'string', required: true, descriptionTr: 'Kaynak belge', descriptionEn: 'Source document' },
      { name: 'query', type: 'string', required: true, descriptionTr: 'Kullanici sorgusu', descriptionEn: 'User query' },
    ],
    complexity: 'high',
    effectiveness: 0.86,
    notebook: 'graph_rag.ipynb',
  },
  {
    id: 'rag-ms-graphrag-001',
    nameTr: 'Microsoft GraphRAG',
    nameEn: 'Microsoft GraphRAG',
    category: 'advanced_architecture',
    icon: '\u{1F310}',
    descriptionTr: 'Varlik cikartma ve topluluk tabanli hiyerarsik ozetleme.',
    descriptionEn: 'Entity extraction and community-based hierarchical summarization.',
    promptTemplate: `[{documents}] icin topluluk algilama ve ozetleme yap:
1) Varlik merkezli retrieval: Her varlik icin bilgi topla
2) Iliski merkezli retrieval: Varliklar arasi baglantilari kur
3) Topluluk ozetleme: Iliskili varliklari grupla ve ozetle

Sorgu: [{query}]

## GraphRAG Pipeline
1. Belge -> Varlik cikartma (NER)
2. Varlik -> Iliski cikartma
3. Graf -> Topluluk algilama (Leiden)
4. Topluluklar -> Hiyerarsik ozetler
5. Soru -> En ilgili topluluk(lar) -> Yanit`,
    whenToUseTr: ['Buyuk olcekli belge koleksiyonlari', 'Kurumsal bilgi yonetimi', 'Tema kesfetme'],
    whenToUseEn: ['Large document collections', 'Enterprise knowledge management', 'Theme discovery'],
    compatibleWith: ['rag-graph-001', 'rag-raptor-001'],
    parameters: [
      { name: 'documents', type: 'string', required: true, descriptionTr: 'Belge koleksiyonu', descriptionEn: 'Document collection' },
      { name: 'query', type: 'string', required: true, descriptionTr: 'Kullanici sorgusu', descriptionEn: 'User query' },
    ],
    complexity: 'high',
    effectiveness: 0.89,
    notebook: 'Microsoft_GraphRag.ipynb',
  },
  {
    id: 'rag-raptor-001',
    nameTr: 'RAPTOR',
    nameEn: 'RAPTOR',
    category: 'advanced_architecture',
    icon: '\u{1F333}',
    descriptionTr: 'Rekursif soyutlayici islem ile agac yapisinda retrieval.',
    descriptionEn: 'Recursive abstractive processing with tree-organized retrieval.',
    promptTemplate: `Belgeyi hiyerarsik agaca donustur:
- Yapraklar = chunk'lar (orijinal metin)
- Dallar = ozetler (chunklarin birlesmesi)
- Kok = genel ozet

Sorgu [{query}] icin agacta gezinerek en uygun seviyeden yanit al.

## RAPTOR Adimlari
1. Metni chunk'lara bol
2. Chunklari klusturle (UMAP + GMM)
3. Her kluster icin ozet olustur
4. Ozetleri tekrar klusturle (rekursif)
5. Sorguya gore agacin uygun seviyesinden retrieval yap`,
    whenToUseTr: ['Uzun belgeler', 'Farkli soyutlama duzeylerinde arama', 'Ozet + detay birligi'],
    whenToUseEn: ['Long documents', 'Multi-abstraction search', 'Summary + detail unity'],
    compatibleWith: ['rag-hierarchical-001', 'rag-ms-graphrag-001'],
    parameters: [
      { name: 'query', type: 'string', required: true, descriptionTr: 'Kullanici sorgusu', descriptionEn: 'User query' },
    ],
    complexity: 'high',
    effectiveness: 0.87,
    notebook: 'raptor.ipynb',
  },
  {
    id: 'rag-self-001',
    nameTr: 'Self-RAG',
    nameEn: 'Self-RAG',
    category: 'advanced_architecture',
    icon: '\u{1F916}',
    descriptionTr: 'Dinamik olarak retrieval ve generation kararlarini birlestiren RAG.',
    descriptionEn: 'Dynamically combines retrieval and generation decisions.',
    promptTemplate: `[{query}] icin:
1) Retrieval gerekli mi? -> Degerlendir [evet/hayir]
2) Eger evet: retrieval yap ve belgeleri al
3) Taslak yanit uret
4) Taslagi degerlendir: [yeterli mi? / eksik var mi?]
5) Eger yetersiz: retrieval'i iyilestir ve tekrar dene
6) Son yaniti uret ve guvenilirlik skoru ekle

## Ozel Tokenlar
- [Retrieve] : Retrieval gerekli mi?
- [IsRel] : Belge ilgili mi?
- [IsSup] : Yanit destekleniyor mu?
- [IsUse] : Yanit faydali mi?`,
    whenToUseTr: ['Akilli retrieval kararlari', 'Gereksiz retrieval onleme', 'Kalite kontrol'],
    whenToUseEn: ['Smart retrieval decisions', 'Avoiding unnecessary retrieval', 'Quality control'],
    compatibleWith: ['rag-crag-001', 'rag-agentic-001'],
    parameters: [
      { name: 'query', type: 'string', required: true, descriptionTr: 'Kullanici sorgusu', descriptionEn: 'User query' },
    ],
    complexity: 'high',
    effectiveness: 0.88,
    notebook: 'self_rag.ipynb',
  },
  {
    id: 'rag-crag-001',
    nameTr: 'CRAG - Duzeltici RAG',
    nameEn: 'CRAG - Corrective RAG',
    category: 'advanced_architecture',
    icon: '\u{1F527}',
    descriptionTr: 'Retrieval kalitesini degerlendirir ve duzeltir. Dusuk kalitede web aramasiyla destekler.',
    descriptionEn: 'Evaluates and corrects retrieval quality. Falls back to web search when low quality.',
    promptTemplate: `[{query}] icin:
1) Retrieval yap
2) Belge kalitesini degerlendir [yuksek/orta/dusuk]
3) Eger dusuk: web aramasi yap ve sonuclari ekle
4) Belgeyi duzelt ve yanit uret

## Kalite Degerlendirme
- Yuksek (>0.8): Dogrudan kullan
- Orta (0.5-0.8): Ek kaynaklarla destekle
- Dusuk (<0.5): Web aramasina gec

## Duzeltme Adimlari
- Ilgisiz bolumleri cikar
- Tutarsiz bilgileri isaretle
- Ek kaynaktan dogrulama yap`,
    whenToUseTr: ['Dusuk kalite retrieval duzeltme', 'Web destekli RAG', 'Otomatik kalite kontrol'],
    whenToUseEn: ['Low quality retrieval correction', 'Web-backed RAG', 'Automatic quality control'],
    compatibleWith: ['rag-self-001', 'rag-agentic-001'],
    parameters: [
      { name: 'query', type: 'string', required: true, descriptionTr: 'Kullanici sorgusu', descriptionEn: 'User query' },
    ],
    complexity: 'high',
    effectiveness: 0.87,
    notebook: 'crag.ipynb',
  },
  {
    id: 'rag-agentic-001',
    nameTr: 'Agentic RAG',
    nameEn: 'Agentic RAG',
    category: 'advanced_architecture',
    icon: '\u{1F9D1}\u{200D}\u{1F4BB}',
    descriptionTr: 'Otonom ajan tabanli RAG. Retrieve, analyze, generate, validate araclariyla calisir.',
    descriptionEn: 'Autonomous agent-based RAG with retrieve, analyze, generate, validate tools.',
    promptTemplate: `RAG Ajani olarak gorev: [{task}].
Araclar: [retrieve, analyze, generate, validate]

## Calisma Plani
1) Sorgu analizi: Niyeti anla, alt-sorulara ayir
2) Gerekirse retrieval: Hangi kaynaklardan ne aranacak?
3) Cok adimli dusunme: Bulunan bilgileri birlestir
4) Yurutme: Yaniti olustur
5) Dogrulama: Yaniti belgelerle cross-check et

## Karar Matriksi
- retrieve(query) -> documents
- analyze(documents) -> insights
- generate(insights) -> response
- validate(response, documents) -> final_response`,
    whenToUseTr: ['Karmasik, cok adimli gorevler', 'Otonom bilgi toplama', 'Uretim sistemi RAG'],
    whenToUseEn: ['Complex multi-step tasks', 'Autonomous information gathering', 'Production RAG'],
    compatibleWith: ['rag-self-001', 'rag-crag-001', 'rag-graph-001'],
    parameters: [
      { name: 'task', type: 'string', required: true, descriptionTr: 'Ajan gorevi', descriptionEn: 'Agent task' },
    ],
    complexity: 'high',
    effectiveness: 0.91,
    notebook: 'Agentic_RAG.ipynb',
  },
];

// ── Helper Functions ──────────────────────────────────────────────────────────

/** Get techniques by category */
export function getTechniquesByCategory(category: RAGCategory): RAGTechnique[] {
  return RAG_TECHNIQUES.filter((t) => t.category === category);
}

/** Get a single technique by ID */
export function getTechniqueById(id: string): RAGTechnique | undefined {
  return RAG_TECHNIQUES.find((t) => t.id === id);
}

/** Search techniques by keyword */
export function searchTechniques(query: string, lang: 'tr' | 'en'): RAGTechnique[] {
  const q = query.toLowerCase();
  return RAG_TECHNIQUES.filter((t) => {
    const name = lang === 'tr' ? t.nameTr : t.nameEn;
    const desc = lang === 'tr' ? t.descriptionTr : t.descriptionEn;
    const uses = lang === 'tr' ? t.whenToUseTr : t.whenToUseEn;
    return (
      name.toLowerCase().includes(q) ||
      desc.toLowerCase().includes(q) ||
      uses.some((u) => u.toLowerCase().includes(q)) ||
      t.id.toLowerCase().includes(q)
    );
  });
}

/** Get compatible techniques for a given technique */
export function getCompatibleTechniques(techniqueId: string): RAGTechnique[] {
  const technique = getTechniqueById(techniqueId);
  if (!technique) return [];
  return technique.compatibleWith
    .map((id) => getTechniqueById(id))
    .filter((t): t is RAGTechnique => t !== undefined);
}

/** Auto-recommend RAG strategy based on query characteristics */
export function recommendStrategy(query: string): {
  primary: RAGTechnique;
  supporting: RAGTechnique[];
  reasoning: string;
  reasoningTr: string;
} {
  const wordCount = query.split(/\s+/).length;
  const hasComplexIndicators = /neden|nasil|karsilastir|analiz|why|how|compare|analyze/i.test(query);
  const hasDataIndicators = /csv|tablo|table|veri|data|rakam|number/i.test(query);
  const hasGraphIndicators = /iliski|baglanti|relation|connect|network|graf|graph/i.test(query);
  const isAmbiguous = wordCount < 5 && !hasComplexIndicators;

  // Data queries
  if (hasDataIndicators) {
    return {
      primary: getTechniqueById('rag-csv-001')!,
      supporting: [getTechniqueById('rag-reliable-001')!],
      reasoning: 'Data-specific query detected. CSV RAG + validation.',
      reasoningTr: 'Veri odakli sorgu tespit edildi. CSV RAG + dogrulama.',
    };
  }

  // Graph/relationship queries
  if (hasGraphIndicators) {
    return {
      primary: getTechniqueById('rag-graph-001')!,
      supporting: [getTechniqueById('rag-reranking-001')!, getTechniqueById('rag-ms-graphrag-001')!],
      reasoning: 'Relationship-heavy query. Graph RAG recommended.',
      reasoningTr: 'Iliski agirlikli sorgu. Graph RAG oneriliyor.',
    };
  }

  // Complex multi-step queries
  if (hasComplexIndicators && wordCount > 10) {
    return {
      primary: getTechniqueById('rag-agentic-001')!,
      supporting: [
        getTechniqueById('rag-query-transform-001')!,
        getTechniqueById('rag-fusion-001')!,
      ],
      reasoning: 'Complex query detected. Agentic RAG with query transformation + fusion.',
      reasoningTr: 'Karmasik sorgu tespit edildi. Agentic RAG + sorgu donusumu + fusion.',
    };
  }

  // Ambiguous/short queries
  if (isAmbiguous) {
    return {
      primary: getTechniqueById('rag-hyde-001')!,
      supporting: [
        getTechniqueById('rag-iterative-001')!,
        getTechniqueById('rag-reranking-001')!,
      ],
      reasoning: 'Short/ambiguous query. HyDE for better matching + iterative refinement.',
      reasoningTr: 'Kisa/belirsiz sorgu. HyDE ile daha iyi eslestirme + yinelemeli iyilestirme.',
    };
  }

  // Default: Simple + enhancement
  return {
    primary: getTechniqueById('rag-simple-001')!,
    supporting: [
      getTechniqueById('rag-semantic-chunking-001')!,
      getTechniqueById('rag-compression-001')!,
    ],
    reasoning: 'Standard query. Simple RAG with semantic chunking + compression.',
    reasoningTr: 'Standart sorgu. Simple RAG + anlamsal chunking + sikistirma.',
  };
}

/** Build a combined prompt template from selected techniques */
export function buildCombinedPrompt(techniqueIds: string[], language: 'tr' | 'en'): string {
  const techniques = techniqueIds
    .map((id) => getTechniqueById(id))
    .filter((t): t is RAGTechnique => t !== undefined);

  if (techniques.length === 0) return '';

  const header = language === 'tr'
    ? '# RAG Strateji Kompozisyonu\n\nSecilen teknikler ve uygulanma sirasi:\n'
    : '# RAG Strategy Composition\n\nSelected techniques and execution order:\n';

  const body = techniques
    .map((t, i) => {
      const name = language === 'tr' ? t.nameTr : t.nameEn;
      const desc = language === 'tr' ? t.descriptionTr : t.descriptionEn;
      return `## ${i + 1}. ${name}\n${desc}\n\n### Prompt Template\n${t.promptTemplate}\n`;
    })
    .join('\n---\n\n');

  const footer = language === 'tr'
    ? '\n---\n\n## Entegrasyon Notu\nYukaridaki teknikleri siralasiyla uygula. Her adimin ciktisini bir sonraki adimin girdisi olarak kullan.'
    : '\n---\n\n## Integration Note\nApply the above techniques in order. Use each step\'s output as input for the next step.';

  return `${header}\n${body}${footer}`;
}
