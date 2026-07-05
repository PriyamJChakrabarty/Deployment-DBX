"use client";

import { useEffect, useRef, useState } from "react";
import { COLORS, CATEGORY_COLORS } from "@/lib/theme";

// Team identity — Team 0 (mine) is brand, Team 1 (opponent) is Ethics cyan.
// Matches the TEAM_COLORS convention already shipped in home-client.js's RaidRow.
const TEAM_COLORS = [COLORS.brand, CATEGORY_COLORS.Ethics];

const KEYFRAMES = `
@keyframes radar-ring {
  0%   { transform: scale(0.4); opacity: 0.9; }
  100% { transform: scale(2.4); opacity: 0; }
}
@keyframes float-in {
  from { transform: translateY(20px) scale(0.85); opacity: 0; }
  to   { transform: translateY(0)    scale(1);    opacity: 1; }
}
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 0px rgba(255,176,32,0); }
  50%       { box-shadow: 0 0 28px rgba(255,176,32,0.45); }
}
@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.4); opacity: 0.4; }
  40%           { transform: scale(1);   opacity: 1; }
}
@keyframes shield-drop {
  0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
  60%  { transform: scale(1.2) rotate(4deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg);   opacity: 1; }
}
@keyframes flash-bg {
  0%   { opacity: 0; }
  25%  { opacity: 0.5; }
  100% { opacity: 0; }
}
`;

function Avi({ name, size = 64, color = "var(--signal-performance)", empty = false }) {
  return (
    <div
      className="flex flex-shrink-0 select-none items-center justify-center rounded-full font-black"
      style={{
        width: size, height: size,
        background: empty ? "var(--surface-2)" : `linear-gradient(135deg, ${color}30, ${color}08)`,
        border: `2px solid ${empty ? "var(--border-strong)" : `${color}60`}`,
        fontSize: size * 0.38,
        color: empty ? "var(--foreground-subtle)" : color,
      }}
    >
      {empty ? "?" : (name || "?")[0].toUpperCase()}
    </div>
  );
}

function RadarRing({ delay = 0 }) {
  return (
    <div
      className="pointer-events-none absolute rounded-full border-2 border-signal-performance/35"
      style={{
        width: "120px", height: "120px",
        animation: `radar-ring 2.2s ease-out ${delay}s infinite`,
      }}
    />
  );
}

