"""
Multi-LLM benchmarking — runs the same retrieved context against
Gemini Flash, Llama 3 8B (via Groq), and Claude Haiku concurrently.
"""

import asyncio
import os
import time

from dotenv import load_dotenv
from embeddings import GeminiEmbeddings768
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


def _friendly_error(error: Exception) -> str:
    """Return a concise message safe to show in model tabs."""
    message = str(error)
    if "429" in message or "ResourceExhausted" in message or "quota" in message.lower():
        return "Provider quota exceeded. Please retry later or use another configured model."
    return message.split("\n")[0]

# ---------------------------------------------------------------------------
# Shared QA prompt — each model gets the same context + question
# ---------------------------------------------------------------------------
BENCHMARK_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are VectorMind, a helpful assistant for a general-purpose "
        "retrieval-augmented generation system.\n\n"
        "Answer the customer's question using ONLY the context provided below. "
        "Be conversational, friendly, and concise. If the answer is not clearly "
        "in the context, say you don't have that information rather than guessing.\n\n"
        "CONTEXT:\n{context}",
    ),
    ("human", "{question}"),
])

# ---------------------------------------------------------------------------
# Model registry — lazy-init so missing keys don't crash import
# ---------------------------------------------------------------------------

def _get_models() -> dict:
    """Return dict of available model configs. Only includes models with valid keys."""
    models = {}

    if os.getenv("GEMINI_API_KEY"):
        models["gemini-flash"] = {
            "label": "Gemini Flash",
            "llm": ChatGoogleGenerativeAI(
                model="gemini-2.0-flash",
                google_api_key=os.getenv("GEMINI_API_KEY"),
                temperature=0.3,
                max_retries=0,
            ),
        }

    if os.getenv("GROQ_API_KEY"):
        models["llama3-groq"] = {
            "label": "Llama 3.1 8B (Groq)",
            "llm": ChatGroq(
                model="llama-3.1-8b-instant",
                api_key=os.getenv("GROQ_API_KEY"),
                temperature=0.3,
            ),
        }

    if os.getenv("ANTHROPIC_API_KEY"):
        models["claude-haiku"] = {
            "label": "Claude Haiku",
            "llm": ChatAnthropic(
                model="claude-haiku-4-5-20251001",
                api_key=os.getenv("ANTHROPIC_API_KEY"),
                temperature=0.3,
                max_tokens=1024,
            ),
        }

    return models


async def _run_single_model(model_key: str, model_cfg: dict, context: str, question: str) -> dict:
    """Run a single model and capture response + timing."""
    llm = model_cfg["llm"]
    chain = BENCHMARK_PROMPT | llm

    start = time.time()
    try:
        # Use ainvoke for async execution
        result = await chain.ainvoke({"context": context, "question": question})
        latency_ms = int((time.time() - start) * 1000)

        # Extract total token count if available. Some providers omit usage metadata.
        tokens = None
        if hasattr(result, "usage_metadata") and result.usage_metadata:
            tokens = result.usage_metadata.get("total_tokens")

        return {
            "model": model_key,
            "label": model_cfg["label"],
            "answer": result.content,
            "latency_ms": latency_ms,
            "tokens": tokens,
            "ragas_faithfulness": None,
            "ragas_relevancy": None,
            "error": None,
        }
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return {
            "model": model_key,
            "label": model_cfg["label"],
            "answer": None,
            "latency_ms": latency_ms,
            "tokens": None,
            "ragas_faithfulness": None,
            "ragas_relevancy": None,
            "error": _friendly_error(e),
        }


def _round_score(value):
    """Normalize RAGAS score return types to a 0.0-1.0 float."""
    if value is None:
        return None
    if hasattr(value, "value"):
        value = value.value
    return round(float(value), 2)


def _import_ragas_wrappers():
    """Import RAGAS wrappers across recent RAGAS package layouts."""
    try:
        from ragas.llms import LangchainLLMWrapper
    except ImportError:
        from ragas.integrations.langchain import LangchainLLMWrapper

    try:
        from ragas.embeddings import LangchainEmbeddingsWrapper
    except ImportError:
        from ragas.integrations.langchain import LangchainEmbeddingsWrapper

    return LangchainLLMWrapper, LangchainEmbeddingsWrapper


