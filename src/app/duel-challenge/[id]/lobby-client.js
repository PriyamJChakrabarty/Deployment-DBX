"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const KEYFRAMES = `
@keyframes lob-float {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes vs-pulse {
  0%, 100% { transform: scale(1);    text-shadow: 0 0 0px rgba(245,185,66,0); }
  50%       { transform: scale(1.08); text-shadow: 0 0 24px rgba(245,185,66,0.6); }
}
@keyframes sword-glow {
  0%, 100% { box-shadow: 0 0 0px rgba(245,185,66,0); }
  50%       { box-shadow: 0 0 32px rgba(245,185,66,0.3); }
}
@keyframes ready-ring {
  0%   { transform: scale(0.8); opacity: 0.9; }
  100% { transform: scale(2);   opacity: 0; }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-4px); }
  40%       { transform: translateX(4px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
}
`;

function Avatar({ name, color, size = 80, present }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative" }}>
        <div style={{
          width: size, height: size, borderRadius: "50%",
          background: `linear-gradient(135deg, ${color}28, ${color}08)`,
          border: `2.5px solid ${present ? color : "rgba(201,214,218,0.15)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: Math.round(size * 0.42), fontWeight: 900,
          color: present ? color : "#4a6570",
          transition: "border-color 0.4s, color 0.4s",
          boxShadow: present ? `0 0 0 4px ${color}18` : "none",
        }}>
          {(name || "?")[0].toUpperCase()}
        </div>
        {present && (
          <div style={{
            position: "absolute", bottom: 4, right: 4,
            width: 14, height: 14, borderRadius: "50%",
            background: color, border: "2px solid #0d1a1f",
            boxShadow: `0 0 8px ${color}80`,
          }} />
        )}
      </div>
    </div>
  );
}

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
  const mins = Math.floor(rem / 60);
  const secs = rem % 60;
  const urgent = rem < 60;

  return (
    <div style={{
      fontSize: 13, fontVariantNumeric: "tabular-nums",
      color: urgent ? "#ef4444" : "#4a6570",
      fontWeight: 700,
      animation: urgent ? "shake 0.5s ease infinite" : "none",
    }}>
      ⏱ {mins}:{String(secs).padStart(2, "0")}
    </div>
  );
}

const STATUS_META = {
  pending:   { label: "Waiting for opponent to accept…",   color: "#f5b942" },
  accepted:  { label: "Both in lobby — ready to fight!",   color: "#3ddc84" },
  cancelled: { label: "Challenge was cancelled.",           color: "#ef4444" },
  rejected:  { label: "Challenge was declined.",           color: "#ef4444" },
  expired:   { label: "Challenge timed out.",              color: "#4a6570" },
  matched:   { label: "Match starting…",                   color: "#3ddc84" },
};

