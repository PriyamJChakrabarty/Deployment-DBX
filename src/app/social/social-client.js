"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const C = {
  bg:      "#0d1a1f",
  panel:   "#0a1419",
  sidebar: "#060c0f",
  card:    "#0e191f",
  border:  "rgba(201,214,218,0.07)",
  green:   "#3ddc84",
  cyan:    "#22d3ee",
  text:    "#e8f0f3",
  sub:     "#8ba0a6",
  muted:   "#4a6570",
};

// ── SVG icons ──────────────────────────────────────────────────
function IconChat({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconPeople({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconShield({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconSend({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

// ── Helpers ────────────────────────────────────────────────────
function dname(u) {
  if (!u) return "?";
  if (u.username) return u.username;
  const f = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return f || "Anonymous";
}

function timeAgo(d) {
  if (!d) return "";
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60)    return "now";
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

async function api(url, opts = {}) {
  const r = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts.headers },
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error || "Request failed");
  return d;
}

function Avi({ name, size = 36, color = C.green, online = false }) {
  const dotSize = Math.max(8, Math.round(size * 0.28));
  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `linear-gradient(135deg, ${color}28, ${color}0a)`,
        border: `1.5px solid ${color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: Math.round(size * 0.4), fontWeight: 700, color,
        userSelect: "none", letterSpacing: "-0.01em",
      }}>
        {(name || "?")[0].toUpperCase()}
      </div>
      {online && (
        <div style={{
          position: "absolute", bottom: 0, right: 0,
          width: dotSize, height: dotSize, borderRadius: "50%",
          background: C.green, border: `2px solid ${C.bg}`,
          boxShadow: "0 0 6px rgba(61,220,132,0.5)",
        }} />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────
function Bubble({ msg, isMine }) {
  return (
    <div style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
      <div style={{
        maxWidth: "70%",
        background: isMine ? "rgba(61,220,132,0.12)" : "rgba(201,214,218,0.05)",
        border: `1px solid ${isMine ? "rgba(61,220,132,0.28)" : "rgba(201,214,218,0.1)"}`,
        borderRadius: isMine ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
        padding: "9px 13px",
      }}>
        <p style={{ margin: 0, fontSize: "13.5px", color: C.text, lineHeight: 1.5, wordBreak: "break-word" }}>
          {msg.body}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: "10px", color: C.muted, textAlign: isMine ? "right" : "left" }}>
          {timeAgo(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

function InboxRow({ conv, active, myClerkId, onClick, online }) {
  const name = conv.displayName || "Unknown";
  const last = conv.lastMessage;
  const mine = last?.senderClerkId === myClerkId;
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", background: active ? "rgba(61,220,132,0.05)" : "none",
        border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", gap: "11px",
        padding: "10px 16px",
        borderLeft: active ? `2px solid ${C.green}` : "2px solid transparent",
      }}
    >
      <Avi name={name} size={38} color={C.cyan} online={online} />
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "130px" }}>
            {name}
          </span>
          <span style={{ fontSize: "10px", color: C.muted, flexShrink: 0, marginLeft: "6px" }}>
            {timeAgo(last?.createdAt || conv.updatedAt)}
          </span>
        </div>
        <div style={{ fontSize: "12px", color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>
          {last ? `${mine ? "You: " : ""}${last.body}` : ""}
        </div>
      </div>
    </button>
  );
}

function SuggestCard({ user, isFollowed, onFollow, onMessage, online }) {
  const name = dname(user);
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px",
      padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
      width: "130px", flexShrink: 0,
    }}>
      <Avi name={name} size={44} color={C.green} online={online} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "110px" }}>
          {name}
        </div>
        <div style={{ fontSize: "10px", color: C.muted, marginTop: "2px" }}>
          {user.bestScore > 0 ? `${user.bestScore} pts` : "New"}
        </div>
      </div>
      <div style={{ display: "flex", gap: "6px", width: "100%" }}>
        <button
          onClick={onFollow}
          style={{
            flex: 1, fontSize: "11px", fontWeight: 700, padding: "5px 0",
            borderRadius: "6px", cursor: "pointer",
            background: isFollowed ? "transparent" : C.green,
            color: isFollowed ? C.muted : "#0d1a1f",
            border: `1px solid ${isFollowed ? C.border : C.green}`,
          }}
        >
          {isFollowed ? "Unfollow" : "Follow"}
        </button>
        <button
          onClick={onMessage}
          style={{
            flex: 1, fontSize: "11px", fontWeight: 700, padding: "5px 0",
            borderRadius: "6px", cursor: "pointer",
            background: "transparent", color: C.cyan,
            border: `1px solid rgba(34,211,238,0.3)`,
          }}
        >
          DM
        </button>
      </div>
    </div>
  );
}

function FollowCard({ user, onMessage, onUnfollow, onChallenge, online }) {
  const name = dname(user);
  const hasNote = !!user.noteText;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "10px 14px", borderRadius: "10px",
      background: C.card, border: `1px solid ${C.border}`,
    }}>
      <Avi name={name} size={40} color={C.cyan} online={online} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </div>
        {hasNote ? (
          <div style={{ fontSize: "11.5px", color: C.sub, marginTop: "3px", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            &ldquo;{user.noteText}&rdquo;
          </div>
        ) : (
          <div style={{ fontSize: "11px", color: C.muted, marginTop: "3px" }}>
            {user.bestScore > 0 ? `${user.bestScore} pts` : "No note yet"}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
        <button
          onClick={onUnfollow}
          style={{
            fontSize: "11px", fontWeight: 600, padding: "5px 10px",
            borderRadius: "6px", cursor: "pointer",
            background: "transparent", color: C.muted,
            border: `1px solid ${C.border}`,
          }}
        >
          Unfollow
        </button>
        <button
          onClick={onChallenge}
          style={{
            fontSize: "11px", fontWeight: 700, padding: "5px 12px",
            borderRadius: "6px", cursor: "pointer",
            background: "rgba(245,185,66,0.08)", color: "#f5b942",
            border: "1px solid rgba(245,185,66,0.3)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(245,185,66,0.16)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(245,185,66,0.08)"; }}
        >
          ⚔️ Challenge
        </button>
        <button
          onClick={onMessage}
          style={{
            fontSize: "11px", fontWeight: 700, padding: "5px 12px",
            borderRadius: "6px", cursor: "pointer",
            background: "transparent", color: C.cyan,
            border: `1px solid rgba(34,211,238,0.3)`,
          }}
        >
          DM
        </button>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────
export default function SocialClient({ myClerkId, myNote }) {
  const [view, setView] = useState("messages");

  const [inbox, setInbox]           = useState([]);
  const [inboxLoaded, setInboxLoaded] = useState(false);
  const [activeConvId, setConvId]   = useState(null);
  const [messages, setMsgs]         = useState([]);
  const [input, setInput]           = useState("");
  const [sending, setSending]       = useState(false);

  // pendingTarget: { clerkId, displayName } — set when DM is clicked but no conv yet
  const [pendingTarget, setPendingTarget] = useState(null);

  const [suggested, setSuggested]   = useState([]);
  const [following, setFollowing]   = useState([]);
  const [followed,  setFollowed]    = useState(new Set());

  const [myNoteText, setMyNoteText] = useState(myNote || "");
  const [editNote,   setEditNote]   = useState(false);
  const [noteInput,  setNoteInput]  = useState(myNote || "");

  const [onlineIds, setOnlineIds]   = useState(new Set());

  const endRef    = useRef(null);
  const pollRef   = useRef(null);
  const onlineRef = useRef(null);
  const activeConv = inbox.find((c) => c.id === activeConvId) ?? null;

  // Keep followed Set in sync with following list
  useEffect(() => {
    setFollowed(new Set(following.map((u) => u.clerkId)));
  }, [following]);

  // If inbox loads and contains the pending target, switch to that conversation
  useEffect(() => {
    if (!pendingTarget || inbox.length === 0) return;
    const existing = inbox.find((c) => c.otherClerkId === pendingTarget.clerkId);
    if (existing) {
      setConvId(existing.id);
      setPendingTarget(null);
    }
  }, [inbox, pendingTarget]);

  const fetchSuggested = useCallback(async () => {
    if (!myClerkId) return;
    try { setSuggested(await api("/api/follow/suggested")); } catch {}
  }, [myClerkId]);

  const fetchFollowing = useCallback(async () => {
    if (!myClerkId) return;
    try { setFollowing(await api("/api/follow/following")); } catch {}
  }, [myClerkId]);

  const fetchInbox = useCallback(async () => {
    if (!myClerkId) return;
    try { setInbox(await api("/api/chat/inbox")); } catch {}
  }, [myClerkId]);

  const fetchMsgs = useCallback(async (id) => {
    try { setMsgs(await api(`/api/chat/conversation/${id}`)); } catch {}
  }, []);

  useEffect(() => {
    fetchSuggested();
    fetchFollowing();
    fetchInbox().then(() => setInboxLoaded(true));
  }, [fetchSuggested, fetchFollowing, fetchInbox]);

  useEffect(() => {
    clearInterval(pollRef.current);
    if (!activeConvId) return;
    fetchMsgs(activeConvId);
    pollRef.current = setInterval(() => fetchMsgs(activeConvId), 3000);
    return () => clearInterval(pollRef.current);
  }, [activeConvId, fetchMsgs]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!myClerkId) return;
    const refresh = async () => {
      try {
        const r = await fetch("/api/presence/online");
        if (r.ok) {
          const list = await r.json();
          setOnlineIds(new Set(list.map((u) => u.clerkId)));
        }
      } catch {}
    };
    refresh();
    onlineRef.current = setInterval(refresh, 5_000);
    return () => clearInterval(onlineRef.current);
  }, [myClerkId]);

  // ── Follow / Unfollow ──────────────────────────────────────
  async function handleFollow(clerkId) {
    const had = followed.has(clerkId);
    setFollowed((prev) => { const n = new Set(prev); had ? n.delete(clerkId) : n.add(clerkId); return n; });
    try {
      await api("/api/follow", { method: had ? "DELETE" : "POST", body: JSON.stringify({ targetClerkId: clerkId }) });
      if (!had) {
        // Followed: remove from suggested, add to following list
        setSuggested((prev) => prev.filter((u) => u.clerkId !== clerkId));
        await fetchFollowing();
      } else {
        // Unfollowed from suggest card: refresh suggested
        await fetchSuggested();
      }
    } catch {
      setFollowed((prev) => { const n = new Set(prev); had ? n.add(clerkId) : n.delete(clerkId); return n; });
    }
  }

  async function handleUnfollow(clerkId) {
    setFollowing((prev) => prev.filter((u) => u.clerkId !== clerkId));
    setFollowed((prev) => { const n = new Set(prev); n.delete(clerkId); return n; });
    try {
      await api("/api/follow", { method: "DELETE", body: JSON.stringify({ targetClerkId: clerkId }) });
      await fetchSuggested(); // they may reappear as suggestion
    } catch {
      await fetchFollowing(); // revert on error
    }
  }

  // ── Open DM ────────────────────────────────────────────────
  // Does NOT create a conversation upfront.
  // If an existing conversation with that user is already in the inbox, open it.
  // Otherwise, set pendingTarget so the first sent message creates it.
  function handleDMClick(user) {
    const existing = inbox.find((c) => c.otherClerkId === user.clerkId);
    if (existing) {
      setConvId(existing.id);
      setPendingTarget(null);
    } else {
      setConvId(null);
      setPendingTarget({ clerkId: user.clerkId, displayName: dname(user) });
    }
    setView("messages");
  }

  async function handleChallenge(user) {
    try {
      const r = await fetch("/api/duel/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeeClerkId: user.clerkId }),
      });
      const d = await r.json();
      if (d.challengeId) window.location.href = `/duel-challenge/${d.challengeId}`;
    } catch {}
  }

  // ── Send message ───────────────────────────────────────────
  async function handleSend() {
    if (!input.trim() || sending) return;
    if (!activeConvId && !pendingTarget) return;
    setSending(true);
    const body = input.trim();
    setInput("");

    try {
      if (pendingTarget) {
        // First message: create conversation then send
        const { conversationId } = await api("/api/chat/conversation", {
          method: "POST",
          body: JSON.stringify({ targetClerkId: pendingTarget.clerkId }),
        });
        await api(`/api/chat/conversation/${conversationId}/message`, {
          method: "POST",
          body: JSON.stringify({ body }),
        });
        await fetchInbox();
        setConvId(conversationId);
        setPendingTarget(null);
      } else {
        await api(`/api/chat/conversation/${activeConvId}/message`, {
          method: "POST",
          body: JSON.stringify({ body }),
        });
        await Promise.all([fetchMsgs(activeConvId), fetchInbox()]);
      }
    } catch { setInput(body); } finally { setSending(false); }
  }

  // ── Note ───────────────────────────────────────────────────
  async function saveNote() {
    const text = noteInput.trim().slice(0, 60);
    setMyNoteText(text);
    setEditNote(false);
    try {
      await api("/api/social/note", { method: "PATCH", body: JSON.stringify({ noteText: text }) });
    } catch {}
  }

  if (!myClerkId) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
        <p style={{ color: C.sub, fontSize: "15px" }}>Sign in to access social features.</p>
        <Link href="/sign-in" style={{ background: C.green, color: "#0d1a1f", textDecoration: "none", padding: "10px 28px", borderRadius: "8px", fontWeight: 800, fontSize: "14px" }}>
          Sign In →
        </Link>
      </div>
    );
  }

  // Derived: who to show in the chat header
  const chatName = pendingTarget?.displayName ?? activeConv?.displayName ?? null;
  const chatOtherClerkId = pendingTarget?.clerkId ?? activeConv?.otherClerkId ?? null;

  return (
    <div style={{ display: "flex", height: "100%", width: "100%", overflow: "hidden" }}>

      {/* ── Icon sidebar ────────────────────────────────────── */}
      <div style={{
        width: "52px", flexShrink: 0,
        background: C.sidebar,
        borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "18px", gap: "8px",
      }}>
        {[
          { id: "messages", Icon: IconChat,   label: "Messages" },
          { id: "people",   Icon: IconPeople, label: "People"   },
        ].map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            title={label}
            style={{
              width: "38px", height: "38px", borderRadius: "10px",
              background: view === id ? "rgba(61,220,132,0.12)" : "transparent",
              border: `1px solid ${view === id ? "rgba(61,220,132,0.32)" : "transparent"}`,
              color: view === id ? C.green : C.muted,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.15s", padding: 0,
            }}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>

      {/* ── Messages view ───────────────────────────────────── */}
      {view === "messages" && (
        <>
          {/* Inbox list */}
          <div style={{
            width: "265px", flexShrink: 0,
            borderRight: `1px solid ${C.border}`,
            background: C.panel,
            display: "flex", flexDirection: "column", height: "100%",
          }}>
            <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>Messages</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {!inboxLoaded && (
                <p style={{ fontSize: "12px", color: C.muted, textAlign: "center", padding: "24px 16px" }}>Loading…</p>
              )}
              {inboxLoaded && inbox.length === 0 && !pendingTarget && (
                <div style={{ padding: "32px 16px", textAlign: "center" }}>
                  <p style={{ fontSize: "13px", color: C.muted, margin: "0 0 10px" }}>No messages yet.</p>
                  <button onClick={() => setView("people")} style={{ background: "none", border: "none", color: C.cyan, cursor: "pointer", fontSize: "12px", textDecoration: "underline" }}>
                    Find people →
                  </button>
                </div>
              )}

              {/* Pending target row (shown while first message hasn't been sent yet) */}
              {pendingTarget && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "11px",
                  padding: "10px 16px",
                  borderLeft: `2px solid ${C.cyan}`,
                  background: "rgba(34,211,238,0.04)",
                }}>
                  <Avi name={pendingTarget.displayName} size={38} color={C.cyan} online={onlineIds.has(pendingTarget.clerkId)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pendingTarget.displayName}
                    </div>
                    <div style={{ fontSize: "11px", color: C.cyan, marginTop: "2px" }}>New conversation</div>
                  </div>
                </div>
              )}

              {inbox.map((conv) => (
                <InboxRow
                  key={conv.id}
                  conv={conv}
                  active={conv.id === activeConvId && !pendingTarget}
                  myClerkId={myClerkId}
                  onClick={() => { setConvId(conv.id); setPendingTarget(null); }}
                  online={onlineIds.has(conv.otherClerkId)}
                />
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: C.bg, minWidth: 0 }}>
            {chatName ? (
              <>
                {/* Header */}
                <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  <Avi name={chatName} size={32} color={C.cyan} online={onlineIds.has(chatOtherClerkId)} />
                  <div>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: C.text }}>{chatName}</span>
                    {pendingTarget && (
                      <div style={{ fontSize: "11px", color: C.cyan, marginTop: "1px" }}>Send a message to start the conversation</div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {!pendingTarget && messages.length === 0 && (
                    <p style={{ fontSize: "13px", color: C.muted, textAlign: "center", marginTop: "48px" }}>
                      Say hello to {chatName}!
                    </p>
                  )}
                  {pendingTarget && (
                    <p style={{ fontSize: "13px", color: C.muted, textAlign: "center", marginTop: "48px" }}>
                      No messages yet. Send one below!
                    </p>
                  )}
                  {messages.map((msg) => (
                    <Bubble key={msg.id} msg={msg} isMine={msg.senderClerkId === myClerkId} />
                  ))}
                  <div ref={endRef} />
                </div>

                {/* Input */}
                <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: "8px", flexShrink: 0, alignItems: "center" }}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder={`Message ${chatName}…`}
                    maxLength={500}
                    style={{
                      flex: 1, background: C.panel, border: `1px solid ${C.border}`,
                      borderRadius: "8px", padding: "9px 14px", fontSize: "13px", color: C.text, outline: "none",
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    style={{
                      width: "38px", height: "38px", borderRadius: "8px", flexShrink: 0,
                      background: input.trim() && !sending ? C.green : "transparent",
                      color: input.trim() && !sending ? "#0d1a1f" : C.muted,
                      border: `1px solid ${input.trim() && !sending ? C.green : C.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: input.trim() && !sending ? "pointer" : "not-allowed",
                    }}
                  >
                    <IconSend size={15} />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
                <div style={{ color: C.muted }}><IconChat size={36} /></div>
                <p style={{ fontSize: "14px", color: C.sub, margin: 0 }}>Select a conversation</p>
                <button onClick={() => setView("people")} style={{ background: "none", border: "none", color: C.cyan, cursor: "pointer", fontSize: "12px", textDecoration: "underline" }}>
                  Find people →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── People view ─────────────────────────────────────── */}
      {view === "people" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Top — Suggested */}
          <div style={{ flex: "0 0 44%", display: "flex", flexDirection: "column", borderBottom: `2px solid ${C.border}`, overflow: "hidden" }}>
            <div style={{ padding: "13px 24px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: C.sub, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                Suggested Connections
              </span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 24px" }}>
              {suggested.length === 0 ? (
                <p style={{ fontSize: "13px", color: C.muted }}>No suggestions right now.</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  {suggested.map((u) => (
                    <SuggestCard
                      key={u.clerkId}
                      user={u}
                      isFollowed={followed.has(u.clerkId)}
                      online={onlineIds.has(u.clerkId)}
                      onFollow={() => handleFollow(u.clerkId)}
                      onMessage={() => handleDMClick(u)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom — Following */}
          <div style={{ flex: "0 0 56%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "13px 24px 10px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: C.sub, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                Following
              </span>
              <span style={{ fontSize: "11px", color: C.muted }}>{following.length} people</span>
            </div>

            {/* My note */}
            <div style={{
              padding: "8px 24px", borderBottom: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", gap: "10px",
              flexShrink: 0, background: "rgba(61,220,132,0.03)",
            }}>
              <Avi name="Me" size={28} color={C.green} />
              {editNote ? (
                <>
                  <input
                    autoFocus
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveNote(); if (e.key === "Escape") setEditNote(false); }}
                    maxLength={60}
                    placeholder="Your note for followers (60 chars)…"
                    style={{
                      flex: 1, background: C.panel,
                      border: `1px solid rgba(61,220,132,0.3)`, borderRadius: "6px",
                      padding: "5px 10px", fontSize: "12px", color: C.text, outline: "none",
                    }}
                  />
                  <button onClick={saveNote} style={{ background: C.green, color: "#0d1a1f", border: "none", borderRadius: "5px", padding: "5px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                    Save
                  </button>
                  <button onClick={() => setEditNote(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "11px" }}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: "12px", color: myNoteText ? C.sub : C.muted, fontStyle: myNoteText ? "italic" : "normal" }}>
                    {myNoteText ? `"${myNoteText}"` : "Set your note for followers…"}
                  </span>
                  <button
                    onClick={() => { setNoteInput(myNoteText); setEditNote(true); }}
                    style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: "5px", padding: "3px 9px", fontSize: "11px", color: C.sub, cursor: "pointer" }}
                  >
                    Edit
                  </button>
                </>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px 24px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {following.length === 0 ? (
                <p style={{ fontSize: "13px", color: C.muted }}>
                  You&apos;re not following anyone yet.
                </p>
              ) : (
                following.map((u) => (
                  <FollowCard
                    key={u.clerkId}
                    user={u}
                    online={onlineIds.has(u.clerkId)}
                    onUnfollow={() => handleUnfollow(u.clerkId)}
                    onMessage={() => handleDMClick(u)}
                    onChallenge={() => handleChallenge(u)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
