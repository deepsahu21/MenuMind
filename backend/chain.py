"""
LangChain LCEL pipeline — replaces manual retriever.py + generator.py.

Uses create_history_aware_retriever + create_retrieval_chain for
multi-turn conversational RAG with Pinecone vector search.
"""

import os

from dotenv import load_dotenv
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from pinecone import Pinecone

from embeddings import GeminiEmbeddings768

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0.3,
    max_retries=0,
)

# Custom embeddings that force 768 dimensions to match existing Pinecone index
embeddings = GeminiEmbeddings768(api_key=os.getenv("GEMINI_API_KEY"))

# ---------------------------------------------------------------------------
# Vector Store + Retriever
# ---------------------------------------------------------------------------
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
pinecone_index = pc.Index("inspire-rag")

vector_store = PineconeVectorStore(
    index=pinecone_index,
    embedding=embeddings,
    text_key="text",  # matches existing metadata schema
)

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------
# Prompt that rewrites a follow-up question into a standalone question
# so the retriever can find relevant docs without needing chat context.
CONTEXTUALIZE_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "Given a chat history and the latest user question which might "
        "reference context in the chat history, formulate a standalone "
        "question that can be understood without the chat history. "
        "Do NOT answer the question — just reformulate it if needed, "
        "otherwise return it as-is.",
    ),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}"),
])

# Main QA prompt — mirrors the original generator.py system prompt
QA_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are VectorMind, a helpful assistant for a general-purpose "
        "retrieval-augmented generation system.\n\n"
        "Answer the customer's question using ONLY the context provided below. "
        "Be conversational, friendly, and concise. If the answer is not clearly "
        "in the context, say you don't have that information rather than guessing. "
        "Never make anything up.\n\n"
        "CONTEXT:\n{context}",
    ),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}"),
])

# ---------------------------------------------------------------------------
# Chain assembly
# ---------------------------------------------------------------------------

def _build_retriever():
    """Return a general retriever over all indexed documents."""
    search_kwargs = {
        "k": 5,
        "filter": {"source_type": {"$in": ["pdf", "url", "text"]}},
    }
    return vector_store.as_retriever(search_kwargs=search_kwargs)


def build_chain():
    """Build the full conversational retrieval chain."""
    retriever = _build_retriever()

    history_aware_retriever = create_history_aware_retriever(
        llm, retriever, CONTEXTUALIZE_PROMPT,
    )
    question_answer_chain = create_stuff_documents_chain(llm, QA_PROMPT)
    return create_retrieval_chain(history_aware_retriever, question_answer_chain)


def run_chain(question: str, chat_history: list) -> dict:
    """
    Execute the RAG chain and return structured output.

    Args:
        question: The user's question.
        chat_history: List of LangChain BaseMessage objects for multi-turn.

    Returns:
        dict with "answer", "sources", "chat_history" (updated).
    """
    chain = build_chain()

    result = chain.invoke({
        "input": question,
        "chat_history": chat_history,
    })

    # Extract source documents and format them to match existing API contract
    sources = []
    for doc in result.get("context", []):
        meta = doc.metadata
        sources.append({
            "text": doc.page_content,
            "score": meta.get("score", 0.0),
            "source_type": meta.get("source_type", ""),
            "source_name": meta.get("source_name", meta.get("source", "")),
            "category": meta.get("category", ""),
            "item_name": meta.get("item_name", ""),
            "source": meta.get("source", ""),
        })

    # Update chat history with this turn
    from langchain_core.messages import HumanMessage, AIMessage
    updated_history = list(chat_history) + [
        HumanMessage(content=question),
        AIMessage(content=result["answer"]),
    ]

    return {
        "answer": result["answer"],
        "sources": sources,
        "chat_history": updated_history,
    }
