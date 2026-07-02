"use client";

import { startTransition, useState } from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/theme-monokai";

const ASSISTANT_PROMPT =
  "Type how you would fix this error. We will keep your debugging notes here.";

function createInitialMessages() {
  return [{ id: "assistant-intro", role: "assistant", content: ASSISTANT_PROMPT }];
}

function createUserMessage(content) {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "user",
    content,
  };
}

export default function DebugBattleClient({ initialPayload }) {
  const [challenge, setChallenge] = useState(initialPayload.challenge);
  const [code, setCode] = useState(initialPayload.challenge.code);
  const [messages, setMessages] = useState(createInitialMessages);
  const [draft, setDraft] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [source, setSource] = useState(initialPayload.source || "fallback");
  const [loadError, setLoadError] = useState("");
  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);

  async function loadChallenge() {
    setRefreshing(true);
    setLoadError("");
    try {
      const response = await fetch("/api/debug-battle", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload?.error || "Could not generate a debugging challenge.");
      startTransition(() => {
        setChallenge(payload.challenge);
        setCode(payload.challenge.code);
        setSource(payload.source || "fallback");
        setMessages(createInitialMessages());
        setDraft("");
        setSummary("");
      });
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not generate a debugging challenge.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function readCode() {
    setSummarizing(true);
    setSummary("");
    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Summarization failed.");
      setSummary(payload.summary);
    } catch (error) {
      setSummary(error instanceof Error ? error.message : "Summarization failed.");
    } finally {
      setSummarizing(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedDraft = draft.trim();
    if (!trimmedDraft) return;
    setMessages((prev) => [...prev, createUserMessage(trimmedDraft)]);
    setDraft("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#1a1a2e", color: "#e2e8f0" }}>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 16px", background: "#16213e", borderBottom: "1px solid #0f3460", flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: "15px", color: "#e94560" }}>DebugRoyale</span>
        <span style={{ fontSize: "12px", color: "#8b949e", background: "#0f3460", padding: "2px 10px", borderRadius: "999px" }}>
          {source === "groq" ? "Live Groq" : "Fallback"}
        </span>
        <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: "#c9d1d9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {challenge.title}
        </span>
        <button
          type="button"
          onClick={loadChallenge}
          disabled={refreshing}
          style={{ background: "#e94560", color: "#fff", border: "none", padding: "5px 16px", borderRadius: "6px", cursor: refreshing ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: 600, opacity: refreshing ? 0.6 : 1 }}
        >
          {refreshing ? "Generating…" : "New Challenge"}
        </button>
      </div>

      {loadError && (
        <div style={{ padding: "6px 16px", background: "#3b0d0d", color: "#fca5a5", fontSize: "12px", borderBottom: "1px solid #6e1414", flexShrink: 0 }}>
          {loadError}
        </div>
      )}

      {/* Two-panel body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left panel — Ace Editor */}
        <div style={{ width: "60%", display: "flex", flexDirection: "column" }}>
          {/* Editor toolbar */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", padding: "6px 12px", background: "#16213e", borderBottom: "1px solid #0f3460", borderRight: "1px solid #0f3460", flexShrink: 0 }}>
            <button type="button" style={{ background: "transparent", border: "1px solid #3fb950", color: "#3fb950", padding: "3px 12px", borderRadius: "5px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
              ▶ Run
            </button>
            <button type="button" style={{ background: "transparent", border: "1px solid #d29922", color: "#d29922", padding: "3px 12px", borderRadius: "5px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
              Hint
            </button>
            <button type="button" style={{ background: "transparent", border: "1px solid #a371f7", color: "#a371f7", padding: "3px 12px", borderRadius: "5px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
              Submit Fix
            </button>
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "#484f58" }}>
              {challenge.difficulty} · C++
            </span>
          </div>

          <AceEditor
            mode="c_cpp"
            theme="monokai"
            name="debug-editor"
            value={code}
            onChange={setCode}
            width="100%"
            height="100%"
            fontSize={14}
            setOptions={{
              useWorker: false,
              showLineNumbers: true,
              tabSize: 2,
            }}
          />
        </div>

        {/* Right panel — Output */}
        <div style={{ width: "40%", display: "flex", flexDirection: "column", borderLeft: "1px solid #0f3460", overflow: "hidden", background: "#16213e" }}>

          {/* Read button */}
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #0f3460", flexShrink: 0 }}>
            <button
              type="button"
              onClick={readCode}
              disabled={summarizing}
              style={{ background: summarizing ? "#0f3460" : "#16213e", color: summarizing ? "#484f58" : "#58a6ff", border: "1px solid #58a6ff", padding: "5px 18px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: summarizing ? "not-allowed" : "pointer", opacity: summarizing ? 0.7 : 1 }}
            >
              {summarizing ? "Reading…" : "Read"}
            </button>
          </div>

          {/* Summary card */}
          {summary && (
            <div style={{ margin: "12px 16px 0", padding: "12px 14px", background: "#0d2137", border: "1px solid #1a4a7a", borderRadius: "10px", flexShrink: 0 }}>
              <p style={{ margin: "0 0 4px 0", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#58a6ff" }}>
                What this code does
              </p>
              <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.7, color: "#c9d1d9" }}>
                {summary}
              </p>
            </div>
          )}

          {/* Problem statement */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #0f3460", maxHeight: "200px", overflowY: "auto", flexShrink: 0 }}>
            <p style={{ margin: "0 0 6px 0", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#484f58" }}>
              Problem Statement
            </p>
            <pre style={{ margin: 0, fontSize: "12px", lineHeight: 1.75, color: "#8b949e", whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
              {challenge.statement}
            </pre>
          </div>

          {/* Error output */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #0f3460", background: "#1a0810", maxHeight: "220px", overflowY: "auto", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#f85149" }}>
                Error Output
              </p>
              <span style={{ background: "#3b0d0d", border: "1px solid #6e1414", color: "#fca5a5", fontSize: "10px", padding: "1px 8px", borderRadius: "4px" }}>
                {challenge.errorLabel}
              </span>
            </div>
            <pre style={{ margin: 0, fontSize: "12px", lineHeight: 1.75, color: "#fca5a5", fontFamily: "'Cascadia Code', 'Consolas', monospace", whiteSpace: "pre-wrap" }}>
              {challenge.error}
            </pre>
          </div>

          {/* Resolution chatbox */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "14px 16px", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#484f58" }}>
                Resolution Notes
              </p>
              <span style={{ fontSize: "11px", color: "#484f58" }}>
                {messages.length - 1} note{messages.length === 2 ? "" : "s"}
              </span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    maxWidth: "90%",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    fontSize: "12px",
                    lineHeight: 1.65,
                    background: message.role === "assistant" ? "#0f3460" : "#e94560",
                    color: "#e2e8f0",
                    alignSelf: message.role === "assistant" ? "flex-start" : "flex-end",
                  }}
                >
                  {message.content}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Describe your fix…"
                rows={2}
                style={{ flex: 1, background: "#0f3460", border: "1px solid #1a4a7a", borderRadius: "8px", color: "#e2e8f0", padding: "8px 10px", fontSize: "12px", resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.6 }}
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                style={{ background: draft.trim() ? "#e94560" : "#0f3460", color: draft.trim() ? "#fff" : "#484f58", border: "none", borderRadius: "8px", padding: "0 14px", fontSize: "12px", fontWeight: 600, cursor: draft.trim() ? "pointer" : "not-allowed", alignSelf: "stretch" }}
              >
                Save
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
