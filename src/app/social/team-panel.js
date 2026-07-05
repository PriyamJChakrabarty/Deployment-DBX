"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORY_COLORS, COLORS, RESULT_COLORS } from "@/lib/theme";

// Accent hues reused from the category signal palette (hue-matched, not
// semantically tied to bug categories here — same convention as
// TEAM_COLORS in home-client.js).
const GREEN = CATEGORY_COLORS.Scalability;  // #2dd881
const GOLD  = CATEGORY_COLORS.Performance;  // #ffb020
const CYAN  = CATEGORY_COLORS.Ethics;       // #22d3ee
const RED   = CATEGORY_COLORS.Security;     // #ff3b5c

const ROLE_RANK  = { captain: 0, vice_captain: 1, member: 2 };
const ROLE_LABEL = { captain: "Captain", vice_captain: "Vice Captain", member: "Member" };
const ROLE_COLOR = { captain: GOLD, vice_captain: CYAN, member: COLORS.foregroundMuted };
const ROLE_ICON  = { captain: "👑", vice_captain: "🥈", member: "🎮" };

const EMOJIS = ["🛡️","⚔️","🔥","💀","🏆","👑","🐉","⚡","🌪️","🎯","🦅","🐺","🦁","🔱","🌟","💎","🚀","🧠","🤖","🎮"];

const SIZE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 10];

