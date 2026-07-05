"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Ably from "ably";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import { CATEGORIES as CATS, RESULT_COLORS, COLORS, CATEGORY_COLORS } from "@/lib/theme";

// ── Constants ──────────────────────────────────────────────────
const PTS_PER_FIX   = 20;
// Team identity — Team 0 (mine) is brand, Team 1 (opponent) is Ethics cyan.
// Matches the TEAM_COLORS convention already shipped in home-client.js's RaidRow.
const TEAM_COLORS   = [COLORS.brand, CATEGORY_COLORS.Ethics];
const TEAM_LABELS_DEFAULT = ["Alpha", "Bravo"];
function getTeamLabel(teamId, formalTeams) {
  const formalTeam = formalTeams.find((team) => team.teamSideId === teamId);
  if (formalTeam?.teamName) return formalTeam.teamName;
  return TEAM_LABELS_DEFAULT[teamId] ?? `Team ${teamId}`;
}

function getFormalTeamResult(teamSideId, winnerTeam) {
  if (winnerTeam === null) return { delta: 0, label: "DRAW" };
  if (winnerTeam === teamSideId) return { delta: 1, label: "WIN" };
  return { delta: -1, label: "LOSS" };
}

function mergePlayerScoreIntoTeams(currentTeams, myTeamId, myClerkId, nextScore) {
  return currentTeams.map((team) => {
    if (team.teamId !== myTeamId) return team;

    const players = team.players.map((player) =>
      player.clerkId === myClerkId
        ? { ...player, totalScore: nextScore }
        : player
    );

    return {
      ...team,
      players,
      totalScore: players.reduce((score, player) => score + player.totalScore, 0),
    };
  });
}

