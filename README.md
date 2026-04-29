# MenuMind

Multi-LLM RAG evaluation platform for restaurant menu Q&A. Ask a question about a menu, get answers from Gemini, Groq (Llama 3), and Claude simultaneously — each scored on faithfulness and relevancy via RAGAs.

Built this to solve a real problem: when you're picking an LLM for a domain-specific RAG pipeline, "vibes-based" model selection doesn't cut it. MenuMind gives you actual scoring to compare outputs side by side.

---

## What it does

- **RAG pipeline** — LangChain LCEL with Pinecone vector search and Gemini Flash for generation. Supports multi-turn conversation with session memory.
- **Multi-LLM benchmarking** — same retrieved context, three different models, concurrent async calls. See who answers better.
- **RAGAs evaluation** — each model response is scored on faithfulness (is it grounded in the retrieved chunks?) and answer relevancy (does it actually address the question?).
- **Multi-source ingestion** — upload PDFs, scrape URLs, or ingest plain text via CLI or the browser UI. Not locked to any specific menu or brand.
- **Demo mode** — frontend detects missing API keys and degrades gracefully. Banner shows which keys are live.

---

## Stack

| Layer | Tech |
|---|---|
| Orchestration | LangChain (LCEL) |
| Vector store | Pinecone |
| Generation | Gemini Flash, Llama 3 8B (Groq), Claude Haiku |
| Evaluation | RAGAs |
| Backend | FastAPI (async) |
| Frontend | React |

---

## Setup

```bash
git clone https://github.com/deepsahu21/MenuMind.git
cd MenuMind
pip install -r requirements.txt
cd frontend && npm install
```

Create a `.env` in the project root:

```
GEMINI_API_KEY=        # required — powers RAG + embeddings
PINECONE_API_KEY=      # required — vector store
GROQ_API_KEY=          # optional — Llama 3 benchmark tab
ANTHROPIC_API_KEY=     # optional — Claude benchmark tab
```

Run ingestion (loads demo knowledge base):

```bash
cd backend
python ingest.py
```

Start the app:

```bash
# backend
cd backend && uvicorn main:app --reload

# frontend (separate terminal)
cd frontend && npm run dev
```

---

## Ingestion CLI

Ingest your own menus beyond the demo data:

```bash
# PDF
python ingest.py --type pdf --source ./menus/menu.pdf --brand chipotle

# URL
python ingest.py --type url --source https://www.chipotle.com/menu --brand chipotle

# Plain text
python ingest.py --type text --source ./notes/menu_notes.txt --brand chipotle
```

---

## API

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Pinecone connectivity + vector count |
| `/config` | GET | Which API keys are configured (booleans only) |
| `/query` | POST | Conversational RAG with session memory |
| `/benchmark` | POST | Same question → 3 models → RAGAs scores |

---

## Project structure

```
MenuMind/
├── backend/
│   ├── chain.py          # LangChain LCEL pipeline
│   ├── benchmark.py      # Multi-LLM runner + RAGAs scoring
│   ├── main.py           # FastAPI app
│   ├── ingest.py         # Ingestion CLI
│   └── ingestion/        # PDF, URL, text loaders
└── frontend/
    └── src/
        ├── App.jsx
        └── components/
            ├── BenchmarkPanel.jsx
            ├── ChatWindow.jsx
            └── SourcePanel.jsx
```

---

## Demo questions

- "Does the Beef 'n Cheddar have gluten?"
- "What are the hottest sauces at Buffalo Wild Wings?"
- "How do I earn Dunkin' rewards points?"
- "What's the calorie count on a glazed donut?"