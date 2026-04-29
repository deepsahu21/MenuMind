KNOWLEDGE_BASE = [
    {
        "id": "vectormind_overview",
        "text": (
            "VectorMind is a multi-LLM RAG evaluation platform. It retrieves "
            "document context from Pinecone, generates grounded answers, and "
            "compares model responses across the same retrieved chunks."
        ),
        "metadata": {
            "category": "platform_overview",
            "source": "vectormind_demo",
            "source_type": "text",
            "source_name": "VectorMind demo knowledge base",
        },
    },
    {
        "id": "vectormind_uploads",
        "text": (
            "Users can upload PDF documents from the chat interface. Uploaded "
            "PDFs are parsed, split into chunks, embedded, and upserted to the "
            "Pinecone index for later retrieval."
        ),
        "metadata": {
            "category": "document_upload",
            "source": "vectormind_demo",
            "source_type": "text",
            "source_name": "VectorMind demo knowledge base",
        },
    },
    {
        "id": "vectormind_benchmarking",
        "text": (
            "Benchmark mode sends one question and the same retrieved context "
            "to Gemini Flash, Llama 3 through Groq, and Claude Haiku. Each "
            "model result includes answer text, latency, token count when "
            "available, and an isolated error if that model call fails."
        ),
        "metadata": {
            "category": "benchmarking",
            "source": "vectormind_demo",
            "source_type": "text",
            "source_name": "VectorMind demo knowledge base",
        },
    },
    {
        "id": "vectormind_ragas",
        "text": (
            "RAGAS evaluation scores benchmark answers for faithfulness and "
            "answer relevancy. Faithfulness checks whether answer claims are "
            "grounded in retrieved context. Answer relevancy checks whether "
            "the response addresses the user's question."
        ),
        "metadata": {
            "category": "evaluation",
            "source": "vectormind_demo",
            "source_type": "text",
            "source_name": "VectorMind demo knowledge base",
        },
    },
    {
        "id": "vectormind_config",
        "text": (
            "The config endpoint reports API key availability as booleans only. "
            "The frontend displays Gemini, Pinecone, Groq, and Anthropic status "
            "as live or missing without exposing secret values."
        ),
        "metadata": {
            "category": "configuration",
            "source": "vectormind_demo",
            "source_type": "text",
            "source_name": "VectorMind demo knowledge base",
        },
    },
]
