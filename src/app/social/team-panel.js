"use client";

import { useEffect, useRef, useState } from "react";

const C = {
  bg:     "#0d1a1f",
  panel:  "#0a1419",
  card:   "#0e191f",
  border: "rgba(201,214,218,0.07)",
  green:  "#3ddc84",
  gold:   "#f5b942",
  cyan:   "#22d3ee",
  red:    "#ef4444",
  text:   "#e8f0f3",
  sub:    "#8ba0a6",
  muted:  "#4a6570",
};

const ROLE_RANK  = { captain: 0, vice_captain: 1, member: 2 };
const ROLE_LABEL = { captain: "Captain", vice_captain: "Vice Captain", member: "Member" };
const ROLE_COLOR = { captain: C.gold, vice_captain: C.cyan, member: C.sub };
const ROLE_ICON  = { captain: "👑", vice_captain: "🥈", member: "🎮" };

const EMOJIS = ["🛡️","⚔️","🔥","💀","🏆","👑","🐉","⚡","🌪️","🎯","🦅","🐺","🦁","🔱","🌟","💎","🚀","🧠","🤖","🎮"];

const SIZE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 10];

const KEYFRAMES = `
@keyframes raid-glow {
  0%, 100% { box-shadow: 0 0 18px rgba(245,185,66,0.35), 0 0 0px rgba(245,185,66,0); }
  50%      { box-shadow: 0 0 40px rgba(245,185,66,0.65), 0 0 70px rgba(245,185,66,0.25); }
}
@keyframes raid-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes badge-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}
@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

function canKick(myRole, targetRole)   { return ROLE_RANK[myRole] < ROLE_RANK[targetRole]; }
function canPromote(myRole, targetRole) { return ROLE_RANK[myRole] < ROLE_RANK[targetRole]; }
function canDemote(myRole, targetRole)  { return ROLE_RANK[myRole] < ROLE_RANK[targetRole] && targetRole !== "member"; }

function timeAgo(d) {
  if (!d) return "";
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60)        return "just now";
  if (s < 3600)      return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)     return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

async function apiFetch(url, opts = {}) {
  const r = await fetch(url, { cache: "no-store", ...opts, headers: { "Content-Type": "application/json", ...opts.headers } });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error || "Request failed");
  return d;
}

// ── Sub-components ─────────────────────────────────────────────

function MemberRow({ member, myClerkId, myRole, teamId, onRefresh }) {
  const isMe = member.clerkId === myClerkId;
  const [loading, setLoading] = useState(false);

  async function act(action) {
    setLoading(true);
    try {
      if (action === "kick") {
        await apiFetch(`/api/teams/${teamId}/members/${member.clerkId}/kick`, { method: "DELETE" });
      } else {
        await apiFetch(`/api/teams/${teamId}/members/${member.clerkId}/role`, {
          method: "PATCH", body: JSON.stringify({ action }),
        });
      }
      await onRefresh();
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }

  const showPromote = !isMe && canPromote(myRole, member.role);
  const showDemote  = !isMe && canDemote(myRole, member.role);
  const showKick    = !isMe && canKick(myRole, member.role);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px", borderRadius: 10,
      background: C.card, border: `1px solid ${C.border}`,
      marginBottom: 6,
    }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: `linear-gradient(135deg, ${ROLE_COLOR[member.role]}2c, ${ROLE_COLOR[member.role]}08)`,
          border: `1.5px solid ${ROLE_COLOR[member.role]}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700, color: ROLE_COLOR[member.role],
        }}>
          {(member.displayName || "?")[0].toUpperCase()}
        </div>
        <div style={{
          position: "absolute", bottom: -3, right: -4, fontSize: 13,
          background: C.bg, borderRadius: "50%", lineHeight: 1, padding: 1.5,
          border: `1px solid ${C.border}`,
        }}>
          {ROLE_ICON[member.role]}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {member.displayName}{isMe ? " (you)" : ""}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", color: ROLE_COLOR[member.role],
            background: `${ROLE_COLOR[member.role]}14`,
            border: `1px solid ${ROLE_COLOR[member.role]}30`,
            borderRadius: 99, padding: "1px 8px", flexShrink: 0,
          }}>
            {ROLE_LABEL[member.role]}
          </span>
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
          🕐 Joined {timeAgo(member.joinedAt)}
        </div>
      </div>

      {(showPromote || showDemote || showKick) && (
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {showPromote && (
            <button onClick={() => act("promote")} disabled={loading} style={actionBtn(C.green)}>
              ↑ Promote
            </button>
          )}
          {showDemote && (
            <button onClick={() => act("demote")} disabled={loading} style={actionBtn(C.gold)}>
              ↓ Demote
            </button>
          )}
          {showKick && (
            <button onClick={() => act("kick")} disabled={loading} style={actionBtn(C.red)}>
              Kick
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function actionBtn(color) {
  return {
    fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 6,
    cursor: "pointer", background: "transparent",
    color, border: `1px solid ${color}44`,
    transition: "background 0.15s",
  };
}

function TeamChat({ teamId, myClerkId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const endRef   = useRef(null);
  const pollRef  = useRef(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await apiFetch(`/api/teams/${teamId}/messages`);
        if (active) setMessages(data);
      } catch {}
    };

    load();
    pollRef.current = setInterval(load, 3000);
    return () => {
      active = false;
      clearInterval(pollRef.current);
    };
  }, [teamId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    try {
      await apiFetch(`/api/teams/${teamId}/messages`, {
        method: "POST", body: JSON.stringify({ content: text }),
      });
      setMessages(await apiFetch(`/api/teams/${teamId}/messages`));
    } catch { setInput(text); }
    finally { setSending(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && (
          <p style={{ color: C.muted, fontSize: 13, textAlign: "center", marginTop: 48 }}>
            No messages yet. Say something!
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderClerkId === myClerkId;
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
              {!isMine && (
                <span style={{ fontSize: 10, color: C.muted, marginBottom: 3, marginLeft: 4 }}>{msg.senderName}</span>
              )}
              <div style={{
                maxWidth: "70%",
                background: isMine ? "rgba(61,220,132,0.1)" : "rgba(201,214,218,0.05)",
                border: `1px solid ${isMine ? "rgba(61,220,132,0.25)" : "rgba(201,214,218,0.1)"}`,
                borderRadius: isMine ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                padding: "9px 13px",
              }}>
                <p style={{ margin: 0, fontSize: 13.5, color: C.text, lineHeight: 1.5, wordBreak: "break-word" }}>
                  {msg.content}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 10, color: C.muted, textAlign: isMine ? "right" : "left" }}>
                  {timeAgo(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div style={{
        padding: "12px 16px", borderTop: `1px solid ${C.border}`,
        display: "flex", gap: 8, flexShrink: 0,
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Message your team…"
          style={{
            flex: 1, background: "rgba(201,214,218,0.05)",
            border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.text, padding: "9px 14px", fontSize: 13, outline: "none",
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          style={{
            background: C.green, color: "#0d1a1f",
            border: "none", borderRadius: 8,
            padding: "9px 18px", fontSize: 13, fontWeight: 700,
            cursor: input.trim() && !sending ? "pointer" : "default",
            opacity: input.trim() && !sending ? 1 : 0.4,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function ChallengeTeamsTab({ myTeamId }) {
  const [teams,      setTeams]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [challenging, setChallenging] = useState(null);

  useEffect(() => {
    apiFetch("/api/teams").then(setTeams).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleChallenge(team) {
    setChallenging(team.id);
    try {
      const d = await apiFetch("/api/team-challenge", {
        method: "POST", body: JSON.stringify({ challengeeTeamId: team.id }),
      });
      if (d.challengeId) window.location.href = `/team-challenge/${d.challengeId}`;
    } catch (e) { alert(e.message); }
    finally { setChallenging(null); }
  }

  const others = teams.filter((t) => t.id !== myTeamId);

  if (loading) return <p style={{ color: C.muted, textAlign: "center", padding: 48, fontSize: 13 }}>Loading…</p>;

  if (others.length === 0) return (
    <div style={{ textAlign: "center", padding: "64px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🏆</div>
      <div style={{ color: C.muted, fontSize: 14 }}>No other teams to challenge yet.</div>
    </div>
  );

  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", height: "100%" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
        Select a team to challenge
      </div>
      {others.map((team) => (
        <div key={team.id} style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "14px 16px", borderRadius: 12,
          background: C.card, border: `1px solid ${C.border}`,
          marginBottom: 8, transition: "border-color 0.15s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(245,185,66,0.25)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
        >
          <div style={{ fontSize: 34, flexShrink: 0 }}>{team.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 3 }}>{team.name}</div>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 11, color: C.muted }}>{team.memberCount} / {team.size} members</span>
              <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>{team.wins}W – {team.losses}L</span>
            </div>
          </div>
          <button
            onClick={() => handleChallenge(team)}
            disabled={challenging === team.id}
            style={{
              background: challenging === team.id ? "transparent" : C.gold,
              color: challenging === team.id ? C.gold : "#0d1a1f",
              border: `1px solid ${C.gold}`,
              borderRadius: 8, padding: "7px 18px",
              fontSize: 12, fontWeight: 800,
              cursor: challenging === team.id ? "default" : "pointer",
              opacity: challenging === team.id ? 0.6 : 1,
              flexShrink: 0, letterSpacing: "0.04em",
            }}
          >
            {challenging === team.id ? "Sending…" : "⚔ Challenge"}
          </button>
        </div>
      ))}
    </div>
  );
}

function PastRaids({ teamId }) {
  const [raids, setRaids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await apiFetch(`/api/teams/${teamId}/raids`);
        if (active) setRaids(data);
      } catch {}
      finally {
        if (active) setLoading(false);
      }
    };

    load();
    const pollId = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(pollId);
    };
  }, [teamId]);

  const RESULT = {
    win:  { label: "WIN",  color: C.green, bg: "rgba(61,220,132,0.08)"  },
    loss: { label: "LOSS", color: C.red,   bg: "rgba(239,68,68,0.08)"   },
    draw: { label: "DRAW", color: C.gold,  bg: "rgba(245,185,66,0.08)"  },
  };

  if (loading) return <p style={{ color: C.muted, textAlign: "center", padding: 48, fontSize: 13 }}>Loading…</p>;
  if (raids.length === 0) return (
    <p style={{ color: C.muted, textAlign: "center", padding: 48, fontSize: 13 }}>
      No completed raids yet. Start one from the Home page!
    </p>
  );

  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", height: "100%" }}>
      {raids.map((raid) => {
        const r = RESULT[raid.result] ?? RESULT.draw;
        return (
          <div key={raid.matchId} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "12px 16px", borderRadius: 10,
            background: r.bg, border: `1px solid ${r.color}22`,
            marginBottom: 8,
          }}>
            <div style={{
              width: 48, textAlign: "center",
              fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
              color: r.color,
            }}>
              {r.label}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                Group Raid #{raid.matchId}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                {timeAgo(raid.endedAt)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: r.color }}>
                {raid.myScore} <span style={{ color: C.muted, fontWeight: 400 }}>pts</span>
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>vs {raid.oppScore}</div>
              <div style={{ fontSize: 10, color: r.color, fontWeight: 700, marginTop: 3 }}>
                Team record: +1 {raid.result === "win" ? "win" : raid.result === "loss" ? "loss" : "draw"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Not-in-team view ───────────────────────────────────────────

function CreateTeamForm({ onCreated }) {
  const [name,  setName]  = useState("");
  const [emoji, setEmoji] = useState("🛡️");
  const [size,  setSize]  = useState(5);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const team = await apiFetch("/api/teams", {
        method: "POST", body: JSON.stringify({ name: name.trim(), emoji, size }),
      });
      onCreated(team);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} style={{
      background: C.panel, borderRight: `1px solid ${C.border}`,
      width: "320px", flexShrink: 0, padding: "28px 24px",
      display: "flex", flexDirection: "column", gap: 20, overflowY: "auto",
    }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4 }}>🛡️ Create a Team</div>
        <div style={{ fontSize: 12, color: C.muted }}>Form your squad and invite players to raid together.</div>
      </div>

      {/* Emoji picker */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: C.sub, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
          Team Logo (Emoji)
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {EMOJIS.map((e) => (
            <button
              key={e} type="button" onClick={() => setEmoji(e)}
              style={{
                width: 38, height: 38, borderRadius: 8, fontSize: 20, cursor: "pointer",
                border: `1.5px solid ${emoji === e ? C.green : C.border}`,
                background: emoji === e ? "rgba(61,220,132,0.1)" : "rgba(201,214,218,0.03)",
              }}
            >
              {e}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 32, textAlign: "center" }}>{emoji}</div>
      </div>

      {/* Name */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: C.sub, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Team Name
        </label>
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          maxLength={32} placeholder="e.g. Null Terminators"
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(201,214,218,0.04)", border: `1px solid ${C.border}`,
            borderRadius: 8, color: C.text, padding: "10px 14px",
            fontSize: 13, outline: "none",
          }}
        />
      </div>

      {/* Size */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: C.sub, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Max Members
        </label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SIZE_OPTIONS.map((n) => (
            <button
              key={n} type="button" onClick={() => setSize(n)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: "pointer",
                background: size === n ? C.green : "transparent",
                color: size === n ? "#0d1a1f" : C.sub,
                border: `1px solid ${size === n ? C.green : C.border}`,
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit" disabled={!name.trim() || loading}
        style={{
          background: C.green, color: "#0d1a1f", border: "none",
          borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 800,
          cursor: name.trim() && !loading ? "pointer" : "default",
          opacity: name.trim() && !loading ? 1 : 0.5,
        }}
      >
        {loading ? "Creating…" : "Create Team →"}
      </button>
    </form>
  );
}

function OpenTeamsList({ onJoined }) {
  const [teams,   setTeams]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);

  useEffect(() => {
    apiFetch("/api/teams").then(setTeams).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function join(team) {
    setJoining(team.id);
    try {
      await apiFetch(`/api/teams/${team.id}/join`, { method: "POST" });
      onJoined();
    } catch (e) { alert(e.message); }
    finally { setJoining(null); }
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, marginBottom: 20, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        🌐 Open Teams
      </div>

      {loading && <p style={{ color: C.muted, fontSize: 13 }}>Loading…</p>}
      {!loading && teams.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🛡️</div>
          <div style={{ color: C.muted, fontSize: 14 }}>No open teams yet. Be the first to create one!</div>
        </div>
      )}

      {teams.map((team) => (
        <div key={team.id} style={{
          display: "flex", alignItems: "center", gap: 16,
          padding: "16px 18px", borderRadius: 12,
          background: C.card, border: `1px solid ${C.border}`,
          marginBottom: 10,
        }}>
          <div style={{ fontSize: 36, flexShrink: 0 }}>{team.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}>{team.name}</div>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 11, color: C.muted }}>
                {team.memberCount} / {team.size} members
              </span>
              <span style={{ fontSize: 11, color: C.green }}>
                {team.wins}W – {team.losses}L
              </span>
            </div>
          </div>
          <button
            onClick={() => join(team)}
            disabled={joining === team.id}
            style={{
              background: C.green, color: "#0d1a1f",
              border: "none", borderRadius: 8,
              padding: "8px 20px", fontSize: 13, fontWeight: 700,
              cursor: joining === team.id ? "default" : "pointer",
              opacity: joining === team.id ? 0.6 : 1, flexShrink: 0,
            }}
          >
            {joining === team.id ? "Joining…" : "Join"}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── In-team view ───────────────────────────────────────────────

function StatItem({ icon, value, label, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14 }}>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1.15 }}>{value}</div>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>
          {label}
        </div>
      </div>
      <div style={{ fontSize: 28, flexShrink: 0 }}>{icon}</div>
    </div>
  );
}

function InTeamView({ team, myClerkId, onRefresh, onLeave }) {
  const [tab, setTab]         = useState("members");
  const [raiding, setRaiding] = useState(false);

  const canChallenge = team.myRole === "captain" || team.myRole === "vice_captain";
  const isCaptain    = team.myRole === "captain";

  const TABS = [
    { id: "members",   label: "Members",    icon: "👥" },
    { id: "chat",      label: "Chat",       icon: "💬" },
    { id: "raids",     label: "Past Raids", icon: "📜" },
    ...(canChallenge ? [{ id: "challenge", label: "Challenge", icon: "⚔️" }] : []),
  ];

  const wins   = team.wins ?? 0;
  const losses = team.losses ?? 0;
  const played = wins + losses;
  const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;

  async function startRaid() {
    setRaiding(true);
    try {
      const data = await apiFetch(`/api/teams/${team.id}/raid`, { method: "POST" });
      window.location.href = `/team-raid-lobby/${data.teamGroupId}`;
    } catch (e) { alert(e.message); setRaiding(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", overflow: "hidden" }}>
      <style>{KEYFRAMES}</style>

      {/* Team header */}
      <div style={{
        position: "relative",
        padding: "22px 28px 0",
        borderBottom: `1px solid ${C.border}`,
        background: `linear-gradient(180deg, rgba(245,185,66,0.05), ${C.panel} 70%)`,
        flexShrink: 0,
      }}>
        <button
          onClick={onLeave}
          style={{
            position: "absolute", top: 20, left: 28,
            display: "flex", alignItems: "center", gap: 7,
            background: "rgba(239,68,68,0.08)", color: C.red,
            border: `1px solid rgba(239,68,68,0.35)`, borderRadius: 8,
            padding: "8px 16px 8px 14px", fontSize: 12, fontWeight: 700,
            letterSpacing: "0.02em", cursor: "pointer",
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.18)";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.08)";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)";
          }}
        >
          <span style={{ fontSize: 14 }}>🚪</span> Leave Team
        </button>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center", gap: 32, marginBottom: 18, padding: "0 8px",
        }}>
          <div />

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <div style={{
              fontSize: 64, lineHeight: 1, marginBottom: 10,
              filter: `drop-shadow(0 0 18px ${ROLE_COLOR[team.myRole]}55)`,
              animation: "badge-float 3.4s ease-in-out infinite",
            }}>
              {team.emoji}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 30, fontWeight: 900, color: C.text, letterSpacing: "-0.02em" }}>
                {team.name}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                color: ROLE_COLOR[team.myRole],
                background: `${ROLE_COLOR[team.myRole]}14`,
                border: `1px solid ${ROLE_COLOR[team.myRole]}30`,
                borderRadius: 99, padding: "2px 10px",
              }}>
                {ROLE_ICON[team.myRole]} {ROLE_LABEL[team.myRole]}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, justifySelf: "end" }}>
            <StatItem icon="🏆" value={wins}     label="Wins"    color={C.green} />
            <StatItem icon="💀" value={losses}   label="Losses"  color={C.red} />
            <StatItem icon="📊" value={`${winRate}%`} label="Win Rate" color={C.cyan} />
            <StatItem icon="👥" value={`${team.members.length}/${team.size}`} label="Roster" color={C.gold} />
          </div>
        </div>

        {/* Raid CTA */}
        {isCaptain && (
          <div style={{ display: "flex", justifyContent: "center", paddingBottom: 20 }}>
            <button
              onClick={startRaid}
              disabled={raiding}
              style={{
                position: "relative", overflow: "hidden",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: "16px 56px", borderRadius: 16, border: "none",
                cursor: raiding ? "default" : "pointer",
                background: raiding
                  ? "rgba(245,185,66,0.25)"
                  : `linear-gradient(100deg, #e6a530 0%, #f5b942 25%, #ffe08a 50%, #f5b942 75%, #e6a530 100%)`,
                backgroundSize: "250% 100%",
                animation: raiding ? "none" : "raid-glow 2.2s ease-in-out infinite, raid-shimmer 3.5s linear infinite",
                opacity: raiding ? 0.7 : 1,
                transform: "scale(1)",
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) => { if (!raiding) e.currentTarget.style.transform = "scale(1.045)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <span style={{ fontSize: 22, fontWeight: 900, color: "#241505", letterSpacing: "0.03em" }}>
                {raiding ? "⏳ Launching Raid…" : "⚔️ START RAID"}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#4a3410", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Lead your squad into battle
              </span>
            </button>
          </div>
        )}
        {!isCaptain && (
          <div style={{ display: "flex", justifyContent: "center", paddingBottom: 18 }}>
            <div style={{
              fontSize: 11.5, color: C.muted, fontWeight: 600,
              background: "rgba(201,214,218,0.04)", border: `1px solid ${C.border}`,
              borderRadius: 99, padding: "7px 18px",
            }}>
              ⏳ Only the captain {ROLE_ICON.captain} can launch a raid
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id} onClick={() => setTab(id)}
              style={{
                padding: "8px 18px", borderRadius: "10px 10px 0 0",
                fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: "none",
                display: "flex", alignItems: "center", gap: 6,
                background: tab === id ? "rgba(61,220,132,0.1)" : "transparent",
                color: tab === id ? C.green : C.muted,
                borderBottom: tab === id ? `2px solid ${C.green}` : "2px solid transparent",
                transition: "color 0.15s, background 0.15s",
              }}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "members" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            {team.members.map((m) => (
              <MemberRow
                key={m.clerkId}
                member={m}
                myClerkId={myClerkId}
                myRole={team.myRole}
                teamId={team.id}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}
        {tab === "chat"      && <TeamChat teamId={team.id} myClerkId={myClerkId} />}
        {tab === "raids"     && <PastRaids teamId={team.id} />}
        {tab === "challenge" && <ChallengeTeamsTab myTeamId={team.id} />}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────

export default function TeamsPanel({ myClerkId }) {
  const [team,    setTeam]    = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  const fetchTeam = async () => {
    try {
      const data = await apiFetch("/api/teams/my");
      setTeam(data);
    } catch { setTeam(null); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await apiFetch("/api/teams/my");
        if (active) setTeam(data);
      } catch {
        if (active) setTeam(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const pollId = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(pollId);
    };
  }, []);

  async function handleLeave() {
    if (!team) return;
    const confirmed = window.confirm(
      team.myRole === "captain" && team.members.length > 1
        ? "You are the captain. Leaving will transfer leadership to the next highest-ranking member. Continue?"
        : team.members.length === 1
        ? "You are the only member. Leaving will disband the team. Continue?"
        : "Are you sure you want to leave the team?"
    );
    if (!confirmed) return;
    try {
      await apiFetch(`/api/teams/${team.id}/leave`, { method: "DELETE" });
      setTeam(null);
    } catch (e) { alert(e.message); }
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: C.muted, fontSize: 13 }}>Loading…</span>
      </div>
    );
  }

  if (!team) {
    return (
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <CreateTeamForm onCreated={() => fetchTeam()} />
        <OpenTeamsList onJoined={() => fetchTeam()} />
      </div>
    );
  }

  return (
    <InTeamView
      team={team}
      myClerkId={myClerkId}
      onRefresh={fetchTeam}
      onLeave={handleLeave}
    />
  );
}
