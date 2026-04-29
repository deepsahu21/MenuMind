"""Gemini embeddings configured to match the existing Pinecone index."""

from typing import List

from google import genai
from google.genai import types
from langchain_core.embeddings import Embeddings

# The Gemini API currently exposes this embedding model for embedContent.
# Keep output_dimensionality=768 so vectors remain compatible with Pinecone.
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSION = 768


class GeminiEmbeddings768(Embeddings):
    """LangChain-compatible Gemini embeddings with explicit 768 dimensions."""

    def __init__(self, api_key: str):
        self._client = genai.Client(api_key=api_key)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        vectors = []
        for text in texts:
            response = self._client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=text,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_DOCUMENT",
                    output_dimensionality=EMBEDDING_DIMENSION,
                ),
            )
            vectors.append(response.embeddings[0].values)
        return vectors

    def embed_query(self, text: str) -> List[float]:
        response = self._client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY",
                output_dimensionality=EMBEDDING_DIMENSION,
            ),
        )
        return response.embeddings[0].values
