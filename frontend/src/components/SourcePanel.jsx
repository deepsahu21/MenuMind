import React, { useEffect, useState } from "react";

const SOURCE_COLORS = {
  pdf: { bg: "#1e3a8a", text: "#bfdbfe", label: "PDF" },
  url: { bg: "#064e3b", text: "#a7f3d0", label: "URL" },
  text: { bg: "#3b0764", text: "#e9d5ff", label: "Text" },
};

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
  padding: "20px 20px 12px",
  borderBottom: "1px solid #2a2b2e",
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
};

const emptyStyles = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#4a4b50",
  fontSize: "13px",
  fontStyle: "italic",
  padding: "20px",
  textAlign: "center",
};

const cardsContainerStyles = {
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const fadeInCSS = `
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.source-card-animated {
  animation: fadeSlideIn 0.3s ease forwards;
}
`;

function cardStyle(delay) {
  return {
    backgroundColor: "#1c1d20",
    borderRadius: "10px",
    padding: "14px 16px",
    border: "1px solid #2a2b2e",
    animationDelay: `${delay}ms`,
    opacity: 0,
  };
}

const chunkTextStyles = {
  fontSize: "12.5px",
  lineHeight: "1.55",
  color: "#b0b1b6",
  marginBottom: "10px",
};

const badgeRowStyles = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
  alignItems: "center",
};

function sourceBadgeStyle(sourceType) {
  const colors = SOURCE_COLORS[sourceType] || { bg: "#2a2b2e", text: "#e1e1e3", label: "Source" };
  return {
    padding: "3px 10px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 600,
    backgroundColor: colors.bg,
    color: colors.text,
  };
}

const categoryBadgeStyles = {
  padding: "3px 10px",
  borderRadius: "12px",
  fontSize: "11px",
  fontWeight: 500,
  backgroundColor: "#2a2b2e",
  color: "#9a9ba0",
};

function scoreStyle(score) {
  const pct = Math.round(score * 100);
  let color = "#ef4444";
  if (pct >= 85) color = "#4ade80";
  else if (pct >= 70) color = "#facc15";
  return {
    marginLeft: "auto",
    fontSize: "11px",
    fontWeight: 600,
    color,
  };
}

export default function SourcePanel({ sources }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    if (sources.length > 0) {
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [sources]);

  return (
    <div style={panelStyles}>
      <style>{fadeInCSS}</style>
      <div style={headerStyles}>
        <div style={titleStyles}>Sources</div>
        <div style={subtitleStyles}>Retrieved context for last answer</div>
      </div>
      {sources.length === 0 ? (
        <div style={emptyStyles}>
          Sources will appear here after your first question
        </div>
      ) : (
        <div style={cardsContainerStyles}>
          {visible &&
            sources.map((src, i) => {
              const sourceType = src.source_type || "source";
              const sourceInfo = SOURCE_COLORS[sourceType];
              return (
                <div
                  key={`${src.source}-${i}`}
                  className="source-card-animated"
                  style={cardStyle(i * 80)}
                >
                  <div style={chunkTextStyles}>{src.text}</div>
                  <div style={badgeRowStyles}>
                    <span style={sourceBadgeStyle(sourceType)}>
                      {sourceInfo?.label || sourceType}
                    </span>
                    <span style={categoryBadgeStyles}>
                      {src.source_name || src.source || src.category || "Indexed document"}
                    </span>
                    <span style={scoreStyle(src.score)}>
                      {Math.round(src.score * 100)}% match
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