function formatTime(secs) {
  if (secs <= 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── File tree ──────────────────────────────────────────────────
function FileLeaf({ node, selectedPath, onSelect, fileProg }) {
  const fixed = Object.values(fileProg).filter((c) => c.fixed?.length > 0).length;
  const isSel = selectedPath === node.path;
  return (
    <button
      onClick={() => onSelect(node.path)}
      title={node.path}
      className="flex w-full items-center gap-1.5 border-none py-1.5 pl-5 pr-2.5 text-left"
      style={{
        cursor: "pointer",
        borderLeft: isSel ? "2px solid var(--signal-performance)" : "2px solid transparent",
        background: isSel ? "rgba(255,176,32,0.05)" : "transparent",
      }}
    >
      <span className="flex-shrink-0 text-[11px]">📄</span>
      <span
        className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs"
        style={{ color: isSel ? "var(--foreground)" : "var(--foreground-muted)" }}
      >
        {node.name}
      </span>
      {fixed > 0 && (
        <span className="flex-shrink-0 rounded-full bg-signal-performance/[0.12] px-1.5 py-px text-[10px] font-bold text-signal-performance">
          {fixed}/5
        </span>
      )}
    </button>
  );
}

function FolderBranch({ node, selectedPath, onSelect, progress }) {
  const [open, setOpen] = useState(true);
  if (node.type === "file") {
    return <FileLeaf node={node} selectedPath={selectedPath} onSelect={onSelect} fileProg={progress[node.path] ?? {}} />;
  }
  if (!node.name) {
    return (
      <div>
        {node.children.map((c) => (
          <FolderBranch key={c.name} node={c} selectedPath={selectedPath} onSelect={onSelect} progress={progress} />
        ))}
      </div>
    );
  }
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-1.5 border-none bg-none px-2.5 py-1.5 text-left"
      >
        <span className="w-2.5 flex-shrink-0 text-[9px] text-foreground-subtle">{open ? "▾" : "▸"}</span>
        <span className="flex-shrink-0 text-xs">📁</span>
        <span className="text-xs font-semibold text-foreground-muted">{node.name}</span>
      </button>
      {open && (
        <div className="pl-3.5">
          {node.children.map((c) => (
            <FolderBranch key={c.name} node={c} selectedPath={selectedPath} onSelect={onSelect} progress={progress} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Category row (right panel) ─────────────────────────────────
function CategoryRow({ cat, vulns, catProg, isActive, onToggle, onCheck, checking, lastCheck }) {
  const fixedIdxs  = catProg?.fixed ?? [];
  const isDone     = vulns.length > 0 && fixedIdxs.length >= vulns.length;
  const justChecked = lastCheck?.category === cat.key && !lastCheck?.error;
  const justFixed   = justChecked && (lastCheck?.added ?? 0) > 0;

  return (
    <div className="border-b border-border">
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-2.5 border-none px-3.5 py-2.5 text-left"
        style={{ background: isActive ? `${cat.color}09` : "none" }}
      >
        <span className="flex-shrink-0 text-[15px]">{cat.icon}</span>
        <span className="flex-1 text-xs font-semibold" style={{ color: isDone ? cat.color : "var(--foreground)" }}>
          {cat.key}
        </span>
        {isDone ? (
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-extrabold"
            style={{ color: cat.color, background: `${cat.color}18` }}
          >
            ✓ FIXED
          </span>
        ) : (
          <span className="text-[10px]" style={{ color: fixedIdxs.length > 0 ? cat.color : "var(--foreground-subtle)" }}>
            {fixedIdxs.length}/{vulns.length}
          </span>
        )}
        <span className="flex-shrink-0 text-[10px] text-foreground-subtle">{isActive ? "▾" : "▸"}</span>
      </button>

      {isActive && (
        <div className="px-3 pb-3">
          {vulns.map((vuln, vi) => {
            const fixed = fixedIdxs.includes(vi);
            const lines = Array.isArray(vuln["Line Number"]) ? vuln["Line Number"].join("–") : "?";
            return (
              <div
                key={vi}
                className="mb-2.5 rounded-md p-2.5"
                style={{
                  background: fixed ? `${RESULT_COLORS.win}0a` : "var(--background)",
                  border: `1px solid ${fixed ? `${RESULT_COLORS.win}38` : "var(--border)"}`,
                }}
              >
                <div className="mb-1.5 text-[10px] font-bold tracking-[0.04em]" style={{ color: cat.color }}>
                  📍 Lines {lines}
                </div>
                <pre className="m-0 mb-1.5 overflow-x-auto whitespace-pre-wrap break-all rounded border border-border bg-background p-1.5 font-mono text-[10.5px] leading-relaxed text-foreground">
                  {vuln["Vulnerability Code"]}
                </pre>
                <p className="m-0 text-[11px] leading-relaxed text-foreground-muted">
                  💡 {vuln["Hint"]}
                </p>
                {fixed && <div className="mt-1.5 text-[10.5px] font-bold" style={{ color: RESULT_COLORS.win }}>✓ Fixed!</div>}
              </div>
            );
          })}

          {justChecked && (
            <div
              className="mb-2.5 rounded-md px-2.5 py-2 text-[11.5px] font-semibold"
              style={{
                background: justFixed ? `${RESULT_COLORS.win}1a` : "rgba(255,59,92,0.08)",
                border: `1px solid ${justFixed ? `${RESULT_COLORS.win}4d` : "var(--signal-security)"}`,
                color: justFixed ? RESULT_COLORS.win : isDone ? RESULT_COLORS.win : "#ff8080",
              }}
            >
              {isDone
                ? "✓ All fixed in this category!"
                : justFixed
                ? `✓ Fixed! +${lastCheck.added} pts`
                : "✗ Not fixed yet — review the hint."}
            </div>
          )}

          {!isDone && (
            <button
              onClick={onCheck}
              disabled={checking}
              className="w-full rounded-md border-none py-2 text-xs font-extrabold transition-colors"
              style={{
                background: checking ? "var(--surface-2)" : cat.color,
                color: checking ? "var(--foreground-subtle)" : "var(--background)",
                cursor: checking ? "not-allowed" : "pointer",
              }}
            >
              {checking ? "Checking…" : `Check ${cat.key} →`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Live scoreboard (right panel top) ─────────────────────────
function Scoreboard({ teams, myTeamId, formalTeams, timeLeft, matchStatus, winnerTeam }) {
  const timerColor  = timeLeft !== null && timeLeft <= 10 ? "var(--signal-security)" : "var(--signal-performance)";
  const matchEnded  = matchStatus === "completed" || matchStatus === "abandoned";

  return (
    <div className="flex-shrink-0 border-b border-border bg-background px-3.5 py-2.5">
      {/* Timer row */}
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground-subtle">
          Live Scoreboard
        </span>
        {matchEnded ? (
          <span className="text-[11px] font-bold" style={{ color: winnerTeam !== null ? TEAM_COLORS[winnerTeam] : "var(--signal-performance)" }}>
            {matchStatus === "abandoned" ? "⚠ Abandoned" : winnerTeam !== null ? `${getTeamLabel(winnerTeam, formalTeams)} wins!` : "Draw"}
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-foreground-subtle">⏱</span>
            <span className="font-mono text-sm font-black" style={{ color: timerColor, fontVariantNumeric: "tabular-nums" }}>
              {timeLeft !== null ? formatTime(timeLeft) : "—"}
            </span>
          </div>
        )}
      </div>

      {/* Teams */}
      <div className="flex gap-2">
        {teams.map((team) => {
          const color     = TEAM_COLORS[team.teamId];
          const isMyTeam  = team.teamId === myTeamId;
          const isWinner  = matchEnded && winnerTeam === team.teamId;
          return (
            <div
              key={team.teamId}
              className="flex-1 rounded-lg p-2.5"
              style={{
                background: isMyTeam ? `${color}0a` : "rgba(148,163,184,0.04)",
                border: `1px solid ${isMyTeam ? `${color}30` : "var(--border)"}`,
              }}
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: color }} />
                <span className="text-[10px] font-extrabold tracking-[0.06em]" style={{ color }}>
                  {getTeamLabel(team.teamId, formalTeams)}
                  {isWinner && " 🏆"}
                </span>
                <span className="ml-auto font-mono text-sm font-black" style={{ color, fontVariantNumeric: "tabular-nums" }}>
                  {team.totalScore}
                </span>
              </div>
              {team.players.map((p) => (
                <div key={p.clerkId} className="flex items-center justify-between gap-1 py-0.5">
                  <span
                    className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[11px]"
                    style={{ color: p.isMe ? "var(--foreground)" : "var(--foreground-muted)", fontWeight: p.isMe ? 700 : 400 }}
                  >
                    {p.isMe ? "◆ " : ""}{p.displayName}
                  </span>
                  <span className="flex-shrink-0 font-mono text-[11px] font-bold" style={{ color, fontVariantNumeric: "tabular-nums" }}>
                    {p.totalScore}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {formalTeams.length > 0 && (
        <div className="mt-2 text-[10px] leading-relaxed text-foreground-subtle">
          Team raid tracked: formal team names, Social team record, and Past Raids all sync from the completed match.
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function LiveRaidClient({
  matchId, myClerkId, myName,
  initialState,
  codebaseName, files, filesCode, fileTree,
  formalTeams = [],
}) {
  const [selectedPath,   setSelectedPath]   = useState(files[0]?.Path ?? null);
  const [editedCodes,    setEditedCodes]    = useState(() => ({ ...filesCode }));
  const [progress,       setProgress]       = useState(() => initialState.me.fileProgress ?? {});
  const [myTotalScore,   setMyTotalScore]   = useState(initialState.me.totalScore);
  const [myTeamId]                          = useState(initialState.me.teamId);
  const [teams,          setTeams]          = useState(initialState.teams);
  const [matchStatus,    setMatchStatus]    = useState(initialState.status);
  const [winnerTeam,     setWinnerTeam]     = useState(initialState.winnerTeam ?? null);
  const [timeLeft,       setTimeLeft]       = useState(null);
  const [activeCategory, setActiveCat]      = useState(null);
  const [checking,       setChecking]       = useState(false);
  const [lastCheck,      setLastCheck]      = useState(null);
  const [surrenderConfirm, setSurrenderConfirm] = useState(false);
  const [surrendering,     setSurrendering]     = useState(false);

  const pollRef          = useRef(null);
  const timerRef         = useRef(null);
  const latestUpdatedAt  = useRef(null);
  const ablyRef          = useRef(null);
  const codePublishTimer = useRef(null);
  const lastLocalEditRef = useRef({});

  const matchEnded   = matchStatus === "completed" || matchStatus === "abandoned";
  const selectedFile = files.find((f) => f.Path === selectedPath) ?? null;
  const fileProgress = progress[selectedPath] ?? {};

  const { totalVulns, totalFixed } = useMemo(() => {
    let tv = 0, tf = 0;
    for (const f of files) {
      for (const c of CATS) {
        tv += f.Vulnerabilities?.[c.key]?.length ?? 0;
        tf += progress[f.Path]?.[c.key]?.fixed?.length ?? 0;
      }
    }
    return { totalVulns: tv, totalFixed: tf };
  }, [files, progress]);

  const fileScore = Object.values(fileProgress).reduce((s, c) => s + (c.score ?? 0), 0);
  const fileCatsDone = CATS.filter((c) => {
    const vulns = selectedFile?.Vulnerabilities?.[c.key] ?? [];
    const fixed = fileProgress[c.key]?.fixed?.length ?? 0;
    return vulns.length > 0 && fixed >= vulns.length;
  }).length;

  const pct = totalVulns > 0 ? Math.round((totalFixed / totalVulns) * 100) : 0;
  const orderedTeams = useMemo(
    () => [...teams].sort((a, b) => a.teamId - b.teamId),
    [teams]
  );
  const orderedFormalTeams = useMemo(
    () => [...formalTeams].sort((a, b) => a.teamSideId - b.teamSideId),
    [formalTeams]
  );

  function applyMatchSnapshot(snapshot) {
    if (!snapshot) { console.log("[RAID] applyMatchSnapshot: null snapshot, skipping"); return; }

    // Revision guard: skip stale snapshots
    if (snapshot.updatedAt && latestUpdatedAt.current) {
      if (snapshot.updatedAt <= latestUpdatedAt.current) {
        console.log(`[RAID] applyMatchSnapshot: STALE skipping updatedAt=${snapshot.updatedAt} latest=${latestUpdatedAt.current}`);
        return;
      }
    }
    console.log(`[RAID] applyMatchSnapshot: applying updatedAt=${snapshot.updatedAt} teams=${JSON.stringify(snapshot.teams?.map(t => ({ id: t.teamId, score: t.totalScore })))}`);
    if (snapshot.updatedAt) latestUpdatedAt.current = snapshot.updatedAt;

    if (snapshot.teams) setTeams(snapshot.teams);

    if (snapshot.me) {
      setMyTotalScore(snapshot.me.totalScore);
      setProgress(snapshot.me.fileProgress ?? {});
    }

    if (snapshot.status && snapshot.status !== "active") {
      setMatchStatus(snapshot.status);
      setWinnerTeam(snapshot.winnerTeam ?? null);
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
    }
  }

  async function syncMatchState() {
    const response = await fetch(`/api/raid/match/${matchId}`, { cache: "no-store" });
    if (!response.ok) return null;

    const snapshot = await response.json();
    applyMatchSnapshot(snapshot);
    return snapshot;
  }

  // ── Timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialState.endsAt) return;
    const endsAt = new Date(initialState.endsAt).getTime();
    const tick = () => setTimeLeft(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // ── Poll match state every 10s (SSE fallback) ────────────────
  useEffect(() => {
    if (matchEnded) return;
    const poll = async () => {
      try {
        await syncMatchState();
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, 10000);
    return () => clearInterval(pollRef.current);
  }, [matchEnded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SSE live updates via Ably-backed event stream ─────────────
  useEffect(() => {
    if (matchEnded) return;

    console.log(`[RAID] opening EventSource /api/raid/match/${matchId}/events`);
    const es = new EventSource(`/api/raid/match/${matchId}/events`);

    es.onopen = () => {
      console.log(`[RAID] EventSource connected matchId=${matchId}`);
    };

    es.addEventListener("snapshot", (event) => {
      console.log(`[RAID] SSE snapshot received raw:`, event.data?.slice(0, 120));
      try {
        const snapshot = JSON.parse(event.data);
        applyMatchSnapshot(snapshot);
      } catch (err) {
        console.error("[RAID] SSE snapshot parse error:", err);
      }
    });

    es.onerror = (err) => {
      console.warn(`[RAID] EventSource error matchId=${matchId} readyState=${es.readyState}`, err);
    };

    return () => {
      console.log(`[RAID] closing EventSource matchId=${matchId}`);
      es.close();
    };
  }, [matchId, matchEnded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Team code sync via Ably ───────────────────────────────────
  useEffect(() => {
    if (matchEnded) return;

    const prefix = process.env.NEXT_PUBLIC_ABLY_CHANNEL_PREFIX || "debug-battle";
    const channelName = `${prefix}:raid:${matchId}:team:${myTeamId}:code`;

    const ably = new Ably.Realtime({
      authUrl:  `/api/ably/token?matchId=${matchId}&teamId=${myTeamId}`,
      clientId: myClerkId,
    });
    ablyRef.current = ably;

    const channel = ably.channels.get(channelName);

    channel.subscribe("code-update", (msg) => {
      const { filePath, content, fromClerkId } = msg.data ?? {};
      if (!filePath || content == null || fromClerkId === myClerkId) return;

      const lastEdit = lastLocalEditRef.current[filePath] ?? 0;
      if (Date.now() - lastEdit < 1000) return; // user is actively typing here — skip

      setEditedCodes((prev) => ({ ...prev, [filePath]: content }));
    });

    return () => {
      clearTimeout(codePublishTimer.current);
      channel.unsubscribe();
      ably.close();
      ablyRef.current = null;
    };
  }, [matchId, myTeamId, myClerkId, matchEnded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-end when timer hits 0 ────────────────────────────────
  useEffect(() => {
    if (timeLeft === 0 && !matchEnded) {
      clearInterval(timerRef.current);
      const timeoutId = setTimeout(() => {
        syncMatchState()
          .then((snapshot) => {
            if (!snapshot?.status) setMatchStatus("completed");
          })
          .catch(() => setMatchStatus("completed"));
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────
  function handleFileSelect(path) {
    setSelectedPath(path);
    setLastCheck(null);
    setActiveCat(null);
  }

  function handleCodeChange(code) {
    setEditedCodes((prev) => ({ ...prev, [selectedPath]: code }));
    setLastCheck(null);

    // Track that we edited this file right now (prevents applying teammate's
    // stale broadcast back over our own live typing)
    lastLocalEditRef.current[selectedPath] = Date.now();

    // Debounce: publish to teammate after 400ms of silence
    clearTimeout(codePublishTimer.current);
    codePublishTimer.current = setTimeout(() => {
      const ably = ablyRef.current;
      if (!ably || !selectedPath) return;
      const prefix = process.env.NEXT_PUBLIC_ABLY_CHANNEL_PREFIX || "debug-battle";
      const channelName = `${prefix}:raid:${matchId}:team:${myTeamId}:code`;
      ably.channels.get(channelName).publish("code-update", {
        filePath:    selectedPath,
        content:     code,
        fromClerkId: myClerkId,
        editedAt:    new Date().toISOString(),
      }).catch(() => {});
    }, 400);
  }

  async function handleCheck(catKey) {
    if (checking || !selectedFile || matchEnded) return;
    setChecking(true);
    setLastCheck(null);

    const alreadyFixed = fileProgress[catKey]?.fixed ?? [];

    try {
      const r = await fetch(`/api/raid/match/${matchId}/submit`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          filePath:     selectedPath,
          categoryKey:  catKey,
          userCode:     editedCodes[selectedPath],
          alreadyFixed,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Check failed");

      const newlyFixed = data.fixed ?? [];
      const allFixed   = data.allFixed ?? [...new Set([...alreadyFixed, ...newlyFixed])];
      const added      = newlyFixed.length * PTS_PER_FIX;
      const nextProgress = data.fileProgress ?? (() => {
        const updatedProgress = { ...progress };
        const currentFileProgress = { ...(updatedProgress[selectedPath] ?? {}) };
        const prevCat = currentFileProgress[catKey] ?? { fixed: [], score: 0 };
        currentFileProgress[catKey] = { fixed: allFixed, score: prevCat.score + added };
        updatedProgress[selectedPath] = currentFileProgress;
        return updatedProgress;
      })();
      const nextScore = data.newScore ?? myTotalScore + added;

      // Optimistic local update, then apply canonical snapshot from response
      setProgress(nextProgress);
      setMyTotalScore(nextScore);
      setTeams((currentTeams) => mergePlayerScoreIntoTeams(currentTeams, myTeamId, myClerkId, nextScore));
      setLastCheck({ category: catKey, added, newlyFixed, allFixed });
      if (data.snapshot) {
        applyMatchSnapshot(data.snapshot);
      } else {
        await syncMatchState().catch(() => {});
      }
    } catch (err) {
      setLastCheck({ category: catKey, error: err.message });
    } finally {
      setChecking(false);
    }
  }

  async function handleSurrender() {
    if (surrendering || matchEnded) return;
    setSurrendering(true);
    try {
      await fetch(`/api/raid/match/${matchId}/surrender`, { method: "POST" });
    } catch {}
    setSurrendering(false);
    setSurrenderConfirm(false);
  }

  // ─────────────────────────────────────────────────────────────
  // END SCREEN
  // ─────────────────────────────────────────────────────────────
  if (matchEnded) {
    const weWon     = winnerTeam === myTeamId;
    const isDraw    = matchStatus === "completed" && winnerTeam === null;
    const resultColor = matchStatus === "abandoned"
      ? "var(--foreground-subtle)"
      : weWon ? RESULT_COLORS.win : isDraw ? RESULT_COLORS.draw : RESULT_COLORS.loss;

    return (
      <div className="relative flex flex-1 flex-col items-center justify-center gap-7 bg-background font-sans">
        <div className="text-[52px]">
          {matchStatus === "abandoned" ? "🔌" : weWon ? "🏆" : isDraw ? "🤝" : "💀"}
        </div>
        <h1
          className="m-0 font-display font-black tracking-tight"
          style={{ fontSize: "clamp(28px,5vw,52px)", color: resultColor }}
        >
          {matchStatus === "abandoned" ? "Match Abandoned"
            : weWon ? "Your Team Wins!"
            : isDraw ? "It's a Draw"
            : "Your Team Lost"}
        </h1>

        {/* Team score card */}
        <div className="flex items-center gap-8 rounded-2xl border border-border bg-surface px-9 py-5.5">
          {orderedTeams.map((team, i) => {
            const color = TEAM_COLORS[team.teamId];
            const isWinner = winnerTeam === team.teamId;
            return (
              <div key={team.teamId} className="flex items-center gap-8">
                {i === 1 && <div className="text-xl font-black text-foreground-subtle">VS</div>}
                <div className="text-center">
                  <div className="mb-2.5 text-[10px] font-extrabold uppercase tracking-[0.1em]" style={{ color }}>
                    {getTeamLabel(team.teamId, orderedFormalTeams)}{isWinner ? " 🏆" : ""}{team.teamId === myTeamId ? " (You)" : ""}
                  </div>
                  <div className="text-[38px] font-black text-foreground">{team.totalScore}</div>
                  <div className="mt-2 flex flex-col gap-0.5">
                    {team.players.map((p) => (
                      <div key={p.clerkId} className="text-[11px] text-foreground-muted">
                        {p.displayName}: {p.totalScore} pts
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {orderedFormalTeams.length > 0 && (
          <div className="absolute right-5 top-5 flex flex-col gap-1.5 rounded-[10px] border border-border bg-surface p-3" style={{ width: "min(340px, calc(100vw - 40px))" }}>
            {orderedFormalTeams.map((formalTeam) => {
              const debugResult = getFormalTeamResult(formalTeam.teamSideId, winnerTeam);
              const color = debugResult.delta > 0 ? RESULT_COLORS.win : debugResult.delta < 0 ? RESULT_COLORS.loss : RESULT_COLORS.draw;
              return (
                <div key={`${formalTeam.sourceTeamId ?? "team"}-${formalTeam.teamSideId}`} className="text-xs text-foreground-muted">
                  Team: <span className="font-extrabold text-foreground">{formalTeam.teamName}</span>
                  {" "}Result: <span className="font-extrabold" style={{ color }}>{debugResult.label}</span>
                  {" "}({debugResult.delta > 0 ? "+1" : debugResult.delta < 0 ? "-1" : "0"} in Social)
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => { window.location.href = "/group-raid-page"; }}
            className="cursor-pointer rounded-lg border-none bg-signal-performance px-8 py-3 text-sm font-extrabold text-background"
          >
            Raid Again →
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

  // ─────────────────────────────────────────────────────────────
  // MAIN ARENA
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex h-12 flex-shrink-0 items-center gap-3 border-b border-border bg-background px-4.5">
        {/* Mode badge */}
        <span className="rounded-full border border-signal-performance/30 bg-signal-performance/[0.12] px-2.5 py-0.5 text-[10px] font-extrabold tracking-[0.08em] text-signal-performance">
          LIVE RAID
        </span>

        {/* Codebase */}
        <span className="text-[12.5px] font-bold text-foreground">{codebaseName}</span>
        <span className="rounded-full border border-signal-performance/20 bg-signal-performance/10 px-1.5 py-px text-[10px] font-bold text-signal-performance">
          {files.length} FILES
        </span>

        {/* My score */}
        <div className="ml-2 flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: TEAM_COLORS[myTeamId] }} />
          <span className="text-[11.5px] text-foreground-muted">{myName}</span>
          <span className="text-[13px] font-extrabold" style={{ color: TEAM_COLORS[myTeamId], fontVariantNumeric: "tabular-nums" }}>
            {myTotalScore}pts
          </span>
        </div>

        <div className="flex-1" />

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] text-foreground-subtle">{totalFixed}/{totalVulns}</span>
          <div className="h-1 w-[120px] overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full transition-[width] duration-[400ms] ease-out"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--signal-performance), var(--signal-scalability))" }}
            />
          </div>
          <span className="text-[10.5px] text-foreground-muted">{pct}%</span>
        </div>

        {/* Timer */}
        <div className="ml-1 flex items-center gap-1.5">
          <span className="text-[11px] text-foreground-subtle">⏱</span>
          <span
            className="font-mono text-sm font-black"
            style={{ fontVariantNumeric: "tabular-nums", color: timeLeft !== null && timeLeft <= 10 ? "var(--signal-security)" : "var(--signal-performance)" }}
          >
            {timeLeft !== null ? formatTime(timeLeft) : "—"}
          </span>
        </div>

        {/* Surrender */}
        {!surrenderConfirm ? (
          <button
            onClick={() => setSurrenderConfirm(true)}
            disabled={matchEnded}
            className="rounded-md border border-signal-security/35 bg-transparent px-2.5 py-[3px] text-[11px] font-bold text-signal-security"
            style={{ cursor: matchEnded ? "not-allowed" : "pointer", opacity: matchEnded ? 0.4 : 1 }}
          >
            Surrender
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold text-signal-security">
              Your team loses. Sure?
            </span>
            <button
              onClick={handleSurrender}
              disabled={surrendering}
              className="rounded-md border-none bg-signal-security px-2.5 py-[3px] text-[11px] font-extrabold text-background"
              style={{ cursor: surrendering ? "not-allowed" : "pointer" }}
            >
              {surrendering ? "…" : "Yes"}
            </button>
            <button
              onClick={() => setSurrenderConfirm(false)}
              className="cursor-pointer rounded-md border border-border-strong bg-transparent px-2.5 py-[3px] text-[11px] font-semibold text-foreground-muted"
            >
              No
            </button>
          </div>
        )}

        <span className="font-mono text-[10px] text-foreground-subtle">#{matchId}</span>
      </div>

      {/* ── Three-column layout ──────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Left: File tree */}
        <div className="flex w-[240px] flex-shrink-0 flex-col overflow-hidden border-r border-border bg-background">
          <div className="flex flex-shrink-0 items-center gap-1.5 border-b border-border px-3.5 pb-1.5 pt-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-foreground-subtle">
              Explorer
            </span>
            <span className="ml-auto text-[10px] text-foreground-subtle">{files.length} files</span>
          </div>
          <div className="flex-1 overflow-y-auto py-1.5">
            <FolderBranch node={fileTree} selectedPath={selectedPath} onSelect={handleFileSelect} progress={progress} />
          </div>
        </div>

        {/* Center: Ace Editor */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#1e1e1e]">
          <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-border bg-background px-3.5 py-1.5">
            <span className="text-[13px]">📄</span>
            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold text-foreground">
              {selectedPath ?? "No file selected"}
            </span>
            <span className="flex-shrink-0 rounded border border-signal-ethics/20 bg-signal-ethics/10 px-1.5 py-0.5 text-[10px] font-bold text-signal-ethics">
              C++
            </span>
            <span className="flex-shrink-0 text-[10.5px] text-foreground-subtle">
              {fileCatsDone}/5 done · {fileScore} pts
            </span>
          </div>

          <div className="min-h-0 flex-1">
            {selectedPath ? (
              <AceEditor
                key={selectedPath}
                mode="c_cpp"
                theme="monokai"
                value={editedCodes[selectedPath] ?? ""}
                onChange={handleCodeChange}
                width="100%"
                height="100%"
                fontSize={13}
                showPrintMargin={false}
                wrapEnabled={false}
                setOptions={{ useWorker: false, tabSize: 4, enableLiveAutocompletion: false }}
                style={{ lineHeight: "1.7" }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-foreground-subtle">
                Select a file from the explorer
              </div>
            )}
          </div>
        </div>

        {/* Right: Scoreboard + Vulnerability hunter */}
        <div className="flex w-[360px] flex-shrink-0 flex-col overflow-hidden border-l border-border bg-background">
          {/* Live scoreboard */}
          <Scoreboard
            teams={orderedTeams}
            myTeamId={myTeamId}
            formalTeams={orderedFormalTeams}
            timeLeft={timeLeft}
            matchStatus={matchStatus}
            winnerTeam={winnerTeam}
          />

          {/* Vulnerability hunter header */}
          <div className="flex-shrink-0 border-b border-border px-3.5 py-2.5">
            <div className="text-[11.5px] font-bold text-foreground">Vulnerability Hunter</div>
            <div className="mt-px overflow-hidden text-ellipsis whitespace-nowrap text-[10.5px] text-foreground-subtle">
              {selectedPath ? selectedPath.split("/").pop() : "Select a file to begin"}
            </div>
          </div>

          {/* Category accordion */}
          <div className="flex-1 overflow-y-auto">
            {!selectedFile ? (
              <div className="px-4.5 py-9 text-center text-[12.5px] text-foreground-subtle">
                Select a file from the explorer to see its vulnerabilities.
              </div>
            ) : (
              CATS.map((cat) => {
                const vulns = selectedFile.Vulnerabilities?.[cat.key] ?? [];
                return (
                  <CategoryRow
                    key={cat.key}
                    cat={cat}
                    vulns={vulns}
                    catProg={fileProgress[cat.key]}
                    isActive={activeCategory === cat.key}
                    onToggle={() => setActiveCat((prev) => (prev === cat.key ? null : cat.key))}
                    onCheck={() => handleCheck(cat.key)}
                    checking={checking && activeCategory === cat.key}
                    lastCheck={lastCheck}
                  />
                );
              })
            )}
          </div>

          {/* File score footer */}
          {lastCheck?.error ? (
            <div className="flex-shrink-0 border-t border-signal-security/20 bg-signal-security/[0.07] px-3.5 py-2.5 text-[11px] text-[#ff8080]">
              ✗ {lastCheck.error}
            </div>
          ) : (
            <div className="flex flex-shrink-0 items-center justify-between border-t border-border px-3.5 py-2.5">
              <span className="text-[10.5px] text-foreground-subtle">
                {selectedPath?.split("/").pop() ?? "File"} score
              </span>
              <span className="text-[13px] font-extrabold text-signal-performance">
                {fileScore} pts
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
