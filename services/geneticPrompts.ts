/**
 * Genetic Algorithm — LLM Prompt Templates
 *
 * Mutation ve crossover operasyonları için LLM prompt şablonları.
 * Pattern: services/optimizerPrompts.ts ile aynı yapı.
 */

import type { MutationType, CrossoverType } from '../types/genetic';

// ─── Mutation Labels ─────────────────────────────────────────────────────────

export const MUTATION_LABELS: Record<MutationType, { en: string; tr: string }> = {
  rephrase:            { en: 'Rephrase for clarity',       tr: 'Netlik için yeniden ifade et' },
  add_detail:          { en: 'Add specificity',            tr: 'Detay ekle' },
  remove_redundancy:   { en: 'Remove redundancy',          tr: 'Tekrarı kaldır' },
  swap_framework:      { en: 'Swap framework',             tr: 'Çerçeve değiştir' },
  inject_guardrail:    { en: 'Add safety guardrails',      tr: 'Güvenlik bariyeri ekle' },
  restructure:         { en: 'Restructure sections',       tr: 'Bölümleri yeniden yapılandır' },
  strengthen_criteria: { en: 'Strengthen test criteria',   tr: 'Test kriterlerini güçlendir' },
};

export const CROSSOVER_LABELS: Record<CrossoverType, { en: string; tr: string }> = {
  section_swap:    { en: 'Section swap',     tr: 'Bölüm takası' },
  paragraph_blend: { en: 'Paragraph blend',  tr: 'Paragraf karışımı' },
  strength_merge:  { en: 'Strength merge',   tr: 'Güçlü yön birleştirme' },
};

// ─── Mutation Prompts ────────────────────────────────────────────────────────

