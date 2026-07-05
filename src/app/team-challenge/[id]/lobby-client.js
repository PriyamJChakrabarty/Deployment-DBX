"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS } from "@/lib/theme";

// ── Animations ────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes tc-rise {
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes tc-vs-pulse {
  0%,100% { transform: scale(1);    text-shadow: 0 0 0 transparent; }
  50%      { transform: scale(1.1); text-shadow: 0 0 28px color-mix(in oklab, var(--signal-performance) 50%, transparent); }
}
@keyframes tc-ready-glow {
  0%,100% { box-shadow: 0 0 0 transparent; }
  50%      { box-shadow: 0 0 24px color-mix(in oklab, var(--signal-performance) 40%, transparent); }
}
@keyframes tc-pulse-ring {
  0%   { transform: scale(0.9); opacity: 1; }
  100% { transform: scale(2);   opacity: 0; }
}
@keyframes tc-shake {
  0%,100% { transform: translateX(0); }
  25%     { transform: translateX(-3px); }
  75%     { transform: translateX(3px); }
}
@keyframes tc-badge-pop {
  0%  { transform: scale(0); }
  70% { transform: scale(1.2); }
  100%{ transform: scale(1); }
}
`;

// Raw hex mirrors of the design-system tokens — kept as plain hex (not CSS
// vars) so the `${color}NN` alpha-suffix trick used throughout this file
// keeps working for genuinely per-side/per-state dynamic accents.
const C = {
  bg:     COLORS.background,        // canvas
  panel:  COLORS.surface,            // chrome bars
  border: COLORS.border,
  green:  "#2dd881",                 // signal-scalability
  cyan:   "#22d3ee",                 // signal-ethics
  gold:   "#ffb020",                 // signal-performance
  red:    "#ff3b5c",                 // signal-security
  brand:  COLORS.brand,
  text:   COLORS.foreground,
  sub:    COLORS.foregroundMuted,
  muted:  COLORS.foregroundSubtle,
};

// Two competing teams get distinct identity colors, mirroring home-client's
// RaidRow TEAM_COLORS = [COLORS.brand, "#22d3ee"] for two-team displays.
const SIDE_COLOR = { challenger: C.brand, challengee: C.cyan };

const ROLE_LABEL = { captain: "Captain", vice_captain: "VC", member: "" };

const STATUS_META = {
  pending:   { msg: "Waiting for opponent captain to accept…",  color: C.gold  },
  accepted:  { msg: "Lobby open — get your teams assembled!",   color: C.green },
  cancelled: { msg: "Challenge was cancelled.",                 color: C.red   },
  rejected:  { msg: "Challenge was declined.",                  color: C.red   },
  expired:   { msg: "Challenge timed out.",                     color: C.muted },
  matched:   { msg: "Match is starting…",                      color: C.green },
};

// ── Countdown ─────────────────────────────────────────────────────
function Countdown({ expiresAt }) {
  const [rem, setRem] = useState(null);

  useEffect(() => {
    if (!expiresAt) return;
    const end = new Date(expiresAt).getTime();
    const tick = () => setRem(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (rem === null) return null;
  const urgent = rem < 60;
  return (
    <span
      className="font-mono text-[13px] font-extrabold tabular-nums"
      style={{
        color: urgent ? C.red : C.muted,
        animation: urgent ? "tc-shake 0.6s ease infinite" : "none",
      }}
    >
      ⏱ {Math.floor(rem / 60)}:{String(rem % 60).padStart(2, "0")}
    </span>
  );
}

// ── Member card ───────────────────────────────────────────────────
function MemberCard({ member, color, roleLabel }) {
  const { displayName, present } = member;

  return (
    <div
      className="flex items-center gap-2.5 rounded-[10px] border px-3.5 py-2.5 transition-all duration-300"
      style={{
        background: present ? `${color}08` : "rgba(148,163,184,0.02)",
        borderColor: present ? `${color}22` : C.border,
      }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-black transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${color}22, ${color}08)`,
            border: `1.5px solid ${present ? color : "rgba(148,163,184,0.12)"}`,
            color: present ? color : C.muted,
          }}
        >
          {(displayName || "?")[0].toUpperCase()}
        </div>
        {/* presence dot */}
        <div
          className="absolute bottom-[1px] right-[1px] h-2.5 w-2.5 rounded-full transition-colors duration-300"
          style={{
            background: present ? color : "rgba(148,163,184,0.18)",
            border: `1.5px solid ${C.bg}`,
            boxShadow: present ? `0 0 6px ${color}80` : "none",
          }}
        />
        {present && (
          <div
            className="absolute bottom-[1px] right-[1px] h-2.5 w-2.5 rounded-full"
            style={{ background: color, animation: "tc-pulse-ring 1.5s ease-out infinite" }}
          />
        )}
      </div>

      {/* Name + role */}
      <div className="min-w-0 flex-1">
        <div
          className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-bold transition-colors duration-300"
          style={{ color: present ? C.text : C.sub }}
        >
          {displayName}
        </div>
        {roleLabel && (
          <div
            className="mt-px font-mono text-[10px] font-bold uppercase tracking-[0.07em]"
            style={{ color, animation: "tc-badge-pop 0.3s ease forwards" }}
          >
            {roleLabel}
          </div>
        )}
      </div>

      {/* Status */}
      <div
        className="flex-shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.06em]"
        style={{ color: present ? color : C.muted }}
      >
        {present ? "In Lobby" : "Waiting…"}
      </div>
    </div>
  );
}