const KEYFRAMES = `
@keyframes raid-glow {
  0%, 100% { box-shadow: 0 0 18px color-mix(in oklab, var(--signal-performance) 35%, transparent), 0 0 0px transparent; }
  50%      { box-shadow: 0 0 40px color-mix(in oklab, var(--signal-performance) 65%, transparent), 0 0 70px color-mix(in oklab, var(--signal-performance) 25%, transparent); }
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

const ACTION_BTN_BASE = "cursor-pointer rounded-md border bg-transparent px-3 py-1 text-[11px] font-bold transition-colors";
const ACTION_BTN_CLASS = {
  promote: `${ACTION_BTN_BASE} border-signal-scalability/40 text-signal-scalability hover:bg-signal-scalability/10`,
  demote:  `${ACTION_BTN_BASE} border-signal-performance/40 text-signal-performance hover:bg-signal-performance/10`,
  kick:    `${ACTION_BTN_BASE} border-signal-security/40 text-signal-security hover:bg-signal-security/10`,
};

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

  const roleColor = ROLE_COLOR[member.role];

  return (
    <div className="mb-1.5 flex items-center gap-3 rounded-[10px] border border-border bg-surface-2 px-4 py-3">
      <div className="relative flex-shrink-0">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold"
          style={{
            background: `linear-gradient(135deg, ${roleColor}2c, ${roleColor}08)`,
            border: `1.5px solid ${roleColor}55`,
            color: roleColor,
          }}
        >
          {(member.displayName || "?")[0].toUpperCase()}
        </div>
        <div className="absolute -bottom-[3px] -right-1 rounded-full border border-border bg-background p-[1.5px] text-[13px] leading-none">
          {ROLE_ICON[member.role]}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-bold text-foreground">
            {member.displayName}{isMe ? " (you)" : ""}
          </span>
          <span
            className="flex-shrink-0 rounded-full border px-2 py-px text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{ color: roleColor, background: `${roleColor}14`, borderColor: `${roleColor}30` }}
          >
            {ROLE_LABEL[member.role]}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] text-foreground-subtle">
          🕐 Joined {timeAgo(member.joinedAt)}
        </div>
      </div>

      {(showPromote || showDemote || showKick) && (
        <div className="flex flex-shrink-0 gap-1.5">
          {showPromote && (
            <button onClick={() => act("promote")} disabled={loading} className={ACTION_BTN_CLASS.promote}>
              ↑ Promote
            </button>
          )}
          {showDemote && (
            <button onClick={() => act("demote")} disabled={loading} className={ACTION_BTN_CLASS.demote}>
              ↓ Demote
            </button>
          )}
          {showKick && (
            <button onClick={() => act("kick")} disabled={loading} className={ACTION_BTN_CLASS.kick}>
              Kick
            </button>
          )}
        </div>
      )}
    </div>
  );
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
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <p className="mt-12 text-center text-[13px] text-foreground-subtle">
            No messages yet. Say something!
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderClerkId === myClerkId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
              {!isMine && (
                <span className="mb-[3px] ml-1 text-[10px] text-foreground-subtle">{msg.senderName}</span>
              )}
              <div
                className={`max-w-[70%] rounded-[14px] border px-[13px] py-[9px] ${
                  isMine
                    ? "rounded-br-[3px] border-signal-scalability/25 bg-signal-scalability/10"
                    : "rounded-bl-[3px] border-border bg-foreground/5"
                }`}
              >
                <p className="m-0 break-words text-[13.5px] leading-relaxed text-foreground">
                  {msg.content}
                </p>
                <p className={`mt-1 mb-0 text-[10px] text-foreground-subtle ${isMine ? "text-right" : "text-left"}`}>
                  {timeAgo(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="flex flex-shrink-0 gap-2 border-t border-border px-4 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Message your team…"
          className="flex-1 rounded-lg border border-border bg-foreground/5 px-3.5 py-2.5 text-[13px] text-foreground outline-none"
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className={`rounded-lg border-none bg-signal-scalability px-4.5 py-2.5 text-[13px] font-bold text-background ${
            input.trim() && !sending ? "cursor-pointer opacity-100" : "cursor-default opacity-40"
          }`}
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

  if (loading) return <p className="p-12 text-center text-[13px] text-foreground-subtle">Loading…</p>;

  if (others.length === 0) return (
    <div className="py-16 text-center">
      <div className="mb-4 text-4xl">🏆</div>
      <div className="text-sm text-foreground-subtle">No other teams to challenge yet.</div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto px-5 py-4">
      <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground-subtle">
        Select a team to challenge
      </div>
      {others.map((team) => (
        <div
          key={team.id}
          className="mb-2 flex items-center gap-3.5 rounded-xl border border-border bg-surface-2 px-4 py-3.5 transition-colors hover:border-signal-performance/25"
        >
          <div className="flex-shrink-0 text-[34px]">{team.emoji}</div>
          <div className="min-w-0 flex-1">
            <div className="mb-[3px] text-sm font-extrabold text-foreground">{team.name}</div>
            <div className="flex gap-3">
              <span className="text-[11px] text-foreground-subtle">{team.memberCount} / {team.size} members</span>
              <span className="text-[11px] font-bold text-signal-scalability">{team.wins}W – {team.losses}L</span>
            </div>
          </div>
          <button
            onClick={() => handleChallenge(team)}
            disabled={challenging === team.id}
            className={`flex-shrink-0 rounded-lg border border-signal-performance px-4.5 py-[7px] text-xs font-extrabold tracking-[0.04em] ${
              challenging === team.id
                ? "cursor-default bg-transparent text-signal-performance opacity-60"
                : "cursor-pointer bg-signal-performance text-background"
            }`}
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
    win:  { label: "WIN",  color: RESULT_COLORS.win  },
    loss: { label: "LOSS", color: RESULT_COLORS.loss },
    draw: { label: "DRAW", color: RESULT_COLORS.draw },
  };

  if (loading) return <p className="p-12 text-center text-[13px] text-foreground-subtle">Loading…</p>;
  if (raids.length === 0) return (
    <p className="p-12 text-center text-[13px] text-foreground-subtle">
      No completed raids yet. Start one from the Home page!
    </p>
  );

  return (
    <div className="h-full overflow-y-auto px-5 py-4">
      {raids.map((raid) => {
        const r = RESULT[raid.result] ?? RESULT.draw;
        return (
          <div
            key={raid.matchId}
            className="mb-2 flex items-center gap-3.5 rounded-[10px] border px-4 py-3"
            style={{ background: `${r.color}14`, borderColor: `${r.color}22` }}
          >
            <div className="w-12 text-center text-[11px] font-extrabold tracking-[0.08em]" style={{ color: r.color }}>
              {r.label}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-foreground">
                Group Raid #{raid.matchId}
              </div>
              <div className="mt-0.5 text-[11px] text-foreground-subtle">
                {timeAgo(raid.endedAt)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-extrabold" style={{ color: r.color }}>
                {raid.myScore} <span className="font-normal text-foreground-subtle">pts</span>
              </div>
              <div className="text-[11px] text-foreground-subtle">vs {raid.oppScore}</div>
              <div className="mt-[3px] text-[10px] font-bold" style={{ color: r.color }}>
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
    <form onSubmit={submit} className="flex w-[320px] flex-shrink-0 flex-col gap-5 overflow-y-auto border-r border-border bg-surface px-6 py-7">
      <div>
        <div className="mb-1 text-base font-extrabold text-foreground">🛡️ Create a Team</div>
        <div className="text-xs text-foreground-subtle">Form your squad and invite players to raid together.</div>
      </div>

      {/* Emoji picker */}
      <div>
        <label className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-foreground-muted">
          Team Logo (Emoji)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((e) => (
            <button
              key={e} type="button" onClick={() => setEmoji(e)}
              className={`h-[38px] w-[38px] rounded-lg border-[1.5px] text-xl ${
                emoji === e ? "border-signal-scalability bg-signal-scalability/10" : "border-border bg-foreground/[0.03]"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="mt-3 text-center text-[32px]">{emoji}</div>
      </div>

      {/* Name */}
      <div>
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.06em] text-foreground-muted">
          Team Name
        </label>
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          maxLength={32} placeholder="e.g. Null Terminators"
          className="box-border w-full rounded-lg border border-border bg-foreground/[0.04] px-3.5 py-2.5 text-[13px] text-foreground outline-none"
        />
      </div>

      {/* Size */}
      <div>
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.06em] text-foreground-muted">
          Max Members
        </label>
        <div className="flex flex-wrap gap-1.5">
          {SIZE_OPTIONS.map((n) => (
            <button
              key={n} type="button" onClick={() => setSize(n)}
              className={`rounded-lg border px-3.5 py-1.5 text-[13px] font-bold ${
                size === n ? "border-signal-scalability bg-signal-scalability text-background" : "border-border bg-transparent text-foreground-muted"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit" disabled={!name.trim() || loading}
        className={`rounded-[10px] border-none bg-signal-scalability py-3 text-sm font-extrabold text-background ${
          name.trim() && !loading ? "cursor-pointer opacity-100" : "cursor-default opacity-50"
        }`}
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
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-5 text-[13px] font-bold uppercase tracking-[0.04em] text-foreground-muted">
        🌐 Open Teams
      </div>

      {loading && <p className="text-[13px] text-foreground-subtle">Loading…</p>}
      {!loading && teams.length === 0 && (
        <div className="py-16 text-center">
          <div className="mb-4 text-4xl">🛡️</div>
          <div className="text-sm text-foreground-subtle">No open teams yet. Be the first to create one!</div>
        </div>
      )}

      {teams.map((team) => (
        <div key={team.id} className="mb-2.5 flex items-center gap-4 rounded-xl border border-border bg-surface-2 px-4.5 py-4">
          <div className="flex-shrink-0 text-4xl">{team.emoji}</div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-sm font-extrabold text-foreground">{team.name}</div>
            <div className="flex gap-3">
              <span className="text-[11px] text-foreground-subtle">
                {team.memberCount} / {team.size} members
              </span>
              <span className="text-[11px] text-signal-scalability">
                {team.wins}W – {team.losses}L
              </span>
            </div>
          </div>
          <button
            onClick={() => join(team)}
            disabled={joining === team.id}
            className={`flex-shrink-0 rounded-lg border-none bg-signal-scalability px-5 py-2 text-[13px] font-bold text-background ${
              joining === team.id ? "cursor-default opacity-60" : "cursor-pointer opacity-100"
            }`}
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
    <div className="flex items-center justify-end gap-3.5">
      <div className="text-right">
        <div className="text-[26px] font-black leading-[1.15]" style={{ color }}>{value}</div>
        <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-foreground-subtle">
          {label}
        </div>
      </div>
      <div className="flex-shrink-0 text-[28px]">{icon}</div>
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

  const roleColor = ROLE_COLOR[team.myRole];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <style>{KEYFRAMES}</style>

      {/* Team header */}
      <div
        className="relative flex-shrink-0 border-b border-border px-7 pt-[22px]"
        style={{ background: "linear-gradient(180deg, color-mix(in oklab, var(--signal-performance) 5%, transparent), var(--surface) 70%)" }}
      >
        <button
          onClick={onLeave}
          className="absolute left-7 top-5 flex items-center gap-[7px] rounded-lg border border-signal-security/35 bg-signal-security/[0.08] py-2 pl-3.5 pr-4 text-xs font-bold tracking-[0.02em] text-signal-security transition-colors hover:border-signal-security/60 hover:bg-signal-security/[0.18]"
        >
          <span className="text-sm">🚪</span> Leave Team
        </button>

        <div className="mb-[18px] grid grid-cols-[1fr_auto_1fr] items-center gap-8 px-2">
          <div />

          <div className="flex flex-col items-center text-center">
            <div
              className="mb-2.5 text-6xl leading-none"
              style={{ filter: `drop-shadow(0 0 18px ${roleColor}55)`, animation: "badge-float 3.4s ease-in-out infinite" }}
            >
              {team.emoji}
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[30px] font-black tracking-tight text-foreground">
                {team.name}
              </span>
              <span
                className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                style={{ color: roleColor, background: `${roleColor}14`, borderColor: `${roleColor}30` }}
              >
                {ROLE_ICON[team.myRole]} {ROLE_LABEL[team.myRole]}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-self-end gap-3.5">
            <StatItem icon="🏆" value={wins}     label="Wins"    color={GREEN} />
            <StatItem icon="💀" value={losses}   label="Losses"  color={RED} />
            <StatItem icon="📊" value={`${winRate}%`} label="Win Rate" color={CYAN} />
            <StatItem icon="👥" value={`${team.members.length}/${team.size}`} label="Roster" color={GOLD} />
          </div>
        </div>

        {/* Raid CTA */}
        {isCaptain && (
          <div className="flex justify-center pb-5">
            <button
              onClick={startRaid}
              disabled={raiding}
              className={`relative flex flex-col items-center gap-0.5 overflow-hidden rounded-2xl border-none px-14 py-4 transition-transform enabled:hover:scale-[1.045] ${
                raiding ? "cursor-default opacity-70" : "cursor-pointer opacity-100"
              }`}
              style={{
                background: raiding
                  ? "color-mix(in oklab, var(--signal-performance) 25%, transparent)"
                  : "linear-gradient(100deg, color-mix(in oklab, var(--signal-performance) 80%, black) 0%, var(--signal-performance) 25%, color-mix(in oklab, var(--signal-performance) 45%, white) 50%, var(--signal-performance) 75%, color-mix(in oklab, var(--signal-performance) 80%, black) 100%)",
                backgroundSize: "250% 100%",
                animation: raiding ? "none" : "raid-glow 2.2s ease-in-out infinite, raid-shimmer 3.5s linear infinite",
              }}
            >
              <span className="text-[22px] font-black tracking-[0.03em] text-background">
                {raiding ? "⏳ Launching Raid…" : "⚔️ START RAID"}
              </span>
              <span className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-background/60">
                Lead your squad into battle
              </span>
            </button>
          </div>
        )}
        {!isCaptain && (
          <div className="flex justify-center pb-[18px]">
            <div className="rounded-full border border-border bg-foreground/[0.04] px-4.5 py-[7px] text-[11.5px] font-semibold text-foreground-subtle">
              ⏳ Only the captain {ROLE_ICON.captain} can launch a raid
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-t-[10px] border-none px-4.5 py-2 text-[12.5px] font-bold transition-colors ${
                tab === id
                  ? "border-b-2 border-signal-scalability bg-signal-scalability/10 text-signal-scalability"
                  : "border-b-2 border-transparent bg-transparent text-foreground-subtle"
              }`}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {tab === "members" && (
          <div className="flex-1 overflow-y-auto px-5 py-4">
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
      <div className="flex flex-1 items-center justify-center">
        <span className="text-[13px] text-foreground-subtle">Loading…</span>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-1 overflow-hidden">
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
