"""
Semantic Kernel RAG Pipeline.
InMemoryCollection ile prompt araması + LLM sentezi.
Zvec backend desteği: yerel HNSW indeksi ile hızlı semantik arama.
"""

import json
import os
import logging
from dataclasses import dataclass
from typing import Annotated, Optional

from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import (
    OpenAIChatCompletion,
    OpenAITextEmbedding,
)
from semantic_kernel.connectors.in_memory import InMemoryCollection
from semantic_kernel.data.vector import (
    VectorStoreField,
    vectorstoremodel,
)

log = logging.getLogger(__name__)

# ---------- Zvec Backend ----------

ZVEC_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "zvec-rag-db")
ZVEC_DIM = 1536  # text-embedding-3-small boyutu


class ZvecRAGBackend:
    """
    Zvec tabanlı RAG backend.
    Kullanıcının zvec pipeline kodunu production-ready hale getirir.
    Zvec kurulu değilse None döner, pipeline InMemory fallback'e geçer.
    """

    def __init__(self):
        self.collection = None
        self._doc_store: dict[str, str] = {}  # id -> metin içeriği
        self._meta_store: dict[str, dict] = {}  # id -> metadata
        self.ready = False

    def initialize(self) -> bool:
        """Zvec koleksiyonunu başlat. Başarılı ise True döner."""
        try:
            import zvec  # type: ignore
            import numpy as np  # noqa: F401 — varlık kontrolü

            import shutil
            db_path = os.path.realpath(ZVEC_DB_PATH)

            schema = zvec.CollectionSchema(
                name="reach_knowledge_base",
                vectors=zvec.VectorSchema(
                    "embedding",
                    zvec.DataType.VECTOR_FP32,
                    ZVEC_DIM,
                ),
            )
            # zvec.create_and_open requires the path to NOT exist
            if os.path.exists(db_path):
                shutil.rmtree(db_path)
            self.collection = zvec.create_and_open(path=db_path, schema=schema)
            log.info("[ZvecRAG] Collection ready at %s", db_path)

            self.ready = True
            return True
        except ImportError:
            log.warning("[ZvecRAG] zvec not installed — using InMemory fallback")
            return False
        except Exception as e:
            log.warning("[ZvecRAG] Init failed (%s) — using InMemory fallback", e)
            return False

    def upsert(self, doc_id: str, vector: list[float], text: str, metadata: Optional[dict] = None):
        """Belgeyi zvec koleksiyonuna ekle/güncelle."""
        if not self.ready or self.collection is None:
            raise RuntimeError("ZvecRAG not initialized")
        import zvec  # type: ignore

        self.collection.insert([
            zvec.Doc(id=doc_id, vectors={"embedding": vector})
        ])
        self._doc_store[doc_id] = text
        self._meta_store[doc_id] = metadata or {}

    def search(self, query_vector: list[float], top_k: int = 5) -> list[dict]:
        """Semantik arama — en yakın top_k belgeyi döndür."""
        if not self.ready or self.collection is None:
            raise RuntimeError("ZvecRAG not initialized")
        import zvec  # type: ignore

        results = self.collection.query(
            zvec.VectorQuery("embedding", vector=query_vector),
            topk=top_k,
        )
        output = []
        for r in results:
            doc_id = r["id"]
            output.append({
                "id": doc_id,
                "score": round(float(r.get("score", 0.0)), 4),
                "content": self._doc_store.get(doc_id, ""),
                "metadata": self._meta_store.get(doc_id, {}),
            })
        return output

    def count(self) -> int:
        return len(self._doc_store)


# Singleton zvec backend
_zvec_backend: Optional[ZvecRAGBackend] = None


def get_zvec_backend() -> Optional[ZvecRAGBackend]:
    """Zvec backend singleton — ilk çağrıda başlatılır."""
    global _zvec_backend
    if _zvec_backend is None:
        backend = ZvecRAGBackend()
        if backend.initialize():
            _zvec_backend = backend
    return _zvec_backend

