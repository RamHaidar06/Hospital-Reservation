import React, { useState, useEffect, useRef } from "react";
import useAppointmentChatbot from "../hooks/useAppointmentChatbot";

/**
 * AppointmentChatbot UI Component
 * Floating chatbot widget for appointment management
 */
export default function AppointmentChatbot({ loggedInPatient, loggedInDoctor, isAuthenticated, onAppointmentsChanged }) {
  const [isOpen, setIsOpen] = useState(false);
  const activeUser = loggedInPatient || loggedInDoctor || null;
  const userRole = loggedInDoctor ? "doctor" : "patient";
  const { messages, loading, submitTextMessage, selectQuickReply, resetChat } =
    useAppointmentChatbot(activeUser, userRole, onAppointmentsChanged);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isAuthenticated || !activeUser) {
    return null; // Don't show chatbot if not logged in
  }

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    submitTextMessage(inputValue);
    setInputValue("");
  };

  const handleQuickReply = (replyId) => {
    selectQuickReply(replyId);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="chatbot-launcher"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--cyan-bright) 0%, var(--teal-accent) 100%)",
          border: "none",
          color: "#000",
          fontSize: "1.5rem",
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(14, 165, 233, 0.4)",
          transition: "all 0.3s ease",
          zIndex: 99,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = "scale(1.1)";
          e.target.style.boxShadow = "0 12px 32px rgba(14, 165, 233, 0.6)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "scale(1)";
          e.target.style.boxShadow = "0 8px 24px rgba(14, 165, 233, 0.4)";
        }}
          title="Gemini Secretary"
      >
        💬
      </button>

      {/* Chatbot Panel */}
      {isOpen && (
        <div
          className="chatbot-panel"
          style={{
            position: "fixed",
            bottom: "100px",
            right: "24px",
            width: "420px",
            maxWidth: "calc(100vw - 48px)",
            height: "min(74vh, 760px)",
            minHeight: "420px",
            backgroundClip: "padding-box",
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(14, 165, 233, 0.3)",
            borderRadius: "12px",
            boxShadow: "0 20px 64px rgba(14, 165, 233, 0.3)",
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
            backdropFilter: "blur(10px)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            className="chatbot-header"
            style={{
              padding: "16px",
              borderBottom: "1px solid rgba(14, 165, 233, 0.2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(14, 165, 233, 0.1)",
              borderRadius: "12px 12px 0 0",
            }}
          >
            <div>
              <h3
                style={{
                  margin: "0",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                🤖 Gemini Secretary
              </h3>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                }}
              >
                Powered by Gemini
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={resetChat}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  padding: "0",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(14, 165, 233, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                }}
                title="Reset chat"
              >
                🔄
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  padding: "0",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(14, 165, 233, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                }}
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div
            className="chatbot-messages"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              overscrollBehavior: "contain",
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: msg.type === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "12px 14px",
                    borderRadius: msg.type === "user" ? "12px 12px 0 12px" : "12px 12px 12px 0",
                    background:
                      msg.type === "user"
                        ? "linear-gradient(135deg, var(--cyan-bright) 0%, var(--teal-accent) 100%)"
                        : "rgba(14, 165, 233, 0.1)",
                    border:
                      msg.type === "user"
                        ? "1px solid var(--cyan-bright)"
                        : "1px solid rgba(14, 165, 233, 0.3)",
                    color: msg.type === "user" ? "#000" : "#fff",
                    fontSize: "0.9rem",
                    lineHeight: "1.4",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", gap: "4px", padding: "12px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "var(--cyan-bright)",
                    animation: "pulse 1.4s ease-in-out infinite",
                  }}
                />
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "var(--cyan-bright)",
                    animation: "pulse 1.4s ease-in-out 0.2s infinite",
                  }}
                />
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "var(--cyan-bright)",
                    animation: "pulse 1.4s ease-in-out 0.4s infinite",
                  }}
                />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          {messages.length > 0 && messages[messages.length - 1]?.quickReplies && (
            <div
              className="chatbot-quick-replies"
              style={{
                padding: "12px",
                borderTop: "1px solid rgba(14, 165, 233, 0.2)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxHeight: "34%",
                overflowY: "auto",
                overflowX: "hidden",
                overscrollBehavior: "contain",
                flexShrink: 0,
              }}
            >
              {messages[messages.length - 1].quickReplies.map((reply) => (
                <button
                  key={reply.id}
                  onClick={() => handleQuickReply(reply.id)}
                  disabled={loading}
                  className="chatbot-quick-reply"
                  style={{
                    padding: "10px 14px",
                    background: "rgba(14, 165, 233, 0.15)",
                    border: "1px solid rgba(14, 165, 233, 0.4)",
                    color: "var(--cyan-bright)",
                    borderRadius: "6px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    transition: "all 0.2s ease",
                    opacity: loading ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.background = "rgba(14, 165, 233, 0.25)";
                      e.target.style.borderColor = "var(--cyan-bright)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "rgba(14, 165, 233, 0.15)";
                    e.target.style.borderColor = "rgba(14, 165, 233, 0.4)";
                  }}
                >
                  {reply.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            className="chatbot-input-row"
            onSubmit={handleSendMessage}
            style={{
              padding: "12px",
              borderTop: "1px solid rgba(14, 165, 233, 0.2)",
              display: "flex",
              gap: "8px",
              borderRadius: "0 0 12px 12px",
            }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 12px",
                background: "rgba(14, 165, 233, 0.1)",
                border: "1px solid rgba(14, 165, 233, 0.3)",
                borderRadius: "4px",
                color: "#fff",
                fontSize: "0.85rem",
                outline: "none",
                transition: "all 0.2s ease",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--cyan-bright)";
                e.target.style.boxShadow = "0 0 8px rgba(14, 165, 233, 0.2)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(14, 165, 233, 0.3)";
                e.target.style.boxShadow = "none";
              }}
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              style={{
                padding: "10px 16px",
                background: "linear-gradient(135deg, var(--cyan-bright) 0%, var(--teal-accent) 100%)",
                border: "none",
                color: "#000",
                borderRadius: "4px",
                cursor: loading || !inputValue.trim() ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: "0.85rem",
                transition: "all 0.2s ease",
                opacity: loading || !inputValue.trim() ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading && inputValue.trim()) {
                  e.target.style.boxShadow = "0 4px 12px rgba(14, 165, 233, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = "none";
              }}
            >
              {loading ? "..." : "Send"}
            </button>
          </form>
        </div>
      )}

      {/* Pulse animation for loading */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
