import React, { useState } from "react";

/**
 * BenchmarkPanel — Tabbed UI comparing responses from multiple LLMs.
 * Each tab shows: model response, latency badge, token count.
 * Tabs for models with missing API keys show a disabled state.
 */

// Model display config with accent colors
const MODEL_CONFIG = {
  "gemini-flash": { label: "Gemini Flash", color: "#4285f4", icon: "✦" },
  "llama3-groq": { label: "Llama 3.1 (Groq)", color: "#f97316", icon: "🦙" },
  "claude-haiku": { label: "Claude Haiku", color: "#a78bfa", icon: "◈" },
};

const MODEL_ORDER = ["gemini-flash", "llama3-groq", "claude-haiku"];

const panelStyles = {
  width: "35%",
  minWidth: "320px",
  backgroundColor: "#161719",
  borderLeft: "1px solid #2a2b2e",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  flexShrink: 0,
};

const headerStyles = {
  padding: "20px 20px 0",
  flexShrink: 0,
};

const titleStyles = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#ffffff",
  marginBottom: "4px",
};

const subtitleStyles = {
  fontSize: "12px",
  color: "#6b6d73",
  marginBottom: "16px",
};

const tabBarStyles = {
  display: "flex",
  gap: "4px",
  padding: "0 20px",
  borderBottom: "1px solid #2a2b2e",
  flexShrink: 0,
};

function tabStyle(isActive, color, isDisabled) {
  return {
    padding: "10px 14px",
    fontSize: "12px",
    fontWeight: isActive ? 600 : 400,
    color: isDisabled ? "#4a4b50" : isActive ? color : "#8b8d93",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
    cursor: isDisabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s ease",
    opacity: isDisabled ? 0.5 : 1,
    whiteSpace: "nowrap",
  };
}

const contentAreaStyles = {
  flex: 1,
  padding: "20px",
  overflowY: "auto",
};

const responseTextStyles = {
  fontSize: "13.5px",
  lineHeight: "1.65",
  color: "#d4d4d8",
  marginBottom: "16px",
  whiteSpace: "pre-wrap",
};

const metaRowStyles = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "12px",
};

const scoresContainerStyles = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  marginTop: "18px",
};

const scoreHeaderStyles = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "12px",
  color: "#9a9ba0",
  marginBottom: "6px",
};

const scoreTrackStyles = {
  height: "7px",
  borderRadius: "999px",
  backgroundColor: "#2a2b2e",
  overflow: "hidden",
};

function scoreColor(score) {
  if (score === null || score === undefined) return "#4a4b50";
  if (score > 0.7) return "#22c55e";
  if (score >= 0.4) return "#f59e0b";
  return "#ef4444";
}

function scoreFillStyle(score) {
  const width = score === null || score === undefined ? 0 : Math.max(0, Math.min(100, score * 100));
  return {
    height: "100%",
    width: `${width}%`,
    borderRadius: "999px",
    backgroundColor: scoreColor(score),
    transition: "width 0.25s ease",
  };
}

function badgeStyle(bg, text) {
  return {
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 600,
    backgroundColor: bg,
    color: text,
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  };
}

const emptyStateStyles = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#4a4b50",
  fontSize: "13px",
  fontStyle: "italic",
  padding: "40px 20px",
  textAlign: "center",
};

const errorStyles = {
  fontSize: "13px",
  color: "#ef4444",
  backgroundColor: "#1c1d20",
  border: "1px solid #7f1d1d",
  borderRadius: "8px",
  padding: "12px 16px",
  lineHeight: "1.5",
};

const disabledPlaceholderStyles = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  padding: "40px 20px",
  textAlign: "center",
  color: "#5a5b60",
};

const keyIconStyles = {
  fontSize: "28px",
  opacity: 0.4,
};

function ScoreBar({ label, value }) {
  const displayValue = value === null || value === undefined
    ? "Unavailable"
    : `${Math.round(value * 100)}%`;

  return (
    <div>
      <div style={scoreHeaderStyles}>
        <span>{label}</span>
        <span style={{ color: scoreColor(value), fontWeight: 600 }}>{displayValue}</span>
      </div>
      <div style={scoreTrackStyles}>
        <div style={scoreFillStyle(value)} />
      </div>
    </div>
  );
}

