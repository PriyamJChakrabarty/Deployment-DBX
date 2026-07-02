"use client";

import { useEffect, useRef, useState } from "react";

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
  0%, 100% { box-shadow: 0 0 0px rgba(61,220,132,0); }
  50%       { box-shadow: 0 0 40px rgba(61,220,132,0.5); }
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

function Avi({ name, size = 80, color = "#3ddc84" }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${color}30, ${color}08)`,
      border: `3px solid ${color}60`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 900, color,
      userSelect: "none",
    }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

function RadarRing({ delay = 0 }) {
  return (
    <div style={{
      position: "absolute",
      width: "120px", height: "120px", borderRadius: "50%",
      border: "2px solid rgba(61,220,132,0.4)",
      animation: `radar-ring 2s ease-out ${delay}s infinite`,
      pointerEvents: "none",
    }} />
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
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0d1a1f", position: "relative", overflow: "hidden",
        minHeight: 0,
      }}>
        {/* subtle grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: [
            "linear-gradient(rgba(201,214,218,0.03) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(201,214,218,0.03) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "44px 44px",
        }} />
        {children}
      </div>
    </>
  );

  // ── Phase: checking ────────────────────────────────────────
  if (phase === "checking") {
    return wrap(
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: "10px", height: "10px", borderRadius: "50%", background: "#3ddc84",
            animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    );
  }

  // ── Phase: searching ──────────────────────────────────────
  if (phase === "searching") {
    return wrap(
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0", zIndex: 1 }}>
        {/* Radar rings */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "120px", height: "120px", marginBottom: "40px" }}>
          <RadarRing delay={0} />
          <RadarRing delay={0.66} />
          <RadarRing delay={1.33} />
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "rgba(61,220,132,0.08)",
            border: "2px solid rgba(61,220,132,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "28px",
          }}>
            ⚔️
          </div>
        </div>

        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#e8f0f3", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          Finding your opponent{dots}
        </h2>

        {onlineCount !== null && (
          <p style={{ fontSize: "13px", color: "#4a6570", margin: "0 0 40px" }}>
            {onlineCount > 0
              ? `${onlineCount} other player${onlineCount !== 1 ? "s" : ""} online`
              : "Waiting for another player to join"}
          </p>
        )}
        {onlineCount === null && (
          <p style={{ fontSize: "13px", color: "#4a6570", margin: "0 0 40px" }}>Searching arena…</p>
        )}

        <button
          onClick={handleCancel}
          style={{
            background: "transparent",
            border: "1px solid rgba(201,214,218,0.15)",
            color: "#4a6570", cursor: "pointer",
            padding: "9px 28px", borderRadius: "8px",
            fontSize: "13px", fontWeight: 600,
            transition: "color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#e8f0f3"; e.currentTarget.style.borderColor = "rgba(201,214,218,0.35)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#4a6570"; e.currentTarget.style.borderColor = "rgba(201,214,218,0.15)"; }}
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
        <div style={{
          position: "absolute", inset: 0,
          background: "white",
          animation: "flash-bg 0.6s ease-out forwards",
          pointerEvents: "none", zIndex: 2,
        }} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "48px", zIndex: 1 }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#3ddc84", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
            Match Found!
          </p>

          {/* Players + sword */}
          <div style={{ display: "flex", alignItems: "center", gap: "48px" }}>
            {/* Me */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", animation: "float-in-left 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
              <div style={{ animation: "glow-pulse 1.5s ease-in-out infinite" }}>
                <Avi name={myName} size={88} color="#3ddc84" />
              </div>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#e8f0f3", maxWidth: "110px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {myName}
              </span>
              <span style={{ fontSize: "11px", color: "#3ddc84", fontWeight: 600 }}>You</span>
            </div>

            {/* Sword */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div style={{ fontSize: "52px", animation: "sword-drop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both" }}>
                ⚔️
              </div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: "rgba(201,214,218,0.15)", letterSpacing: "0.06em" }}>
                VS
              </div>
              <div style={{
                fontSize: "42px", fontWeight: 900, color: "#3ddc84",
                fontVariantNumeric: "tabular-nums",
                textShadow: "0 0 30px rgba(61,220,132,0.5)",
              }}>
                {countdown}
              </div>
            </div>

            {/* Opponent */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", animation: "float-in-right 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
              <div style={{ animation: "glow-pulse 1.5s ease-in-out 0.75s infinite" }}>
                <Avi name={matchData?.opponentName ?? "?"} size={88} color="#22d3ee" />
              </div>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#e8f0f3", maxWidth: "110px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {matchData?.opponentName ?? "Opponent"}
              </span>
              <span style={{ fontSize: "11px", color: "#22d3ee", fontWeight: 600 }}>Opponent</span>
            </div>
          </div>

          <p style={{ fontSize: "13px", color: "#4a6570", margin: 0 }}>
            Match #{matchData?.matchId} — starting in {countdown}…
          </p>
        </div>
      </>
    );
  }

  // ── Phase: battle ─────────────────────────────────────────
  return wrap(
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", animation: "battle-zoom 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards", zIndex: 1 }}>
      <div style={{ fontSize: "64px" }}>⚔️</div>
      <h1 style={{
        fontSize: "clamp(36px, 7vw, 72px)",
        fontWeight: 900, letterSpacing: "-0.03em",
        color: "#e8f0f3",
        margin: 0,
        textShadow: "0 0 60px rgba(61,220,132,0.3)",
      }}>
        DUEL STARTS
      </h1>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{ fontSize: "16px", fontWeight: 700, color: "#3ddc84" }}>{myName}</span>
        <span style={{ fontSize: "13px", color: "#4a6570" }}>vs</span>
        <span style={{ fontSize: "16px", fontWeight: 700, color: "#22d3ee" }}>{matchData?.opponentName ?? "Opponent"}</span>
      </div>
      <div style={{
        background: "rgba(61,220,132,0.08)",
        border: "1px solid rgba(61,220,132,0.2)",
        borderRadius: "10px",
        padding: "16px 32px",
        textAlign: "center",
        marginTop: "8px",
      }}>
        <p style={{ color: "#8ba0a6", fontSize: "14px", margin: "0 0 4px" }}>Match ID</p>
        <p style={{ color: "#3ddc84", fontSize: "22px", fontWeight: 800, margin: 0 }}>#{matchData?.matchId}</p>
      </div>
      <p style={{ fontSize: "13px", color: "#4a6570", margin: "8px 0 0" }}>
        Full duel arena coming soon.
      </p>
      <button
        onClick={() => { window.location.href = `/live-battle/arena/${matchData?.matchId}`; }}
        style={{
          marginTop: "8px", fontSize: "13px", color: "#4a6570",
          textDecoration: "underline", cursor: "pointer",
          background: "none", border: "none", padding: 0,
        }}
      >
        Skip intro →
      </button>
    </div>
  );
}
