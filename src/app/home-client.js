"use client";

import { useState } from "react";
import Link from "next/link";
import ReturnToDuelButton from "@/components/return-to-duel";
import OnlinePlayersWidget from "@/components/online-players";
import { FEATURES } from "@/lib/features";

// ── Constants ──────────────────────────────────────────────────
const ALL_CARDS = [
  {
    id:        "practice",
    label:     "Practice",
    icon:      "🎯",
    sub:       "SOLO MODE",
    desc:      "Debug real code at your own pace. Hunt bugs across Security, Performance, Scalability, Ethics, and Maintainability.",
    href:      "/duel",
    color:     "#22d3ee",
    cta:       "Start Practice →",
    available: true,
  },
  {
    id:        "duel",
    label:     "1v1 Duel",
    icon:      "⚔️",
    sub:       "LIVE PvP",
    desc:      "Race another engineer in real-time. First to find all five bug categories wins. Skill decides everything.",
    href:      "/live-battle",
    color:     "#3ddc84",
    cta:       "Find Opponent →",
    available: true,
  },
  {
    id:        "raid",
    label:     "Group Raid",
    icon:      "🛡️",
    sub:       "SQUADS",
    desc:      "Full codebase, divided by speciality. Navigate the file tree, hunt bugs by category, rack up team score.",
    href:      "/group-raid-page",
    color:     "#f5b942",
    cta:       "Launch Raid →",
    available: true,
  },
];

const CARDS = ALL_CARDS.filter(c => c.id !== "practice" || FEATURES.PRACTICE);
const DEFAULT_FOCUSED = Math.max(0, CARDS.findIndex(c => c.id === "duel"));

const TABS = [
  { label: "Questions Solved", icon: "📋" },
  { label: "Past Duels",       icon: "⚔️" },
  { label: "Group Raids",      icon: "🛡️" },
];

const RESULT = {
  win:  { emoji: "🏆", color: "#3ddc84", label: "WIN"  },
  loss: { emoji: "💀", color: "#ff5c5c", label: "LOSS" },
  draw: { emoji: "🤝", color: "#f5b942", label: "DRAW" },
};

// ── Helpers ────────────────────────────────────────────────────
function fmt(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString();
}

function timeAgo(d) {
  if (!d) return "";
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60)        return "just now";
  if (s < 3600)      return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)     return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

