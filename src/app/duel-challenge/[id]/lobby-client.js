"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const KEYFRAMES = `
@keyframes lob-float {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes vs-pulse {
  0%, 100% { transform: scale(1);    text-shadow: 0 0 0px transparent; }
  50%       { transform: scale(1.08); text-shadow: 0 0 24px color-mix(in oklab, var(--signal-performance) 60%, transparent); }
}
@keyframes sword-glow {
  0%, 100% { box-shadow: 0 0 0px transparent; }
  50%       { box-shadow: 0 0 32px color-mix(in oklab, var(--signal-performance) 30%, transparent); }
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
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative">
        <div
          className="flex items-center justify-center rounded-full font-black transition-colors duration-[400ms]"
          style={{
            width: size, height: size,
            background: `linear-gradient(135deg, ${color}28, ${color}08)`,
            border: `2.5px solid ${present ? color : "var(--border-strong)"}`,
            fontSize: Math.round(size * 0.42),
            color: present ? color : "var(--foreground-subtle)",
            boxShadow: present ? `0 0 0 4px ${color}18` : "none",
          }}
        >
          {(name || "?")[0].toUpperCase()}
        </div>
        {present && (
          <div
            className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2"
            style={{ background: color, borderColor: "var(--background)", boxShadow: `0 0 8px ${color}80` }}
          />
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
    <div
      className={`font-mono text-[13px] font-bold tabular-nums ${urgent ? "text-signal-security" : "text-foreground-subtle"}`}
      style={{ animation: urgent ? "shake 0.5s ease infinite" : "none" }}
    >
      ⏱ {mins}:{String(secs).padStart(2, "0")}
    </div>
  );
}

const STATUS_META = {
  pending:   { label: "Waiting for opponent to accept…",   color: "var(--signal-performance)" },
  accepted:  { label: "Both in lobby — ready to fight!",   color: "var(--signal-scalability)" },
  cancelled: { label: "Challenge was cancelled.",           color: "var(--signal-security)" },
  rejected:  { label: "Challenge was declined.",           color: "var(--signal-security)" },
  expired:   { label: "Challenge timed out.",              color: "var(--foreground-subtle)" },
  matched:   { label: "Match starting…",                   color: "var(--signal-scalability)" },
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
  const meta         = STATUS_META[ch.status] ?? { label: ch.status, color: "var(--foreground-subtle)" };

  const challengerColor = "#2dd881"; // signal-scalability
  const challengeeColor = "#22d3ee"; // signal-ethics

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-background p-6"
        style={{
          backgroundImage: [
            "linear-gradient(rgba(148,163,184,0.03) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(148,163,184,0.03) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "52px 52px",
        }}
      >

        {/* Ambient glow when both present */}
        {bothPresent && ch.status === "accepted" && (
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, color-mix(in oklab, var(--signal-performance) 4%, transparent) 0%, transparent 70%)" }}
          />
        )}

        <div className="relative z-10 flex flex-col items-center">

          {/* Header */}
          <div className="mb-9 text-center" style={{ animation: "lob-float 0.4s ease forwards" }}>
            <div className="mb-2 font-mono text-[13px] font-extrabold uppercase tracking-[0.12em] text-foreground-subtle">
              ⚔️ 1v1 Duel Challenge
            </div>
            <Countdown expiresAt={ch.expiresAt} />
          </div>

          {/* Players VS row */}
          <div className="mb-10 flex items-center gap-12" style={{ animation: "lob-float 0.45s ease 0.05s both" }}>
            {/* Challenger */}
            <div className="min-w-[120px] text-center">
              <Avatar
                name={ch.challengerName}
                color={challengerColor}
                present={ch.challengerPresent}
              />
              <div className="mt-2.5 text-[15px] font-extrabold text-foreground">
                {ch.challengerName}
              </div>
              <div
                className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.07em]"
                style={{ color: ch.challengerPresent ? challengerColor : "var(--foreground-subtle)" }}
              >
                {ch.challengerPresent ? "In Lobby" : (ch.status === "pending" ? "Waiting…" : "Not here")}
              </div>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="font-display text-[28px] font-black tracking-[-0.02em] text-signal-performance"
                style={{ animation: bothPresent && ch.status === "accepted" ? "vs-pulse 1.8s ease infinite" : "none" }}
              >
                VS
              </div>
              {bothPresent && ch.status === "accepted" && (
                <div className="relative flex items-center justify-center">
                  <div
                    className="absolute h-2 w-2 rounded-full bg-signal-scalability"
                    style={{ animation: "ready-ring 1.4s ease-out infinite" }}
                  />
                  <div
                    className="absolute h-2 w-2 rounded-full bg-signal-scalability"
                    style={{ animation: "ready-ring 1.4s ease-out 0.7s infinite" }}
                  />
                </div>
              )}
            </div>

            {/* Challengee */}
            <div className="min-w-[120px] text-center">
              <Avatar
                name={ch.challengeeName}
                color={challengeeColor}
                present={ch.challengeePresent}
              />
              <div className="mt-2.5 text-[15px] font-extrabold text-foreground">
                {ch.challengeeName}
              </div>
              <div
                className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.07em]"
                style={{ color: ch.challengeePresent ? challengeeColor : "var(--foreground-subtle)" }}
              >
                {ch.challengeePresent ? "In Lobby" : (ch.status === "pending" ? "Invited" : "Not here")}
              </div>
            </div>
          </div>

          {/* Status */}
          <div
            className="mb-8 text-center text-[13px] font-bold"
            style={{ color: meta.color, animation: "lob-float 0.45s ease 0.1s both" }}
          >
            {meta.label}
          </div>

          {/* Actions */}
          {!isDead && (
            <div className="flex flex-col items-center gap-3" style={{ animation: "lob-float 0.45s ease 0.15s both" }}>

              {/* Start button */}
              <div className="relative">
                {bothPresent && ch.status === "accepted" && !starting && (
                  <div
                    className="pointer-events-none absolute -inset-1 rounded-2xl bg-signal-performance/15"
                    style={{ animation: "sword-glow 1.6s ease infinite" }}
                  />
                )}
                <button
                  onClick={handleStart}
                  disabled={!canStart}
                  className={`relative rounded-xl px-12 py-3.5 text-base font-black tracking-[0.04em] transition-all duration-200 ${
                    canStart
                      ? "cursor-pointer bg-signal-performance text-background"
                      : "cursor-not-allowed border border-border bg-foreground/[0.06] text-foreground-subtle"
                  }`}
                >
                  {starting ? "Starting…" : "⚔️  START DUEL"}
                </button>
              </div>

              {startErr && (
                <div className="text-xs font-semibold text-signal-security">{startErr}</div>
              )}

              {/* Hint when waiting for opponent */}
              {ch.status === "pending" && (
                <div className="max-w-[280px] text-center text-xs text-foreground-subtle">
                  {isChallenger
                    ? "Waiting for them to accept. Start activates once both of you are in this lobby."
                    : "The challenger is waiting. Start activates once both of you are here."}
                </div>
              )}
              {ch.status === "accepted" && !bothPresent && (
                <div className="text-xs text-foreground-subtle">
                  Waiting for the other player to join this lobby…
                </div>
              )}

              {/* Cancel / Leave */}
              <button
                onClick={handleCancel}
                className="mt-1 cursor-pointer rounded-lg border border-signal-security/25 bg-transparent px-6 py-2 text-[13px] font-bold text-signal-security transition-colors hover:border-signal-security/50 hover:bg-signal-security/[0.08]"
              >
                {isChallenger ? "Cancel Challenge" : "Leave Lobby"}
              </button>
            </div>
          )}

          {/* Dead state */}
          {isDead && (
            <div className="flex flex-col items-center gap-4" style={{ animation: "lob-float 0.4s ease forwards" }}>
              <div className="text-[40px] leading-none">
                {ch.status === "rejected" ? "🚫" : ch.status === "expired" ? "⏰" : "💔"}
              </div>
              <button
                onClick={() => router.replace("/social")}
                className="cursor-pointer rounded-[10px] bg-signal-performance px-7 py-2.5 text-sm font-extrabold text-background"
              >
                Back to Social
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
