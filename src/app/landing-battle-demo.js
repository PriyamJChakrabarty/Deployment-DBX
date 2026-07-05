"use client";

import { useEffect, useRef, useState } from "react";

const GREEN = "#3ddc84";
const GOLD  = "#f5b942";
const CYAN  = "#22d3ee";
const RED   = "#ef4444";
const TEXT  = "#e8f0f3";
const SUB   = "#8ba0a6";
const MUTED = "#4a6570";
const CARD  = "#0e191f";
const BORDER = "rgba(201,214,218,0.08)";

const KEYFRAMES = `
@keyframes ld-float-in-left  { from { transform: translateX(-140px) scale(0.7); opacity: 0; } to { transform: translateX(0) scale(1); opacity: 1; } }
@keyframes ld-float-in-right { from { transform: translateX(140px)  scale(0.7); opacity: 0; } to { transform: translateX(0) scale(1); opacity: 1; } }
@keyframes ld-sword-drop {
  0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
  60%  { transform: scale(1.25) rotate(5deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes ld-glow-pulse {
  0%, 100% { box-shadow: 0 0 0px rgba(61,220,132,0); }
  50%      { box-shadow: 0 0 36px rgba(61,220,132,0.45); }
}
@keyframes ld-battle-zoom {
  0%   { transform: scale(0.4); opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes ld-flash {
  0%   { opacity: 0; }
  30%  { opacity: 0.55; }
  100% { opacity: 0; }
}
@keyframes ld-cursor-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
@keyframes ld-bot-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}
@keyframes ld-dot-bounce {
  0%, 80%, 100% { transform: scale(0.4); opacity: 0.4; }
  40%           { transform: scale(1);   opacity: 1; }
}
@keyframes ld-line-flash {
  0%   { background: rgba(61,220,132,0); }
  30%  { background: rgba(61,220,132,0.24); }
  100% { background: rgba(61,220,132,0); }
}
@keyframes ld-badge-pop {
  0%   { transform: scale(0.4) translateY(6px); opacity: 0; }
  18%  { transform: scale(1.08) translateY(0);   opacity: 1; }
  28%  { transform: scale(1) translateY(0);      opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: scale(1) translateY(-4px);   opacity: 0; }
}
`;

// ── The "generated" file — good code stays untouched, only bug lines change ──
const CODE = [
  "function getUser(id) {",
  '  const query = "SELECT * FROM users WHERE id=" + id;',
  "  return db.query(query);",
  "}",
  "",
  "function calculateTotal(items) {",
  "  let total = 0;",
  "  for (let i = 0; i <= items.length; i++) {",
  "    total += items[i].price;",
  "  }",
  "  return total;",
  "}",
  "",
  "function isAdmin(user) {",
  '  return user.role === "admin";',
  "}",
  "",
  "function hashPassword(pw) {",
  "  return md5(pw);",
  "}",
];

// Each bug can touch more than one line — e.g. fixing the SQL injection means
// both parameterizing the query *and* passing the bound value into db.query().
const BUGS = [
  {
    label: "SQL Injection", category: "Security", color: RED, primaryLine: 1,
    edits: [
      { line: 1, fixed: '  const query = "SELECT * FROM users WHERE id = ?";' },
      { line: 2, fixed: "  return db.query(query, [id]);" },
    ],
  },
  {
    label: "Off-by-One Loop", category: "Performance", color: GOLD, primaryLine: 7,
    edits: [
      { line: 7, fixed: "  for (let i = 0; i < items.length; i++) {" },
    ],
  },
  {
    label: "Weak Password Hashing", category: "Security", color: RED, primaryLine: 18,
    edits: [
      { line: 18, fixed: "  return bcrypt.hashSync(pw, 12);" },
    ],
  },
];

// lineIndex -> { fixed, bug, bugIdx } for quick lookup while rendering
const LINE_EDITS = new Map();
BUGS.forEach((bug, bugIdx) => {
  bug.edits.forEach((edit) => LINE_EDITS.set(edit.line, { ...edit, bug, bugIdx }));
});