// ── Stat chip ─────────────────────────────────────────────────
function StatChip({ label, value, color }) {
  return (
    <div style={{
      background: "rgba(201,214,218,0.03)",
      border:     "1px solid rgba(201,214,218,0.08)",
      borderRadius: "14px",
      padding: "18px 28px",
      textAlign: "center",
      minWidth: "120px",
      flex: "1 1 120px",
      maxWidth: "170px",
    }}>
      <div style={{ fontSize: "28px", fontWeight: 900, color, lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div style={{ fontSize: "10.5px", color: "#4a6570", marginTop: "6px", letterSpacing: "0.07em", textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

const TEAM_LABELS  = ["Alpha", "Bravo"];
const TEAM_COLORS  = ["#3ddc84", "#22d3ee"];

// ── Expandable row shell ──────────────────────────────────────
function ExpandableRow({ header, children, accentColor }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: "#080f12",
      border: `1px solid ${open ? (accentColor + "38") : "rgba(201,214,218,0.07)"}`,
      borderRadius: "10px",
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      {/* Header row */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
          display: "flex", alignItems: "center", gap: "16px",
          padding: "13px 18px",
        }}
      >
        {header}
        <span style={{
          fontSize: "11px", color: "#4a6570", flexShrink: 0, marginLeft: "auto",
          transition: "transform 0.2s",
          display: "inline-block",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
        }}>
          ▾
        </span>
      </button>

      {/* Expanded body */}
      <div style={{
        maxHeight: open ? "400px" : "0px",
        overflow: "hidden",
        transition: "max-height 0.3s ease",
      }}>
        <div style={{
          borderTop: `1px solid ${accentColor}22`,
          padding: "16px 18px 18px",
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Duel history row ──────────────────────────────────────────
function DuelRow({ duel }) {
  const meta = RESULT[duel.result] ?? RESULT.draw;
  return (
    <ExpandableRow
      accentColor={meta.color}
      header={
        <>
          <div style={{ width: "42px", textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: "20px", lineHeight: 1 }}>{meta.emoji}</div>
            <div style={{ fontSize: "9px", fontWeight: 800, color: meta.color, letterSpacing: "0.06em", marginTop: "2px" }}>
              {meta.label}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#e8f0f3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {duel.challengeSlot}
            </div>
            <div style={{ fontSize: "11.5px", color: "#4a6570", marginTop: "2px" }}>
              vs {duel.opponentName}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: "13.5px", fontWeight: 700, color: meta.color }}>
              {duel.myScore} <span style={{ color: "#4a6570", fontWeight: 400, fontSize: "12px" }}>vs</span> {duel.opponentScore}
            </div>
            <div style={{ fontSize: "10.5px", color: "#4a6570", marginTop: "2px" }}>{timeAgo(duel.startedAt)}</div>
          </div>
        </>
      }
    >
      {/* Summary card */}
      <div style={{ display: "flex", gap: "32px", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#3ddc84", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>You</div>
          <div style={{ fontSize: "36px", fontWeight: 900, color: "#e8f0f3" }}>{duel.myScore}</div>
          <div style={{ fontSize: "11px", color: "#4a6570", marginTop: "3px" }}>pts</div>
        </div>
        <div style={{ fontSize: "16px", fontWeight: 900, color: "#4a6570" }}>VS</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#22d3ee", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>{duel.opponentName}</div>
          <div style={{ fontSize: "36px", fontWeight: 900, color: "#e8f0f3" }}>{duel.opponentScore}</div>
          <div style={{ fontSize: "11px", color: "#4a6570", marginTop: "3px" }}>pts</div>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: "12px", fontSize: "11px", color: "#4a6570" }}>
        {duel.challengeSlot} · Match #{duel.matchId}
      </div>
    </ExpandableRow>
  );
}

// ── Group Raid history row ────────────────────────────────────
function RaidRow({ raid }) {
  const meta     = RESULT[raid.result] ?? RESULT.draw;
  const myTeam   = raid.teams?.find((t) => t.teamId === raid.myTeamId);
  const opp      = raid.teams?.find((t) => t.teamId !== raid.myTeamId);
  const myTeamColor  = TEAM_COLORS[raid.myTeamId ?? 0];
  const oppTeamColor = TEAM_COLORS[raid.myTeamId === 0 ? 1 : 0];

  return (
    <ExpandableRow
      accentColor={meta.color}
      header={
        <>
          <div style={{ width: "42px", textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: "20px", lineHeight: 1 }}>{meta.emoji}</div>
            <div style={{ fontSize: "9px", fontWeight: 800, color: meta.color, letterSpacing: "0.06em", marginTop: "2px" }}>
              {meta.label}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#e8f0f3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {raid.codebaseFolder}
            </div>
            <div style={{ fontSize: "11.5px", color: "#4a6570", marginTop: "2px" }}>
              Team {TEAM_LABELS[raid.myTeamId ?? 0]} vs Team {TEAM_LABELS[raid.myTeamId === 0 ? 1 : 0]}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: "13.5px", fontWeight: 700, color: meta.color }}>
              {myTeam?.totalScore ?? 0}{" "}
              <span style={{ color: "#4a6570", fontWeight: 400, fontSize: "12px" }}>vs</span>{" "}
              {opp?.totalScore ?? 0}
            </div>
            <div style={{ fontSize: "10.5px", color: "#4a6570", marginTop: "2px" }}>{timeAgo(raid.startedAt)}</div>
          </div>
        </>
      }
    >
      {/* Summary card: two teams side by side */}
      <div style={{ display: "flex", gap: "16px" }}>
        {[myTeam, opp].filter(Boolean).map((team, i) => {
          const color    = i === 0 ? myTeamColor : oppTeamColor;
          const isWinner = raid.winnerTeam === team.teamId;
          return (
            <div key={team.teamId} style={{
              flex: 1,
              background: `${color}08`,
              border: `1px solid ${color}25`,
              borderRadius: "8px",
              padding: "12px 14px",
            }}>
              <div style={{ fontSize: "10px", fontWeight: 800, color, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
                Team {TEAM_LABELS[team.teamId]}{isWinner ? " 🏆" : ""}
                {i === 0 && <span style={{ color: "#4a6570", fontWeight: 400 }}> (You)</span>}
              </div>
              {team.players.map((p) => (
                <div key={p.clerkId} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "2px 0",
                }}>
                  <span style={{ fontSize: "12px", color: p.isMe ? "#e8f0f3" : "#8ba0a6", fontWeight: p.isMe ? 700 : 400 }}>
                    {p.isMe ? "◆ " : ""}{p.displayName}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color }}>{p.totalScore} pts</span>
                </div>
              ))}
              <div style={{
                marginTop: "8px", paddingTop: "6px",
                borderTop: `1px solid ${color}20`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: "10px", color: "#4a6570", textTransform: "uppercase", letterSpacing: "0.06em" }}>Team Total</span>
                <span style={{ fontSize: "14px", fontWeight: 900, color }}>{team.totalScore}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: "center", marginTop: "10px", fontSize: "11px", color: "#4a6570" }}>
        {raid.codebaseFolder} · Raid #{raid.matchId}
      </div>
    </ExpandableRow>
  );
}

// ── Question row ──────────────────────────────────────────────
function QuestionRow({ duel }) {
  const meta = RESULT[duel.result] ?? RESULT.draw;
  return (
    <ExpandableRow
      accentColor={meta.color}
      header={
        <>
          <div style={{ fontSize: "18px", flexShrink: 0 }}>📄</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#e8f0f3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {duel.challengeSlot}
            </div>
            <div style={{ fontSize: "11px", color: "#4a6570", marginTop: "2px" }}>{timeAgo(duel.startedAt)}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: meta.color }}>{duel.myScore} pts</div>
            <div style={{ fontSize: "10px", color: meta.color, marginTop: "2px", letterSpacing: "0.04em" }}>
              {meta.emoji} {meta.label}
            </div>
          </div>
        </>
      }
    >
      <div style={{ display: "flex", gap: "32px", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#3ddc84", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>You</div>
          <div style={{ fontSize: "36px", fontWeight: 900, color: "#e8f0f3" }}>{duel.myScore}</div>
          <div style={{ fontSize: "11px", color: "#4a6570", marginTop: "3px" }}>pts</div>
        </div>
        <div style={{ fontSize: "16px", fontWeight: 900, color: "#4a6570" }}>VS</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#22d3ee", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>{duel.opponentName}</div>
          <div style={{ fontSize: "36px", fontWeight: 900, color: "#e8f0f3" }}>{duel.opponentScore}</div>
          <div style={{ fontSize: "11px", color: "#4a6570", marginTop: "3px" }}>pts</div>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: "12px", fontSize: "11px", color: "#4a6570" }}>
        {duel.challengeSlot} · Match #{duel.matchId}
      </div>
    </ExpandableRow>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ icon, msg, hint, href, cta }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ fontSize: "36px", marginBottom: "14px" }}>{icon}</div>
      <p style={{ fontSize: "15px", color: "#8ba0a6", margin: "0 0 6px" }}>{msg}</p>
      {hint && <p style={{ fontSize: "13px", color: "#4a6570", margin: "0 0 20px" }}>{hint}</p>}
      {href && cta && (
        <Link href={href} style={{
          background: "#3ddc84", color: "#0d1a1f",
          textDecoration: "none", padding: "10px 24px",
          borderRadius: "7px", fontSize: "13px", fontWeight: 800,
        }}>
          {cta}
        </Link>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function HomeClient({ stats, history = [], raidHistory = [] }) {
  const [focused,    setFocused]    = useState(DEFAULT_FOCUSED);
  const [activeTab,  setActiveTab]  = useState(0);

  const hasStats = !!stats;

  return (
    <div style={{
      backgroundImage: [
        "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(61,220,132,0.1), transparent 65%)",
        "linear-gradient(rgba(201,214,218,0.022) 1px, transparent 1px)",
        "linear-gradient(90deg, rgba(201,214,218,0.022) 1px, transparent 1px)",
      ].join(", "),
      backgroundSize: "100% 100%, 44px 44px, 44px 44px",
    }}>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section style={{
        maxWidth: "1100px", margin: "0 auto",
        padding: "72px 40px 52px",
        position: "relative",
      }}>
        {/* Return-to-duel badge — top-right of hero */}
        <div style={{ position: "absolute", top: "24px", right: "40px" }}>
          <ReturnToDuelButton />
        </div>

        {/* Welcome + name */}
        <div style={{ textAlign: "center", marginBottom: "44px" }}>
          <p style={{
            fontSize: "12px", fontWeight: 700, color: "#3ddc84",
            letterSpacing: "0.1em", textTransform: "uppercase",
            margin: "0 0 10px",
          }}>
            {hasStats ? "Welcome back," : "Welcome to"}
          </p>
          <h1 style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 900, letterSpacing: "-0.03em",
            color: "#e8f0f3", margin: 0, lineHeight: 1.1,
          }}>
            {hasStats ? stats.name : "DebugRoyale"}
          </h1>
          {!hasStats && (
            <p style={{ fontSize: "15px", color: "#8ba0a6", margin: "12px 0 0", lineHeight: 1.6 }}>
              The competitive arena where engineers hunt bugs — category by category, round by round.
            </p>
          )}
        </div>

        {/* Trophy number */}
        <div style={{ textAlign: "center", marginBottom: "44px", position: "relative" }}>
          {/* Glow behind number */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "300px", height: "180px",
            background: "radial-gradient(ellipse, rgba(61,220,132,0.15), transparent 70%)",
            pointerEvents: "none",
          }} />

          <div style={{ fontSize: "52px", lineHeight: 1, marginBottom: "0px" }}>🏆</div>
          <div style={{
            fontSize: "clamp(80px, 13vw, 130px)",
            fontWeight: 900,
            color: "#3ddc84",
            lineHeight: 1.0,
            letterSpacing: "-0.04em",
            textShadow: "0 0 48px rgba(61,220,132,0.45), 0 0 100px rgba(61,220,132,0.2)",
            fontVariantNumeric: "tabular-nums",
          }}>
            {hasStats ? fmt(stats.bestScore) : "—"}
          </div>
          <div style={{
            fontSize: "11px", color: "#4a6570",
            letterSpacing: "0.1em", textTransform: "uppercase",
            marginTop: "6px",
          }}>
            Bug Slayer Score
          </div>
        </div>

        {/* Stats row */}
        {hasStats ? (
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <StatChip label="Total Points"  value={fmt(stats.totalPoints)}        color="#22d3ee" />
            <StatChip label="Wins"          value={fmt(stats.wins)}               color="#3ddc84" />
            <StatChip label="Losses"        value={fmt(stats.losses)}             color="#ff5c5c" />
            <StatChip label="Practiced"     value={fmt(stats.questionsPracticed)} color="#a78bfa" />
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <Link href="/sign-in" style={{
              display: "inline-block",
              background: "#3ddc84", color: "#0d1a1f",
              textDecoration: "none", padding: "13px 32px",
              borderRadius: "8px", fontSize: "14px", fontWeight: 800,
              boxShadow: "0 0 40px rgba(61,220,132,0.25)",
            }}>
              Sign In to See Your Stats →
            </Link>
          </div>
        )}
      </section>

      {/* ── Carousel ──────────────────────────────────────────── */}
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "8px 40px 64px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h2 style={{
            fontSize: "clamp(18px, 3vw, 24px)",
            fontWeight: 800, color: "#e8f0f3",
            letterSpacing: "-0.02em", margin: "0 0 6px",
          }}>
            Choose Your Arena
          </h2>
          <p style={{ fontSize: "13px", color: "#4a6570", margin: 0 }}>
            Hover a card to explore each mode
          </p>
        </div>

        <div
          onMouseLeave={() => setFocused(DEFAULT_FOCUSED)}
          style={{
            display: "flex", gap: "20px",
            justifyContent: "center", alignItems: "center",
            minHeight: "310px",
          }}
        >
          {CARDS.map((card, i) => {
            const isActive = focused === i;
            return (
              <div
                key={card.id}
                onMouseEnter={() => setFocused(i)}
                onClick={() => setFocused(i)}
                style={{
                  flexShrink: 0,
                  width:      isActive ? "360px" : "215px",
                  minHeight:  isActive ? "290px" : "220px",
                  transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                  opacity:    isActive ? 1 : 0.48,
                  background: isActive ? `${card.color}0c` : "rgba(8,15,18,0.7)",
                  border:     `1px solid ${isActive ? card.color + "48" : "rgba(201,214,218,0.06)"}`,
                  borderRadius: "20px",
                  padding:    isActive ? "32px 28px" : "24px 20px",
                  cursor:     "pointer",
                  boxShadow:  isActive
                    ? `0 0 0 1px ${card.color}20, 0 16px 56px ${card.color}18, 0 4px 20px rgba(0,0,0,0.3)`
                    : "none",
                  transform:  isActive ? "translateY(-10px)" : "translateY(0)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: "10px",
                  textAlign: "center",
                  overflow: "hidden",
                }}
              >
                {/* Sub-label */}
                <div style={{
                  fontSize: "9px", fontWeight: 800, letterSpacing: "0.1em",
                  color: isActive ? card.color : "#4a6570",
                  textTransform: "uppercase",
                  transition: "color 0.35s",
                }}>
                  {card.sub}
                </div>

                {/* Icon */}
                <div style={{
                  fontSize: isActive ? "60px" : "40px",
                  lineHeight: 1,
                  transition: "font-size 0.35s",
                  marginBottom: "2px",
                }}>
                  {card.icon}
                </div>

                {/* Title */}
                <div style={{
                  fontSize: isActive ? "22px" : "15px",
                  fontWeight: 900,
                  color: isActive ? "#e8f0f3" : "#8ba0a6",
                  letterSpacing: "-0.02em",
                  transition: "all 0.35s",
                }}>
                  {card.label}
                </div>

                {/* Description — only when active */}
                <div style={{
                  fontSize: "13px", color: "#8ba0a6",
                  lineHeight: 1.6, margin: "0",
                  maxHeight: isActive ? "120px" : "0px",
                  overflow: "hidden",
                  transition: "max-height 0.4s ease, opacity 0.35s",
                  opacity: isActive ? 1 : 0,
                }}>
                  {card.desc}
                </div>

                {/* CTA — only when active */}
                <div style={{
                  marginTop: "auto",
                  maxHeight: isActive ? "60px" : "0px",
                  overflow: "hidden",
                  transition: "max-height 0.4s ease, opacity 0.35s",
                  opacity: isActive ? 1 : 0,
                  width: "100%",
                  display: "flex", justifyContent: "center",
                }}>
                  {card.available ? (
                    <Link href={card.href} style={{
                      display: "inline-block",
                      background: card.color, color: "#0d1a1f",
                      textDecoration: "none",
                      padding: "11px 28px",
                      borderRadius: "9px",
                      fontSize: "13px", fontWeight: 800,
                      boxShadow: `0 0 28px ${card.color}48`,
                      letterSpacing: "-0.01em",
                    }}>
                      {card.cta}
                    </Link>
                  ) : (
                    <span style={{
                      display: "inline-block",
                      background: "transparent", color: card.color,
                      border: `1px solid ${card.color}48`,
                      padding: "11px 28px",
                      borderRadius: "9px",
                      fontSize: "13px", fontWeight: 700,
                    }}>
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Online players indicator */}
        <OnlinePlayersWidget />
      </section>

      {/* ── Activity Tabs ──────────────────────────────────────── */}
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 40px 100px" }}>

        {/* Tab bar */}
        <div style={{
          display: "flex", gap: "0",
          borderBottom: "1px solid rgba(201,214,218,0.08)",
          marginBottom: "28px",
        }}>
          {TABS.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              style={{
                background: "none", border: "none",
                borderBottom: `2px solid ${activeTab === i ? "#3ddc84" : "transparent"}`,
                color: activeTab === i ? "#3ddc84" : "#4a6570",
                padding: "10px 18px",
                fontSize: "13px", fontWeight: activeTab === i ? 700 : 400,
                cursor: "pointer",
                transition: "all 0.15s",
                marginBottom: "-1px",
                display: "flex", alignItems: "center", gap: "6px",
              }}
            >
              <span style={{ fontSize: "14px" }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {!hasStats ? (
          <EmptyState
            icon="🔐"
            msg="Sign in to see your activity"
            hint="Your solved questions and duel history will appear here."
            href="/sign-in"
            cta="Sign In →"
          />

        ) : activeTab === 0 ? (
          /* Questions Solved */
          history.length === 0 ? (
            <EmptyState
              icon="📋"
              msg="No questions solved yet."
              hint="Complete a duel to see your history here."
              href="/live-battle"
              cta="Start a Duel →"
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {history.map((d) => <QuestionRow key={d.matchId} duel={d} />)}
            </div>
          )

        ) : activeTab === 1 ? (
          /* Past Duels */
          history.length === 0 ? (
            <EmptyState
              icon="⚔️"
              msg="No duels on record yet."
              hint="Complete a 1v1 duel for it to appear here."
              href="/live-battle"
              cta="Find an Opponent →"
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {history.map((d) => <DuelRow key={d.matchId} duel={d} />)}
            </div>
          )

        ) : (
          /* Group Raids */
          raidHistory.length === 0 ? (
            <EmptyState
              icon="🛡️"
              msg="No group raids completed yet."
              hint="Tackle a full codebase with your team — divide by speciality, hunt every category."
              href="/group-raid-page"
              cta="Start a Group Raid →"
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {raidHistory.map((r) => <RaidRow key={r.matchId} raid={r} />)}
            </div>
          )
        )}
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(201,214,218,0.07)" }}>
      <footer style={{
        maxWidth: "1100px", margin: "0 auto",
        padding: "24px 40px",
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <span style={{ fontSize: "14px", fontWeight: 900, color: "#3ddc84", letterSpacing: "-0.02em" }}>Debug</span>
          <span style={{ fontSize: "14px", fontWeight: 900, color: "#e8f0f3", letterSpacing: "-0.02em" }}>Royale</span>
        </div>
        <span style={{ fontSize: "12px", color: "#4a6570" }}>Powered by Groq — Competitive Code Review Arena</span>
      </footer>
      </div>
    </div>
  );
}
