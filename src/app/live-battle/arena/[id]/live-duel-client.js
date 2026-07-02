"use client";

import { useEffect, useRef, useState } from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/theme-monokai";

const CATEGORIES = [
  { key: "Security",        label: "Security",        icon: "🔒", color: "#ff5c5c" },
  { key: "Performance",     label: "Performance",     icon: "⚡", color: "#f5b942" },
  { key: "Scalability",     label: "Scalability",     icon: "📈", color: "#3ddc84" },
  { key: "Ethics",          label: "Ethics",          icon: "⚖️", color: "#22d3ee" },
  { key: "Maintainability", label: "Maintainability", icon: "🔧", color: "#a78bfa" },
];

const DUEL_KEYFRAMES = `
@keyframes duel-score-surge {
  0% { transform: scale(0.94) translateY(10px); box-shadow: 0 0 0 rgba(0,0,0,0); }
  35% { transform: scale(1.04) translateY(-4px); }
  100% { transform: scale(1) translateY(0); box-shadow: 0 24px 60px rgba(0,0,0,0.28); }
}
@keyframes duel-score-glow {
  0% { opacity: 0; transform: scale(0.85); }
  40% { opacity: 0.95; }
  100% { opacity: 0; transform: scale(1.18); }
}
@keyframes duel-score-delta {
  0% { opacity: 0; transform: translateY(12px) scale(0.85); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-22px) scale(1.02); }
}
@keyframes duel-scoreboard-sheen {
  0% { transform: translateX(-120%) skewX(-16deg); opacity: 0; }
  18% { opacity: 0.16; }
  100% { transform: translateX(220%) skewX(-16deg); opacity: 0; }
}
`;

