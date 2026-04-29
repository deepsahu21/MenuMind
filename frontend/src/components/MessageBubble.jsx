import React from "react";

const userBubbleStyles = {
  alignSelf: "flex-end",
  backgroundColor: "#2c2d30",
  color: "#e8e8ea",
  padding: "10px 16px",
  borderRadius: "16px 16px 4px 16px",
  maxWidth: "70%",
  fontSize: "14px",
  lineHeight: "1.5",
  wordBreak: "break-word",
};

const assistantBubbleStyles = {
  alignSelf: "flex-start",
  backgroundColor: "#1c1d20",
  color: "#d4d4d8",
  padding: "12px 16px",
  borderRadius: "16px 16px 16px 4px",
  maxWidth: "75%",
  fontSize: "14px",
  lineHeight: "1.6",
  borderLeft: "3px solid #3b82f6",
  wordBreak: "break-word",
};

const metaStyles = {
  fontSize: "11px",
  color: "#6b6d73",
  marginTop: "6px",
  paddingLeft: "4px",
};

const typingContainerStyles = {
  alignSelf: "flex-start",
  backgroundColor: "#1c1d20",
  padding: "12px 20px",
  borderRadius: "16px 16px 16px 4px",
  borderLeft: "3px solid #3b82f6",
  display: "flex",
  gap: "5px",
  alignItems: "center",
};

const dotCSS = `
@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}
.typing-dot {
  width: 7px;
  height: 7px;
  background-color: #6b6d73;
  border-radius: 50%;
  animation: bounce 1.2s infinite;
}
.typing-dot:nth-child(2) { animation-delay: 0.15s; }
.typing-dot:nth-child(3) { animation-delay: 0.3s; }
`;

export function TypingIndicator() {
  return (
    <>
      <style>{dotCSS}</style>
      <div style={typingContainerStyles}>
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: "4px" }}>
      <div style={isUser ? userBubbleStyles : assistantBubbleStyles}>
        {message.content}
      </div>
      {!isUser && message.latency_ms > 0 && (
        <div style={metaStyles}>
          Answered in {message.latency_ms}ms &middot; {message.chunks_retrieved} sources retrieved
        </div>
      )}
    </div>
  );
}