async def _score_with_ragas(question: str, answer: str, contexts: list[str]) -> tuple:
    """
    Score a generated answer with RAGAS.

    RAGAS is intentionally imported lazily so the API can still run in demo
    environments where the optional evaluation dependency is not installed yet.
    """
    if not answer or not contexts or not os.getenv("GEMINI_API_KEY"):
        return None, None

    try:
        from ragas.dataset_schema import SingleTurnSample
        try:
            from ragas.metrics.collections import Faithfulness, ResponseRelevancy
        except ImportError:
            from ragas.metrics import Faithfulness, ResponseRelevancy

        LangchainLLMWrapper, LangchainEmbeddingsWrapper = _import_ragas_wrappers()

        judge_llm = LangchainLLMWrapper(ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0,
            max_retries=0,
        ))
        judge_embeddings = LangchainEmbeddingsWrapper(
            GeminiEmbeddings768(api_key=os.getenv("GEMINI_API_KEY"))
        )

        sample = SingleTurnSample(
            user_input=question,
            response=answer,
            retrieved_contexts=contexts,
        )

        faithfulness_metric = Faithfulness(llm=judge_llm)
        relevancy_metric = ResponseRelevancy(
            llm=judge_llm,
            embeddings=judge_embeddings,
        )

        faithfulness_score, relevancy_score = await asyncio.gather(
            faithfulness_metric.single_turn_ascore(sample),
            relevancy_metric.single_turn_ascore(sample),
        )

        return _round_score(faithfulness_score), _round_score(relevancy_score)
    except Exception:
        return None, None


async def _attach_ragas_scores(results: list, question: str, contexts: list[str]) -> list:
    """Add RAGAS scores to each model result without failing the benchmark."""
    score_tasks = [
        asyncio.wait_for(
            _score_with_ragas(question, result.get("answer"), contexts),
            timeout=8,
        )
        for result in results
    ]
    scores = await asyncio.gather(*score_tasks, return_exceptions=True)

    scored_results = []
    for result, score in zip(results, scores):
        if isinstance(score, Exception):
            faithfulness, relevancy = None, None
        else:
            faithfulness, relevancy = score
        scored_results.append({
            **result,
            "ragas_faithfulness": faithfulness,
            "ragas_relevancy": relevancy,
        })
    return scored_results


async def run_benchmark(question: str, retrieved_chunks: list) -> dict:
    """
    Run the same query against all available LLMs concurrently.

    Args:
        question: The user's question.
        retrieved_chunks: Pre-retrieved context chunks from the RAG pipeline.

    Returns:
        dict with "results" (list of per-model outputs) and "sources".
    """
    # Build context string from retrieved chunks (same format for all models)
    context = "\n\n".join(
        [f"[{i + 1}] {chunk['text']}" for i, chunk in enumerate(retrieved_chunks)]
    )
    contexts = [chunk["text"] for chunk in retrieved_chunks]

    models = _get_models()

    if not models:
        return {
            "results": [],
            "sources": retrieved_chunks,
            "question": question,
            "error": "No benchmark API keys configured",
        }

    # Fire all models concurrently
    tasks = [
        asyncio.wait_for(_run_single_model(key, cfg, context, question), timeout=25)
        for key, cfg in models.items()
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    normalized_results = []
    for key, result in zip(models.keys(), results):
        if isinstance(result, Exception):
            normalized_results.append({
                "model": key,
                "label": models[key]["label"],
                "answer": None,
                "latency_ms": 0,
                "tokens": None,
                "ragas_faithfulness": None,
                "ragas_relevancy": None,
                "error": _friendly_error(result),
            })
        else:
            normalized_results.append(result)

    gemini_result = next(
        (result for result in normalized_results if result.get("model") == "gemini-flash"),
        None,
    )
    if gemini_result and gemini_result.get("error") and "quota" in gemini_result["error"].lower():
        return {
            "results": normalized_results,
            "sources": retrieved_chunks,
            "question": question,
        }

    scored_results = await _attach_ragas_scores(normalized_results, question, contexts)

    return {
        "results": scored_results,
        "sources": retrieved_chunks,
        "question": question,
    }