export function getMutationPrompt(
  mutationType: MutationType,
  originalPrompt: string,
  weakness: string,
  language: 'tr' | 'en',
): string {
  const instructions: Record<MutationType, { en: string; tr: string }> = {
    rephrase: {
      en: `Rephrase the following master prompt to improve clarity and readability.
The current weakness is: "${weakness}".
Keep the same intent, structure, and constraints but use clearer, more precise language.
Do NOT add new sections or remove existing ones. Focus on wording improvements.`,
      tr: `Aşağıdaki master prompt'u netlik ve okunabilirlik açısından yeniden ifade et.
Mevcut zayıflık: "${weakness}".
Aynı amacı, yapıyı ve kısıtlamaları koru ama daha net, daha kesin bir dil kullan.
Yeni bölüm ekleme veya var olanları kaldırma. Sadece ifade iyileştirmelerine odaklan.`,
    },
    add_detail: {
      en: `Add more specificity and detail to the following master prompt.
The current weakness is: "${weakness}".
Add concrete examples, specific metrics, or clearer constraints where the prompt is vague.
Do NOT change the overall structure or remove existing content.`,
      tr: `Aşağıdaki master prompt'a daha fazla özgüllük ve detay ekle.
Mevcut zayıflık: "${weakness}".
Prompt'un belirsiz olduğu yerlere somut örnekler, belirli metrikler veya daha net kısıtlamalar ekle.
Genel yapıyı değiştirme veya mevcut içeriği kaldırma.`,
    },
    remove_redundancy: {
      en: `Remove redundant or repetitive content from the following master prompt.
The current weakness is: "${weakness}".
Consolidate duplicate instructions, remove unnecessary repetition, and make the prompt more concise.
Keep all unique information intact.`,
      tr: `Aşağıdaki master prompt'tan tekrarlanan veya gereksiz içeriği kaldır.
Mevcut zayıflık: "${weakness}".
Tekrar eden talimatları birleştir, gereksiz tekrarları kaldır ve prompt'u daha özlü yap.
Tüm benzersiz bilgileri koru.`,
    },
    swap_framework: {
      en: `Restructure the following master prompt using a different reasoning framework approach.
The current weakness is: "${weakness}".
Try a different organizational pattern (e.g., if currently sequential, try hierarchical; if role-based, try task-based).
Preserve all the original intent and constraints.`,
      tr: `Aşağıdaki master prompt'u farklı bir akıl yürütme çerçevesi yaklaşımı kullanarak yeniden yapılandır.
Mevcut zayıflık: "${weakness}".
Farklı bir organizasyon deseni dene (örn. sıralıysa hiyerarşik dene; rol tabanlıysa görev tabanlı dene).
Tüm orijinal amaç ve kısıtlamaları koru.`,
    },
    inject_guardrail: {
      en: `Add safety and security guardrails to the following master prompt.
The current weakness is: "${weakness}".
Add input validation instructions, output format constraints, error handling guidance, and ethical boundaries.
Do NOT remove any existing content.`,
      tr: `Aşağıdaki master prompt'a güvenlik bariyerleri ekle.
Mevcut zayıflık: "${weakness}".
Girdi doğrulama talimatları, çıktı format kısıtlamaları, hata yönetimi rehberliği ve etik sınırlar ekle.
Mevcut içerikten hiçbir şey kaldırma.`,
    },
    restructure: {
      en: `Restructure the sections of the following master prompt for better organization.
The current weakness is: "${weakness}".
Reorganize into clear SYSTEM/DEVELOPER/USER sections if not already present.
Add section headers, improve flow, and ensure logical ordering of instructions.`,
      tr: `Aşağıdaki master prompt'un bölümlerini daha iyi bir organizasyon için yeniden yapılandır.
Mevcut zayıflık: "${weakness}".
Yoksa net SYSTEM/DEVELOPER/USER bölümlerine ayır.
Bölüm başlıkları ekle, akışı iyileştir ve talimatların mantıksal sıralamasını sağla.`,
    },
    strengthen_criteria: {
      en: `Add testability and reproducibility criteria to the following master prompt.
The current weakness is: "${weakness}".
Add specific success criteria, expected output format, evaluation metrics, and acceptance conditions.
Make the prompt's output measurable and verifiable.`,
      tr: `Aşağıdaki master prompt'a test edilebilirlik ve tekrarlanabilirlik kriterleri ekle.
Mevcut zayıflık: "${weakness}".
Belirli başarı kriterleri, beklenen çıktı formatı, değerlendirme metrikleri ve kabul koşulları ekle.
Prompt'un çıktısını ölçülebilir ve doğrulanabilir yap.`,
    },
  };

  const inst = instructions[mutationType][language];

  return `${inst}

--- ORIGINAL MASTER PROMPT ---
${originalPrompt}
--- END ---

Return ONLY the improved master prompt text. No explanations, no markdown wrapping.`;
}

// ─── Crossover Prompts ───────────────────────────────────────────────────────

