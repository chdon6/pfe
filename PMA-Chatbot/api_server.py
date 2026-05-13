"""
HTTP API for the PMA assistant (per-user Chroma + Ollama).

Run (dev):
  set PMA_API_KEY=dev-secret
  uvicorn api_server:app --host 127.0.0.1 --port 8000

The .NET backend calls this service with X-Api-Key; browsers should never talk to it directly.
"""

from __future__ import annotations

import os
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel, Field

from pma_rag import (
    build_embeddings,
    build_qa_chain,
    clear_user_store,
    greeting_answer,
    is_simple_greeting,
    load_vectorstore,
    safe_user_id,
    user_persist_path,
)

app = FastAPI(title="PMA Assistant Engine", version="1.0.0")


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    expected = os.environ.get("PMA_API_KEY", "").strip()
    if not expected:
        raise HTTPException(status_code=500, detail="PMA_API_KEY is not configured on the engine")
    if (x_api_key or "").strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")


class IngestDoc(BaseModel):
    text: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class IngestRequest(BaseModel):
    user_id: str
    documents: list[IngestDoc] = Field(default_factory=list)
    replace_store: bool = True


class ChatRequest(BaseModel):
    user_id: str
    message: str = Field(min_length=1)


class SourceChunk(BaseModel):
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceChunk] = Field(default_factory=list)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/internal/ingest", dependencies=[Depends(require_api_key)])
def ingest(body: IngestRequest) -> dict[str, Any]:
    try:
        uid = safe_user_id(body.user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    if body.replace_store:
        clear_user_store(uid)

    if not body.documents:
        return {"ingested": 0, "user_id": uid}

    embeddings = build_embeddings()
    persist = user_persist_path(uid)
    base_docs = [Document(page_content=d.text, metadata=d.metadata or {}) for d in body.documents]
    splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=120)
    docs = splitter.split_documents(base_docs)
    Chroma.from_documents(docs, embeddings, persist_directory=persist).persist()
    return {"ingested": len(docs), "user_id": uid}


@app.post("/internal/chat", dependencies=[Depends(require_api_key)])
def chat(body: ChatRequest) -> ChatResponse:
    try:
        uid = safe_user_id(body.user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    msg = body.message.strip()
    if is_simple_greeting(msg):
        return ChatResponse(answer=greeting_answer(), sources=[])

    try:
        qa = build_qa_chain(uid)
        out = qa.invoke({"query": msg})
    except Exception as ex:  # noqa: BLE001 — surface engine errors to API consumer
        raise HTTPException(status_code=502, detail=f"Assistant engine error: {ex}") from ex

    answer = (out.get("result") or "").strip()
    raw_docs = out.get("source_documents") or []
    sources: list[SourceChunk] = []
    for d in raw_docs:
        sources.append(SourceChunk(content=(d.page_content or "").strip(), metadata=dict(d.metadata or {})))
    return ChatResponse(answer=answer or "Réponse vide du modèle.", sources=sources)