// ── Team panel ────────────────────────────────────────────────────
function TeamPanel({ teamName, teamEmoji, members, side, captainId, isCaptain, mySide, challengeStatus, onReady, onAccept, onReject, isReady, isReadying }) {
  const color     = SIDE_COLOR[side];
  const allHere   = members.every((m) => m.present);
  const canReady  = isCaptain && mySide === side && challengeStatus === "accepted" && allHere && !isReady;
  const presentN  = members.filter((m) => m.present).length;

  return (
    <div
      className={`flex flex-1 flex-col overflow-hidden border-border ${side === "challenger" ? "border-r" : "border-l"}`}
      style={{
        background: `linear-gradient(180deg, ${color}06 0%, transparent 60%)`,
        animation: "tc-rise 0.4s ease both",
      }}
    >
      {/* Team header */}
      <div className="border-b border-border px-6 pb-4 pt-6 text-center">
        <div className="mb-2.5 text-[44px] leading-none">{teamEmoji}</div>
        <div className="mb-1.5 font-display text-[17px] font-bold tracking-tight text-foreground">
          {teamName}
        </div>
        <div
          className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.07em]"
          style={{ color: allHere && challengeStatus === "accepted" ? color : C.muted }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: allHere && challengeStatus === "accepted" ? color : C.muted }}
          />
          {presentN} / {members.length} in lobby
        </div>
      </div>

      {/* Member list */}
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-4 py-3.5">
        {members.map((m) => {
          const roleLabel = m.clerkId === captainId ? "Captain" : ROLE_LABEL[m.role] ?? "";
          return (
            <MemberCard
              key={m.clerkId}
              member={m}
              color={color}
              roleLabel={roleLabel}
            />
          );
        })}
      </div>

      {/* Ready / Accept-Reject footer */}
      <div className="flex-shrink-0 border-t border-border px-5 py-4">

        {/* Challengee captain pending: Accept / Reject */}
        {side === "challengee" && challengeStatus === "pending" && isCaptain && mySide === "challengee" && (
          <div className="flex gap-2">
            <button
              onClick={onAccept}
              className="flex-1 rounded-[10px] bg-signal-scalability py-2.5 text-[13px] font-black tracking-[0.04em] text-background hover:brightness-90"
            >
              ✓ Accept
            </button>
            <button
              onClick={onReject}
              className="flex-1 rounded-[10px] border border-signal-security/30 py-2.5 text-[13px] font-bold text-signal-security hover:bg-signal-security/10"
            >
              ✕ Decline
            </button>
          </div>
        )}

        {/* Ready button */}
        {challengeStatus === "accepted" && mySide === side && (
          <div className="relative">
            {canReady && (
              <div
                className="pointer-events-none absolute -inset-[3px] rounded-[13px]"
                style={{ animation: "tc-ready-glow 1.4s ease infinite" }}
              />
            )}
            <button
              onClick={onReady}
              disabled={!canReady || isReadying}
              title={
                !isCaptain     ? "Only the captain can press Ready" :
                mySide !== side ? "" :
                !allHere       ? "Wait for all team members to join" : ""
              }
              className={`w-full rounded-[10px] py-3 text-sm font-black tracking-[0.06em] transition-all duration-200 ${
                isReady
                  ? "cursor-not-allowed border-[1.5px] border-signal-scalability bg-signal-scalability/15 text-signal-scalability"
                  : canReady
                  ? `bg-signal-performance text-background ${isReadying ? "cursor-not-allowed" : "cursor-pointer"}`
                  : "cursor-not-allowed border border-border bg-foreground/[0.05] text-foreground-subtle"
              }`}
            >
              {isReady ? "✓ READY" : isReadying ? "…" : isCaptain ? "⚔ READY" : "⚔ READY (Captain only)"}
            </button>
            {!allHere && challengeStatus === "accepted" && isCaptain && mySide === side && (
              <div className="mt-1.5 text-center text-[11px] text-foreground-subtle">
                Waiting for {members.filter((m) => !m.present).length} more member{members.filter((m) => !m.present).length > 1 ? "s" : ""}…
              </div>
            )}
          </div>
        )}

        {/* Pending + challenger side */}
        {challengeStatus === "pending" && side === "challenger" && mySide === "challenger" && (
          <div className="text-center text-xs italic text-foreground-subtle">
            Waiting for opponents to accept…
          </div>
        )}

        {/* Pending + non-captain challengee */}
        {challengeStatus === "pending" && side === "challengee" && (!isCaptain || mySide !== "challengee") && (
          <div className="text-center text-xs italic text-foreground-subtle">
            Captain deciding…
          </div>
        )}

      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function LobbyClient({ challengeId, myClerkId, mySide, isCaptain, initialChallenge }) {
  const [ch, setCh]           = useState(initialChallenge);
  const [readying, setReadying] = useState(false);
  const [readyErr, setReadyErr] = useState(null);
  const router = useRouter();
  const sseRef = useRef(null);
  const pollRef = useRef(null);

  function applyChallenge(state) {
    setCh(state);
    if (state.status === "matched" && state.matchId) {
      router.replace(`/group-raid-page/arena/${state.matchId}`);
    }
  }

  // SSE + 10s fallback poll
  useEffect(() => {
    let active = true;

    const sse = new EventSource(`/api/team-challenge/${challengeId}/events`);
    sseRef.current = sse;
    sse.addEventListener("team-challenge", (e) => {
      try { if (active) applyChallenge(JSON.parse(e.data)); } catch {}
    });
    sse.onerror = () => {};

    pollRef.current = setInterval(async () => {
      if (!active) return;
      try {
        const r = await fetch(`/api/team-challenge/${challengeId}`);
        if (!r.ok || !active) return;
        applyChallenge(await r.json());
      } catch {}
    }, 10_000);

    return () => {
      active = false;
      sse.close();
      clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId]);

  async function handleAccept() {
    await fetch(`/api/team-challenge/${challengeId}/accept`, { method: "POST" }).catch(() => {});
  }

  async function handleReject() {
    await fetch(`/api/team-challenge/${challengeId}/reject`, { method: "POST" }).catch(() => {});
    router.replace("/social");
  }

  async function handleReady() {
    setReadyErr(null);
    setReadying(true);
    try {
      const r = await fetch(`/api/team-challenge/${challengeId}/ready`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) { setReadyErr(d.error ?? "Error"); }
      else if (d.matchId) router.replace(`/group-raid-page/arena/${d.matchId}`);
    } catch { setReadyErr("Network error"); }
    finally { setReadying(false); }
  }

  async function handleCancel() {
    await fetch(`/api/team-challenge/${challengeId}/cancel`, { method: "POST" }).catch(() => {});
    router.replace("/social");
  }

  // Derived
  const isDead      = ["cancelled", "rejected", "expired"].includes(ch.status);
  const isActive    = ["pending", "accepted"].includes(ch.status);
  const meta        = STATUS_META[ch.status] ?? { msg: ch.status, color: C.muted };

  const challengerMembers = (ch.members ?? []).filter((m) => m.teamSide === "challenger");
  const challengeeMembers = (ch.members ?? []).filter((m) => m.teamSide === "challengee");

  const challengerAllReady = challengerMembers.every((m) => m.present);
  const challengeeAllReady = challengeeMembers.every((m) => m.present);

  const myTeamReady = mySide === "challenger" ? ch.challengerReady : ch.challengeeReady;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        className="relative flex flex-1 flex-col overflow-hidden bg-background"
        style={{
          backgroundImage: [
            "linear-gradient(rgba(148,163,184,0.018) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(148,163,184,0.018) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "48px 48px",
        }}
      >

        {/* Ambient glow when accepted */}
        {ch.status === "accepted" && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse 70% 30% at 50% 0%, color-mix(in oklab, var(--signal-performance) 4%, transparent) 0%, transparent 60%)" }}
          />
        )}

        {/* ── Top bar ── */}
        <div
          className="flex flex-shrink-0 items-center justify-between border-b border-border bg-surface px-7 py-3.5"
          style={{ animation: "tc-rise 0.35s ease both" }}
        >
          <div className="font-mono text-[11px] font-extrabold uppercase tracking-[0.12em] text-signal-performance">
            ⚔️  Team Challenge
          </div>
          <Countdown expiresAt={ch.expiresAt} />
        </div>

        {/* ── Main arena ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Challenger panel */}
          <TeamPanel
            teamName={ch.challengerTeamName}
            teamEmoji={ch.challengerTeamEmoji}
            members={challengerMembers}
            side="challenger"
            captainId={ch.challengerCaptainId}
            isCaptain={isCaptain}
            mySide={mySide}
            challengeStatus={ch.status}
            onReady={handleReady}
            onAccept={handleAccept}
            onReject={handleReject}
            isReady={ch.challengerReady}
            isReadying={readying && mySide === "challenger"}
          />

          {/* Center VS column */}
          <div className="flex w-[130px] flex-shrink-0 flex-col items-center justify-center gap-5 border-x border-border bg-signal-performance/[0.02] px-2">

            {/* VS */}
            <div
              className="font-display text-[32px] font-black tracking-[-0.02em] text-signal-performance"
              style={{ animation: ch.status === "accepted" ? "tc-vs-pulse 2s ease infinite" : "none" }}
            >
              VS
            </div>

            {/* Ready indicators */}
            <div className="flex w-full flex-col items-center gap-2">
              <div
                className={`box-border w-full rounded-full py-1 text-center font-mono text-[10px] font-extrabold uppercase tracking-[0.07em] transition-all duration-300 ${
                  ch.challengerReady
                    ? "border border-brand/30 bg-brand-dim text-brand"
                    : "border border-border bg-foreground/[0.04] text-foreground-subtle"
                }`}
              >
                {ch.challengerReady ? "✓ Ready" : "Not Ready"}
              </div>
              <div className="h-2.5 w-px bg-border" />
              <div
                className={`box-border w-full rounded-full py-1 text-center font-mono text-[10px] font-extrabold uppercase tracking-[0.07em] transition-all duration-300 ${
                  ch.challengeeReady
                    ? "border border-signal-ethics/30 bg-signal-ethics/10 text-signal-ethics"
                    : "border border-border bg-foreground/[0.04] text-foreground-subtle"
                }`}
              >
                {ch.challengeeReady ? "✓ Ready" : "Not Ready"}
              </div>
            </div>

            {/* Status message */}
            <div
              className="text-center text-[11px] font-bold leading-relaxed tracking-[0.03em]"
              style={{ color: meta.color }}
            >
              {meta.msg}
            </div>
          </div>

          {/* Challengee panel */}
          <TeamPanel
            teamName={ch.challengeeTeamName}
            teamEmoji={ch.challengeeTeamEmoji}
            members={challengeeMembers}
            side="challengee"
            captainId={ch.challengeeCaptainId}
            isCaptain={isCaptain}
            mySide={mySide}
            challengeStatus={ch.status}
            onReady={handleReady}
            onAccept={handleAccept}
            onReject={handleReject}
            isReady={ch.challengeeReady}
            isReadying={readying && mySide === "challengee"}
          />
        </div>

        {/* ── Bottom bar ── */}
        <div
          className="flex flex-shrink-0 items-center justify-center gap-4 border-t border-border bg-surface px-6 py-3"
          style={{ animation: "tc-rise 0.45s ease 0.1s both" }}
        >
          {readyErr && (
            <div className="text-xs font-semibold text-signal-security">{readyErr}</div>
          )}

          {isActive && (
            <button
              onClick={handleCancel}
              className="rounded-lg border border-signal-security/25 px-6 py-2 text-[13px] font-bold text-signal-security transition-all duration-150 hover:border-signal-security/50 hover:bg-signal-security/10"
            >
              {mySide === "challenger" ? "Cancel Challenge" : "Leave Lobby"}
            </button>
          )}

          {isDead && (
            <>
              <div className="text-[28px]">
                {ch.status === "rejected" ? "🚫" : ch.status === "expired" ? "⏰" : "💔"}
              </div>
              <button
                onClick={() => router.replace("/social")}
                className="rounded-[9px] bg-signal-performance px-7 py-2.5 text-sm font-extrabold text-background"
              >
                Back to Social
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
