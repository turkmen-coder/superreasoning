"""
Semantic Kernel RAG Microservice.
FastAPI + SK ile prompt kütüphanesi RAG pipeline.

Kullanım: uvicorn main:app --port 4200
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# .env yükle (parent dir'den de)
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from rag_pipeline import pipeline


# ---------- Lifespan ----------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: pipeline'ı başlat."""
    try:
        await pipeline.initialize()
        print(f"[SK-RAG] Pipeline initialized — {pipeline.prompt_count} prompts loaded")
    except Exception as e:
        print(f"[SK-RAG] Pipeline init failed: {e}")
    yield


# ---------- App ----------

app = FastAPI(
    title="Super Reasoning SK-RAG Service",
    version="1.0.0",
    lifespan=lifespan,
)


# ---------- Models ----------

class AskRequest(BaseModel):
    query: str
    top_k: int = Field(default=5, ge=1, le=50, alias="topK")
    language: str = Field(default="en", pattern="^(tr|en)$")

    class Config:
        populate_by_name = True


class SearchRequest(BaseModel):
    query: str
    top_k: int = Field(default=10, ge=1, le=50, alias="topK")

    class Config:
        populate_by_name = True


# ---------- Endpoints ----------

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "sk-rag",
        "ready": pipeline.loaded,
        "promptCount": pipeline.prompt_count,
        "backend": pipeline.backend,
        "zvecReady": pipeline.zvec is not None and pipeline.zvec.ready if pipeline.zvec else False,
    }


@app.post("/rag/ask")
async def rag_ask(req: AskRequest):
    if not pipeline.loaded:
        raise HTTPException(503, "RAG pipeline not ready")
    try:
        result = await pipeline.ask(
            query=req.query,
            top_k=req.top_k,
            language=req.language,
        )
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/rag/search")
async def rag_search(req: SearchRequest):
    if not pipeline.loaded:
        raise HTTPException(503, "RAG pipeline not ready")
    try:
        result = await pipeline.search(
            query=req.query,
            top_k=req.top_k,
        )
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/reload")
async def reload():
    try:
        result = await pipeline.reload()
        return result
    except Exception as e:
        raise HTTPException(500, str(e))