# ---------- Data Model ----------

@vectorstoremodel(collection_name="prompts")
@dataclass
class PromptItem:
    id: Annotated[str, VectorStoreField("key")]
    content: Annotated[str, VectorStoreField("data")]
    name: Annotated[str, VectorStoreField("data")]
    category: Annotated[str, VectorStoreField("data")]
    tags_str: Annotated[str, VectorStoreField("data")]
    embedding: Annotated[
        list[float] | str | None,
        VectorStoreField(
            "vector",
            dimensions=1536,
            embedding_generator=OpenAITextEmbedding(
                ai_model_id="text-embedding-3-small",
            ),
        ),
    ] = None


# ---------- RAG Pipeline ----------

class RAGPipeline:
    def __init__(self):
        self.kernel: Kernel | None = None
        self.collection: InMemoryCollection | None = None
        self.zvec: Optional[ZvecRAGBackend] = None
        self.embedding_service: Optional[OpenAITextEmbedding] = None
        self.loaded = False
        self.prompt_count = 0
        self.backend = "inmemory"  # 'zvec' | 'inmemory'

    async def initialize(self, prompts_path: str | None = None):
        """Kernel ve koleksiyonu başlat, prompt'ları yükle."""
        self.kernel = Kernel()

        # LLM servisi
        chat_model = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
        self.kernel.add_service(OpenAIChatCompletion(ai_model_id=chat_model))

        # Embedding servisi
        self.embedding_service = OpenAITextEmbedding(ai_model_id="text-embedding-3-small")
        self.kernel.add_service(self.embedding_service)

        # Zvec backend'i dene — başarısız olursa InMemory'ye düş
        self.zvec = get_zvec_backend()
        if self.zvec:
            self.backend = "zvec"
            log.info("[RAGPipeline] Using zvec backend")
        else:
            self.backend = "inmemory"
            log.info("[RAGPipeline] Using InMemory backend")

        # InMemory koleksiyon (her zaman başlat — zvec yoksa primary, varsa fallback)
        self.collection = InMemoryCollection[str, PromptItem](
            record_type=PromptItem,
            collection_name="prompts",
            embedding_generator=self.embedding_service,
        )
        await self.collection.ensure_collection_exists()

        # Prompt'ları yükle
        if prompts_path is None:
            prompts_path = os.path.join(
                os.path.dirname(__file__), "..", "data", "prompts-export.json"
            )

        if os.path.exists(prompts_path):
            await self._load_prompts(prompts_path)

        # Kernel'a arama fonksiyonu ekle (InMemory üzerinden — SK entegrasyonu için)
        self.kernel.add_function(
            "memory",
            self.collection.create_search_function(
                function_name="search",
                description="Search prompt library for relevant prompts",
                top=5,
                string_mapper=lambda r: (
                    f"[{r.record.category}] {r.record.name}: {r.record.content}"
                ),
            ),
        )

        self.loaded = True

    async def _load_prompts(self, path: str):
        """JSON'dan prompt'ları yükle — hem InMemory hem zvec'e ekle."""
        with open(path, "r", encoding="utf-8") as f:
            prompts = json.load(f)

        for p in prompts:
            text_for_embed = f"{p['prompt']} | {p['name']} | {', '.join(p.get('tags', []))}"
            item = PromptItem(
                id=p["id"],
                content=p["prompt"],
                name=p["name"],
                category=p["category"],
                tags_str=", ".join(p.get("tags", [])),
                embedding=text_for_embed,
            )
            await self.collection.upsert(item)

            # Zvec'e de ekle (embedding'i SK'dan alıyoruz — async)
            if self.zvec and self.embedding_service:
                try:
                    from semantic_kernel.contents import TextContent  # noqa
                    vectors = await self.embedding_service.generate_raw_embeddings(
                        [text_for_embed]
                    )
                    if vectors and len(vectors) > 0:
                        self.zvec.upsert(
                            doc_id=p["id"],
                            vector=list(vectors[0]),
                            text=p["prompt"],
                            metadata={
                                "name": p["name"],
                                "category": p["category"],
                                "tags": p.get("tags", []),
                            },
                        )
                except Exception as e:
                    log.warning("[ZvecRAG] Failed to index %s: %s", p["id"], e)

        self.prompt_count = len(prompts)

    async def ask(self, query: str, top_k: int = 5, language: str = "en") -> dict:
        """RAG: Semantik arama + LLM sentezi."""
        if not self.loaded or not self.kernel:
            raise RuntimeError("Pipeline not initialized")

        lang_instruction = "Respond in Turkish." if language == "tr" else "Respond in English."

        prompt_template = f"""You are a helpful prompt engineering assistant.
Use ONLY the context below to answer the user's question.
If the context doesn't contain relevant information, say so.
{lang_instruction}

## Retrieved Prompts (Context)
{{{{memory.search $query}}}}

## User Question
{{{{$query}}}}

## Instructions
1. Identify the most relevant prompts from the context
2. Synthesize a helpful answer that recommends specific prompts
3. Explain WHY each recommended prompt is relevant
4. Keep your answer concise and actionable
"""

        result = await self.kernel.invoke_prompt(
            prompt=prompt_template,
            plugin_name="rag",
            function_name="ask",
            query=query,
        )

        # Ayrıca raw search sonuçlarını da al
        search_results = await self.collection.search(
            values=query,
            top=top_k,
        )

        sources = []
        async for r in search_results.results:
            sources.append({
                "id": r.record.id,
                "name": r.record.name,
                "category": r.record.category,
                "score": round(r.score, 4) if r.score else 0,
                "snippet": r.record.content[:200],
            })

        return {
            "query": query,
            "answer": str(result),
            "sources": sources,
            "grounded": len(sources) > 0,
            "provider": "openai",
        }

    async def _embed_query(self, query: str) -> Optional[list[float]]:
        """Sorgu metnini embedding vektörüne çevir."""
        if not self.embedding_service:
            return None
        try:
            vectors = await self.embedding_service.generate_raw_embeddings([query])
            return list(vectors[0]) if vectors else None
        except Exception as e:
            log.warning("[RAGPipeline] Embedding failed: %s", e)
            return None

    async def search(self, query: str, top_k: int = 10) -> dict:
        """Zenginleştirilmiş semantik arama — zvec varsa zvec, yoksa InMemory."""
        if not self.loaded:
            raise RuntimeError("Pipeline not initialized")

        # Zvec backend üzerinden arama
        if self.zvec and self.zvec.ready:
            query_vector = await self._embed_query(query)
            if query_vector:
                zvec_results = self.zvec.search(query_vector, top_k=top_k)
                return {
                    "query": query,
                    "results": [
                        {
                            "id": r["id"],
                            "name": r["metadata"].get("name", ""),
                            "category": r["metadata"].get("category", ""),
                            "tags": r["metadata"].get("tags", []),
                            "score": r["score"],
                            "content": r["content"],
                        }
                        for r in zvec_results
                    ],
                    "total": len(zvec_results),
                    "backend": "zvec",
                }

        # InMemory fallback
        if not self.collection:
            raise RuntimeError("No search backend available")

        search_results = await self.collection.search(values=query, top=top_k)
        results = []
        async for r in search_results.results:
            results.append({
                "id": r.record.id,
                "name": r.record.name,
                "category": r.record.category,
                "tags": r.record.tags_str.split(", ") if r.record.tags_str else [],
                "score": round(r.score, 4) if r.score else 0,
                "content": r.record.content,
            })

        return {
            "query": query,
            "backend": "inmemory",
            "results": results,
            "total": len(results),
        }

    async def reload(self, prompts_path: str | None = None):
        """Prompt verisini yeniden yükle."""
        if self.collection:
            await self.initialize(prompts_path)
        return {"reloaded": True, "count": self.prompt_count}


# Singleton
pipeline = RAGPipeline()
