"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  X,
  Minimize2,
  Maximize2,
  Bot,
  User,
  Shield,
  RefreshCw,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { auditApi } from "@/lib/api";

const QUICK_PROMPT_CHIPS = [
  "Which accounts should I prioritize?",
  "Why are dormant accounts risky?",
  "Audit summary report",
  "Which accounts haven't been reviewed?",
  "How does BreachWatch protect me?"
];

/**
 * Lightweight Markdown Formatter for clean assistant responses
 */
function MarkdownMessage({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} style={{ margin: "6px 0", paddingLeft: "18px", listStyleType: "disc" }}>
          {currentList.map((item, idx) => (
            <li key={idx} style={{ marginBottom: "4px", lineHeight: "1.4" }}>
              {formatInlineStyles(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const formatInlineStyles = (str) => {
    const parts = [];
    // Regex matches **bold**, `code`, and plain text
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(
          <strong key={`b-${match.index}`} style={{ color: "#f1f5ee", fontWeight: "700" }}>
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code
            key={`c-${match.index}`}
            style={{
              background: "rgba(184, 216, 178, 0.12)",
              color: "#bde5c3",
              padding: "1px 5px",
              borderRadius: "4px",
              fontSize: "11px",
              fontFamily: "monospace"
            }}
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < str.length) {
      parts.push(str.substring(lastIndex));
    }

    return parts;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    // Header 3
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h4
          key={`h3-${index}`}
          style={{
            fontSize: "13.5px",
            fontWeight: "700",
            color: "#f1f5ee",
            margin: "8px 0 4px 0",
            letterSpacing: "-0.2px"
          }}
        >
          {formatInlineStyles(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      flushList();
      elements.push(
        <blockquote
          key={`bq-${index}`}
          style={{
            borderLeft: "2px solid rgba(74, 222, 128, 0.6)",
            background: "rgba(20, 36, 26, 0.6)",
            padding: "5px 10px",
            margin: "6px 0",
            fontSize: "11.5px",
            color: "#8ea890",
            borderRadius: "0 6px 6px 0"
          }}
        >
          {formatInlineStyles(trimmed.slice(2))}
        </blockquote>
      );
      return;
    }

    // List item (-, *, or number)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      currentList.push(trimmed.slice(2));
      return;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      currentList.push(numMatch[2]);
      return;
    }

    // Paragraph
    flushList();
    elements.push(
      <p key={`p-${index}`} style={{ margin: "4px 0", lineHeight: "1.4" }}>
        {formatInlineStyles(trimmed)}
      </p>
    );
  });

  flushList();

  return <div style={{ fontSize: "12px", color: "#e2ece1" }}>{elements}</div>;
}

export function GhostAICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "model",
      content:
        "### ✦ GhostAI Security Advisor Ready\n\nI am grounded in your live identity audit. Ask me which dormant accounts to decommission, prioritize your remediation queue, or generate an executive security summary.\n\n*How can I help protect your digital perimeter today?*",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isMinimized]);

  /**
   * Dispatches user question to backend GhostAI endpoint
   */
  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isThinking) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInputMessage("");
    setIsThinking(true);

    try {
      // Build lightweight conversation history
      const historyPayload = updatedHistory
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content
        }));

      const response = await auditApi.askGhostAI(query, historyPayload);

      const botReply = response?.reply || "I analyzed your perimeter posture, but could not produce a response. Please try again.";

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: "model",
          content: botReply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } catch (err) {
      console.warn("[GhostAI] Advisor error:", err.message);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "model",
          content:
            "### ⚠️ Advisor Notice\n\nUnable to reach backend security context. Please check that `http://localhost:5000` is running.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* 1. Floating Ambient Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="ghostai-trigger"
          title="Open GhostAI Security Copilot"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "30px",
            background: "linear-gradient(135deg, rgba(20, 36, 26, 0.96) 0%, rgba(14, 26, 19, 0.96) 100%)",
            border: "1px solid rgba(74, 222, 128, 0.4)",
            color: "#bde5c3",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4), 0 0 16px rgba(74, 222, 128, 0.25)",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            userSelect: "none"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 24px rgba(0, 0, 0, 0.5), 0 0 22px rgba(74, 222, 128, 0.45)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.4), 0 0 16px rgba(74, 222, 128, 0.25)";
          }}
        >
          {/* Subtle Ambient Pulse Ring */}
          <span
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "14px",
              height: "14px"
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: "-2px",
                borderRadius: "50%",
                background: "rgba(74, 222, 128, 0.35)",
                animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite"
              }}
            />
            <Sparkles size={14} color="#4ade80" />
          </span>
          <span>✦ GhostAI Advisor</span>
        </button>
      )}

      {/* 2. Floating Chat Window Modal / Drawer */}
      {isOpen && (
        <div
          className="ghostai-window"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "385px",
            maxWidth: "calc(100vw - 32px)",
            height: isMinimized ? "54px" : "540px",
            maxHeight: "calc(100vh - 48px)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(180deg, #18261e 0%, #142019 100%)",
            border: "1px solid rgba(134, 179, 144, 0.28)",
            borderRadius: "16px",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(74, 222, 128, 0.15)",
            overflow: "hidden",
            transition: "height 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        >
          {/* Window Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              background: "rgba(20, 32, 24, 0.9)",
              borderBottom: isMinimized ? "none" : "1px solid rgba(134, 179, 144, 0.18)",
              userSelect: "none"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  background: "rgba(74, 222, 128, 0.15)",
                  border: "1px solid rgba(74, 222, 128, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#4ade80"
                }}
              >
                <Sparkles size={14} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <strong style={{ fontSize: "12.5px", color: "#f1f5ee", fontWeight: "700" }}>
                    GhostAI Copilot
                  </strong>
                  <span
                    style={{
                      fontSize: "8.5px",
                      fontWeight: "700",
                      padding: "1.5px 6px",
                      borderRadius: "10px",
                      background: "rgba(74, 222, 128, 0.18)",
                      color: "#bde5c3",
                      border: "1px solid rgba(74, 222, 128, 0.3)",
                      letterSpacing: "0.04em"
                    }}
                  >
                    ● GROUNDED
                  </span>
                </div>
              </div>
            </div>

            {/* Header Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimize"}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#8ea890",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Advisor"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#8ea890",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Quick-Prompt Chips Row */}
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(25, 37, 28, 0.6)",
                  borderBottom: "1px solid rgba(134, 179, 144, 0.12)",
                  display: "flex",
                  gap: "6px",
                  overflowX: "auto",
                  whiteSpace: "nowrap",
                  scrollbarWidth: "none"
                }}
              >
                {QUICK_PROMPT_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip)}
                    disabled={isThinking}
                    style={{
                      background: "rgba(184, 216, 178, 0.08)",
                      border: "1px solid rgba(134, 179, 144, 0.2)",
                      borderRadius: "14px",
                      padding: "3.5px 10px",
                      fontSize: "10.5px",
                      fontWeight: "600",
                      color: "#bde5c3",
                      cursor: isThinking ? "not-allowed" : "pointer",
                      transition: "all 0.12s ease",
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      if (!isThinking) e.currentTarget.style.background = "rgba(184, 216, 178, 0.18)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isThinking) e.currentTarget.style.background = "rgba(184, 216, 178, 0.08)";
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Message Stream */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "14px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  background: "rgba(19, 31, 23, 0.4)"
                }}
              >
                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isUser ? "flex-end" : "flex-start",
                        maxWidth: "100%"
                      }}
                    >
                      <div
                        style={{
                          maxWidth: isUser ? "85%" : "96%",
                          padding: isUser ? "8px 12px" : "10px 14px",
                          borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                          background: isUser ? "#25362a" : "#1b2d21",
                          border: isUser ? "1px solid rgba(134, 179, 144, 0.2)" : "1px solid rgba(134, 179, 144, 0.18)",
                          borderLeft: isUser ? undefined : "3px solid #4ade80",
                          color: isUser ? "#f1f5ee" : "#e2ece1",
                          fontSize: "12px",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                          wordBreak: "break-word"
                        }}
                      >
                        {isUser ? (
                          <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.4" }}>{msg.content}</div>
                        ) : (
                          <MarkdownMessage text={msg.content} />
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: "9px",
                          color: "#8ea890",
                          marginTop: "3px",
                          padding: isUser ? "0 4px 0 0" : "0 0 0 4px"
                        }}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  );
                })}

                {/* Thinking Pulse */}
                {isThinking && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "12px 12px 12px 2px",
                        background: "#1b2d21",
                        border: "1px solid rgba(134, 179, 144, 0.18)",
                        borderLeft: "3px solid #4ade80",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <RefreshCw size={12} color="#4ade80" className="animate-spin" />
                      <span style={{ fontSize: "11px", color: "#8ea890" }}>
                        GhostAI is analyzing your security context...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Box Footer */}
              <div
                style={{
                  padding: "10px 12px",
                  background: "#16231b",
                  borderTop: "1px solid rgba(134, 179, 144, 0.16)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask GhostAI about your digital footprint..."
                  disabled={isThinking}
                  style={{
                    flex: 1,
                    background: "rgba(25, 37, 28, 0.8)",
                    border: "1px solid rgba(134, 179, 144, 0.22)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    color: "#f1f5ee",
                    outline: "none"
                  }}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isThinking || !inputMessage.trim()}
                  title="Send message (Enter)"
                  style={{
                    background: isThinking || !inputMessage.trim()
                      ? "rgba(184, 216, 178, 0.1)"
                      : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    border: "none",
                    borderRadius: "8px",
                    width: "34px",
                    height: "34px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isThinking || !inputMessage.trim() ? "#8ea890" : "#0a1f14",
                    cursor: isThinking || !inputMessage.trim() ? "not-allowed" : "pointer",
                    transition: "all 0.15s ease",
                    flexShrink: 0
                  }}
                >
                  <Send size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default GhostAICopilot;

