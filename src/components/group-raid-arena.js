"use client";

import { useState, useMemo } from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";

const CATS = [
  { key: "Security",        icon: "🔒", color: "#ff5c5c" },
  { key: "Performance",     icon: "⚡", color: "#f5b942" },
  { key: "Scalability",     icon: "📈", color: "#3ddc84" },
  { key: "Ethics",          icon: "⚖️",  color: "#22d3ee" },
  { key: "Maintainability", icon: "🔧", color: "#a78bfa" },
];

const PTS_PER_FIX = 20;

// ── Folder tree ────────────────────────────────────────────────
function FileLeaf({ node, selectedPath, onSelect, fileProg }) {
  const fixed = Object.values(fileProg).filter((c) => c.fixed?.length > 0).length;
  const isSel = selectedPath === node.path;

  return (
    <button
      onClick={() => onSelect(node.path)}
      title={node.path}
      style={{
        width: "100%", background: "none", border: "none",
        cursor: "pointer", textAlign: "left",
        padding: "5px 10px 5px 20px",
        display: "flex", alignItems: "center", gap: "7px",
        borderLeft: isSel ? "2px solid #3ddc84" : "2px solid transparent",
        background: isSel ? "rgba(61,220,132,0.06)" : "transparent",
      }}
    >
      <span style={{ fontSize: "11px", flexShrink: 0 }}>📄</span>
      <span style={{
        fontSize: "12px",
        color: isSel ? "#e8f0f3" : "#8ba0a6",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        flex: 1,
      }}>
        {node.name}
      </span>
      {fixed > 0 && (
        <span style={{
          fontSize: "10px", fontWeight: 700, color: "#3ddc84",
          background: "rgba(61,220,132,0.12)", padding: "1px 6px", borderRadius: "999px",
          flexShrink: 0,
        }}>
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
        style={{
          width: "100%", background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
          padding: "5px 10px",
          display: "flex", alignItems: "center", gap: "6px",
        }}
      >
        <span style={{ fontSize: "9px", color: "#4a6570", width: "10px", flexShrink: 0 }}>
          {open ? "▾" : "▸"}
        </span>
        <span style={{ fontSize: "12px", flexShrink: 0 }}>📁</span>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#8ba0a6", letterSpacing: "-0.01em" }}>
          {node.name}
        </span>
      </button>
      {open && (
        <div style={{ paddingLeft: "14px" }}>
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
    <div style={{ borderBottom: "1px solid rgba(201,214,218,0.05)" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", border: "none", cursor: "pointer",
          background: isActive ? `${cat.color}09` : "none",
          padding: "11px 16px",
          display: "flex", alignItems: "center", gap: "10px",
        }}
      >
        <span style={{ fontSize: "16px", flexShrink: 0 }}>{cat.icon}</span>
        <span style={{
          fontSize: "12.5px", fontWeight: 600, flex: 1, textAlign: "left",
          color: isDone ? cat.color : "#e8f0f3",
        }}>
          {cat.key}
        </span>

        {isDone ? (
          <span style={{
            fontSize: "9.5px", fontWeight: 800, letterSpacing: "0.04em",
            color: cat.color, background: `${cat.color}18`,
            padding: "2px 8px", borderRadius: "4px",
          }}>
            ✓ FIXED
          </span>
        ) : (
          <span style={{ fontSize: "10.5px", color: fixedIdxs.length > 0 ? cat.color : "#4a6570" }}>
            {fixedIdxs.length}/{vulns.length}
          </span>
        )}

        <span style={{ fontSize: "10px", color: "#4a6570", flexShrink: 0 }}>
          {isActive ? "▾" : "▸"}
        </span>
      </button>

      {isActive && (
        <div style={{ padding: "0 14px 14px 14px" }}>
          {vulns.map((vuln, vi) => {
            const fixed = fixedIdxs.includes(vi);
            const lines = Array.isArray(vuln["Line Number"]) ? vuln["Line Number"].join("–") : "?";
            return (
              <div key={vi} style={{
                marginBottom: "10px",
                background: fixed ? "rgba(61,220,132,0.04)" : "#080f12",
                border: `1px solid ${fixed ? "rgba(61,220,132,0.22)" : "rgba(201,214,218,0.06)"}`,
                borderRadius: "8px", padding: "11px",
              }}>
                <div style={{
                  fontSize: "10px", fontWeight: 700, color: cat.color,
                  letterSpacing: "0.04em", marginBottom: "7px",
                }}>
                  📍 Lines {lines}
                </div>
                <pre style={{
                  margin: "0 0 8px", fontSize: "11px",
                  fontFamily: "'Cascadia Code','Fira Code','Consolas',monospace",
                  color: "#c9d6da", background: "#0d1117",
                  borderRadius: "5px", padding: "7px 9px",
                  border: "1px solid rgba(201,214,218,0.05)",
                  overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
                  lineHeight: 1.55,
                }}>
                  {vuln["Vulnerability Code"]}
                </pre>
                <p style={{ margin: 0, fontSize: "11.5px", color: "#8ba0a6", lineHeight: 1.55 }}>
                  💡 {vuln["Hint"]}
                </p>
                {fixed && (
                  <div style={{ marginTop: "7px", fontSize: "11px", fontWeight: 700, color: "#3ddc84" }}>
                    ✓ Vulnerability fixed!
                  </div>
                )}
              </div>
            );
          })}

          {justChecked && (
            <div style={{
              padding: "9px 12px", borderRadius: "7px", marginBottom: "10px",
              background: justFixed ? "rgba(61,220,132,0.1)" : "rgba(245,90,90,0.08)",
              border: `1px solid ${justFixed ? "rgba(61,220,132,0.3)" : "rgba(245,90,90,0.2)"}`,
              fontSize: "12px", fontWeight: 600,
              color: justFixed ? "#3ddc84" : isDone ? "#3ddc84" : "#ff8080",
            }}>
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
              style={{
                width: "100%",
                background: checking ? "rgba(201,214,218,0.05)" : cat.color,
                color: checking ? "#4a6570" : "#0d1a1f",
                border: "none",
                cursor: checking ? "not-allowed" : "pointer",
                padding: "9px 0", borderRadius: "7px",
                fontSize: "12.5px", fontWeight: 800,
                transition: "background 0.15s, color 0.15s",
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
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "14px",
        padding: "0 20px", height: "50px", flexShrink: 0,
        background: "#060c0f",
        borderBottom: "1px solid rgba(201,214,218,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "15px" }}>🛡️</span>
          <span style={{ fontSize: "13.5px", fontWeight: 800, color: "#e8f0f3", letterSpacing: "-0.01em" }}>
            Group Raid
          </span>
          <span style={{ color: "#4a6570", fontSize: "12px" }}>·</span>
          <span style={{ fontSize: "12px", color: "#f5b942", fontWeight: 600 }}>
            {codebaseName}
          </span>
          <span style={{
            fontSize: "10px", fontWeight: 700, color: "#f5b942",
            background: "rgba(245,185,66,0.12)", border: "1px solid rgba(245,185,66,0.25)",
            padding: "1px 8px", borderRadius: "999px",
          }}>
            {files.length} FILES
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "11px", color: "#4a6570", whiteSpace: "nowrap" }}>
            {totalFixed}/{totalVulns}
          </span>
          <div style={{
            width: "160px", height: "5px",
            background: "rgba(201,214,218,0.07)", borderRadius: "3px", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: "3px",
              width: `${pct}%`,
              background: "linear-gradient(90deg, #3ddc84, #22d3ee)",
              transition: "width 0.5s ease",
              boxShadow: "0 0 8px rgba(61,220,132,0.4)",
            }} />
          </div>
          <span style={{ fontSize: "11px", color: pct === 100 ? "#3ddc84" : "#8ba0a6", fontWeight: pct === 100 ? 700 : 400 }}>
            {pct}%
          </span>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "rgba(61,220,132,0.08)", border: "1px solid rgba(61,220,132,0.22)",
          borderRadius: "8px", padding: "5px 14px",
        }}>
          <span style={{ fontSize: "14px" }}>🏆</span>
          <span style={{ fontSize: "15px", fontWeight: 900, color: "#3ddc84", fontVariantNumeric: "tabular-nums" }}>
            {totalScore.toLocaleString()}
          </span>
          <span style={{ fontSize: "10px", color: "#4a6570" }}>pts</span>
        </div>
      </div>

      {/* ── Three-column layout ───────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>

        {/* Left: File tree */}
        <div style={{
          width: "250px", flexShrink: 0,
          background: "#060c0f",
          borderRight: "1px solid rgba(201,214,218,0.07)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "10px 14px 8px",
            borderBottom: "1px solid rgba(201,214,218,0.06)",
            flexShrink: 0, display: "flex", alignItems: "center", gap: "6px",
          }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#4a6570", letterSpacing: "0.07em", textTransform: "uppercase" }}>
              Explorer
            </span>
            <span style={{ fontSize: "10px", color: "#4a6570", marginLeft: "auto" }}>
              {files.length} files
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
            <FolderBranch
              node={fileTree}
              selectedPath={selectedPath}
              onSelect={handleFileSelect}
              progress={progress}
            />
          </div>
        </div>

        {/* Center: Ace Editor */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          minWidth: 0, minHeight: 0,
          background: "#1e1e1e",
        }}>
          <div style={{
            padding: "6px 16px",
            background: "#0d1117",
            borderBottom: "1px solid rgba(201,214,218,0.07)",
            display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
          }}>
            <span style={{ fontSize: "13px" }}>📄</span>
            <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#e8f0f3", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedPath ?? "No file selected"}
            </span>
            <span style={{
              fontSize: "10px", fontWeight: 700, color: "#22d3ee",
              background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)",
              padding: "2px 8px", borderRadius: "4px", flexShrink: 0,
            }}>
              C++
            </span>
            <span style={{ fontSize: "11px", color: "#4a6570", flexShrink: 0, whiteSpace: "nowrap" }}>
              {fileCatsDone}/5 done
            </span>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#4a6570", fontSize: "14px" }}>
                Select a file from the explorer
              </div>
            )}
          </div>
        </div>

        {/* Right: Vulnerability panel */}
        <div style={{
          width: "370px", flexShrink: 0,
          background: "#0a1419",
          borderLeft: "1px solid rgba(201,214,218,0.07)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "10px 16px",
            borderBottom: "1px solid rgba(201,214,218,0.07)",
            flexShrink: 0,
          }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#e8f0f3", letterSpacing: "-0.01em" }}>
              Vulnerability Hunter
            </div>
            <div style={{
              fontSize: "11px", color: "#4a6570", marginTop: "1px",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {selectedPath ? selectedPath.split("/").pop() : "Select a file to begin"}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {!selectedFile ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#4a6570", fontSize: "13px" }}>
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
            <div style={{
              padding: "10px 16px", flexShrink: 0,
              background: "rgba(245,90,90,0.07)",
              borderTop: "1px solid rgba(245,90,90,0.18)",
              fontSize: "11.5px", color: "#ff8080",
            }}>
              ✗ {lastCheck.error}
            </div>
          ) : (
            <div style={{
              padding: "11px 16px", flexShrink: 0,
              borderTop: "1px solid rgba(201,214,218,0.07)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: "11px", color: "#4a6570" }}>
                {selectedPath?.split("/").pop() ?? "File"} score
              </span>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "#3ddc84" }}>
                {fileScore} pts
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
