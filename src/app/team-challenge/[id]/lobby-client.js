"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ── Animations ────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes tc-rise {
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes tc-vs-pulse {
  0%,100% { transform: scale(1);    text-shadow: 0 0 0 rgba(245,185,66,0); }
  50%      { transform: scale(1.1); text-shadow: 0 0 28px rgba(245,185,66,0.5); }
}
@keyframes tc-ready-glow {
  0%,100% { box-shadow: 0 0 0 rgba(245,185,66,0); }
  50%      { box-shadow: 0 0 24px rgba(245,185,66,0.4); }
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

const C = {
  bg:         "#0d1a1f",
  panel:      "#0a1419",
  card:       "#0e1f27",
  border:     "rgba(201,214,218,0.07)",
  green:      "#3ddc84",
  cyan:       "#22d3ee",
  gold:       "#f5b942",
  red:        "#ef4444",
  text:       "#e8f0f3",
  sub:        "#8ba0a6",
  muted:      "#4a6570",
};

const SIDE_COLOR = { challenger: C.green, challengee: C.cyan };

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
    <span style={{
      fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums",
      color: urgent ? C.red : C.muted,
      animation: urgent ? "tc-shake 0.6s ease infinite" : "none",
    }}>
      ⏱ {Math.floor(rem / 60)}:{String(rem % 60).padStart(2, "0")}
    </span>
  );
}

