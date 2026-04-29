import React, { useState, useEffect } from "react";
import ChatWindow from "./components/ChatWindow";
import SourcePanel from "./components/SourcePanel";
import BenchmarkPanel from "./components/BenchmarkPanel";

const API_BASE = "http://localhost:8000";

// ---------------------------------------------------------------------------
// Example suggestion chips shown before user types anything
// ---------------------------------------------------------------------------
const EXAMPLE_QUESTIONS = [
  { text: "What can you help me with?" },
  { text: "Summarize the uploaded document" },
  { text: "Compare how each model answers this" },
];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const appStyles = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#111214",
  color: "#e1e1e3",
  margin: 0,
};

const headerStyles = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 24px",
  borderBottom: "1px solid #2a2b2e",
  backgroundColor: "#161719",
  flexShrink: 0,
};

const logoStyles = {
  fontSize: "18px",
  fontWeight: 700,
  letterSpacing: "-0.3px",
  color: "#ffffff",
};

const logoAccent = {
  color: "#8b8d93",
  fontWeight: 400,
  marginLeft: "8px",
  fontSize: "14px",
};

const headerRight = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const bodyStyles = {
  display: "flex",
  flex: 1,
  overflow: "hidden",
};

// Demo mode banner
const bannerStyles = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  position: "sticky",
  top: 0,
  zIndex: 10,
  padding: "8px 24px",
  backgroundColor: "#1a1a2e",
  borderBottom: "1px solid #2a2b3e",
  fontSize: "12px",
  color: "#9a9ba0",
  flexShrink: 0,
};

const bannerPillsRow = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

function statusPillStyle(isLive) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "3px 10px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 500,
    backgroundColor: isLive ? "#052e16" : "#2a1215",
    color: isLive ? "#4ade80" : "#f87171",
  };
}

const dismissBtnStyles = {
  background: "none",
  border: "none",
  color: "#6b6d73",
  cursor: "pointer",
  fontSize: "16px",
  padding: "0 4px",
  fontFamily: "inherit",
};

// Compare toggle button
function toggleBtnStyle(isActive) {
  return {
    padding: "6px 14px",
    borderRadius: "8px",
    border: isActive ? "1px solid #8b5cf6" : "1px solid #3a3b3e",
    backgroundColor: isActive ? "#8b5cf622" : "transparent",
    color: isActive ? "#c4b5fd" : "#7a7b80",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };
}

const globalCSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { margin: 0; overflow: hidden; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #3a3b3e; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #4a4b4e; }
`;

export default function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [latestSources, setLatestSources] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState(null);

  // Benchmark mode state
  const [benchmarkMode, setBenchmarkMode] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);

  // Demo mode state
  const [apiConfig, setApiConfig] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Fetch API key configuration on mount for demo mode banner
  useEffect(() => {
    fetch(`${API_BASE}/config`)
      .then((res) => res.json())
      .then((data) => setApiConfig(data))
      .catch(() => {
        // Backend unreachable — show everything as missing
        setApiConfig({ gemini: false, anthropic: false, groq: false, pinecone: false });
      });
  }, []);

  // Core RAG is broken if Pinecone or Gemini keys are missing
  const coreAvailable = apiConfig?.pinecone && apiConfig?.gemini;

  const handleSend = async (question) => {
    const userMessage = { role: "user", content: question, sources: [], latency_ms: 0 };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setLatestSources([]);

    if (benchmarkMode) {
      // Benchmark mode — call /benchmark endpoint
      setBenchmarkLoading(true);
      setBenchmarkData(null);
      try {
        const response = await fetch(`${API_BASE}/benchmark`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        });
        const data = await response.json();

        // Use the first available model's answer as the chat response
        const firstResult = data.results?.find((r) => r.answer && !r.error);
        const assistantMessage = {
          role: "assistant",
          content: firstResult?.answer || "Benchmark complete — see results panel.",
          sources: data.sources || [],
          latency_ms: data.latency_ms || 0,
          chunks_retrieved: data.sources?.length || 0,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setLatestSources(data.sources || []);
        setBenchmarkData(data);
      } catch {
        const errorMessage = {
          role: "assistant",
          content: "Benchmark request failed. Please try again.",
          sources: [],
          latency_ms: 0,
          chunks_retrieved: 0,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setBenchmarkLoading(false);
        setIsLoading(false);
      }
    } else {
      // Normal mode — call /query endpoint
      try {
        const body = { question };
        if (sessionId) body.session_id = sessionId;

        const response = await fetch(`${API_BASE}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await response.json();

        // Store session ID for multi-turn conversations
        if (data.session_id) setSessionId(data.session_id);

        const assistantMessage = {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          latency_ms: data.latency_ms,
          chunks_retrieved: data.chunks_retrieved,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setLatestSources(data.sources);
      } catch {
        const errorMessage = {
          role: "assistant",
          content: "Something went wrong. Please try again.",
          sources: [],
          latency_ms: 0,
          chunks_retrieved: 0,
        };
        setMessages((prev) => [...prev, errorMessage]);
        setLatestSources([]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle clicking a suggestion chip
  const handleSuggestionClick = (suggestion) => {
    if (!coreAvailable) return;
    handleSend(suggestion.text);
  };

  const handleUpload = async (file) => {
    if (!file || isUploading || !coreAvailable) return;

    setIsUploading(true);
    setToast(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/ingest/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Upload failed");
      }
      setToast(`Document ingested — ${data.chunks_added} chunks added`);
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      setToast(err.message || "Document ingestion failed");
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={appStyles}>
      <style>{globalCSS}</style>

      {/* Demo mode banner — sticky, dismissible, reappears on refresh */}
      {apiConfig && !bannerDismissed && (
        <div style={bannerStyles}>
          <div style={bannerPillsRow}>
            <span style={{ color: "#6b6d73", fontWeight: 500, marginRight: "4px" }}>
              MenuMind Demo
            </span>
            <span style={statusPillStyle(apiConfig.gemini)}>
              Gemini: {apiConfig.gemini ? "live" : "missing"}
            </span>
            <span style={statusPillStyle(apiConfig.pinecone)}>
              Pinecone: {apiConfig.pinecone ? "live" : "missing"}
            </span>
            <span style={statusPillStyle(apiConfig.groq)}>
              Groq: {apiConfig.groq ? "live" : "missing"}
            </span>
            <span style={statusPillStyle(apiConfig.anthropic)}>
              Anthropic: {apiConfig.anthropic ? "live" : "missing"}
            </span>
          </div>
          <button
            style={dismissBtnStyles}
            onClick={() => setBannerDismissed(true)}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <header style={headerStyles}>
        <div>
          <span style={logoStyles}>MenuMind</span>
          <span style={logoAccent}>Multi-LLM RAG Evaluation Platform</span>
        </div>
        <div style={headerRight}>
          <button
            style={toggleBtnStyle(benchmarkMode)}
            onClick={() => setBenchmarkMode(!benchmarkMode)}
            title="Toggle benchmark mode to compare model responses"
          >
            {benchmarkMode ? "◈" : "◇"} Compare Models
          </button>
        </div>
      </header>

      <div style={bodyStyles}>
        <ChatWindow
          messages={messages}
          onSend={handleSend}
          isLoading={isLoading}
          disabled={!coreAvailable}
          suggestions={EXAMPLE_QUESTIONS}
          onSuggestionClick={handleSuggestionClick}
          onUpload={handleUpload}
          isUploading={isUploading}
          toast={toast}
        />
        {benchmarkMode ? (
          <BenchmarkPanel
            benchmarkData={benchmarkData}
            isLoading={benchmarkLoading}
            apiConfig={apiConfig}
          />
        ) : (
          <SourcePanel sources={latestSources} />
        )}
      </div>
    </div>
  );
}