export function getCrossoverPrompt(
  parent1: string,
  parent2: string,
  crossoverType: CrossoverType,
  language: 'tr' | 'en',
): string {
  const instructions: Record<CrossoverType, { en: string; tr: string }> = {
    section_swap: {
      en: `You are given two master prompts (Parent A and Parent B). Create a new master prompt by combining the best sections from each:
- Take the sections with the clearest instructions from each parent
- Ensure the combined result is coherent and non-contradictory
- If both parents have similar sections, pick the better-written one
- Maintain a logical flow in the final prompt`,
      tr: `Sana iki master prompt veriliyor (Ebeveyn A ve Ebeveyn B). Her birinden en iyi bölümleri birleştirerek yeni bir master prompt oluştur:
- Her ebeveynden en net talimatlara sahip bölümleri al
- Birleştirilmiş sonucun tutarlı ve çelişkisiz olmasını sağla
- Her iki ebeveynde benzer bölümler varsa daha iyi yazılanı seç
- Son prompt'ta mantıksal bir akış koru`,
    },
    paragraph_blend: {
      en: `You are given two master prompts (Parent A and Parent B). Create a new master prompt by interleaving the best paragraphs:
- Alternate between parents, selecting the stronger paragraph at each position
- Merge overlapping content into a single, improved version
- Remove any contradictions between the blended paragraphs
- Ensure smooth transitions between paragraphs from different parents`,
      tr: `Sana iki master prompt veriliyor (Ebeveyn A ve Ebeveyn B). En iyi paragrafları serpiştirerek yeni bir master prompt oluştur:
- Her konumda daha güçlü paragrafı seçerek ebeveynler arasında geçiş yap
- Örtüşen içeriği tek bir iyileştirilmiş versiyona birleştir
- Harmanlanmış paragraflar arasındaki çelişkileri kaldır
- Farklı ebeveynlerden gelen paragraflar arasında yumuşak geçişler sağla`,
    },
    strength_merge: {
      en: `You are given two master prompts (Parent A and Parent B). Create a new master prompt by taking the strongest aspects of each:
- Identify the strongest qualities in each parent (clarity, specificity, structure, safety, etc.)
- Combine these strengths into a single, superior prompt
- Ensure no quality is lost from either parent's best features
- The result should be better than either parent individually`,
      tr: `Sana iki master prompt veriliyor (Ebeveyn A ve Ebeveyn B). Her birinin en güçlü yönlerini alarak yeni bir master prompt oluştur:
- Her ebeveyndeki en güçlü nitelikleri belirle (netlik, özgüllük, yapı, güvenlik vb.)
- Bu güçlü yönleri tek, üstün bir prompt'ta birleştir
- Her iki ebeveynin en iyi özelliklerinden hiçbir kalitenin kaybolmadığından emin ol
- Sonuç her iki ebeveynden tek başına daha iyi olmalı`,
    },
  };

  const inst = instructions[crossoverType][language];

  return `${inst}

--- PARENT A ---
${parent1}
--- END PARENT A ---

--- PARENT B ---
${parent2}
--- END PARENT B ---

Return ONLY the new combined master prompt text. No explanations, no markdown wrapping.`;
}

// ─── System Prompts ──────────────────────────────────────────────────────────

export function getGeneticSystemPrompt(language: 'tr' | 'en'): string {
  if (language === 'tr') {
    return `Sen bir prompt mühendisliği uzmanısın. Görevin, verilen talimatları takip ederek master prompt'ları iyileştirmek, birleştirmek veya dönüştürmektir.

Kurallar:
- SADECE istenen master prompt metnini döndür
- Açıklama, yorum veya markdown sarmalama EKLEME
- Orijinal amacı ve kısıtlamaları KORU
- İyileştirmeyi belirtilen zayıflığa ODAKLA
- Sonuç, orijinalden ÖLÇÜLEBİLİR şekilde daha iyi olmalı`;
  }
  return `You are a prompt engineering expert. Your task is to improve, combine, or transform master prompts following the given instructions.

Rules:
- Return ONLY the requested master prompt text
- Do NOT add explanations, comments, or markdown wrapping
- PRESERVE the original intent and constraints
- FOCUS the improvement on the specified weakness
- The result must be MEASURABLY better than the original`;
}

// ─── MASTER_PROMPT Template for Genetic Lab ──────────────────────────────────

