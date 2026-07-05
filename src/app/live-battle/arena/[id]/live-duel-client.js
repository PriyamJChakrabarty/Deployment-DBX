"use client";

import { useEffect, useRef, useState } from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/theme-monokai";
import { CATEGORIES, RESULT_COLORS, CATEGORY_COLORS } from "@/lib/theme";

// "Me" reuses the same win-green identity color the dashboard's duel history
// rows use for "You"; "Opponent" reuses the Ethics signal cyan — matches the
// convention already shipped in home-client.js's DuelRow.
const ME_COLOR  = RESULT_COLORS.win;
const OPP_COLOR = CATEGORY_COLORS.Ethics;

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
  const timerColor = timeLeft !== null && timeLeft < 60 ? "var(--signal-security)" : ME_COLOR;
  const didIWin    = winnerClerkId === myClerkId;
  const isDraw     = matchStatus === "completed" && !winnerClerkId;

  // ════════════════════════════════════════════════════════════
  // RENDER: end screen
  // ════════════════════════════════════════════════════════════
  if (matchEnded) {
    const resultColor = matchStatus === "abandoned"
      ? "var(--foreground-subtle)"
      : didIWin ? RESULT_COLORS.win : isDraw ? RESULT_COLORS.draw : RESULT_COLORS.loss;

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-7 bg-background font-sans">
        <div className="text-[56px]">
          {matchStatus === "abandoned" ? "🔌" : didIWin ? "🏆" : isDraw ? "🤝" : "💀"}
        </div>

        <h1
          className="m-0 font-display font-black tracking-tight"
          style={{
            fontSize: "clamp(30px,5vw,52px)",
            color: resultColor,
            textShadow: didIWin ? `0 0 40px ${RESULT_COLORS.win}66` : "none",
          }}
        >
          {matchStatus === "abandoned"
            ? "Opponent Disconnected"
            : didIWin ? "You Win!" : isDraw ? "Draw" : "You Lose"}
        </h1>

        {/* Score comparison */}
        <div className="flex items-center gap-12 rounded-2xl border border-border bg-surface px-10 py-6">
          <div className="text-center">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: ME_COLOR }}>You</div>
            <div className="text-[42px] font-black text-foreground">{myScore}</div>
            <div className="mt-1 text-xs text-foreground-subtle">{myName}</div>
          </div>
          <div className="text-2xl font-black text-foreground-subtle">VS</div>
          <div className="text-center">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-signal-ethics">Opponent</div>
            <div className="text-[42px] font-black text-foreground">{opponent?.score ?? 0}</div>
            <div className="mt-1 text-xs text-foreground-subtle">{opponent?.displayName ?? "Opponent"}</div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { window.location.href = "/live-battle"; }}
            className="cursor-pointer rounded-lg border-none px-8 py-3 text-sm font-extrabold"
            style={{ background: ME_COLOR, color: "var(--background)" }}
          >
            Play Again →
          </button>
          <button
            onClick={() => { window.location.href = "/home"; }}
            className="cursor-pointer rounded-lg border border-border-strong bg-transparent px-6 py-3 text-sm font-semibold text-foreground-muted"
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
    <div className="flex h-screen flex-col bg-background font-sans text-foreground-muted">
      <style>{DUEL_KEYFRAMES}</style>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div
        className="flex h-[46px] flex-shrink-0 items-center gap-3 px-4"
        style={{ background: "color-mix(in oklab, var(--background) 97%, transparent)", borderBottom: `1px solid ${ME_COLOR}1a` }}
      >
        {/* Logo */}
        <a href="/home" className="mr-1.5 flex items-center gap-px no-underline">
          <span className="font-display text-sm font-black tracking-tight" style={{ color: ME_COLOR }}>Debug</span>
          <span className="font-display text-sm font-black tracking-tight text-foreground">Battle</span>
        </a>

        <span className="rounded-full border border-signal-security/30 bg-signal-security/10 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.08em] text-signal-security">
          LIVE DUEL
        </span>

        {/* My score */}
        <div className="ml-2 flex items-center gap-1.5">
          <div className="h-[7px] w-[7px] rounded-full" style={{ background: ME_COLOR }} />
          <span className="text-xs text-foreground-muted">{myName}</span>
          <span className="text-sm font-extrabold" style={{ color: ME_COLOR }}>{myScore}pts</span>
          <span className="text-[11px] text-foreground-subtle">· {cat.label}</span>
        </div>

        {/* VS */}
        <span className="ml-1 text-[11px] text-foreground-subtle">vs</span>

        {/* Opponent score */}
        <div className="flex items-center gap-1.5">
          <div className="h-[7px] w-[7px] rounded-full bg-signal-ethics" />
          <span className="text-xs text-foreground-muted">{opponent?.displayName ?? "Opponent"}</span>
          <span className="text-sm font-extrabold text-signal-ethics">{opponent?.score ?? 0}pts</span>
          <span className="text-[11px] text-foreground-subtle">· {categoryLabel(opponent?.categoryIndex ?? 0)}</span>
          {opponent?.status === "finished" && (
            <span className="text-[10px] font-bold text-signal-performance">✓ done</span>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Surrender */}
        {!surrenderConfirm ? (
          <button
            onClick={() => setSurrenderConfirm(true)}
            className="cursor-pointer rounded-md border border-signal-security/30 bg-transparent px-3 py-[3px] text-[11px] font-bold text-signal-security"
          >
            Surrender
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-signal-security">Give up?</span>
            <button
              onClick={handleSurrender}
              disabled={surrendering}
              className="rounded-md border-none bg-signal-security px-2.5 py-[3px] text-[11px] font-extrabold text-background"
              style={{ cursor: surrendering ? "not-allowed" : "pointer", opacity: surrendering ? 0.6 : 1 }}
            >
              {surrendering ? "…" : "Yes, lose"}
            </button>
            <button
              onClick={() => setSurrenderConfirm(false)}
              className="cursor-pointer rounded-md border border-border-strong bg-transparent px-2.5 py-[3px] text-[11px] font-semibold text-foreground-muted"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Timer */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-foreground-subtle">⏱</span>
          <span className="font-mono text-[15px] font-extrabold" style={{ color: timerColor, fontVariantNumeric: "tabular-nums" }}>
            {timeLeft !== null ? formatTime(timeLeft) : "—"}
          </span>
        </div>

        {/* Match ID */}
        <span className="ml-2 font-mono text-[10px] text-foreground-subtle">#{matchId}</span>
      </div>

      {/* ── Two-panel body ──────────────────────────────────── */}
      <div
        className="relative flex-shrink-0 overflow-hidden border-b border-border px-[18px] pb-[18px] pt-4"
        style={{
          background: `radial-gradient(circle at top, ${ME_COLOR}29, transparent 38%), linear-gradient(135deg, var(--surface) 0%, var(--background) 58%, var(--background) 100%)`,
        }}
      >
        <div
          key={`scoreboard-sheen-${scoreFx.me}-${scoreFx.opponent}`}
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.16) 48%, transparent 100%)",
            animation: "duel-scoreboard-sheen 1200ms ease-out",
          }}
        />

        <div className="relative z-10 flex items-stretch gap-3.5">
          <div
            key={`me-score-${scoreFx.me}`}
            className="relative flex-1 overflow-hidden rounded-[22px] p-5"
            style={{
              background: `linear-gradient(155deg, ${ME_COLOR}2e, color-mix(in oklab, var(--background) 88%, transparent))`,
              border: `1px solid ${ME_COLOR}48`,
              boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
              animation: scoreFx.me ? "duel-score-surge 760ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
            }}
          >
            {scoreDelta.me !== null && (
              <div
                key={`me-delta-${scoreFx.me}`}
                className="absolute right-[18px] top-4 text-sm font-black tracking-[0.04em]"
                style={{ color: ME_COLOR, animation: "duel-score-delta 900ms ease-out forwards" }}
              >
                +{scoreDelta.me}
              </div>
            )}
            <div
              key={`me-glow-${scoreFx.me}`}
              className="pointer-events-none absolute rounded-full"
              style={{
                inset: "-22%",
                background: `radial-gradient(circle, ${ME_COLOR}52 0%, transparent 62%)`,
                animation: scoreFx.me ? "duel-score-glow 760ms ease-out" : undefined,
              }}
            />
            <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: ME_COLOR }}>
              You
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-[60px] font-black leading-[0.95] tracking-[-0.06em] text-foreground">
                {myScore}
              </span>
              <span className="text-[15px] font-bold" style={{ color: ME_COLOR }}>PTS</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <span className="text-[15px] font-extrabold text-foreground">{myName}</span>
              <span className="text-[11px] text-foreground-muted">Current: {cat.label}</span>
            </div>
          </div>

          <div className="flex w-[124px] flex-col items-center justify-center rounded-[22px] border border-border bg-surface-2/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-foreground-subtle">
              Duel
            </div>
            <div className="text-[30px] font-black leading-none tracking-[-0.08em] text-foreground-muted">
              VS
            </div>
            <div className="mt-2 text-[10px] font-extrabold tracking-[0.1em]" style={{ color: timerColor }}>
              {timeLeft !== null ? formatTime(timeLeft) : "—"}
            </div>
          </div>

          <div
            key={`opponent-score-${scoreFx.opponent}`}
            className="relative flex-1 overflow-hidden rounded-[22px] border border-signal-ethics/25 p-5"
            style={{
              background: "linear-gradient(155deg, rgba(34,211,238,0.16), color-mix(in oklab, var(--background) 88%, transparent))",
              boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
              animation: scoreFx.opponent ? "duel-score-surge 760ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
            }}
          >
            {scoreDelta.opponent !== null && (
              <div
                key={`opponent-delta-${scoreFx.opponent}`}
                className="absolute right-[18px] top-4 text-sm font-black tracking-[0.04em] text-signal-ethics"
                style={{ animation: "duel-score-delta 900ms ease-out forwards" }}
              >
                +{scoreDelta.opponent}
              </div>
            )}
            <div
              key={`opponent-glow-${scoreFx.opponent}`}
              className="pointer-events-none absolute rounded-full"
              style={{
                inset: "-22%",
                background: "radial-gradient(circle, rgba(124,238,255,0.3) 0%, transparent 62%)",
                animation: scoreFx.opponent ? "duel-score-glow 760ms ease-out" : undefined,
              }}
            />
            <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-signal-ethics">
              Opponent
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-[60px] font-black leading-[0.95] tracking-[-0.06em] text-foreground">
                {opponent?.score ?? 0}
              </span>
              <span className="text-[15px] font-bold text-signal-ethics">PTS</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <span className="text-[15px] font-extrabold text-foreground">{opponent?.displayName ?? "Opponent"}</span>
              <span className="text-[11px] text-foreground-muted">
                {opponent?.status === "finished" ? "Done ✓" : `Current: ${categoryLabel(opponent?.categoryIndex ?? 0)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">

        {/* Left — code editor */}
        <div className="flex w-[60%] flex-col">
          <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-r border-border-strong bg-surface-2 px-3 py-1.5">
            <button
              type="button"
              onClick={handleCheck}
              disabled={checking || selfDone}
              className="rounded-[5px] border px-4 py-1 text-xs font-bold"
              style={{
                background: checking || selfDone ? "var(--surface-2)" : `${RESULT_COLORS.win}1a`,
                color: checking || selfDone ? "var(--foreground-subtle)" : RESULT_COLORS.win,
                borderColor: checking || selfDone ? "var(--border-strong)" : RESULT_COLORS.win,
                cursor: checking || selfDone ? "not-allowed" : "pointer",
                opacity: checking ? 0.7 : 1,
              }}
            >
              {checking ? "Checking…" : selfDone ? "Finished" : "✓ Check"}
            </button>
            {!selfDone && (
              <span className="text-[11px] text-foreground-subtle">
                {cat.icon} {cat.label} · {fixedNow.length} / {vulns.length} fixed
              </span>
            )}
            <span className="ml-auto text-[11px] text-foreground-subtle">
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
        <div className="flex w-[40%] flex-col overflow-hidden border-l border-border-strong bg-surface-2">

          {/* Opponent board */}
          <div className="flex-shrink-0 border-b border-border-strong bg-signal-ethics/[0.03] px-3.5 py-2.5">
            <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-signal-ethics">
              Opponent
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-signal-ethics/40 bg-signal-ethics/10 text-xs font-black text-signal-ethics">
                  {(opponent?.displayName ?? "?")[0].toUpperCase()}
                </div>
                <span className="text-[13px] font-bold text-foreground">
                  {opponent?.displayName ?? "Opponent"}
                </span>
              </div>
              <div className="ml-auto flex gap-4">
                <div className="text-center">
                  <div className="text-lg font-black text-signal-ethics">{opponent?.score ?? 0}</div>
                  <div className="text-[9px] uppercase tracking-[0.08em] text-foreground-subtle">Score</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-foreground">
                    {opponent?.status === "finished" ? "Done ✓" : categoryLabel(opponent?.categoryIndex ?? 0)}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.08em] text-foreground-subtle">Category</div>
                </div>
              </div>
            </div>
          </div>

          {/* Self-done waiting state */}
          {waitingOverlay ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
              <div className="text-[32px]">⏳</div>
              <p className="m-0 text-sm font-bold text-foreground">
                You finished all categories!
              </p>
              <p className="m-0 text-center text-xs text-foreground-subtle">
                Waiting for opponent to finish…
              </p>
              <div
                className="rounded-lg px-5 py-3 text-center"
                style={{ background: `${ME_COLOR}0f`, border: `1px solid ${ME_COLOR}26` }}
              >
                <div className="mb-1 text-[10px] text-foreground-subtle">Your final score</div>
                <div className="text-[28px] font-black" style={{ color: ME_COLOR }}>{myScore}</div>
              </div>
            </div>
          ) : (
            /* Category panel */
            <div className="flex flex-1 flex-col overflow-hidden">

              {/* Category header */}
              <div className="flex-shrink-0 border-b border-border-strong px-3.5 py-2.5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] font-extrabold text-foreground">
                      {cat.icon} {cat.label}
                    </div>
                    <div
                      className="mt-[3px] text-[10px] uppercase tracking-[0.08em]"
                      style={{ color: viewingEarlierCategory ? "var(--signal-performance)" : "var(--foreground-subtle)" }}
                    >
                      {viewingEarlierCategory ? "Reviewing previous category" : "Live category"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span
                      className="rounded-full border border-white/5 bg-background px-2.5 py-[3px] text-xs font-bold"
                      style={{ color: fixedNow.length === vulns.length ? RESULT_COLORS.win : "#58a6ff" }}
                    >
                      {fixedNow.length} / {vulns.length}
                    </span>
                    <button
                      type="button"
                      onClick={handlePrevious}
                      disabled={catIdx === 0 || advancing}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
                      style={{
                        background: catIdx === 0 || advancing ? "var(--surface)" : "var(--surface-raised)",
                        color: catIdx === 0 || advancing ? "var(--foreground-subtle)" : "var(--foreground-muted)",
                        cursor: catIdx === 0 || advancing ? "not-allowed" : "pointer",
                        opacity: catIdx === 0 || advancing ? 0.65 : 1,
                      }}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={advancing}
                      className="rounded-lg border-none px-3.5 py-1.5 text-xs font-extrabold text-white"
                      style={{
                        background: "linear-gradient(135deg, var(--signal-security), #e94560)",
                        cursor: advancing ? "not-allowed" : "pointer",
                        opacity: advancing ? 0.6 : 1,
                        boxShadow: advancing ? "none" : "0 12px 24px rgba(233,69,96,0.25)",
                      }}
                    >
                      {viewingEarlierCategory ? "Next" : isLastCat ? "Finish" : "Next"}
                    </button>
                  </div>
                </div>

                {/* Progress dots */}
                <div className="flex items-center gap-1.5">
                  {CATEGORIES.map((c, i) => (
                    <div
                      key={c.key}
                      className="flex-1 rounded-full transition-all duration-[180ms]"
                      style={{
                        height: i === catIdx ? "8px" : "4px",
                        background: i < unlockedCatIdx ? RESULT_COLORS.win : i === unlockedCatIdx ? c.color : "var(--surface-2)",
                        boxShadow: i === catIdx ? `0 0 0 1px ${c.color}55, 0 0 18px ${c.color}44` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Check result banner */}
              {result && (
                <div
                  className="mx-3.5 mt-2 flex-shrink-0 rounded-md px-3 py-1.5 text-xs leading-relaxed"
                  style={{
                    background: result.error ? "rgba(255,59,92,0.08)" : result.newCount > 0 ? `${RESULT_COLORS.win}12` : "rgba(255,176,32,0.06)",
                    border: `1px solid ${result.error ? "var(--signal-security)" : result.newCount > 0 ? RESULT_COLORS.win : "var(--signal-performance)"}`,
                    color: result.error ? "#fca5a5" : result.newCount > 0 ? RESULT_COLORS.win : "var(--signal-performance)",
                  }}
                >
                  {result.error
                    ? result.error
                    : result.newCount > 0
                    ? `Fixed ${result.newCount} new issue${result.newCount !== 1 ? "s" : ""}! Score: ${result.totalFixed} / ${result.total}`
                    : `No new fixes detected. Score: ${result.totalFixed} / ${result.total} — keep going!`}
                </div>
              )}

              {/* Vulnerability list */}
              <div className="flex-1 overflow-y-auto pt-1.5">
                <p className="mx-3.5 mb-1.5 mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground-subtle">
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
    <div
      className="border-b border-border-strong px-3.5 py-2.5 transition-colors"
      style={{ background: fixed ? `${RESULT_COLORS.win}0d` : "transparent" }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
          style={{
            border: fixed ? "none" : "2px solid var(--foreground-subtle)",
            background: fixed ? RESULT_COLORS.win : "transparent",
          }}
        >
          {fixed && <span className="text-[10px] leading-none text-background">✓</span>}
        </div>
        <div className="flex-1">
          <p className="m-0 mb-1.5 text-[11.5px] leading-relaxed" style={{ color: fixed ? RESULT_COLORS.win : "var(--foreground)" }}>
            {vuln.Description}
          </p>
          <button
            type="button"
            onClick={() => onToggleHint(index)}
            className="cursor-pointer border-none bg-none p-0 text-[11px] text-signal-ethics underline"
          >
            {hintOpen ? "Hide hint" : "Show hint"}
          </button>
          {hintOpen && (
            <p className="m-0 mt-1.5 text-[11px] italic leading-snug text-signal-performance">
              {vuln.Hint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
