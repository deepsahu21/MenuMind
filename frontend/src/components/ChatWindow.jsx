import React, { useState, useRef, useEffect } from "react";
import MessageBubble, { TypingIndicator } from "./MessageBubble";

const containerStyles = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  borderRight: "1px solid #2a2b2e",
  position: "relative",
};

const messagesAreaStyles = {
  flex: 1,
  overflowY: "auto",
  padding: "24px 28px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const emptyStateStyles = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "24px",
  color: "#5a5b60",
  fontSize: "15px",
};

const emptyTitleStyles = {
  fontSize: "16px",
  fontWeight: 500,
  color: "#8b8d93",
  fontStyle: "italic",
};

const suggestionsContainerStyles = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  maxWidth: "360px",
  width: "100%",
};

function suggestionChipStyle(isDisabled) {
  return {
    padding: "10px 16px",
    borderRadius: "10px",
    border: "1px solid #2a2b2e",
    backgroundColor: "#1c1d20",
    color: isDisabled ? "#4a4b50" : "#b0b1b6",
    fontSize: "13px",
    cursor: isDisabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    transition: "all 0.15s ease",
    opacity: isDisabled ? 0.5 : 1,
    lineHeight: "1.4",
  };
}

// Disabled overlay for when core RAG is unavailable
const disabledOverlayStyles = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  color: "#5a5b60",
  padding: "40px",
  textAlign: "center",
};

const inputBarStyles = {
  display: "flex",
  gap: "10px",
  padding: "16px 24px",
  borderTop: "1px solid #2a2b2e",
  backgroundColor: "#161719",
  flexShrink: 0,
};

const uploadButtonStyles = {
  width: "42px",
  borderRadius: "10px",
  border: "1px solid #3a3b3e",
  backgroundColor: "#1c1d20",
  color: "#b0b1b6",
  fontSize: "17px",
  cursor: "pointer",
  fontFamily: "inherit",
  flexShrink: 0,
};

const uploadButtonDisabledStyles = {
  ...uploadButtonStyles,
  color: "#5a5b60",
  cursor: "not-allowed",
  opacity: 0.6,
};

const inputStyles = {
  flex: 1,
  padding: "10px 16px",
  borderRadius: "10px",
  border: "1px solid #3a3b3e",
  backgroundColor: "#1c1d20",
  color: "#e1e1e3",
  fontSize: "14px",
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color 0.15s ease",
};

const buttonStyles = {
  padding: "10px 22px",
  borderRadius: "10px",
  border: "none",
  backgroundColor: "#3b82f6",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "background-color 0.15s ease",
  flexShrink: 0,
};

const buttonDisabledStyles = {
  ...buttonStyles,
  backgroundColor: "#2a2b2e",
  color: "#5a5b60",
  cursor: "not-allowed",
};

const toastStyles = {
  margin: "0 24px 12px",
  padding: "10px 14px",
  borderRadius: "10px",
  backgroundColor: "#10251a",
  border: "1px solid #14532d",
  color: "#86efac",
  fontSize: "13px",
  flexShrink: 0,
};

export default function ChatWindow({
  messages,
  onSend,
  isLoading,
  disabled = false,
  suggestions = [],
  onSuggestionClick,
  onUpload,
  isUploading = false,
  toast = null,
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || disabled) return;
    setInput("");
    onSend(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload?.(file);
    }
    e.target.value = "";
  };

  return (
    <div style={containerStyles}>
      {disabled ? (
        /* Core RAG unavailable — Pinecone or Gemini key missing */
        <div style={disabledOverlayStyles}>
          <div style={{ fontSize: "32px", opacity: 0.3 }}>🔒</div>
          <div style={{ fontSize: "15px", fontWeight: 500, color: "#7a7b80" }}>
            RAG Unavailable
          </div>
          <div style={{ fontSize: "13px", maxWidth: "280px", lineHeight: "1.5" }}>
            Pinecone and Gemini API keys are required for the RAG pipeline.
            Add them to your <code style={{ color: "#8b8d93" }}>.env</code> file
            and restart the backend.
          </div>
        </div>
      ) : isEmpty ? (
        /* Empty state with suggestion chips */
        <div style={emptyStateStyles}>
          <div style={emptyTitleStyles}>Ask anything about your documents</div>
          {suggestions.length > 0 && (
            <div style={suggestionsContainerStyles}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  style={suggestionChipStyle(false)}
                  onClick={() => onSuggestionClick?.(s)}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = "#3b82f6";
                    e.target.style.color = "#e1e1e3";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = "#2a2b2e";
                    e.target.style.color = "#b0b1b6";
                  }}
                >
                  💬 {s.text}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={messagesAreaStyles}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      )}
      {toast && <div style={toastStyles}>{toast}</div>}
      <div style={inputBarStyles}>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <button
          type="button"
          style={isUploading || disabled ? uploadButtonDisabledStyles : uploadButtonStyles}
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          title="Upload a PDF"
        >
          {isUploading ? "..." : "📎"}
        </button>
        <input
          ref={inputRef}
          style={{
            ...inputStyles,
            ...(disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}),
          }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "RAG pipeline unavailable" : "Type your question..."}
          disabled={isLoading || disabled}
          onFocus={(e) => !disabled && (e.target.style.borderColor = "#3b82f6")}
          onBlur={(e) => (e.target.style.borderColor = "#3a3b3e")}
        />
        <button
          style={isLoading || !input.trim() || disabled ? buttonDisabledStyles : buttonStyles}
          onClick={handleSend}
          disabled={isLoading || !input.trim() || disabled}
        >
          Send
        </button>
      </div>
    </div>
  );
}
