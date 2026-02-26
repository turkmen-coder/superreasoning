/**
 * Girdiyi anlamı bozmadan mümkün olan en kısa karaktere sıkıştırır.
 * - Fazla boşluk, satır sonları ve tekrarlayan noktalama birleştirilir.
 */
export function compressIntent(text: string): string {
  if (!text || !text.trim()) return text;

  return (
    text
      .trim()
      // Birden fazla boşluğu/satır sonunu tek boşluğa indir
      .replace(/\s+/g, ' ')
      // Noktalama etrafındaki gereksiz boşlukları kaldır ( , . ; : ! ? )
      .replace(/\s*([,.;:!?])\s*/g, '$1 ')
      .replace(/\s+([,.;:!?])\s*/g, '$1 ')
      // Baş/sondaki boşlukları tekrar temizle
      .trim()
  );
}
