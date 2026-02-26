/**
 * Vektör DB Seed Script.
 * Tüm prompt'lar için OpenAI embedding üretir ve vektör store'a yükler.
 *
 * Kullanım: npm run seed:vectors
 */

import 'dotenv/config';
import { loadPromptCorpus, getPromptCorpusTarget } from '../lib/promptCorpus';
import { generateEmbeddings, getCacheSize, getProviderInfo } from '../lib/embeddings';
import { initVectorStore } from '../lib/vectorStore';
import type { VectorDoc } from '../lib/vectorStore';

async function main() {
  const info = getProviderInfo();

  const target = getPromptCorpusTarget();
  const allPrompts = await loadPromptCorpus(target);

  console.log(`[seed:vectors] Provider: ${info.provider} (${info.model}, ${info.dim || '?'}-dim)`);
  console.log(`[seed:vectors] Hedef: ${target}, Yüklenen: ${allPrompts.length}`);

  // Embedding text'leri oluştur
  const texts: string[] = [];
  const promptInfos: Array<{ id: string; metadata: VectorDoc['metadata'] }> = [];

  for (const p of allPrompts) {
    const text = `${p.promptEn} | ${p.nameEn} | ${p.tags.join(', ')}`;
    texts.push(text);
    promptInfos.push({
      id: p.id,
      metadata: {
        name: p.nameEn,
        category: p.categoryEn,
        tags: p.tags,
        lang: 'en',
      },
    });
  }

  // Embedding üret (batch, cache'li)
  console.log('[seed:vectors] Embedding üretiliyor...');
  const vectors = await generateEmbeddings(texts, (done, total) => {
    process.stdout.write(`\r[seed:vectors] Embedding: ${done}/${total}`);
  });
  console.log('');
  console.log(`[seed:vectors] ${vectors.length} embedding üretildi (cache: ${getCacheSize()})`);

  // Vektör store init
  const store = await initVectorStore();

  // Upsert
  const docs: VectorDoc[] = [];
  for (let i = 0; i < texts.length; i++) {
    if (vectors[i]) {
      docs.push({
        id: promptInfos[i].id,
        vector: vectors[i],
        metadata: promptInfos[i].metadata,
      });
    }
  }

  const upserted = await store.upsert(docs);
  console.log(`[seed:vectors] ${upserted} vektör ${store.name} backend'e yüklendi`);
  console.log(`[seed:vectors] Toplam: ${store.count()} vektör`);
  console.log('[seed:vectors] Tamamlandı!');
}

main().catch((err) => {
  console.error('[seed:vectors] Hata:', err.message);
  process.exit(1);
});