const fadeCSS = `
@keyframes benchFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.bench-content-animated {
  animation: benchFadeIn 0.25s ease forwards;
}
`;

export default function BenchmarkPanel({ benchmarkData, isLoading, apiConfig }) {
  const [activeTab, setActiveTab] = useState("gemini-flash");

  // Determine which models are available based on API key config
  const availableModels = {
    "gemini-flash": apiConfig?.gemini ?? false,
    "llama3-groq": apiConfig?.groq ?? false,
    "claude-haiku": apiConfig?.anthropic ?? false,
  };

  // Find result for active tab
  const activeResult = benchmarkData?.results?.find(
    (r) => r.model === activeTab
  );

  const hasData = benchmarkData && benchmarkData.results?.length > 0;

  return (
    <div style={panelStyles}>
      <style>{fadeCSS}</style>

      <div style={headerStyles}>
        <div style={titleStyles}>Model Comparison</div>
        <div style={subtitleStyles}>
          Same query, same context — different models
        </div>
      </div>

      {/* Tab bar */}
      <div style={tabBarStyles}>
        {MODEL_ORDER.map((key) => {
          const cfg = MODEL_CONFIG[key];
          const isAvailable = availableModels[key];
          const isActive = activeTab === key;

          return (
            <button
              key={key}
              style={tabStyle(isActive, cfg.color, !isAvailable)}
              onClick={() => isAvailable && setActiveTab(key)}
              disabled={!isAvailable}
              title={
                !isAvailable ? "API key not configured" : cfg.label
              }
            >
              {cfg.icon} {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div style={contentAreaStyles}>
        {isLoading ? (
          <div style={emptyStateStyles}>
            Running benchmark across models...
          </div>
        ) : !availableModels[activeTab] ? (
          /* Disabled model tab placeholder */
          <div style={disabledPlaceholderStyles}>
            <div style={keyIconStyles}>🔑</div>
            <div style={{ fontSize: "14px", fontWeight: 500 }}>
              Key Not Configured
            </div>
            <div style={{ fontSize: "12px", color: "#4a4b50", maxWidth: "240px" }}>
              Add{" "}
              {activeTab === "llama3-groq"
                ? "GROQ_API_KEY"
                : activeTab === "claude-haiku"
                ? "ANTHROPIC_API_KEY"
                : "GEMINI_API_KEY"}{" "}
              to your .env file to enable this model
            </div>
          </div>
        ) : !hasData ? (
          <div style={emptyStateStyles}>
            Benchmark results will appear here after you send a query in
            Compare mode
          </div>
        ) : activeResult?.error ? (
          <div className="bench-content-animated" key={activeTab}>
            <div style={errorStyles}>
              <strong>Error:</strong> {activeResult.error}
            </div>
          </div>
        ) : activeResult ? (
          <div className="bench-content-animated" key={activeTab}>
            <div style={responseTextStyles}>{activeResult.answer}</div>
            <div style={metaRowStyles}>
              <span
                style={badgeStyle(
                  MODEL_CONFIG[activeTab]?.color + "22",
                  MODEL_CONFIG[activeTab]?.color
                )}
              >
                ⚡ {activeResult.latency_ms}ms
              </span>
              {activeResult.tokens !== null && activeResult.tokens !== undefined && (
                <span style={badgeStyle("#2a2b2e", "#9a9ba0")}>
                  🔤 {activeResult.tokens} tokens
                </span>
              )}
              <span style={badgeStyle("#2a2b2e", "#6b6d73")}>
                {MODEL_CONFIG[activeTab]?.label}
              </span>
            </div>
            <div style={scoresContainerStyles}>
              <ScoreBar
                label="RAGAS Faithfulness"
                value={activeResult.ragas_faithfulness}
              />
              <ScoreBar
                label="RAGAS Relevancy"
                value={activeResult.ragas_relevancy}
              />
            </div>
          </div>
        ) : (
          <div style={emptyStateStyles}>
            No response from {MODEL_CONFIG[activeTab]?.label}
          </div>
        )}
      </div>
    </div>
  );
}
