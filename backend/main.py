"""
FastAPI application — VectorMind.

Endpoints:
    GET  /health     — Index connectivity check
    GET  /config     — Reports which API keys are configured (for demo mode UI)
    POST /query      — Conversational RAG query via LangChain
    POST /benchmark  — Multi-LLM benchmark (Gemini, Llama3/Groq, Claude)
"""

import os
import time
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pinecone import Pinecone
from langchain_pinecone import PineconeVectorStore

from chain import run_chain
from benchmark import run_benchmark
from embeddings import GeminiEmbeddings768

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("inspire-rag")

app = FastAPI(title="VectorMind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Session-based chat history (in-memory; fine for prototype)
# ---------------------------------------------------------------------------
chat_sessions: dict = {}  # session_id -> list[BaseMessage]


def friendly_error(error: Exception) -> str:
    """Return a concise error message for API responses."""
    message = str(error)
    if "429" in message or "ResourceExhausted" in message or "quota" in message.lower():
        return "Provider quota exceeded. Please retry later."
    return message.split("\n")[0]


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    question: str
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class QueryResponse(BaseModel):
    answer: str
    sources: list
    latency_ms: int
    chunks_retrieved: int
    session_id: str


class BenchmarkRequest(BaseModel):
    question: str


class BenchmarkResponse(BaseModel):
    results: list
    sources: list
    question: str
    latency_ms: int


class ConfigResponse(BaseModel):
    gemini: bool
    anthropic: bool
    groq: bool
    pinecone: bool


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    """Check index connectivity and return vector count."""
    stats = index.describe_index_stats()
    return {"status": "ok", "chunks_indexed": stats["total_vector_count"]}


@app.get("/config", response_model=ConfigResponse)
def config():
    """Report which API keys are present — used by frontend for demo mode banner."""
    return ConfigResponse(
        gemini=bool(os.getenv("GEMINI_API_KEY")),
        anthropic=bool(os.getenv("ANTHROPIC_API_KEY")),
        groq=bool(os.getenv("GROQ_API_KEY")),
        pinecone=bool(os.getenv("PINECONE_API_KEY")),
    )


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    """
    Conversational RAG query via LangChain LCEL pipeline.
    Supports multi-turn via session_id.
    """
    start = time.time()

    # Retrieve or create session history
    history = chat_sessions.get(req.session_id, [])

    try:
        result = run_chain(req.question, history)
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return QueryResponse(
            answer=f"RAG query failed: {friendly_error(e)}",
            sources=[],
            latency_ms=latency_ms,
            chunks_retrieved=0,
            session_id=req.session_id,
        )

    latency_ms = int((time.time() - start) * 1000)

    # Persist updated history
    chat_sessions[req.session_id] = result["chat_history"]

    return QueryResponse(
        answer=result["answer"],
        sources=result["sources"],
        latency_ms=latency_ms,
        chunks_retrieved=len(result["sources"]),
        session_id=req.session_id,
    )


@app.post("/benchmark", response_model=BenchmarkResponse)
async def benchmark(req: BenchmarkRequest):
    """
    Run the same query against multiple LLMs concurrently.
    Retrieval is done once; only generation differs per model.
    """
    start = time.time()

    # For benchmark, we do a simple retrieval without chat history
    from chain import vector_store

    try:
        retriever = vector_store.as_retriever(search_kwargs={
            "k": 5,
            "filter": {"source_type": {"$in": ["pdf", "url", "text"]}},
        })
        docs = retriever.invoke(req.question)
    except Exception as e:
        return BenchmarkResponse(
            results=[{
                "model": key,
                "label": label,
                "answer": None,
                "latency_ms": 0,
                "tokens": None,
                "ragas_faithfulness": None,
                "ragas_relevancy": None,
                "error": f"Retrieval failed: {friendly_error(e)}",
            } for key, label in [
                ("gemini-flash", "Gemini Flash"),
                ("llama3-groq", "Llama 3.1 8B (Groq)"),
                ("claude-haiku", "Claude Haiku"),
            ]],
            sources=[],
            question=req.question,
            latency_ms=int((time.time() - start) * 1000),
        )

    # Format chunks to match existing API contract
    retrieved_chunks = []
    for doc in docs:
        meta = doc.metadata
        retrieved_chunks.append({
            "text": doc.page_content,
            "score": meta.get("score", 0.0),
            "source_type": meta.get("source_type", ""),
            "source_name": meta.get("source_name", meta.get("source", "")),
            "category": meta.get("category", ""),
            "item_name": meta.get("item_name", ""),
            "source": meta.get("source", ""),
        })

    # Run all models against the same context
    bench_result = await run_benchmark(req.question, retrieved_chunks)
    latency_ms = int((time.time() - start) * 1000)

    return BenchmarkResponse(
        results=bench_result["results"],
        sources=bench_result["sources"],
        question=bench_result["question"],
        latency_ms=latency_ms,
    )


@app.post("/ingest/upload")
async def ingest_upload(file: UploadFile = File(...)):
    """Ingest an uploaded PDF into Pinecone for browser-based demos."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported.")

    import tempfile
    from ingestion import load_pdf

    suffix = os.path.splitext(file.filename)[1] or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        chunks = load_pdf(tmp_path)
        for chunk in chunks:
            chunk.metadata["source_name"] = file.filename
            chunk.metadata["source_type"] = "pdf"

        vector_store = PineconeVectorStore(
            index=index,
            embedding=GeminiEmbeddings768(api_key=os.getenv("GEMINI_API_KEY")),
            text_key="text",
        )
        vector_store.add_documents(chunks)
        return {"status": "ok", "chunks_added": len(chunks), "source_name": file.filename}
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