const FULL_TEXT     = CODE.join("\n");
const LINE_HEIGHT   = 30;
const PANEL_HEIGHT  = 400;
const TITLE_BAR_HEIGHT = 46;
const CODE_PAD_Y    = 14;
const VIEWPORT_HEIGHT = PANEL_HEIGHT - TITLE_BAR_HEIGHT;
const CONTENT_HEIGHT  = CODE.length * LINE_HEIGHT + CODE_PAD_Y * 2;
const MAX_SCROLL    = Math.max(0, CONTENT_HEIGHT - VIEWPORT_HEIGHT);

function computeScroll(lineIdx) {
  const lineTop = CODE_PAD_Y + lineIdx * LINE_HEIGHT;
  const target = lineTop - (VIEWPORT_HEIGHT - LINE_HEIGHT * 3);
  return Math.min(MAX_SCROLL, Math.max(0, target));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function LandingBattleDemo() {
  const [phase, setPhase]           = useState("intro-vs");
  const [typedLen, setTypedLen]     = useState(0);
  const [linesState, setLinesState] = useState(CODE);
  const [scrollOffset, setScroll]   = useState(0);
  const [highlightLines, setHighlightLines] = useState([]);
  const [flashLines, setFlashLines] = useState([]);
  const [badgeBug, setBadgeBug]     = useState(null);
  const [activeBug, setActiveBug]   = useState(0);

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    async function run() {
      while (!cancelledRef.current) {
        // ── Reset ──
        setPhase("intro-vs");
        setTypedLen(0);
        setLinesState(CODE);
        setScroll(0);
        setHighlightLines([]);
        setFlashLines([]);
        setBadgeBug(null);
        setActiveBug(0);

        await wait(1800);
        if (cancelledRef.current) return;

        setPhase("intro-zoom");
        await wait(2200);
        if (cancelledRef.current) return;

        // ── AI types out the code ──
        setPhase("typing");
        let len = 0;
        while (len < FULL_TEXT.length) {
          if (cancelledRef.current) return;
          len = Math.min(FULL_TEXT.length, len + 1);
          setTypedLen(len);
          const lineIdx = FULL_TEXT.slice(0, len).split("\n").length - 1;
          setScroll(computeScroll(lineIdx));
          await wait(22);
        }
        await wait(900);
        if (cancelledRef.current) return;

        // ── User scrolls back up to review ──
        setPhase("scrolling");
        setScroll(0);
        await wait(1400);
        if (cancelledRef.current) return;

        // ── User fixes each bug in place, good code untouched ──
        setPhase("fixing");
        for (let i = 0; i < BUGS.length; i++) {
          if (cancelledRef.current) return;
          const bug = BUGS[i];
          const bugLines = bug.edits.map((e) => e.line);
          setActiveBug(i);
          setHighlightLines(bugLines);
          setScroll(computeScroll(bug.primaryLine));
          await wait(1100);
          if (cancelledRef.current) return;

          setLinesState((prev) => {
            const next = prev.slice();
            bug.edits.forEach((edit) => { next[edit.line] = edit.fixed; });
            return next;
          });
          setHighlightLines([]);
          setFlashLines(bugLines);
          setBadgeBug(i);
          await wait(1900);
          if (cancelledRef.current) return;

          setFlashLines([]);
          setBadgeBug(null);
          await wait(650);
        }

        setPhase("complete");
        setActiveBug(BUGS.length);
        await wait(3200);
      }
    }

    run();
    return () => { cancelledRef.current = true; };
  }, []);

  const showingLines = phase === "typing"
    ? FULL_TEXT.slice(0, typedLen).split("\n")
    : linesState;

  const header = {
    "intro-vs":   { title: "Live Preview", sub: "Player 1 vs. Player 2" },
    "intro-zoom": { title: "Live Preview", sub: "Player 1 vs. Player 2" },
    typing:       { title: "AI is generating code", sub: "Drafting a first pass…" },
    scrolling:    { title: "Reviewing the diff", sub: "Scrolling back to the top…" },
    fixing:       { title: `Fixing bug ${Math.min(activeBug + 1, BUGS.length)} of ${BUGS.length}`, sub: BUGS[activeBug]?.label ?? "" },
    complete:     { title: "All bugs squashed", sub: `${BUGS.length} issues found & fixed` },
  }[phase];

  const isIntro = phase === "intro-vs" || phase === "intro-zoom";

  return (
    <section style={{ padding: "0 32px 80px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <style>{KEYFRAMES}</style>

      <div style={{
        fontSize: "13px", fontWeight: 800, letterSpacing: "0.14em",
        textTransform: "uppercase", color: "#4a6570",
        textAlign: "center", marginBottom: "36px",
      }}>
        Watch a real bug hunt
      </div>

      <div style={{
        position: "relative", width: "100%", maxWidth: "980px",
        height: "660px", overflow: "hidden",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        {/* subtle grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: [
            "linear-gradient(rgba(201,214,218,0.025) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(201,214,218,0.025) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "36px 36px",
        }} />

        {isIntro && (
          <>
            {phase === "intro-zoom" && (
              <div style={{
                position: "absolute", inset: 0, background: "white",
                animation: "ld-flash 0.6s ease-out forwards",
                pointerEvents: "none", zIndex: 2,
              }} />
            )}

            {phase === "intro-vs" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "52px", zIndex: 1 }}>
                <p style={{ fontSize: "15px", fontWeight: 700, color: GREEN, letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>
                  Match Found!
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "64px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", animation: "ld-float-in-left 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
                    <div style={{ animation: "ld-glow-pulse 1.5s ease-in-out infinite" }}>
                      <div style={{
                        width: 108, height: 108, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${GREEN}30, ${GREEN}08)`,
                        border: `3px solid ${GREEN}60`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46,
                      }}>
                        🧑‍💻
                      </div>
                    </div>
                    <span style={{ fontSize: "17px", fontWeight: 700, color: TEXT }}>Player 1</span>
                  </div>

                  <div style={{ fontSize: "60px", animation: "ld-sword-drop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both" }}>
                    ⚔️
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", animation: "ld-float-in-right 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
                    <div style={{ animation: "ld-glow-pulse 1.5s ease-in-out 0.75s infinite" }}>
                      <div style={{
                        width: 108, height: 108, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${CYAN}30, ${CYAN}08)`,
                        border: `3px solid ${CYAN}60`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46,
                      }}>
                        👩‍💻
                      </div>
                    </div>
                    <span style={{ fontSize: "17px", fontWeight: 700, color: CYAN }}>Player 2</span>
                  </div>
                </div>
              </div>
            )}

            {phase === "intro-zoom" && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "22px",
                animation: "ld-battle-zoom 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards", zIndex: 1,
              }}>
                <div style={{ fontSize: "72px" }}>⚔️</div>
                <h3 style={{
                  fontSize: "clamp(40px, 6vw, 64px)", fontWeight: 900, letterSpacing: "-0.03em",
                  color: TEXT, margin: 0, textShadow: `0 0 60px ${GREEN}55`,
                }}>
                  BATTLE STARTS
                </h3>
              </div>
            )}
          </>
        )}

        {!isIntro && (
          <div style={{ position: "relative", zIndex: 1, width: "100%", padding: "0 40px", boxSizing: "border-box" }}>
            {/* AI / status header */}
            <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "22px" }}>
              <div style={{
                width: 68, height: 68, borderRadius: "50%", flexShrink: 0,
                background: `radial-gradient(circle at 35% 30%, ${CYAN}22, transparent)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "ld-bot-bob 2.6s ease-in-out infinite",
              }}>
                <img src="/images/robo.png" alt="AI" style={{
                  width: 56, height: 56, objectFit: "contain",
                  filter: phase === "typing" ? `drop-shadow(0 0 12px ${CYAN}88)` : "none",
                }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "19px", fontWeight: 800, color: TEXT }}>{header.title}</span>
                  {phase === "typing" && (
                    <div style={{ display: "flex", gap: "4px" }}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} style={{
                          width: "5px", height: "5px", borderRadius: "50%", background: CYAN,
                          animation: `ld-dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }} />
                      ))}
                    </div>
                  )}
                  {phase === "complete" && <span style={{ fontSize: 18 }}>🎉</span>}
                </div>
                <div style={{ fontSize: "15px", color: phase === "fixing" ? (BUGS[activeBug]?.color ?? MUTED) : MUTED, fontWeight: phase === "fixing" ? 700 : 400 }}>
                  {header.sub}
                </div>
              </div>
            </div>

            {/* Code panel */}
            <div style={{
              height: PANEL_HEIGHT, borderRadius: "14px", overflow: "hidden",
              background: CARD, border: `1px solid ${BORDER}`,
              boxShadow: phase === "complete" ? `0 0 40px ${GREEN}22` : "none",
              transition: "box-shadow 0.6s ease",
            }}>
              {/* fake title bar */}
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "13px 20px", borderBottom: `1px solid ${BORDER}`,
              }}>
                <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#ef4444a0" }} />
                <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#f5b942a0" }} />
                <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#3ddc84a0" }} />
                <span style={{ fontSize: "13px", color: MUTED, marginLeft: "10px", fontFamily: "monospace" }}>
                  generated_code.js
                </span>
              </div>

              <div style={{ position: "relative", height: PANEL_HEIGHT - 46, overflow: "hidden" }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0,
                  transform: `translateY(-${scrollOffset}px)`,
                  transition: phase === "scrolling" ? "transform 1.4s cubic-bezier(0.65,0,0.35,1)" : "transform 0.2s linear",
                  padding: "14px 0",
                }}>
                  {showingLines.map((lineText, i) => {
                    const editAtLine = LINE_EDITS.get(i);
                    const isFixedNow = editAtLine && linesState[i] === editAtLine.fixed;
                    const isHighlighted = highlightLines.includes(i);
                    const isFlashing = flashLines.includes(i);
                    const isLastTyping = phase === "typing" && i === showingLines.length - 1;

                    return (
                      <div key={i} style={{
                        position: "relative",
                        height: LINE_HEIGHT, lineHeight: `${LINE_HEIGHT}px`,
                        display: "flex", alignItems: "center",
                        padding: "0 20px",
                        background: isHighlighted ? `${editAtLine?.bug.color ?? GOLD}16` : "transparent",
                        borderLeft: isHighlighted ? `4px solid ${editAtLine?.bug.color ?? GOLD}` : "4px solid transparent",
                        animation: isFlashing ? "ld-line-flash 0.5s ease-out" : "none",
                        whiteSpace: "pre",
                      }}>
                        <span style={{ width: 34, flexShrink: 0, fontSize: 13, color: "#3a4f56", fontFamily: "monospace", userSelect: "none" }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 16, fontFamily: "'Fira Code', Consolas, monospace", color: editAtLine && !isFixedNow ? "#f0a3a3" : TEXT }}>
                          {lineText}
                          {isLastTyping && (
                            <span style={{
                              display: "inline-block", width: 9, height: 18, marginLeft: 2,
                              background: CYAN, verticalAlign: "middle",
                              animation: "ld-cursor-blink 0.9s steps(1) infinite",
                            }} />
                          )}
                        </span>
                        {isFixedNow && (
                          <span style={{ marginLeft: 12, fontSize: 13, color: GREEN, fontWeight: 700, flexShrink: 0 }}>
                            ✓ fixed
                          </span>
                        )}

                        {badgeBug !== null && BUGS[badgeBug].primaryLine === i && (
                          <div style={{
                            position: "absolute", right: 20, top: -38,
                            display: "flex", alignItems: "center", gap: "6px",
                            background: `${BUGS[badgeBug].color}18`,
                            border: `1px solid ${BUGS[badgeBug].color}55`,
                            borderRadius: "999px", padding: "6px 16px",
                            fontSize: "13px", fontWeight: 700, color: BUGS[badgeBug].color,
                            animation: "ld-badge-pop 1.9s ease forwards",
                            whiteSpace: "nowrap", zIndex: 3,
                          }}>
                            ✓ Fixed: {BUGS[badgeBug].label}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