function TeamSlot({ players, teamId, totalSlots = 2, label: labelOverride }) {
  const color = TEAM_COLORS[teamId];
  const label = labelOverride ?? (teamId === 0 ? "Team Alpha" : "Team Bravo");

  return (
    <div
      className="w-[200px] rounded-xl p-[14px_18px]"
      style={{ background: `${color}07`, border: `1px solid ${color}22` }}
    >
      <div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.1em]" style={{ color }}>
        {label}
      </div>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: totalSlots }).map((_, i) => {
          const p = players[i];
          return p ? (
            <div key={p.name} className="flex items-center gap-2" style={{ animation: "float-in 0.4s ease forwards" }}>
              <Avi name={p.name} size={32} color={color} />
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-bold text-foreground">
                {p.name}
              </span>
            </div>
          ) : (
            <div key={i} className="flex items-center gap-2">
              <Avi name="" size={32} empty />
              <span className="text-xs text-foreground-subtle">Searching…</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function RaidMatchmakingClient({ myName, myClerkId, teamGroupId = null, partnerName = null, teamName = null, onBack }) {
  const [phase,      setPhase]      = useState("searching"); // searching | matched
  const [matchData,  setMatchData]  = useState(null);
  const [countdown,  setCountdown]  = useState(3);
  const [onlineCount, setOnline]    = useState(null);
  const [dotFrame,   setDotFrame]   = useState(0);

  const pollRef  = useRef(null);
  const cdRef    = useRef(null);
  const sseRef   = useRef(null);
  const matchedRef = useRef(false); // prevent double-redirect from SSE + fallback poll racing

  useEffect(() => {
    fetch("/api/raid/queue/cancel", { method: "DELETE" }).catch(() => {});
  }, []);

  // ── Enqueue + SSE push + 10s fallback poll ──────────────────
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

    // 1. Enqueue immediately (and check for instant match)
    const enqueue = async () => {
      try {
        const r = await fetch("/api/raid/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamGroupId }),
        });
        if (!r.ok) return;
        const data = await r.json();
        if (data.teamCancelled) {
          clearInterval(pollRef.current);
          if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
          window.location.href = "/home";
          return;
        }
        if (data.matched) handleMatch(data);
      } catch {}
    };

    enqueue();

    // 2. SSE push — server notifies us the instant a match is created
    const sse = new EventSource("/api/raid/queue/events");
    sseRef.current = sse;
    sse.addEventListener("matched", (e) => {
      try { handleMatch(JSON.parse(e.data)); } catch {}
    });
    sse.onerror = () => {
      // SSE dropped — fallback poll will cover it
      sse.close();
      sseRef.current = null;
    };

    // 3. 10s fallback poll — catches rare SSE delivery gaps
    pollRef.current = setInterval(async () => {
      if (matchedRef.current) return;
      try {
        const r = await fetch("/api/raid/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamGroupId }),
        });
        if (!r.ok) return;
        const data = await r.json();
        if (data.teamCancelled) {
          clearInterval(pollRef.current);
          if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
          window.location.href = "/home";
          return;
        }
        if (data.matched) handleMatch(data);
      } catch {}
    }, 10000);

    return () => {
      clearInterval(pollRef.current);
      if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    };
  }, [phase]);

  // Online count
  useEffect(() => {
    if (phase !== "searching") return;
    fetch("/api/presence/online")
      .then((r) => r.json())
      .then((d) => setOnline(Array.isArray(d) ? d.length : 0))
      .catch(() => {});
  }, [phase]);

  // Animated dots
  useEffect(() => {
    if (phase !== "searching") return;
    const id = setInterval(() => setDotFrame((f) => (f + 1) % 4), 400);
    return () => clearInterval(id);
  }, [phase]);

  // Countdown → redirect to arena
  useEffect(() => {
    if (phase !== "matched" || !matchData?.matchId) return;
    setCountdown(3);
    cdRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(cdRef.current);
          const arenaUrl = teamName
            ? `/group-raid-page/arena/${matchData.matchId}?teamName=${encodeURIComponent(teamName)}`
            : `/group-raid-page/arena/${matchData.matchId}`;
          window.location.href = arenaUrl;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(cdRef.current);
  }, [phase, matchData?.matchId]);

  async function handleCancel() {
    clearInterval(pollRef.current);
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    try { await fetch("/api/raid/queue/cancel", { method: "DELETE" }); } catch {}
    window.location.href = "/home";
  }

  const dots = ".".repeat(dotFrame % 4);

  const wrap = (children) => (
    <>
      <style>{KEYFRAMES}</style>
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-background">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              "linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px)",
              "linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "48px 48px",
          }}
        />
        {children}
      </div>
    </>
  );

  // ── Searching ─────────────────────────────────────────────
  if (phase === "searching") {
    return wrap(
      <div className="z-10 flex flex-col items-center">
        <div className="relative mb-10 flex h-[120px] w-[120px] items-center justify-center">
          <RadarRing delay={0} />
          <RadarRing delay={0.73} />
          <RadarRing delay={1.46} />
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-signal-performance/40 bg-signal-performance/[0.08] text-[30px]">
            🛡️
          </div>
        </div>

        <h2 className="m-0 mb-1.5 text-[22px] font-extrabold tracking-tight text-foreground">
          {teamGroupId ? `Searching with ${partnerName ?? "teammate"}${dots}` : `Finding your squad${dots}`}
        </h2>
        <p className="m-0 mb-1.5 text-xs text-foreground-subtle">
          {teamGroupId ? "Need 2 opponents · Pre-formed team ready" : "Need 3 more players · 2v2 Group Raid"}
        </p>
        {onlineCount !== null && (
          <p className="m-0 mb-10 text-xs text-foreground-subtle">
            {onlineCount > 0
              ? `${onlineCount} player${onlineCount !== 1 ? "s" : ""} online`
              : "Waiting for players to join…"}
          </p>
        )}
        {onlineCount === null && (
          <p className="m-0 mb-10 text-xs text-foreground-subtle">Searching…</p>
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

  // ── Matched ───────────────────────────────────────────────
  // Build team display from matchData (server doesn't give names yet, just matchId)
  // Show "you + teammate" vs "opponents" — names fill in on arena load
  return wrap(
    <>
      <div
        className="pointer-events-none absolute inset-0 z-20 bg-white"
        style={{ animation: "flash-bg 0.5s ease-out forwards" }}
      />

      <div className="z-10 flex flex-col items-center gap-9">
        <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.12em] text-signal-performance">
          Squad Found!
        </p>

        <div className="text-[52px]" style={{ animation: "shield-drop 0.55s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" }}>
          🛡️
        </div>

        <div className="flex items-center gap-7">
          <TeamSlot
            teamId={0}
            players={teamGroupId && partnerName
              ? [{ name: myName }, { name: partnerName }]
              : [{ name: myName }]}
            totalSlots={2}
            label={teamName ?? undefined}
          />
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[22px] font-black tracking-[0.06em] text-foreground-subtle">
              VS
            </span>
            <div
              className="text-[38px] font-black text-signal-performance"
              style={{ fontVariantNumeric: "tabular-nums", textShadow: "0 0 24px rgba(255,176,32,0.5)" }}
            >
              {countdown}
            </div>
          </div>
          <TeamSlot teamId={1} players={[]} totalSlots={2} />
        </div>

        <p className="m-0 text-xs text-foreground-subtle">
          Match #{matchData?.matchId} — loading arena in {countdown}…
        </p>

        <button
          onClick={() => {
            const url = teamName
              ? `/group-raid-page/arena/${matchData?.matchId}?teamName=${encodeURIComponent(teamName)}`
              : `/group-raid-page/arena/${matchData?.matchId}`;
            window.location.href = url;
          }}
          className="cursor-pointer border-none bg-transparent p-0 text-xs text-foreground-subtle underline"
        >
          Skip →
        </button>
      </div>
    </>
  );
}
