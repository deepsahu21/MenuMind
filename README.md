# VectorMind

Multi-LLM RAG Evaluation Platform for uploading documents, asking grounded questions, comparing model answers, and scoring answer quality with RAGAS.

## Key Features

- **Conversational RAG** — LangChain LCEL retrieval chain with Pinecone vector search and multi-turn session history.
- **Browser PDF Upload** — Upload a PDF from the chat input; the backend chunks, embeds, and upserts it to Pinecone.
- **Multi-LLM Benchmarking** — Compare Gemini Flash, Llama 3.1 8B via Groq, and Claude Haiku on the same retrieved context.
- **RAGAS Evaluation** — Each benchmark response includes faithfulness and answer relevancy scores.
- **Demo Status Banner** — The UI calls `/config` on load and shows key status pills for Gemini, Pinecone, Groq, and Anthropic.

## Setup

1. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Create `.env` in the project root:
   ```bash
   GEMINI_API_KEY=your_key_here
   PINECONE_API_KEY=your_key_here
   GROQ_API_KEY=your_key_here
   ANTHROPIC_API_KEY=your_key_here
   ```

4. Start the backend:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

5. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

The frontend usually runs at `http://localhost:5173` and the backend at `http://127.0.0.1:8000`.

## Document Ingestion

The primary demo flow is browser upload:

1. Open VectorMind.
2. Click the paperclip button next to the chat input.
3. Choose a PDF.
4. Wait for the success toast: `Document ingested — X chunks added`.
5. Ask questions about the uploaded document.

The CLI is still available for local ingestion:

```bash
cd backend
python ingest.py --type pdf --source ./docs/paper.pdf
python ingest.py --type url --source https://example.com/article
python ingest.py --type text --source ./notes.txt
```

## API Endpoints

- `GET /health` — Pinecone connectivity and vector count.
- `GET /config` — Boolean-only API key status: `gemini`, `pinecone`, `groq`, `anthropic`.
- `POST /query` — Conversational RAG query.
- `POST /benchmark` — Runs the same retrieved context through all configured benchmark models.
- `POST /ingest/upload` — Uploads a PDF and ingests it into Pinecone.

### POST /query

```json
{
  "question": "Summarize the uploaded document",
  "session_id": "optional-uuid-for-multi-turn"
}
```

### POST /benchmark

```json
{
  "question": "Compare how each model explains the core argument"
}
```

Benchmark responses include:

```json
{
  "results": [
    {
      "model": "gemini-flash",
      "answer": "...",
      "latency_ms": 1234,
      "tokens": 512,
      "ragas_faithfulness": 0.91,
      "ragas_relevancy": 0.86,
      "error": null
    }
  ],
  "sources": [],
  "question": "Compare how each model explains the core argument",
  "latency_ms": 2345
}
```

If a model call fails, only that model result includes an `error`; the endpoint still returns the other model results. If RAGAS scoring fails, the score fields return `null`.

## File Breakdown

- `backend/main.py` — FastAPI app with query, benchmark, config, health, and upload ingestion endpoints.
- `backend/chain.py` — LangChain LCEL conversational retrieval pipeline.
- `backend/benchmark.py` — Concurrent multi-model generation plus RAGAS scoring.
- `backend/embeddings.py` — Gemini embeddings wrapper fixed to 768 dimensions for Pinecone.
- `backend/ingest.py` — Local CLI ingestion for PDF, URL, and text sources.
- `backend/ingestion/` — LangChain document loaders and chunking helpers.
- `frontend/src/App.jsx` — VectorMind app shell, config banner, benchmark toggle, upload flow.
- `frontend/src/components/ChatWindow.jsx` — Chat UI, suggestion chips, and PDF attachment button.
- `frontend/src/components/BenchmarkPanel.jsx` — Model tabs with latency, tokens, errors, and RAGAS progress bars.
- `frontend/src/components/SourcePanel.jsx` — Retrieved context display.