export const GENETIC_LAB_MASTER_TEMPLATE = `<MASTER_PROMPT>
  <METADATA>
    Version: 2.0 | Framework: Hybrid RISEN-KERNEL
    Domain: Genetik Laboratuvarı & Biyoanaliz
  </METADATA>

  <PERSONA_FACETS>
    - ROLE: Klinik Genetik Uzmanı & Laboratuvar Direktörü
    - STANCE: Bilimsel titizlik, etik hassasiyet, veriye dayalı analiz
    - PURPOSE: Genetik test sonuçlarının doğru yorumlanması, hasta danışmanlığı ve laboratuvar iş akışı optimizasyonu
    - BIO: 15+ yıl moleküler genetik, sitogenetik ve biyoinformatik deneyimi. CAP/CLIA akredite laboratuvarlarda çalışmış. NGS, PCR, Sanger sekanslama ve mikroarray platformlarında uzman.
  </PERSONA_FACETS>

  <CONTEXT_AND_CONSTRAINTS>
    <LORE>
      - HGVS (Human Genome Variation Society) nomenclature standartları
      - ACMG (American College of Medical Genetics) varyant sınıflandırma kriterleri
      - GRCh37/GRCh38 referans genom versiyonları
      - FDA/EMA ilgili genetik test düzenlemeleri
      - HIPAA/GDPR veri gizliliği protokolleri
      - CLIA/CAP laboratuvar akreditasyon standartları
      - PubMed/ClinVar/OMIM veritabanı yapıları
    </LORE>
    <GUARDRAILS>
      - Tıbbi tanı koyma yetkisi olmadığını her zaman belirt.
      - Genetik verileri anonimleştir, PHI (Protected Health Information) sızdırma.
      - ACMG yönergelerine göre varyant patojenite sınıflandırması yap.
      - Germline vs somatik mutasyon ayrımına dikkat et.
      - Populasyon alel frekanslarını (gnomAD, 1000G) kontrol et.
      - Dizileme derinliği ve kalite metriklerini değerlendir.
    </GUARDRAILS>
  </CONTEXT_AND_CONSTRAINTS>

  <REASONING_PROTOCOL>
    Her yanıttan önce <thinking> etiketleri içinde:
    1. Örnek tipini belirle (kan, doku, amniyon sıvısı vb.) ve preanalitik değişkenleri kontrol et.
    2. Klinik endikasyonu analiz et (dizileme paneli seçimi için).
    3. Biyoinformatik pipeline uygunluğunu doğrula (FASTQ → VCF workflow).
    4. Varyant kalite skorlarını (QUAL, DP, GQ) değerlendir.
    5. Literatür desteği ve fonksiyonel evidans seviyesini belirle.
    6. Raporlama sınırlamaları ve izin gereksinimlerini kontrol et.
    7. Etik ve psikososyal etkileri değerlendir (predispozisyon, taşıyıcılık, incidental findings).
  </REASONING_PROTOCOL>

  <INTEGRATION_STANDARDS>
    - Code Style: ISO 15189 laboratuvar bilgi yönetimi standartlarına uygun
    - Security: Genetik veriler şifrelenmiş olarak işle, blockchain tabanlı loglama kullan
    - Output: HGVS-compliant varyant nomenclature + ACMG patojenite sınıflandırması + klinik özet raporu formatında çıktı üret
  </INTEGRATION_STANDARDS>
</MASTER_PROMPT>`;

/**
 * MASTER_PROMPT yapısı kullanarak genetik lab için optimize edilmiş prompt oluşturur
 */
export function getMasterPromptWithTemplate(
  intent: string,
  language: 'tr' | 'en',
  _customPersona?: string,
  _customLore?: string,
): string {
  if (language === 'tr') {
    return `Aşağıdaki MASTER_PROMPT şablonunu kullanarak, verilen amaca uygun bir prompt oluştur.

${GENETIC_LAB_MASTER_TEMPLATE}

Şablon yapısını koru ancak içeriği aşağıdaki amaca göre özelleştir:
AMAC: ${intent}

ÖZELLEŞTİRME KURALLARI:
1. PERSONA_FACETS bölümünde ROLE, STANCE, PURPOSE ve BIO'yu yukarıdaki amaca göre uyarla
2. CONTEXT_AND_CONSTRAINTS içindeki LORE'u amaca uygun domain bilgisi ile güncelle
3. REASONING_PROTOCOL adımlarını amaca uygun analiz adımlarına dönüştür
4. INTEGRATION_STANDARDS'ı amaca uygun format ve standartlarla güncelle
5. XML etiket yapısını ve METADATA bölümünü koru
6. SADECE MASTER_PROMPT içeriğini döndür, açıklama ekleme`;
  }

  return `Create a prompt using the following MASTER_PROMPT template, customized for the given intent.

${GENETIC_LAB_MASTER_TEMPLATE}

Preserve the template structure but customize the content for:
INTENT: ${intent}

CUSTOMIZATION RULES:
1. Adapt ROLE, STANCE, PURPOSE and BIO in PERSONA_FACETS for the intent above
2. Update LORE in CONTEXT_AND_CONSTRAINTS with domain-relevant knowledge
3. Transform REASONING_PROTOCOL steps into intent-appropriate analysis steps
4. Update INTEGRATION_STANDARDS with relevant format and standards
5. Preserve XML tag structure and METADATA section
6. Return ONLY the MASTER_PROMPT content, no explanations`;
}