// ── Member card ───────────────────────────────────────────────────
function MemberCard({ member, color, roleLabel }) {
  const { displayName, present } = member;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 14px", borderRadius: 10,
      background: present ? `${color}08` : "rgba(201,214,218,0.02)",
      border: `1px solid ${present ? `${color}22` : C.border}`,
      transition: "all 0.3s",
    }}>
      {/* Avatar */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: `linear-gradient(135deg, ${color}22, ${color}08)`,
          border: `1.5px solid ${present ? color : "rgba(201,214,218,0.12)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 900,
          color: present ? color : C.muted,
          transition: "all 0.3s",
        }}>
          {(displayName || "?")[0].toUpperCase()}
        </div>
        {/* presence dot */}
        <div style={{
          position: "absolute", bottom: 1, right: 1,
          width: 10, height: 10, borderRadius: "50%",
          background: present ? color : "rgba(201,214,218,0.18)",
          border: `1.5px solid ${C.bg}`,
          transition: "background 0.3s",
          boxShadow: present ? `0 0 6px ${color}80` : "none",
        }} />
        {present && (
          <div style={{
            position: "absolute", bottom: 1, right: 1,
            width: 10, height: 10, borderRadius: "50%",
            background: color,
            animation: "tc-pulse-ring 1.5s ease-out infinite",
          }} />
        )}
      </div>

      {/* Name + role */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: present ? C.text : C.sub,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          transition: "color 0.3s",
        }}>
          {displayName}
        </div>
        {roleLabel && (
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
            color: color, textTransform: "uppercase", marginTop: 1,
            animation: "tc-badge-pop 0.3s ease forwards",
          }}>
            {roleLabel}
          </div>
        )}
      </div>

      {/* Status */}
      <div style={{
        fontSize: 11, fontWeight: 700, flexShrink: 0,
        color: present ? color : C.muted,
        letterSpacing: "0.06em", textTransform: "uppercase",
      }}>
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
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
      borderRight: side === "challenger" ? `1px solid ${C.border}` : "none",
      borderLeft:  side === "challengee" ? `1px solid ${C.border}` : "none",
      background: `linear-gradient(180deg, ${color}06 0%, transparent 60%)`,
      animation: "tc-rise 0.4s ease both",
    }}>
      {/* Team header */}
      <div style={{
        padding: "24px 24px 16px",
        borderBottom: `1px solid ${C.border}`,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 10 }}>{teamEmoji}</div>
        <div style={{ fontSize: 17, fontWeight: 900, color: C.text, marginBottom: 6, letterSpacing: "-0.01em" }}>
          {teamName}
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 11, fontWeight: 700, color: allHere && challengeStatus === "accepted" ? color : C.muted,
          letterSpacing: "0.07em", textTransform: "uppercase",
        }}>
          <span style={{
            display: "inline-block", width: 6, height: 6, borderRadius: "50%",
            background: allHere && challengeStatus === "accepted" ? color : C.muted,
          }} />
          {presentN} / {members.length} in lobby
        </div>
      </div>

      {/* Member list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
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
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>

        {/* Challengee captain pending: Accept / Reject */}
        {side === "challengee" && challengeStatus === "pending" && isCaptain && mySide === "challengee" && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onAccept}
              style={{
                flex: 1, background: C.green, color: "#0d1a1f",
                border: "none", borderRadius: 10, padding: "11px 0",
                fontSize: 13, fontWeight: 900, cursor: "pointer",
                letterSpacing: "0.04em",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              ✓ Accept
            </button>
            <button
              onClick={onReject}
              style={{
                flex: 1, background: "transparent", color: C.red,
                border: `1px solid rgba(239,68,68,0.3)`, borderRadius: 10,
                padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              ✕ Decline
            </button>
          </div>
        )}

        {/* Ready button */}
        {challengeStatus === "accepted" && mySide === side && (
          <div style={{ position: "relative" }}>
            {canReady && (
              <div style={{
                position: "absolute", inset: -3, borderRadius: 13,
                animation: "tc-ready-glow 1.4s ease infinite",
                pointerEvents: "none",
              }} />
            )}
            <button
              onClick={onReady}
              disabled={!canReady || isReadying}
              title={
                !isCaptain     ? "Only the captain can press Ready" :
                mySide !== side ? "" :
                !allHere       ? "Wait for all team members to join" : ""
              }
              style={{
                width: "100%", padding: "12px 0",
                background: isReady ? "rgba(61,220,132,0.15)" :
                            canReady ? C.gold : "rgba(201,214,218,0.05)",
                color:  isReady ? C.green :
                        canReady ? "#0d1a1f" : C.muted,
                border: isReady ? `1.5px solid ${C.green}` :
                        canReady ? "none" : `1px solid ${C.border}`,
                borderRadius: 10, fontSize: 14, fontWeight: 900,
                cursor: canReady && !isReadying ? "pointer" : "not-allowed",
                letterSpacing: "0.06em",
                transition: "all 0.2s",
              }}
            >
              {isReady ? "✓ READY" : isReadying ? "…" : isCaptain ? "⚔ READY" : "⚔ READY (Captain only)"}
            </button>
            {!allHere && challengeStatus === "accepted" && isCaptain && mySide === side && (
              <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 6 }}>
                Waiting for {members.filter((m) => !m.present).length} more member{members.filter((m) => !m.present).length > 1 ? "s" : ""}…
              </div>
            )}
          </div>
        )}

        {/* Pending + challenger side */}
        {challengeStatus === "pending" && side === "challenger" && mySide === "challenger" && (
          <div style={{ fontSize: 12, color: C.muted, textAlign: "center", fontStyle: "italic" }}>
            Waiting for opponents to accept…
          </div>
        )}

        {/* Pending + non-captain challengee */}
        {challengeStatus === "pending" && side === "challengee" && (!isCaptain || mySide !== "challengee") && (
          <div style={{ fontSize: 12, color: C.muted, textAlign: "center", fontStyle: "italic" }}>
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
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
        background: C.bg,
        backgroundImage: [
          "linear-gradient(rgba(201,214,218,0.018) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(201,214,218,0.018) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "48px 48px",
        position: "relative",
      }}>

        {/* Ambient glow when accepted */}
        {ch.status === "accepted" && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(ellipse 70% 30% at 50% 0%, rgba(245,185,66,0.04) 0%, transparent 60%)",
          }} />
        )}

        {/* ── Top bar ── */}
        <div style={{
          padding: "14px 28px", borderBottom: `1px solid ${C.border}`,
          background: C.panel, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          animation: "tc-rise 0.35s ease both",
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            ⚔️  Team Challenge
          </div>
          <Countdown expiresAt={ch.expiresAt} />
        </div>

        {/* ── Main arena ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

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
          <div style={{
            width: 130, flexShrink: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 20, padding: "0 8px",
            borderLeft: `1px solid ${C.border}`,
            borderRight: `1px solid ${C.border}`,
            background: "rgba(245,185,66,0.02)",
          }}>

            {/* VS */}
            <div style={{
              fontSize: 32, fontWeight: 900, color: C.gold,
              letterSpacing: "-0.02em",
              animation: ch.status === "accepted" ? "tc-vs-pulse 2s ease infinite" : "none",
            }}>
              VS
            </div>

            {/* Ready indicators */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase",
                color: ch.challengerReady ? C.green : C.muted,
                padding: "4px 10px", borderRadius: 20,
                background: ch.challengerReady ? "rgba(61,220,132,0.12)" : "rgba(201,214,218,0.04)",
                border: `1px solid ${ch.challengerReady ? "rgba(61,220,132,0.3)" : C.border}`,
                transition: "all 0.3s", textAlign: "center", width: "100%", boxSizing: "border-box",
              }}>
                {ch.challengerReady ? "✓ Ready" : "Not Ready"}
              </div>
              <div style={{ width: 1, height: 10, background: C.border }} />
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase",
                color: ch.challengeeReady ? C.cyan : C.muted,
                padding: "4px 10px", borderRadius: 20,
                background: ch.challengeeReady ? "rgba(34,211,238,0.12)" : "rgba(201,214,218,0.04)",
                border: `1px solid ${ch.challengeeReady ? "rgba(34,211,238,0.3)" : C.border}`,
                transition: "all 0.3s", textAlign: "center", width: "100%", boxSizing: "border-box",
              }}>
                {ch.challengeeReady ? "✓ Ready" : "Not Ready"}
              </div>
            </div>

            {/* Status message */}
            <div style={{
              fontSize: 11, color: meta.color, fontWeight: 700,
              textAlign: "center", lineHeight: 1.5, letterSpacing: "0.03em",
            }}>
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
        <div style={{
          padding: "12px 24px", borderTop: `1px solid ${C.border}`,
          background: C.panel, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
          animation: "tc-rise 0.45s ease 0.1s both",
        }}>
          {readyErr && (
            <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{readyErr}</div>
          )}

          {isActive && (
            <button
              onClick={handleCancel}
              style={{
                background: "transparent", color: C.red,
                border: `1px solid rgba(239,68,68,0.25)`,
                borderRadius: 8, padding: "8px 24px",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)"; }}
            >
              {mySide === "challenger" ? "Cancel Challenge" : "Leave Lobby"}
            </button>
          )}

          {isDead && (
            <>
              <div style={{ fontSize: 28 }}>
                {ch.status === "rejected" ? "🚫" : ch.status === "expired" ? "⏰" : "💔"}
              </div>
              <button
                onClick={() => router.replace("/social")}
                style={{
                  background: C.gold, color: "#0d1a1f",
                  border: "none", borderRadius: 9,
                  padding: "10px 28px", fontSize: 14, fontWeight: 800,
                  cursor: "pointer",
                }}
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
