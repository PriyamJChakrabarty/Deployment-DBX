"use client";

import { useEffect, useRef, useState } from "react";
import { RESULT_COLORS, CATEGORY_COLORS } from "@/lib/theme";

// "Me" reuses the same win-green identity color the dashboard's duel history
// rows use for "You"; "Opponent" reuses the Ethics signal cyan — matches the
// convention already shipped in home-client.js's DuelRow.
const ME_COLOR  = RESULT_COLORS.win;
const OPP_COLOR = CATEGORY_COLORS.Ethics;

const KEYFRAMES = `
@keyframes radar-ring {
  0%   { transform: scale(0.4); opacity: 0.9; }
  100% { transform: scale(2.2); opacity: 0; }
}
@keyframes float-in-left {
  from { transform: translateX(-180px) scale(0.7); opacity: 0; }
  to   { transform: translateX(0)      scale(1);   opacity: 1; }
}
@keyframes float-in-right {
  from { transform: translateX(180px) scale(0.7); opacity: 0; }
  to   { transform: translateX(0)     scale(1);   opacity: 1; }
}
@keyframes sword-drop {
  0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
  60%  { transform: scale(1.25) rotate(5deg); opacity: 1; }
  100% { transform: scale(1)    rotate(0deg); opacity: 1; }
}
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 0px ${ME_COLOR}00; }
  50%       { box-shadow: 0 0 40px ${ME_COLOR}80; }
}
@keyframes battle-zoom {
  0%   { transform: scale(0.4); opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}
@keyframes flash-bg {
  0%   { opacity: 0; }
  30%  { opacity: 0.6; }
  100% { opacity: 0; }
}
@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.4); opacity: 0.4; }
  40%           { transform: scale(1);   opacity: 1; }
}
`;

