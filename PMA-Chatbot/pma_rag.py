"""Shared RAG setup for PMA assistant (CLI + HTTP API)."""

from __future__ import annotations

import os
import re
import shutil
from pathlib import Path

from langchain_classic.chains import RetrievalQA
from langchain_community.llms import Ollama
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import PromptTemplate
from langchain_huggingface import HuggingFaceEmbeddings

PMA_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template="""You are a PMA (assisted reproduction) documentation assistant, similar to a clinical copilot: precise and faithful to the record.

Rules:
- Answer ONLY from the Context below. If the Context is empty or does not contain the answer, say clearly that this information is not in the provided PMA extracts — do not invent clinical facts.
- For greetings or small talk, reply briefly and invite the user to ask about dossiers, cycles, protocols, or outcomes in the Context.
- Use the same language as the user's question when reasonable (French or English).
- Remind that output is for documentation support and must be validated by qualified staff; you do not make medical decisions.

Context:
{context}

Question:
{question}

Answer:""",
)

_SIMPLE_GREETINGS = frozenset(
    {
        "hi",
        "hello",
        "hey",
        "bonjour",
        "salut",
        "coucou",
        "good morning",
        "good afternoon",
        "good evening",
    }
)


def chroma_root() -> Path:
    return Path(os.environ.get("PMA_CHROMA_ROOT", Path(__file__).resolve().parent / "chroma_users"))


def safe_user_id(user_id: str) -> str:
    uid = (user_id or "").strip()
    if not re.fullmatch(r"[0-9]+", uid):
        raise ValueError("user_id must be a numeric string")
    return uid


def user_persist_path(user_id: str) -> str:
    uid = safe_user_id(user_id)
    path = chroma_root() / uid
    path.mkdir(parents=True, exist_ok=True)
    return str(path)


def clear_user_store(user_id: str) -> None:
    uid = safe_user_id(user_id)
    path = chroma_root() / uid
    if path.is_dir():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def build_embeddings() -> HuggingFaceEmbeddings:
    model = os.environ.get("PMA_EMBED_MODEL", "all-MiniLM-L6-v2")
    return HuggingFaceEmbeddings(model_name=model)


def build_llm() -> Ollama:
    model = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")
    base_url = os.environ.get("OLLAMA_BASE_URL")
    if base_url:
        return Ollama(model=model, base_url=base_url)
    return Ollama(model=model)


def is_simple_greeting(text: str) -> bool:
    return text.strip().lower() in _SIMPLE_GREETINGS


def greeting_answer() -> str:
    return (
        "Bonjour — je suis l’assistant PMA. Posez une question sur les dossiers, cycles, protocoles ou actes "
        "présents dans votre base synchronisée. Je ne m’appuie que sur les extraits fournis.\n\n"
        "Rappel : assistance documentaire uniquement ; la décision clinique reste auprès de l’équipe soignante."
    )


def load_vectorstore(user_id: str, embeddings: HuggingFaceEmbeddings) -> Chroma:
    persist = user_persist_path(user_id)
    return Chroma(persist_directory=persist, embedding_function=embeddings)


def build_qa_chain(user_id: str):
    embeddings = build_embeddings()
    vs = load_vectorstore(user_id, embeddings)
    llm = build_llm()
    return RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vs.as_retriever(search_kwargs={"k": int(os.environ.get("PMA_RETRIEVAL_K", "6"))}),
        return_source_documents=True,
        chain_type_kwargs={"prompt": PMA_PROMPT},
    )
