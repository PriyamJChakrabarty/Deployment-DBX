"use client";

import { useState, useMemo } from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import { CATEGORIES as CATS, RESULT_COLORS } from "@/lib/theme";

const PTS_PER_FIX = 20;

// ── Folder tree ────────────────────────────────────────────────
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
        borderLeft: isSel ? `2px solid ${RESULT_COLORS.win}` : "2px solid transparent",
        background: isSel ? `${RESULT_COLORS.win}0f` : "transparent",
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
        <span
          className="flex-shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold"
          style={{ color: RESULT_COLORS.win, background: `${RESULT_COLORS.win}1f` }}
        >
          {fixed}/5
        </span>
      )}
    </button>
  );
}

function FolderBranch({ node, selectedPath, onSelect, progress }) {
  const [open, setOpen] = useState(true);

  if (node.type === "file") {
    return (
      <FileLeaf
        node={node}
        selectedPath={selectedPath}
        onSelect={onSelect}
        fileProg={progress[node.path] ?? {}}
      />
    );
  }

  if (!node.name) {
    return (
      <div>
        {node.children.map((child) => (
          <FolderBranch key={child.name} node={child} selectedPath={selectedPath} onSelect={onSelect} progress={progress} />
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
        <span className="w-2.5 flex-shrink-0 text-[9px] text-foreground-subtle">
          {open ? "▾" : "▸"}
        </span>
        <span className="flex-shrink-0 text-xs">📁</span>
        <span className="text-xs font-semibold tracking-tight text-foreground-muted">
          {node.name}
        </span>
      </button>
      {open && (
        <div className="pl-3.5">
          {node.children.map((child) => (
            <FolderBranch key={child.name} node={child} selectedPath={selectedPath} onSelect={onSelect} progress={progress} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Right panel: one category row ─────────────────────────────
function CategoryRow({ cat, vulns, catProg, isActive, onToggle, onCheck, checking, lastCheck }) {
  const fixedIdxs  = catProg?.fixed ?? [];
  const isDone     = vulns.length > 0 && fixedIdxs.length >= vulns.length;
  const justChecked = lastCheck?.category === cat.key && !lastCheck?.error;
  const justFixed   = justChecked && (lastCheck?.added ?? 0) > 0;

  return (
    <div className="border-b border-border">
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-2.5 border-none px-4 py-2.5 text-left"
        style={{ background: isActive ? `${cat.color}09` : "none" }}
      >
        <span className="flex-shrink-0 text-base">{cat.icon}</span>
        <span className="flex-1 text-[12.5px] font-semibold" style={{ color: isDone ? cat.color : "var(--foreground)" }}>
          {cat.key}
        </span>

        {isDone ? (
          <span
            className="rounded px-2 py-0.5 text-[9.5px] font-extrabold tracking-[0.04em]"
            style={{ color: cat.color, background: `${cat.color}18` }}
          >
            ✓ FIXED
          </span>
        ) : (
          <span className="text-[10.5px]" style={{ color: fixedIdxs.length > 0 ? cat.color : "var(--foreground-subtle)" }}>
            {fixedIdxs.length}/{vulns.length}
          </span>
        )}

        <span className="flex-shrink-0 text-[10px] text-foreground-subtle">
          {isActive ? "▾" : "▸"}
        </span>
      </button>

      {isActive && (
        <div className="px-3.5 pb-3.5">
          {vulns.map((vuln, vi) => {
            const fixed = fixedIdxs.includes(vi);
            const lines = Array.isArray(vuln["Line Number"]) ? vuln["Line Number"].join("–") : "?";
            return (
              <div
                key={vi}
                className="mb-2.5 rounded-lg p-2.5"
                style={{
                  background: fixed ? `${RESULT_COLORS.win}0a` : "var(--background)",
                  border: `1px solid ${fixed ? `${RESULT_COLORS.win}38` : "var(--border)"}`,
                }}
              >
                <div className="mb-1.5 text-[10px] font-bold tracking-[0.04em]" style={{ color: cat.color }}>
                  📍 Lines {lines}
                </div>
                <pre className="m-0 mb-2 overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-border bg-background p-[7px_9px] font-mono text-[11px] leading-relaxed text-foreground">
                  {vuln["Vulnerability Code"]}
                </pre>
                <p className="m-0 text-[11.5px] leading-relaxed text-foreground-muted">
                  💡 {vuln["Hint"]}
                </p>
                {fixed && (
                  <div className="mt-1.5 text-[11px] font-bold" style={{ color: RESULT_COLORS.win }}>
                    ✓ Vulnerability fixed!
                  </div>
                )}
              </div>
            );
          })}

          {justChecked && (
            <div
              className="mb-2.5 rounded-lg px-3 py-2.5 text-xs font-semibold"
              style={{
                background: justFixed ? `${RESULT_COLORS.win}1a` : "rgba(255,59,92,0.08)",
                border: `1px solid ${justFixed ? `${RESULT_COLORS.win}4d` : "var(--signal-security)"}`,
                color: justFixed ? RESULT_COLORS.win : isDone ? RESULT_COLORS.win : "#ff8080",
              }}
            >
              {isDone
                ? "✓ All vulnerabilities in this category are fixed!"
                : justFixed
                ? `✓ Fixed! +${lastCheck.added} pts earned`
                : "✗ Not fixed yet — review the hint and edit the code above."}
            </div>
          )}

          {!isDone && (
            <button
              onClick={onCheck}
              disabled={checking}
              className="w-full rounded-lg border-none py-2.5 text-[12.5px] font-extrabold transition-colors"
              style={{
                background: checking ? "var(--surface-2)" : cat.color,
                color: checking ? "var(--foreground-subtle)" : "var(--background)",
                cursor: checking ? "not-allowed" : "pointer",
              }}
            >
              {checking ? "Checking with AI…" : `Check ${cat.key} →`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main arena ────────────────────────────────────────────────
/**
 * Drop-in Group Raid arena.
 * Props: codebaseName, files, filesCode, fileTree
 * All data comes from loadCodebase() in src/lib/load-codebase.js.
 */
export default function GroupRaidArena({ codebaseName, files, filesCode, fileTree }) {
  const [selectedPath,   setSelectedPath]  = useState(files[0]?.Path ?? null);
  const [editedCodes,    setEditedCodes]   = useState(() => ({ ...filesCode }));
  const [progress,       setProgress]      = useState({});
  const [totalScore,     setTotalScore]    = useState(0);
  const [activeCategory, setActiveCat]    = useState(null);
  const [checking,       setChecking]      = useState(false);
  const [lastCheck,      setLastCheck]     = useState(null);

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

  function handleFileSelect(path) {
    setSelectedPath(path);
    setLastCheck(null);
    setActiveCat(null);
  }

  function handleCodeChange(code) {
    setEditedCodes((prev) => ({ ...prev, [selectedPath]: code }));
    setLastCheck(null);
  }

  async function handleCheck(catKey) {
    if (checking || !selectedFile) return;
    setChecking(true);
    setLastCheck(null);

    try {
      const vulns        = selectedFile.Vulnerabilities?.[catKey] ?? [];
      const alreadyFixed = fileProgress[catKey]?.fixed ?? [];

      const r    = await fetch("/api/check-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userCode:        editedCodes[selectedPath],
          vulnerabilities: vulns,
          alreadyFixed,
          category: catKey,
        }),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Check failed");

      const newlyFixed = data.fixed ?? [];
      const allFixed   = [...new Set([...alreadyFixed, ...newlyFixed])];
      const added      = newlyFixed.length * PTS_PER_FIX;

      setProgress((prev) => ({
        ...prev,
        [selectedPath]: {
          ...(prev[selectedPath] ?? {}),
          [catKey]: {
            fixed: allFixed,
            score: (prev[selectedPath]?.[catKey]?.score ?? 0) + added,
          },
        },
      }));
      setTotalScore((s) => s + added);
      setLastCheck({ category: catKey, newlyFixed, allFixed, added, vulnCount: vulns.length });
    } catch (err) {
      setLastCheck({ category: catKey, error: err.message });
    } finally {
      setChecking(false);
    }
  }

  const pct = totalVulns > 0 ? Math.round((totalFixed / totalVulns) * 100) : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="flex h-[50px] flex-shrink-0 items-center gap-3.5 border-b border-border bg-background px-5">
        <div className="flex items-center gap-2">
          <span className="text-[15px]">🛡️</span>
          <span className="text-[13.5px] font-extrabold tracking-tight text-foreground">
            Group Raid
          </span>
          <span className="text-xs text-foreground-subtle">·</span>
          <span className="text-xs font-semibold text-signal-performance">
            {codebaseName}
          </span>
          <span className="rounded-full border border-signal-performance/25 bg-signal-performance/[0.12] px-2 py-px text-[10px] font-bold text-signal-performance">
            {files.length} FILES
          </span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2.5">
          <span className="whitespace-nowrap text-[11px] text-foreground-subtle">
            {totalFixed}/{totalVulns}
          </span>
          <div className="h-[5px] w-[160px] overflow-hidden rounded-[3px] bg-border">
            <div
              className="h-full rounded-[3px] transition-[width] duration-500 ease-out"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${RESULT_COLORS.win}, var(--signal-ethics))`,
                boxShadow: `0 0 8px ${RESULT_COLORS.win}66`,
              }}
            />
          </div>
          <span className="text-[11px]" style={{ color: pct === 100 ? RESULT_COLORS.win : "var(--foreground-muted)", fontWeight: pct === 100 ? 700 : 400 }}>
            {pct}%
          </span>
        </div>

        <div
          className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5"
          style={{ background: `${RESULT_COLORS.win}14`, border: `1px solid ${RESULT_COLORS.win}38` }}
        >
          <span className="text-sm">🏆</span>
          <span className="font-mono text-[15px] font-black" style={{ color: RESULT_COLORS.win, fontVariantNumeric: "tabular-nums" }}>
            {totalScore.toLocaleString()}
          </span>
          <span className="text-[10px] text-foreground-subtle">pts</span>
        </div>
      </div>

      {/* ── Three-column layout ───────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Left: File tree */}
        <div className="flex w-[250px] flex-shrink-0 flex-col overflow-hidden border-r border-border bg-background">
          <div className="flex flex-shrink-0 items-center gap-1.5 border-b border-border px-3.5 pb-2 pt-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-foreground-subtle">
              Explorer
            </span>
            <span className="ml-auto text-[10px] text-foreground-subtle">
              {files.length} files
            </span>
          </div>
          <div className="flex-1 overflow-y-auto py-1.5">
            <FolderBranch
              node={fileTree}
              selectedPath={selectedPath}
              onSelect={handleFileSelect}
              progress={progress}
            />
          </div>
        </div>

        {/* Center: Ace Editor */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#1e1e1e]">
          <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-border bg-background px-4 py-1.5">
            <span className="text-[13px]">📄</span>
            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold text-foreground">
              {selectedPath ?? "No file selected"}
            </span>
            <span className="flex-shrink-0 rounded border border-signal-ethics/20 bg-signal-ethics/10 px-2 py-0.5 text-[10px] font-bold text-signal-ethics">
              C++
            </span>
            <span className="flex-shrink-0 whitespace-nowrap text-[11px] text-foreground-subtle">
              {fileCatsDone}/5 done
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

        {/* Right: Vulnerability panel */}
        <div className="flex w-[370px] flex-shrink-0 flex-col overflow-hidden border-l border-border bg-background">
          <div className="flex-shrink-0 border-b border-border px-4 py-2.5">
            <div className="text-xs font-bold tracking-tight text-foreground">
              Vulnerability Hunter
            </div>
            <div className="mt-px overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-foreground-subtle">
              {selectedPath ? selectedPath.split("/").pop() : "Select a file to begin"}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {!selectedFile ? (
              <div className="px-5 py-10 text-center text-[13px] text-foreground-subtle">
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

          {lastCheck?.error ? (
            <div className="flex-shrink-0 border-t border-signal-security/20 bg-signal-security/[0.07] px-4 py-2.5 text-[11.5px] text-[#ff8080]">
              ✗ {lastCheck.error}
            </div>
          ) : (
            <div className="flex flex-shrink-0 items-center justify-between border-t border-border px-4 py-2.5">
              <span className="text-[11px] text-foreground-subtle">
                {selectedPath?.split("/").pop() ?? "File"} score
              </span>
              <span className="text-sm font-extrabold" style={{ color: RESULT_COLORS.win }}>
                {fileScore} pts
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
