"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CATEGORY_COLORS, COLORS } from "@/lib/theme";

// Accent hues reused from the category signal palette (hue-matched, not
// semantically tied to bug categories here — same convention as
// TEAM_COLORS in home-client.js).
const GREEN = CATEGORY_COLORS.Scalability; // #2dd881
const CYAN  = CATEGORY_COLORS.Ethics;      // #22d3ee

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

function Avi({ name, size = 36, color = COLORS.brand, online = false }) {
  const dotSize = Math.max(8, Math.round(size * 0.28));
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex select-none items-center justify-center rounded-full tracking-tight"
        style={{
          width: size, height: size,
          background: `linear-gradient(135deg, ${color}28, ${color}0a)`,
          border: `1.5px solid ${color}44`,
          fontSize: Math.round(size * 0.4), fontWeight: 700, color,
        }}
      >
        {(name || "?")[0].toUpperCase()}
      </div>
      {online && (
        <div
          className="absolute bottom-0 right-0 rounded-full border-[2px] border-background"
          style={{
            width: dotSize, height: dotSize,
            background: GREEN,
            boxShadow: `0 0 6px color-mix(in oklab, ${GREEN} 50%, transparent)`,
          }}
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────
function Bubble({ msg, isMine }) {
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-[14px] border px-[13px] py-[9px] ${
          isMine
            ? "rounded-br-[3px] border-signal-scalability/30 bg-signal-scalability/[0.12]"
            : "rounded-bl-[3px] border-border bg-foreground/5"
        }`}
      >
        <p className="m-0 break-words text-[13.5px] leading-relaxed text-foreground">
          {msg.body}
        </p>
        <p className={`mt-1 mb-0 text-[10px] text-foreground-subtle ${isMine ? "text-right" : "text-left"}`}>
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
      className={`flex w-full cursor-pointer items-center gap-[11px] border-l-2 px-4 py-2.5 text-left ${
        active ? "border-signal-scalability bg-signal-scalability/5" : "border-transparent"
      }`}
    >
      <Avi name={name} size={38} color={CYAN} online={online} />
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-baseline justify-between">
          <span className="max-w-[130px] overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-foreground">
            {name}
          </span>
          <span className="ml-1.5 flex-shrink-0 text-[10px] text-foreground-subtle">
            {timeAgo(last?.createdAt || conv.updatedAt)}
          </span>
        </div>
        <div className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-foreground-subtle">
          {last ? `${mine ? "You: " : ""}${last.body}` : ""}
        </div>
      </div>
    </button>
  );
}

function SuggestCard({ user, isFollowed, onFollow, onMessage, online }) {
  const name = dname(user);
  return (
    <div className="flex w-[130px] flex-shrink-0 flex-col items-center gap-2 rounded-[10px] border border-border bg-surface-2 p-3.5">
      <Avi name={name} size={44} color={GREEN} online={online} />
      <div className="text-center">
        <div className="max-w-[110px] overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold text-foreground">
          {name}
        </div>
        <div className="mt-0.5 text-[10px] text-foreground-subtle">
          {user.bestScore > 0 ? `${user.bestScore} pts` : "New"}
        </div>
      </div>
      <div className="flex w-full gap-1.5">
        <button
          onClick={onFollow}
          className={`flex-1 rounded-md border py-1 text-[11px] font-bold ${
            isFollowed
              ? "border-border text-foreground-subtle"
              : "border-signal-scalability bg-signal-scalability text-background"
          }`}
        >
          {isFollowed ? "Unfollow" : "Follow"}
        </button>
        <button
          onClick={onMessage}
          className="flex-1 rounded-md border border-signal-ethics/30 text-[11px] font-bold text-signal-ethics"
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
    <div className="flex items-center gap-3 rounded-[10px] border border-border bg-surface-2 px-3.5 py-2.5">
      <Avi name={name} size={40} color={CYAN} online={online} />
      <div className="min-w-0 flex-1">
        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-foreground">
          {name}
        </div>
        {hasNote ? (
          <div className="mt-[3px] overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] italic text-foreground-muted">
            &ldquo;{user.noteText}&rdquo;
          </div>
        ) : (
          <div className="mt-[3px] text-[11px] text-foreground-subtle">
            {user.bestScore > 0 ? `${user.bestScore} pts` : "No note yet"}
          </div>
        )}
      </div>
      <div className="flex flex-shrink-0 gap-1.5">
        <button
          onClick={onUnfollow}
          className="rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground-subtle"
        >
          Unfollow
        </button>
        <button
          onClick={onChallenge}
          className="rounded-md border border-signal-performance/30 bg-signal-performance/[0.08] px-3 py-1 text-[11px] font-bold text-signal-performance hover:bg-signal-performance/[0.16]"
        >
          ⚔️ Challenge
        </button>
        <button
          onClick={onMessage}
          className="rounded-md border border-signal-ethics/30 px-3 py-1 text-[11px] font-bold text-signal-ethics"
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
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-[15px] text-foreground-muted">Sign in to access social features.</p>
        <Link href="/sign-in" className="rounded-lg bg-brand px-7 py-2.5 text-sm font-extrabold text-background">
          Sign In →
        </Link>
      </div>
    );
  }

  // Derived: who to show in the chat header
  const chatName = pendingTarget?.displayName ?? activeConv?.displayName ?? null;
  const chatOtherClerkId = pendingTarget?.clerkId ?? activeConv?.otherClerkId ?? null;

  return (
    <div className="flex h-full w-full overflow-hidden">

      {/* ── Icon sidebar ────────────────────────────────────── */}
      <div className="flex w-[52px] flex-shrink-0 flex-col items-center gap-2 border-r border-border bg-background pt-[18px]">
        {[
          { id: "messages", Icon: IconChat,   label: "Messages" },
          { id: "people",   Icon: IconPeople, label: "People"   },
        ].map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            title={label}
            className={`flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border p-0 transition-colors ${
              view === id
                ? "border-signal-scalability/30 bg-signal-scalability/[0.12] text-signal-scalability"
                : "border-transparent text-foreground-subtle"
            }`}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>

      {/* ── Messages view ───────────────────────────────────── */}
      {view === "messages" && (
        <>
          {/* Inbox list */}
          <div className="flex h-full w-[265px] flex-shrink-0 flex-col border-r border-border bg-surface">
            <div className="flex-shrink-0 border-b border-border px-4 pb-2.5 pt-3.5">
              <span className="text-[13px] font-bold tracking-tight text-foreground">Messages</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {!inboxLoaded && (
                <p className="px-4 py-6 text-center text-xs text-foreground-subtle">Loading…</p>
              )}
              {inboxLoaded && inbox.length === 0 && !pendingTarget && (
                <div className="px-4 py-8 text-center">
                  <p className="m-0 mb-2.5 text-[13px] text-foreground-subtle">No messages yet.</p>
                  <button onClick={() => setView("people")} className="cursor-pointer border-none bg-transparent text-xs text-signal-ethics underline">
                    Find people →
                  </button>
                </div>
              )}

              {/* Pending target row (shown while first message hasn't been sent yet) */}
              {pendingTarget && (
                <div className="flex items-center gap-[11px] border-l-2 border-signal-ethics bg-signal-ethics/5 px-4 py-2.5">
                  <Avi name={pendingTarget.displayName} size={38} color={CYAN} online={onlineIds.has(pendingTarget.clerkId)} />
                  <div className="min-w-0 flex-1">
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-foreground">
                      {pendingTarget.displayName}
                    </div>
                    <div className="mt-0.5 text-[11px] text-signal-ethics">New conversation</div>
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
          <div className="flex h-full min-w-0 flex-1 flex-col bg-background">
            {chatName ? (
              <>
                {/* Header */}
                <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-border px-5 py-3">
                  <Avi name={chatName} size={32} color={CYAN} online={onlineIds.has(chatOtherClerkId)} />
                  <div>
                    <span className="text-sm font-semibold text-foreground">{chatName}</span>
                    {pendingTarget && (
                      <div className="mt-px text-[11px] text-signal-ethics">Send a message to start the conversation</div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-4">
                  {!pendingTarget && messages.length === 0 && (
                    <p className="mt-12 text-center text-[13px] text-foreground-subtle">
                      Say hello to {chatName}!
                    </p>
                  )}
                  {pendingTarget && (
                    <p className="mt-12 text-center text-[13px] text-foreground-subtle">
                      No messages yet. Send one below!
                    </p>
                  )}
                  {messages.map((msg) => (
                    <Bubble key={msg.id} msg={msg} isMine={msg.senderClerkId === myClerkId} />
                  ))}
                  <div ref={endRef} />
                </div>

                {/* Input */}
                <div className="flex flex-shrink-0 items-center gap-2 border-t border-border px-4 py-2.5">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder={`Message ${chatName}…`}
                    maxLength={500}
                    className="flex-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-[13px] text-foreground outline-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className={`flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-lg border ${
                      input.trim() && !sending
                        ? "cursor-pointer border-signal-scalability bg-signal-scalability text-background"
                        : "cursor-not-allowed border-border bg-transparent text-foreground-subtle"
                    }`}
                  >
                    <IconSend size={15} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3">
                <div className="text-foreground-subtle"><IconChat size={36} /></div>
                <p className="m-0 text-sm text-foreground-muted">Select a conversation</p>
                <button onClick={() => setView("people")} className="cursor-pointer border-none bg-transparent text-xs text-signal-ethics underline">
                  Find people →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── People view ─────────────────────────────────────── */}
      {view === "people" && (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* Top — Suggested */}
          <div className="flex flex-[0_0_44%] flex-col overflow-hidden border-b-2 border-border">
            <div className="flex-shrink-0 border-b border-border px-6 pb-2.5 pt-3.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-foreground-muted">
                Suggested Connections
              </span>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4">
              {suggested.length === 0 ? (
                <p className="text-[13px] text-foreground-subtle">No suggestions right now.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
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
          <div className="flex flex-[0_0_56%] flex-col overflow-hidden">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 pb-2.5 pt-3.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-foreground-muted">
                Following
              </span>
              <span className="text-[11px] text-foreground-subtle">{following.length} people</span>
            </div>

            {/* My note */}
            <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-border bg-signal-scalability/[0.03] px-6 py-2">
              <Avi name="Me" size={28} color={GREEN} />
              {editNote ? (
                <>
                  <input
                    autoFocus
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveNote(); if (e.key === "Escape") setEditNote(false); }}
                    maxLength={60}
                    placeholder="Your note for followers (60 chars)…"
                    className="flex-1 rounded-md border border-signal-scalability/30 bg-surface px-2.5 py-1 text-xs text-foreground outline-none"
                  />
                  <button onClick={saveNote} className="cursor-pointer rounded-[5px] border-none bg-signal-scalability px-2.5 py-1 text-[11px] font-bold text-background">
                    Save
                  </button>
                  <button onClick={() => setEditNote(false)} className="cursor-pointer border-none bg-transparent text-[11px] text-foreground-subtle">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className={`flex-1 text-xs ${myNoteText ? "italic text-foreground-muted" : "text-foreground-subtle"}`}>
                    {myNoteText ? `"${myNoteText}"` : "Set your note for followers…"}
                  </span>
                  <button
                    onClick={() => { setNoteInput(myNoteText); setEditNote(true); }}
                    className="cursor-pointer rounded-[5px] border border-border bg-transparent px-2.5 py-[3px] text-[11px] text-foreground-muted"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-6 py-3">
              {following.length === 0 ? (
                <p className="text-[13px] text-foreground-subtle">
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