export default function LobbyClient({ challengeId, myClerkId, myName, role, initialChallenge }) {
  const [ch, setCh]           = useState(initialChallenge);
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState(null);
  const router = useRouter();
  const sseRef = useRef(null);
  const pollRef = useRef(null);

  const isMine = (c) => ["cancelled", "rejected", "expired", "matched"].includes(c.status);

  function applyChallenge(c) {
    setCh(c);
    if (c.status === "matched" && c.matchId) {
      router.replace(`/live-battle/arena/${c.matchId}`);
    }
  }

  // ── SSE + 10s fallback poll ───────────────────────────────────
  useEffect(() => {
    let active = true;

    const sse = new EventSource(`/api/duel/challenge/${challengeId}/events`);
    sseRef.current = sse;
    sse.addEventListener("challenge", (e) => {
      try { if (active) applyChallenge(JSON.parse(e.data)); } catch {}
    });
    sse.onerror = () => {};

    pollRef.current = setInterval(async () => {
      if (!active) return;
      try {
        const r = await fetch(`/api/duel/challenge/${challengeId}`);
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

  async function handleStart() {
    setStartErr(null);
    setStarting(true);
    try {
      const r = await fetch(`/api/duel/challenge/${challengeId}/start`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) { setStartErr(d.error ?? "Failed to start"); setStarting(false); return; }
      if (d.matchId) router.replace(`/live-battle/arena/${d.matchId}`);
    } catch { setStarting(false); setStartErr("Network error"); }
  }

  async function handleCancel() {
    await fetch(`/api/duel/challenge/${challengeId}/cancel`, { method: "POST" }).catch(() => {});
    router.replace("/social");
  }

  // ── Derived ───────────────────────────────────────────────────
  const isChallenger = role === "challenger";
  const bothPresent  = ch.challengerPresent && ch.challengeePresent;
  const canStart     = ch.status === "accepted" && bothPresent && !starting;
  const isDead       = ["cancelled", "rejected", "expired"].includes(ch.status);
  const isActive     = ["pending", "accepted"].includes(ch.status);
  const meta         = STATUS_META[ch.status] ?? { label: ch.status, color: "#4a6570" };

  const challengerColor = "#3ddc84";
  const challengeeColor = "#22d3ee";

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0d1a1f",
        backgroundImage: [
          "linear-gradient(rgba(201,214,218,0.02) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(201,214,218,0.02) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "52px 52px",
        gap: 0, padding: 24, position: "relative", overflow: "hidden",
      }}>

        {/* Ambient glow when both present */}
        {bothPresent && ch.status === "accepted" && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(245,185,66,0.04) 0%, transparent 70%)",
          }} />
        )}

        {/* Header */}
        <div style={{
          animation: "lob-float 0.4s ease forwards",
          textAlign: "center", marginBottom: 36,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#4a6570", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
            ⚔️ 1v1 Duel Challenge
          </div>
          <Countdown expiresAt={ch.expiresAt} />
        </div>

        {/* Players VS row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 48,
          animation: "lob-float 0.45s ease 0.05s both",
          marginBottom: 40,
        }}>
          {/* Challenger */}
          <div style={{ textAlign: "center", minWidth: 120 }}>
            <Avatar
              name={ch.challengerName}
              color={challengerColor}
              present={ch.challengerPresent}
            />
            <div style={{ marginTop: 10, fontSize: 15, fontWeight: 800, color: "#e8f0f3" }}>
              {ch.challengerName}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: ch.challengerPresent ? challengerColor : "#4a6570", marginTop: 4, letterSpacing: "0.07em", textTransform: "uppercase" }}>
              {ch.challengerPresent ? "In Lobby" : (ch.status === "pending" ? "Waiting…" : "Not here")}
            </div>
          </div>

          {/* VS */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          }}>
            <div style={{
              fontSize: 28, fontWeight: 900, color: "#f5b942",
              letterSpacing: "-0.02em",
              animation: bothPresent && ch.status === "accepted" ? "vs-pulse 1.8s ease infinite" : "none",
            }}>
              VS
            </div>
            {bothPresent && ch.status === "accepted" && (
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#3ddc84",
                  animation: "ready-ring 1.4s ease-out infinite",
                  position: "absolute",
                }} />
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#3ddc84",
                  animation: "ready-ring 1.4s ease-out 0.7s infinite",
                  position: "absolute",
                }} />
              </div>
            )}
          </div>

          {/* Challengee */}
          <div style={{ textAlign: "center", minWidth: 120 }}>
            <Avatar
              name={ch.challengeeName}
              color={challengeeColor}
              present={ch.challengeePresent}
            />
            <div style={{ marginTop: 10, fontSize: 15, fontWeight: 800, color: "#e8f0f3" }}>
              {ch.challengeeName}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: ch.challengeePresent ? challengeeColor : "#4a6570", marginTop: 4, letterSpacing: "0.07em", textTransform: "uppercase" }}>
              {ch.challengeePresent ? "In Lobby" : (ch.status === "pending" ? "Invited" : "Not here")}
            </div>
          </div>
        </div>

        {/* Status */}
        <div style={{
          fontSize: 13, fontWeight: 700, color: meta.color,
          marginBottom: 32, textAlign: "center",
          animation: "lob-float 0.45s ease 0.1s both",
        }}>
          {meta.label}
        </div>

        {/* Actions */}
        {!isDead && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            animation: "lob-float 0.45s ease 0.15s both",
          }}>

            {/* Start button */}
            <div style={{ position: "relative" }}>
              {bothPresent && ch.status === "accepted" && !starting && (
                <div style={{
                  position: "absolute", inset: -4, borderRadius: 16,
                  background: "rgba(245,185,66,0.15)",
                  animation: "sword-glow 1.6s ease infinite",
                  pointerEvents: "none",
                }} />
              )}
              <button
                onClick={handleStart}
                disabled={!canStart}
                style={{
                  padding: "14px 48px",
                  background: canStart ? "#f5b942" : "rgba(201,214,218,0.06)",
                  color:      canStart ? "#0d1a1f" : "#2a3a42",
                  border:     canStart ? "none" : "1px solid rgba(201,214,218,0.1)",
                  borderRadius: 12,
                  fontSize: 16, fontWeight: 900,
                  cursor: canStart ? "pointer" : "not-allowed",
                  letterSpacing: "0.04em",
                  transition: "all 0.2s",
                  position: "relative",
                }}
              >
                {starting ? "Starting…" : "⚔️  START DUEL"}
              </button>
            </div>

            {startErr && (
              <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{startErr}</div>
            )}

            {/* Hint when waiting for opponent */}
            {ch.status === "pending" && (
              <div style={{ fontSize: 12, color: "#4a6570", textAlign: "center", maxWidth: 280 }}>
                {isChallenger
                  ? "Waiting for them to accept. Start activates once both of you are in this lobby."
                  : "The challenger is waiting. Start activates once both of you are here."}
              </div>
            )}
            {ch.status === "accepted" && !bothPresent && (
              <div style={{ fontSize: 12, color: "#4a6570" }}>
                Waiting for the other player to join this lobby…
              </div>
            )}

            {/* Cancel / Leave */}
            <button
              onClick={handleCancel}
              style={{
                marginTop: 4,
                background: "transparent",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#ef4444", borderRadius: 8,
                padding: "8px 24px", fontSize: 13, fontWeight: 700,
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)"; }}
            >
              {isChallenger ? "Cancel Challenge" : "Leave Lobby"}
            </button>
          </div>
        )}

        {/* Dead state */}
        {isDead && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
            animation: "lob-float 0.4s ease forwards",
          }}>
            <div style={{ fontSize: 40 }}>
              {ch.status === "rejected" ? "🚫" : ch.status === "expired" ? "⏰" : "💔"}
            </div>
            <button
              onClick={() => router.replace("/social")}
              style={{
                background: "#f5b942", color: "#0d1a1f",
                border: "none", borderRadius: 10,
                padding: "10px 28px", fontSize: 14, fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Back to Social
            </button>
          </div>
        )}
      </div>
    </>
  );
}