function formatTime(secs) {
  if (secs <= 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function categoryLabel(idx) {
  return CATEGORIES[idx]?.label ?? "—";
}

// ── Main ──────────────────────────────────────────────────────
export default function LiveDuelClient({
  matchId, myClerkId, myName,
  initialCode, challengeSlot,
  vulnerabilities, matchMeta,
}) {
  const initMe  = matchMeta.me;
  const initOpp = matchMeta.opponent;

  // ── Editor state ───────────────────────────────────────────
  const [code, setCode] = useState(initialCode);

  // ── My progress ────────────────────────────────────────────
  const [catIdx,    setCatIdx]    = useState(initMe.categoryIndex);
  const [unlockedCatIdx, setUnlockedCatIdx] = useState(initMe.categoryIndex);
  const [catFixed,  setCatFixed]  = useState(() =>
    CATEGORIES.map((c) => (initMe.fixedCounts?.[c.key] ?? []))
  );
  const [myScore,   setMyScore]   = useState(initMe.score);
  const [selfDone,  setSelfDone]  = useState(initMe.status === "finished");

  // ── Opponent state (polls) ─────────────────────────────────
  const [opponent,  setOpponent]  = useState(initOpp);

  // ── Match state ────────────────────────────────────────────
  const [matchStatus,    setMatchStatus]    = useState(matchMeta.status);
  const [winnerClerkId,  setWinnerClerkId]  = useState(matchMeta.winnerClerkId ?? null);
  const [timeLeft,       setTimeLeft]       = useState(null);

  // ── UI state ───────────────────────────────────────────────
  const [checking,        setChecking]        = useState(false);
  const [advancing,       setAdvancing]       = useState(false);
  const [result,          setResult]          = useState(null);
  const [openHints,       setOpenHints]       = useState(new Set());
  const [surrenderConfirm, setSurrenderConfirm] = useState(false);
  const [surrendering,    setSurrendering]    = useState(false);
  const [scoreFx,         setScoreFx]         = useState({ me: 0, opponent: 0 });
  const [scoreDelta,      setScoreDelta]      = useState({ me: null, opponent: null });

  const pollRef         = useRef(null);
  const timerRef        = useRef(null);
  const latestUpdatedAt = useRef(null);
  const previousScores  = useRef({ me: initMe.score, opponent: initOpp?.score ?? 0 });
  const scoreTimerRef   = useRef({ me: null, opponent: null });

  const cat        = CATEGORIES[catIdx] ?? CATEGORIES[0];
  const vulns      = vulnerabilities[cat.key] ?? [];
  const fixedNow   = catFixed[catIdx] ?? [];
  const isLastCat  = unlockedCatIdx >= CATEGORIES.length - 1;
  const matchEnded = matchStatus === "completed" || matchStatus === "abandoned";
  const viewingEarlierCategory = catIdx < unlockedCatIdx;

  function triggerScoreFx(side, delta) {
    if (delta <= 0) return;

    if (scoreTimerRef.current[side]) {
      clearTimeout(scoreTimerRef.current[side]);
    }

    setScoreFx((prev) => ({ ...prev, [side]: prev[side] + 1 }));
    setScoreDelta((prev) => ({ ...prev, [side]: delta }));

    scoreTimerRef.current[side] = setTimeout(() => {
      setScoreDelta((prev) => ({ ...prev, [side]: null }));
      scoreTimerRef.current[side] = null;
    }, 950);
  }

  // ── Canonical snapshot apply ───────────────────────────────
  function applyMatchSnapshot(snapshot) {
    if (!snapshot) return;

    if (snapshot.updatedAt && latestUpdatedAt.current) {
      if (snapshot.updatedAt <= latestUpdatedAt.current) return;
    }
    if (snapshot.updatedAt) latestUpdatedAt.current = snapshot.updatedAt;

    if (snapshot.opponent) setOpponent(snapshot.opponent);

    if (snapshot.me) {
      setMyScore(snapshot.me.score);
      setSelfDone((prev) => prev || snapshot.me.status === "finished");
      if (typeof snapshot.me.categoryIndex === "number") {
        setUnlockedCatIdx((prev) => Math.max(prev, snapshot.me.categoryIndex));
        setCatIdx((prev) => Math.min(prev, Math.max(snapshot.me.categoryIndex, 0)));
      }
    }

    if (snapshot.status && snapshot.status !== "active") {
      setMatchStatus(snapshot.status);
      setWinnerClerkId(snapshot.winnerClerkId ?? null);
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
    }
  }

  useEffect(() => {
    const previousMe = previousScores.current.me;
    const previousOpponent = previousScores.current.opponent;
    const currentOpponent = opponent?.score ?? 0;

    if (myScore > previousMe) {
      triggerScoreFx("me", myScore - previousMe);
    }
    if (currentOpponent > previousOpponent) {
      triggerScoreFx("opponent", currentOpponent - previousOpponent);
    }

    previousScores.current = { me: myScore, opponent: currentOpponent };
  }, [myScore, opponent?.score]);

  useEffect(() => () => {
    Object.values(scoreTimerRef.current).forEach((timerId) => {
      if (timerId) clearTimeout(timerId);
    });
  }, []);

  // ── Timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (!matchMeta.endsAt) return;
    const endsAt = new Date(matchMeta.endsAt).getTime();

    const tick = () => {
      const diff = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setTimeLeft(diff);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Poll every 10s (SSE fallback) ─────────────────────────
  useEffect(() => {
    if (matchEnded) return;

    const poll = async () => {
      try {
        const r = await fetch(`/api/duel/match/${matchId}`);
        if (!r.ok) return;
        applyMatchSnapshot(await r.json());
      } catch {}
    };

    poll();
    pollRef.current = setInterval(poll, 10000);
    return () => clearInterval(pollRef.current);
  }, [matchEnded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SSE live updates ───────────────────────────────────────
  useEffect(() => {
    if (matchEnded) return;

    const es = new EventSource(`/api/duel/match/${matchId}/events`);
    es.addEventListener("snapshot", (event) => {
      try { applyMatchSnapshot(JSON.parse(event.data)); } catch {}
    });
    es.onerror = () => {};

    return () => es.close();
  }, [matchId, matchEnded]);

  // ── Auto-end when timer hits 0 ─────────────────────────────
  useEffect(() => {
    if (timeLeft === 0 && !matchEnded) {
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
      fetch(`/api/duel/match/${matchId}`)
        .then((r) => r.json())
        .then((d) => {
          applyMatchSnapshot(d);
          if (!d.status || d.status === "active") setMatchStatus("completed");
        })
        .catch(() => setMatchStatus("completed"));
    }
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Check code ─────────────────────────────────────────────
  async function handleCheck() {
    if (checking || matchEnded || selfDone) return;
    setChecking(true);
    setResult(null);
    const snapshotFixed = [...fixedNow];

    try {
      const res = await fetch(`/api/duel/match/${matchId}/submit`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userCode: code, categoryKey: cat.key, alreadyFixed: snapshotFixed }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Check failed.");

      const newFixed = payload.fixed ?? [];
      const merged   = [...new Set([...snapshotFixed, ...newFixed])];
      const newCount = merged.length - snapshotFixed.length;

      setCatFixed((prev) => {
        const next = [...prev];
        next[catIdx] = merged;
        return next;
      });
      setMyScore(payload.score);
      setResult({ newCount, totalFixed: merged.length, total: vulns.length });

      // Apply canonical server snapshot (syncs opponent score too)
      if (payload.snapshot) applyMatchSnapshot(payload.snapshot);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Check failed." });
    } finally {
      setChecking(false);
    }
  }

  // ── Advance category ───────────────────────────────────────
  async function handleNext() {
    if (viewingEarlierCategory) {
      setCatIdx((prev) => Math.min(unlockedCatIdx, prev + 1));
      setOpenHints(new Set());
      setResult(null);
      return;
    }
    if (advancing) return;
    setAdvancing(true);
    setResult(null);
    setOpenHints(new Set());

    try {
      const res = await fetch(`/api/duel/match/${matchId}/advance`, { method: "POST" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Advance failed.");

      if (payload.finished) {
        setSelfDone(true);
        if (payload.matchCompleted) {
          setMatchStatus("completed");
          setWinnerClerkId(payload.winnerClerkId ?? null);
          clearInterval(pollRef.current);
          clearInterval(timerRef.current);
        }
      } else {
        setUnlockedCatIdx(payload.categoryIndex);
        setCatIdx(payload.categoryIndex);
      }

      if (payload.snapshot) applyMatchSnapshot(payload.snapshot);
    } catch {}
    setAdvancing(false);
  }

  function handleToggleHint(idx) {
    setOpenHints((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function handlePrevious() {
    if (catIdx === 0) return;
    setCatIdx((prev) => Math.max(0, prev - 1));
    setResult(null);
    setOpenHints(new Set());
  }

  // ── Surrender ──────────────────────────────────────────────
  async function handleSurrender() {
    if (surrendering) return;
    setSurrendering(true);
    try {
      await fetch(`/api/duel/match/${matchId}/surrender`, { method: "POST" });
    } catch {}
    setSurrendering(false);
    setSurrenderConfirm(false);
  }

  // ── Derived ────────────────────────────────────────────────
  const timerColor = timeLeft !== null && timeLeft < 60 ? "#ff5c5c" : "#3ddc84";
  const didIWin    = winnerClerkId === myClerkId;
  const isDraw     = matchStatus === "completed" && !winnerClerkId;

  // ════════════════════════════════════════════════════════════
  // RENDER: end screen
  // ════════════════════════════════════════════════════════════
  if (matchEnded) {
    return (
      <div style={{
        height: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0d1117", fontFamily: "'Segoe UI','Aptos','Trebuchet MS',sans-serif",
        gap: "28px",
      }}>
        <div style={{ fontSize: "56px" }}>
          {matchStatus === "abandoned" ? "🔌" : didIWin ? "🏆" : isDraw ? "🤝" : "💀"}
        </div>

        <h1 style={{
          fontSize: "clamp(30px,5vw,52px)", fontWeight: 900,
          color: matchStatus === "abandoned" ? "#8ba0a6" : didIWin ? "#3ddc84" : isDraw ? "#f5b942" : "#ff5c5c",
          letterSpacing: "-0.03em", margin: 0,
          textShadow: didIWin ? "0 0 40px rgba(61,220,132,0.4)" : "none",
        }}>
          {matchStatus === "abandoned"
            ? "Opponent Disconnected"
            : didIWin ? "You Win!" : isDraw ? "Draw" : "You Lose"}
        </h1>

        {/* Score comparison */}
        <div style={{
          display: "flex", gap: "48px", alignItems: "center",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(201,214,218,0.1)",
          borderRadius: "14px", padding: "24px 40px",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#3ddc84", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>You</div>
            <div style={{ fontSize: "42px", fontWeight: 900, color: "#e8f0f3" }}>{myScore}</div>
            <div style={{ fontSize: "12px", color: "#4a6570", marginTop: "4px" }}>{myName}</div>
          </div>
          <div style={{ fontSize: "24px", color: "#4a6570", fontWeight: 900 }}>VS</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#22d3ee", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Opponent</div>
            <div style={{ fontSize: "42px", fontWeight: 900, color: "#e8f0f3" }}>{opponent?.score ?? 0}</div>
            <div style={{ fontSize: "12px", color: "#4a6570", marginTop: "4px" }}>{opponent?.displayName ?? "Opponent"}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => { window.location.href = "/live-battle"; }}
            style={{
              background: "#3ddc84", color: "#0d1a1f", border: "none",
              padding: "12px 32px", borderRadius: "8px",
              fontSize: "14px", fontWeight: 800, cursor: "pointer",
            }}
          >
            Play Again →
          </button>
          <button
            onClick={() => { window.location.href = "/home"; }}
            style={{
              background: "transparent", color: "#8ba0a6",
              border: "1px solid rgba(201,214,218,0.15)",
              padding: "12px 24px", borderRadius: "8px",
              fontSize: "14px", fontWeight: 600, cursor: "pointer",
            }}
          >
            Home
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: waiting for opponent (self finished)
  // ════════════════════════════════════════════════════════════
  const waitingOverlay = selfDone && !matchEnded;

  // ════════════════════════════════════════════════════════════
  // RENDER: main game
  // ════════════════════════════════════════════════════════════
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0d1117", color: "#c9d6da", fontFamily: "'Segoe UI','Aptos','Trebuchet MS',sans-serif" }}>
      <style>{DUEL_KEYFRAMES}</style>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "0 16px", height: "46px", flexShrink: 0,
        background: "rgba(10,20,25,0.97)",
        borderBottom: "1px solid rgba(61,220,132,0.1)",
      }}>
        {/* Logo */}
        <a href="/home" style={{ display: "flex", alignItems: "center", gap: "1px", textDecoration: "none", marginRight: "6px" }}>
          <span style={{ fontWeight: 900, fontSize: "14px", color: "#3ddc84", letterSpacing: "-0.02em" }}>Debug</span>
          <span style={{ fontWeight: 900, fontSize: "14px", color: "#e8f0f3", letterSpacing: "-0.02em" }}>Battle</span>
        </a>

        <span style={{
          fontSize: "10px", fontWeight: 700, color: "#ff5c5c",
          background: "rgba(255,92,92,0.1)", border: "1px solid rgba(255,92,92,0.3)",
          padding: "2px 10px", borderRadius: "999px", letterSpacing: "0.08em",
        }}>
          LIVE DUEL
        </span>

        {/* My score */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "8px" }}>
          <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#3ddc84" }} />
          <span style={{ fontSize: "12px", color: "#8ba0a6" }}>{myName}</span>
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#3ddc84" }}>{myScore}pts</span>
          <span style={{ fontSize: "11px", color: "#4a6570" }}>· {cat.label}</span>
        </div>

        {/* VS */}
        <span style={{ fontSize: "11px", color: "#4a6570", marginLeft: "4px" }}>vs</span>

        {/* Opponent score */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22d3ee" }} />
          <span style={{ fontSize: "12px", color: "#8ba0a6" }}>{opponent?.displayName ?? "Opponent"}</span>
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#22d3ee" }}>{opponent?.score ?? 0}pts</span>
          <span style={{ fontSize: "11px", color: "#4a6570" }}>· {categoryLabel(opponent?.categoryIndex ?? 0)}</span>
          {opponent?.status === "finished" && (
            <span style={{ fontSize: "10px", color: "#f5b942", fontWeight: 700 }}>✓ done</span>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Surrender */}
        {!surrenderConfirm ? (
          <button
            onClick={() => setSurrenderConfirm(true)}
            style={{
              background: "transparent", border: "1px solid rgba(255,92,92,0.3)",
              color: "#ff5c5c", cursor: "pointer",
              padding: "3px 12px", borderRadius: "6px",
              fontSize: "11px", fontWeight: 700,
            }}
          >
            Surrender
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "#ff5c5c", fontWeight: 700 }}>Give up?</span>
            <button
              onClick={handleSurrender}
              disabled={surrendering}
              style={{
                background: "#ff5c5c", color: "#0d1117", border: "none",
                padding: "3px 10px", borderRadius: "5px",
                fontSize: "11px", fontWeight: 800, cursor: surrendering ? "not-allowed" : "pointer",
                opacity: surrendering ? 0.6 : 1,
              }}
            >
              {surrendering ? "…" : "Yes, lose"}
            </button>
            <button
              onClick={() => setSurrenderConfirm(false)}
              style={{
                background: "transparent", border: "1px solid rgba(201,214,218,0.15)",
                color: "#8ba0a6", cursor: "pointer",
                padding: "3px 10px", borderRadius: "5px",
                fontSize: "11px", fontWeight: 600,
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Timer */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#4a6570" }}>⏱</span>
          <span style={{ fontSize: "15px", fontWeight: 800, color: timerColor, fontVariantNumeric: "tabular-nums" }}>
            {timeLeft !== null ? formatTime(timeLeft) : "—"}
          </span>
        </div>

        {/* Match ID */}
        <span style={{ fontSize: "10px", color: "#2a3a40", marginLeft: "8px" }}>#{matchId}</span>
      </div>

      {/* ── Two-panel body ──────────────────────────────────── */}
      <div style={{
        position: "relative",
        padding: "16px 18px 18px",
        background: "radial-gradient(circle at top, rgba(61,220,132,0.16), transparent 38%), linear-gradient(135deg, #0d1620 0%, #0b1118 58%, #091015 100%)",
        borderBottom: "1px solid rgba(201,214,218,0.08)",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        <div
          key={`scoreboard-sheen-${scoreFx.me}-${scoreFx.opponent}`}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: "linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.16) 48%, transparent 100%)",
            animation: "duel-scoreboard-sheen 1200ms ease-out",
          }}
        />

        <div style={{ display: "flex", alignItems: "stretch", gap: "14px", position: "relative", zIndex: 1 }}>
          <div
            key={`me-score-${scoreFx.me}`}
            style={{
              position: "relative",
              flex: 1,
              borderRadius: "22px",
              padding: "18px 20px",
              background: "linear-gradient(155deg, rgba(61,220,132,0.18), rgba(8,22,18,0.88))",
              border: "1px solid rgba(61,220,132,0.28)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
              animation: scoreFx.me ? "duel-score-surge 760ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
              overflow: "hidden",
            }}
          >
            {scoreDelta.me !== null && (
              <div
                key={`me-delta-${scoreFx.me}`}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "18px",
                  color: "#7cffb1",
                  fontSize: "14px",
                  fontWeight: 900,
                  letterSpacing: "0.04em",
                  animation: "duel-score-delta 900ms ease-out forwards",
                }}
              >
                +{scoreDelta.me}
              </div>
            )}
            <div
              key={`me-glow-${scoreFx.me}`}
              style={{
                position: "absolute",
                inset: "-22%",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(124,255,177,0.32) 0%, transparent 62%)",
                pointerEvents: "none",
                animation: scoreFx.me ? "duel-score-glow 760ms ease-out" : undefined,
              }}
            />
            <div style={{ fontSize: "11px", color: "#8fe8b2", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: "10px" }}>
              You
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span style={{ fontSize: "60px", fontWeight: 900, color: "#e8fff1", letterSpacing: "-0.06em", lineHeight: 0.95 }}>
                {myScore}
              </span>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#8fe8b2" }}>PTS</span>
            </div>
            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "#e8f0f3" }}>{myName}</span>
              <span style={{ fontSize: "11px", color: "#8ba0a6" }}>Current: {cat.label}</span>
            </div>
          </div>

          <div style={{
            width: "124px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "22px",
            background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            border: "1px solid rgba(201,214,218,0.08)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
            <div style={{ fontSize: "11px", color: "#4a6570", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "8px" }}>
              Duel
            </div>
            <div style={{ fontSize: "30px", fontWeight: 900, color: "#c9d6da", letterSpacing: "-0.08em", lineHeight: 1 }}>
              VS
            </div>
            <div style={{ marginTop: "8px", fontSize: "10px", color: timerColor, fontWeight: 800, letterSpacing: "0.1em" }}>
              {timeLeft !== null ? formatTime(timeLeft) : "—"}
            </div>
          </div>

          <div
            key={`opponent-score-${scoreFx.opponent}`}
            style={{
              position: "relative",
              flex: 1,
              borderRadius: "22px",
              padding: "18px 20px",
              background: "linear-gradient(155deg, rgba(34,211,238,0.16), rgba(8,16,24,0.88))",
              border: "1px solid rgba(34,211,238,0.26)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
              animation: scoreFx.opponent ? "duel-score-surge 760ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
              overflow: "hidden",
            }}
          >
            {scoreDelta.opponent !== null && (
              <div
                key={`opponent-delta-${scoreFx.opponent}`}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "18px",
                  color: "#7ceeff",
                  fontSize: "14px",
                  fontWeight: 900,
                  letterSpacing: "0.04em",
                  animation: "duel-score-delta 900ms ease-out forwards",
                }}
              >
                +{scoreDelta.opponent}
              </div>
            )}
            <div
              key={`opponent-glow-${scoreFx.opponent}`}
              style={{
                position: "absolute",
                inset: "-22%",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(124,238,255,0.3) 0%, transparent 62%)",
                pointerEvents: "none",
                animation: scoreFx.opponent ? "duel-score-glow 760ms ease-out" : undefined,
              }}
            />
            <div style={{ fontSize: "11px", color: "#84effe", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: "10px" }}>
              Opponent
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span style={{ fontSize: "60px", fontWeight: 900, color: "#f2fcff", letterSpacing: "-0.06em", lineHeight: 0.95 }}>
                {opponent?.score ?? 0}
              </span>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#84effe" }}>PTS</span>
            </div>
            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "#e8f0f3" }}>{opponent?.displayName ?? "Opponent"}</span>
              <span style={{ fontSize: "11px", color: "#8ba0a6" }}>
                {opponent?.status === "finished" ? "Done ✓" : `Current: ${categoryLabel(opponent?.categoryIndex ?? 0)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>

        {/* Left — code editor */}
        <div style={{ width: "60%", display: "flex", flexDirection: "column" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "6px 12px", background: "#161b22",
            borderBottom: "1px solid #21262d", borderRight: "1px solid #21262d", flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={handleCheck}
              disabled={checking || selfDone}
              style={{
                background: checking || selfDone ? "#161b22" : "#16450a",
                color: checking || selfDone ? "#484f58" : "#3fb950",
                border: `1px solid ${checking || selfDone ? "#484f58" : "#3fb950"}`,
                padding: "4px 16px", borderRadius: "5px",
                fontSize: "12px", fontWeight: 700,
                cursor: checking || selfDone ? "not-allowed" : "pointer",
                opacity: checking ? 0.7 : 1,
              }}
            >
              {checking ? "Checking…" : selfDone ? "Finished" : "✓ Check"}
            </button>
            {!selfDone && (
              <span style={{ fontSize: "11px", color: "#484f58" }}>
                {cat.icon} {cat.label} · {fixedNow.length} / {vulns.length} fixed
              </span>
            )}
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "#484f58" }}>
              {challengeSlot} · C++
            </span>
          </div>

          <AceEditor
            mode="c_cpp"
            theme="monokai"
            name="live-duel-editor"
            value={code}
            onChange={setCode}
            width="100%"
            height="100%"
            fontSize={13}
            readOnly={selfDone}
            setOptions={{ useWorker: false, showLineNumbers: true, tabSize: 2 }}
          />
        </div>

        {/* Right — opponent board + category panel */}
        <div style={{
          width: "40%", display: "flex", flexDirection: "column",
          borderLeft: "1px solid #21262d", background: "#161b22", overflow: "hidden",
        }}>

          {/* Opponent board */}
          <div style={{
            padding: "10px 14px", borderBottom: "1px solid #21262d", flexShrink: 0,
            background: "rgba(34,211,238,0.03)",
          }}>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "#22d3ee", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>
              Opponent
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "50%",
                  background: "rgba(34,211,238,0.1)", border: "1.5px solid rgba(34,211,238,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: 900, color: "#22d3ee",
                }}>
                  {(opponent?.displayName ?? "?")[0].toUpperCase()}
                </div>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#e8f0f3" }}>
                  {opponent?.displayName ?? "Opponent"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "16px", marginLeft: "auto" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#22d3ee" }}>{opponent?.score ?? 0}</div>
                  <div style={{ fontSize: "9px", color: "#4a6570", textTransform: "uppercase", letterSpacing: "0.08em" }}>Score</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#e8f0f3" }}>
                    {opponent?.status === "finished" ? "Done ✓" : categoryLabel(opponent?.categoryIndex ?? 0)}
                  </div>
                  <div style={{ fontSize: "9px", color: "#4a6570", textTransform: "uppercase", letterSpacing: "0.08em" }}>Category</div>
                </div>
              </div>
            </div>
          </div>

          {/* Self-done waiting state */}
          {waitingOverlay ? (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "16px", padding: "24px",
            }}>
              <div style={{ fontSize: "32px" }}>⏳</div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#e8f0f3", margin: 0 }}>
                You finished all categories!
              </p>
              <p style={{ fontSize: "12px", color: "#4a6570", margin: 0, textAlign: "center" }}>
                Waiting for opponent to finish…
              </p>
              <div style={{
                background: "rgba(61,220,132,0.06)", border: "1px solid rgba(61,220,132,0.15)",
                borderRadius: "8px", padding: "12px 20px", textAlign: "center",
              }}>
                <div style={{ fontSize: "10px", color: "#4a6570", marginBottom: "4px" }}>Your final score</div>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "#3ddc84" }}>{myScore}</div>
              </div>
            </div>
          ) : (
            /* Category panel */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* Category header */}
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #21262d", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#e8f0f3" }}>
                      {cat.icon} {cat.label}
                    </div>
                    <div style={{ fontSize: "10px", color: viewingEarlierCategory ? "#f5b942" : "#4a6570", marginTop: "3px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {viewingEarlierCategory ? "Reviewing previous category" : "Live category"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: fixedNow.length === vulns.length ? "#3fb950" : "#58a6ff",
                      background: "#0d1117",
                      padding: "3px 10px",
                      borderRadius: "999px",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}>
                      {fixedNow.length} / {vulns.length}
                    </span>
                    <button
                      type="button"
                      onClick={handlePrevious}
                      disabled={catIdx === 0 || advancing}
                      style={{
                        background: catIdx === 0 || advancing ? "#11161d" : "#1d2630",
                        color: catIdx === 0 || advancing ? "#55626d" : "#c9d6da",
                        border: "1px solid rgba(201,214,218,0.12)",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        cursor: catIdx === 0 || advancing ? "not-allowed" : "pointer",
                        fontSize: "12px",
                        fontWeight: 700,
                        opacity: catIdx === 0 || advancing ? 0.65 : 1,
                      }}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={advancing}
                      style={{
                        background: "linear-gradient(135deg, #ff5c5c, #e94560)",
                        color: "#fff",
                        border: "none",
                        padding: "6px 14px",
                        borderRadius: "8px",
                        cursor: advancing ? "not-allowed" : "pointer",
                        fontSize: "12px",
                        fontWeight: 800,
                        opacity: advancing ? 0.6 : 1,
                        boxShadow: advancing ? "none" : "0 12px 24px rgba(233,69,96,0.25)",
                      }}
                    >
                      {viewingEarlierCategory ? "Next" : isLastCat ? "Finish" : "Next"}
                    </button>
                  </div>
                </div>

                {/* Progress dots */}
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  {CATEGORIES.map((c, i) => (
                    <div
                      key={c.key}
                      style={{
                        flex: 1,
                        height: i === catIdx ? "8px" : "4px",
                        borderRadius: "999px",
                        background: i < unlockedCatIdx ? "#3ddc84" : i === unlockedCatIdx ? c.color : "#21262d",
                        boxShadow: i === catIdx ? `0 0 0 1px ${c.color}55, 0 0 18px ${c.color}44` : "none",
                        transition: "all 180ms ease",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Check result banner */}
              {result && (
                <div style={{
                  margin: "8px 14px 0", padding: "7px 12px", borderRadius: "7px",
                  fontSize: "12px", lineHeight: 1.5, flexShrink: 0,
                  background: result.error ? "#3b0d0d" : result.newCount > 0 ? "#0a2d0a" : "#1a1a0a",
                  border: `1px solid ${result.error ? "#6e1414" : result.newCount > 0 ? "#3fb950" : "#4a5a0a"}`,
                  color: result.error ? "#fca5a5" : result.newCount > 0 ? "#3fb950" : "#d29922",
                }}>
                  {result.error
                    ? result.error
                    : result.newCount > 0
                    ? `Fixed ${result.newCount} new issue${result.newCount !== 1 ? "s" : ""}! Score: ${result.totalFixed} / ${result.total}`
                    : `No new fixes detected. Score: ${result.totalFixed} / ${result.total} — keep going!`}
                </div>
              )}

              {/* Vulnerability list */}
              <div style={{ flex: 1, overflowY: "auto", paddingTop: "6px" }}>
                <p style={{
                  margin: "4px 14px 6px", fontSize: "10px", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.12em", color: "#484f58",
                }}>
                  Vulnerabilities to fix
                </p>
                {vulns.map((vuln, i) => (
                  <VulnItem
                    key={i}
                    vuln={vuln}
                    index={i}
                    fixed={fixedNow.includes(i)}
                    hintOpen={openHints.has(i)}
                    onToggleHint={handleToggleHint}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Vuln item ─────────────────────────────────────────────────
function VulnItem({ vuln, index, fixed, hintOpen, onToggleHint }) {
  return (
    <div style={{
      padding: "10px 14px", borderBottom: "1px solid #21262d",
      background: fixed ? "#071a07" : "transparent", transition: "background 0.2s",
    }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <div style={{
          width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0, marginTop: "2px",
          border: fixed ? "none" : "2px solid #484f58",
          background: fixed ? "#3fb950" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {fixed && <span style={{ color: "#fff", fontSize: "10px", lineHeight: 1 }}>✓</span>}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 5px", fontSize: "11.5px", lineHeight: 1.65, color: fixed ? "#3fb950" : "#c9d1d9" }}>
            {vuln.Description}
          </p>
          <button
            type="button"
            onClick={() => onToggleHint(index)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "#58a6ff", padding: 0, textDecoration: "underline" }}
          >
            {hintOpen ? "Hide hint" : "Show hint"}
          </button>
          {hintOpen && (
            <p style={{ margin: "5px 0 0", fontSize: "11px", lineHeight: 1.55, color: "#d29922", fontStyle: "italic" }}>
              {vuln.Hint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
