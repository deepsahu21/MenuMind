"""
Ingestion CLI — embeds documents into Pinecone.

Usage:
    python ingest.py                                         # Demo mode (hardcoded KB)
    python ingest.py --type pdf  --source ./document.pdf
    python ingest.py --type url  --source https://example.com
    python ingest.py --type text --source ./notes.txt
"""

import argparse
import os
import time

from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore

from embeddings import EMBEDDING_DIMENSION, GeminiEmbeddings768

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

INDEX_NAME = "inspire-rag"
DIMENSION = EMBEDDING_DIMENSION


def ensure_index(pc: Pinecone) -> None:
    """Create the Pinecone index if it doesn't exist yet."""
    existing_indexes = [idx["name"] for idx in pc.list_indexes()]
    if INDEX_NAME not in existing_indexes:
        print(f"Creating index '{INDEX_NAME}'...")
        pc.create_index(
            name=INDEX_NAME,
            dimension=DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
        while not pc.describe_index(INDEX_NAME).status["ready"]:
            time.sleep(1)
        print(f"Index '{INDEX_NAME}' created and ready.")
    else:
        print(f"Index '{INDEX_NAME}' already exists.")


def ingest_demo(pc: Pinecone) -> None:
    """Original demo ingestion — embeds hardcoded knowledge base chunks."""
    from data.knowledge_base import KNOWLEDGE_BASE

    embeddings = GeminiEmbeddings768(api_key=os.getenv("GEMINI_API_KEY"))
    index = pc.Index(INDEX_NAME)

    total = len(KNOWLEDGE_BASE)
    for i, chunk in enumerate(KNOWLEDGE_BASE):
        vector = embeddings.embed_documents([chunk["text"]])[0]

        metadata = {**chunk["metadata"], "text": chunk["text"]}
        index.upsert(
            vectors=[{"id": chunk["id"], "values": vector, "metadata": metadata}]
        )
        print(f"[OK] Ingested {i + 1}/{total}: {chunk['id']}")
        time.sleep(0.1)

    print(f"\nDemo ingestion complete. {total} chunks stored in Pinecone.")


def ingest_documents(source_type: str, source: str, pc: Pinecone) -> None:
    """Ingest documents from PDF, URL, or text file via LangChain loaders."""
    from ingestion import load_pdf, load_url, load_text

    loader_map = {
        "pdf": load_pdf,
        "url": load_url,
        "text": load_text,
    }

    loader_fn = loader_map.get(source_type)
    if not loader_fn:
        raise ValueError(f"Unknown source type: {source_type}. Use: pdf, url, text")

    print(f"Loading {source_type} from: {source}")
    chunks = loader_fn(source)

    print(f"Split into {len(chunks)} chunks. Embedding and upserting...")

    embeddings = GeminiEmbeddings768(api_key=os.getenv("GEMINI_API_KEY"))

    index = pc.Index(INDEX_NAME)
    vector_store = PineconeVectorStore(
        index=index,
        embedding=embeddings,
        text_key="text",
    )

    # Batch add documents through LangChain's vector store
    vector_store.add_documents(chunks)
    print(f"\nIngestion complete. {len(chunks)} chunks stored in Pinecone.")


def main():
    parser = argparse.ArgumentParser(
        description="VectorMind — Document Ingestion CLI"
    )
    parser.add_argument(
        "--type",
        choices=["pdf", "url", "text"],
        help="Source type to ingest (omit for demo mode)",
    )
    parser.add_argument(
        "--source",
        help="File path or URL to ingest",
    )
    args = parser.parse_args()
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    ensure_index(pc)

    if args.type is None:
        # No --type flag → fall back to hardcoded demo ingestion
        print("No --type specified. Running demo mode (hardcoded knowledge base).\n")
        ingest_demo(pc)
    else:
        if not args.source:
            parser.error("--source is required when --type is specified")
        ingest_documents(args.type, args.source, pc)


if __name__ == "__main__":
    main()