function Avi({ name, size = 80, color = ME_COLOR }) {
  return (
    <div
      className="flex flex-shrink-0 select-none items-center justify-center rounded-full font-black"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${color}30, ${color}08)`,
        border: `3px solid ${color}60`,
        fontSize: size * 0.4, color,
      }}
    >
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

function RadarRing({ delay = 0 }) {
  return (
    <div
      className="pointer-events-none absolute rounded-full"
      style={{
        width: "120px", height: "120px",
        border: `2px solid ${ME_COLOR}66`,
        animation: `radar-ring 2s ease-out ${delay}s infinite`,
      }}
    />
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function MatchmakingClient({ myClerkId, myName }) {
  const [phase, setPhase]         = useState("checking"); // checking | searching | matched | battle
  const [matchData, setMatchData] = useState(null);       // { matchId, opponentName }
  const [countdown, setCountdown] = useState(3);
  const [onlineCount, setOnline]  = useState(null);
  const [dotFrame, setDotFrame]   = useState(0);

  const pollRef    = useRef(null);
  const cdRef      = useRef(null);
  const sseRef     = useRef(null);
  const matchedRef = useRef(false); // prevent double-redirect if SSE + fallback poll race

  // ── On mount: always cancel stale queue entry and start fresh ─
  useEffect(() => {
    fetch("/api/duel/queue/cancel", { method: "DELETE" }).catch(() => {});
    setPhase("searching");
  }, []);

  // ── Enqueue + SSE push + 10s fallback poll ────────────────
  useEffect(() => {
    if (phase !== "searching") return;
    matchedRef.current = false;

    function handleMatch(data) {
      if (matchedRef.current) return;
      matchedRef.current = true;
      clearInterval(pollRef.current);
      if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
      setMatchData(data);
      setPhase("matched");
    }

    // 1. Enqueue immediately (and catch an instant match)
    const enqueue = async () => {
      try {
        const r = await fetch("/api/duel/queue", { method: "POST" });
        if (!r.ok) return;
        const data = await r.json();
        if (data.matched) handleMatch(data);
      } catch {}
    };

    enqueue();

    // 2. SSE push — server notifies us the instant a match is created
    const sse = new EventSource("/api/duel/queue/events");
    sseRef.current = sse;
    sse.addEventListener("matched", (e) => {
      try { handleMatch(JSON.parse(e.data)); } catch {}
    });
    sse.onerror = () => {
      sse.close();
      sseRef.current = null;
    };

    // 3. 10s fallback poll — insurance against SSE delivery gaps
    pollRef.current = setInterval(async () => {
      if (matchedRef.current) return;
      try {
        const r = await fetch("/api/duel/queue", { method: "POST" });
        if (!r.ok) return;
        const data = await r.json();
        if (data.matched) handleMatch(data);
      } catch {}
    }, 10000);

    return () => {
      clearInterval(pollRef.current);
      if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    };
  }, [phase]);

  // ── Fetch online count for searching screen ────────────────
  useEffect(() => {
    if (phase !== "searching") return;
    fetch("/api/presence/online")
      .then((r) => r.json())
      .then((d) => setOnline(Array.isArray(d) ? d.length : 0))
      .catch(() => {});
  }, [phase]);

  // ── Animated dots ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== "searching") return;
    const id = setInterval(() => setDotFrame((f) => (f + 1) % 4), 400);
    return () => clearInterval(id);
  }, [phase]);

  // ── Redirect to arena 2s after "DUEL STARTS" appears ──────
  useEffect(() => {
    if (phase !== "battle" || !matchData?.matchId) return;
    const t = setTimeout(() => {
      window.location.href = `/live-battle/arena/${matchData.matchId}`;
    }, 2000);
    return () => clearTimeout(t);
  }, [phase, matchData?.matchId]);

  // ── Countdown from 3 once matched ─────────────────────────
  useEffect(() => {
    if (phase !== "matched") return;
    setCountdown(3);
    cdRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(cdRef.current);
          setPhase("battle");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(cdRef.current);
  }, [phase]);

  // ── Cancel ────────────────────────────────────────────────
  async function handleCancel() {
    clearInterval(pollRef.current);
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    try { await fetch("/api/duel/queue/cancel", { method: "DELETE" }); } catch {}
    window.location.href = "/home";
  }

  const dots = ".".repeat(dotFrame % 4);

  // ── Shared wrapper ─────────────────────────────────────────
  const wrap = (children) => (
    <>
      <style>{KEYFRAMES}</style>
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-background">
        {/* subtle grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px)",
              "linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "44px 44px",
          }}
        />
        {children}
      </div>
    </>
  );

  // ── Phase: checking ────────────────────────────────────────
  if (phase === "checking") {
    return wrap(
      <div className="flex items-center gap-2.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: ME_COLOR, animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    );
  }

  // ── Phase: searching ──────────────────────────────────────
  if (phase === "searching") {
    return wrap(
      <div className="z-10 flex flex-col items-center">
        {/* Radar rings */}
        <div className="relative mb-10 flex h-[120px] w-[120px] items-center justify-center">
          <RadarRing delay={0} />
          <RadarRing delay={0.66} />
          <RadarRing delay={1.33} />
          <div
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full text-[28px]"
            style={{ background: `${ME_COLOR}14`, border: `2px solid ${ME_COLOR}66` }}
          >
            ⚔️
          </div>
        </div>

        <h2 className="m-0 mb-2 text-[22px] font-extrabold tracking-tight text-foreground">
          Finding your opponent{dots}
        </h2>

        {onlineCount !== null && (
          <p className="m-0 mb-10 text-[13px] text-foreground-subtle">
            {onlineCount > 0
              ? `${onlineCount} other player${onlineCount !== 1 ? "s" : ""} online`
              : "Waiting for another player to join"}
          </p>
        )}
        {onlineCount === null && (
          <p className="m-0 mb-10 text-[13px] text-foreground-subtle">Searching arena…</p>
        )}

        <button
          onClick={handleCancel}
          className="cursor-pointer rounded-lg border border-border-strong bg-transparent px-7 py-2.5 text-[13px] font-semibold text-foreground-subtle transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ── Phase: matched ────────────────────────────────────────
  if (phase === "matched") {
    return wrap(
      <>
        {/* white flash overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-20 bg-white"
          style={{ animation: "flash-bg 0.6s ease-out forwards" }}
        />

        <div className="z-10 flex flex-col items-center gap-12">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: ME_COLOR }}>
            Match Found!
          </p>

          {/* Players + sword */}
          <div className="flex items-center gap-12">
            {/* Me */}
            <div className="flex flex-col items-center gap-3" style={{ animation: "float-in-left 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
              <div style={{ animation: "glow-pulse 1.5s ease-in-out infinite" }}>
                <Avi name={myName} size={88} color={ME_COLOR} />
              </div>
              <span className="max-w-[110px] overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-foreground">
                {myName}
              </span>
              <span className="text-[11px] font-semibold" style={{ color: ME_COLOR }}>You</span>
            </div>

            {/* Sword */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-[52px]" style={{ animation: "sword-drop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both" }}>
                ⚔️
              </div>
              <div className="text-[28px] font-black tracking-[0.06em] text-foreground-subtle">
                VS
              </div>
              <div
                className="font-display text-[42px] font-black"
                style={{ color: ME_COLOR, fontVariantNumeric: "tabular-nums", textShadow: `0 0 30px ${ME_COLOR}80` }}
              >
                {countdown}
              </div>
            </div>

            {/* Opponent */}
            <div className="flex flex-col items-center gap-3" style={{ animation: "float-in-right 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
              <div style={{ animation: "glow-pulse 1.5s ease-in-out 0.75s infinite" }}>
                <Avi name={matchData?.opponentName ?? "?"} size={88} color={OPP_COLOR} />
              </div>
              <span className="max-w-[110px] overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-foreground">
                {matchData?.opponentName ?? "Opponent"}
              </span>
              <span className="text-[11px] font-semibold text-signal-ethics">Opponent</span>
            </div>
          </div>

          <p className="m-0 text-[13px] text-foreground-subtle">
            Match #{matchData?.matchId} — starting in {countdown}…
          </p>
        </div>
      </>
    );
  }

  // ── Phase: battle ─────────────────────────────────────────
  return wrap(
    <div
      className="z-10 flex flex-col items-center gap-6"
      style={{ animation: "battle-zoom 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
    >
      <div className="text-[64px]">⚔️</div>
      <h1
        className="m-0 font-display font-black tracking-tight text-foreground"
        style={{ fontSize: "clamp(36px, 7vw, 72px)", textShadow: `0 0 60px ${ME_COLOR}4d` }}
      >
        DUEL STARTS
      </h1>
      <div className="flex items-center gap-4">
        <span className="text-base font-bold" style={{ color: ME_COLOR }}>{myName}</span>
        <span className="text-[13px] text-foreground-subtle">vs</span>
        <span className="text-base font-bold text-signal-ethics">{matchData?.opponentName ?? "Opponent"}</span>
      </div>
      <div
        className="mt-2 rounded-[10px] px-8 py-4 text-center"
        style={{ background: `${ME_COLOR}14`, border: `1px solid ${ME_COLOR}33` }}
      >
        <p className="m-0 mb-1 text-sm text-foreground-muted">Match ID</p>
        <p className="m-0 font-mono text-[22px] font-extrabold" style={{ color: ME_COLOR }}>#{matchData?.matchId}</p>
      </div>
      <p className="mt-2 text-[13px] text-foreground-subtle">
        Full duel arena coming soon.
      </p>
      <button
        onClick={() => { window.location.href = `/live-battle/arena/${matchData?.matchId}`; }}
        className="mt-2 cursor-pointer border-none bg-transparent p-0 text-[13px] text-foreground-subtle underline"
      >
        Skip intro →
      </button>
    </div>
  );
}
