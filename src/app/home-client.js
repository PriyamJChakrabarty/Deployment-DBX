"use client";

import { useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import gsap from "gsap";
import ReturnToDuelButton from "@/components/return-to-duel";
import OnlinePlayersWidget from "@/components/online-players";
import { FEATURES } from "@/lib/features";
import { COLORS, RESULT_COLORS } from "@/lib/theme";

const ScannerField = dynamic(() => import("@/components/scanner-field"), { ssr: false });

// ── Constants ──────────────────────────────────────────────────
const ALL_CARDS = [
  {
    id:        "practice",
    label:     "Practice",
    icon:      "🎯",
    sub:       "SOLO MODE",
    desc:      "Debug real code at your own pace. Hunt bugs across Security, Performance, Scalability, Ethics, and Maintainability.",
    href:      "/duel",
    color:     "#2dd881",
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
    color:     COLORS.brand,
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
    color:     "#b794f6",
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
  win:  { emoji: "🏆", color: RESULT_COLORS.win,  label: "WIN"  },
  loss: { emoji: "💀", color: RESULT_COLORS.loss, label: "LOSS" },
  draw: { emoji: "🤝", color: RESULT_COLORS.draw, label: "DRAW" },
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
function StatChip({ label, value, color, chipRef }) {
  return (
    <div
      ref={chipRef}
      className="flex-1 rounded-2xl border border-border px-7 py-4.5 text-center"
      style={{ minWidth: "120px", maxWidth: "170px", background: "color-mix(in oklab, var(--surface) 60%, transparent)" }}
    >
      <div className="text-[28px] font-black leading-none tracking-tight" style={{ color }}>
        {value}
      </div>
      <div className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.07em] text-foreground-subtle">
        {label}
      </div>
    </div>
  );
}

const TEAM_LABELS  = ["Alpha", "Bravo"];
const TEAM_COLORS  = [COLORS.brand, "#22d3ee"];

// ── Expandable row shell ──────────────────────────────────────
function ExpandableRow({ header, children, accentColor }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="overflow-hidden rounded-[10px] border transition-colors"
      style={{ background: COLORS.background, borderColor: open ? `${accentColor}38` : COLORS.border }}
    >
      {/* Header row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-4 px-4.5 py-3.5 text-left"
      >
        {header}
        <span
          className="ml-auto flex-shrink-0 text-[11px] text-foreground-subtle transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ▾
        </span>
      </button>

      {/* Expanded body */}
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: open ? "400px" : "0px" }}
      >
        <div className="border-t px-4.5 pb-4.5 pt-4" style={{ borderColor: `${accentColor}22` }}>
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
          <div className="w-[42px] flex-shrink-0 text-center">
            <div className="text-xl leading-none">{meta.emoji}</div>
            <div className="mt-0.5 font-mono text-[9px] font-extrabold tracking-[0.06em]" style={{ color: meta.color }}>
              {meta.label}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-foreground">
              {duel.challengeSlot}
            </div>
            <div className="mt-0.5 text-[11.5px] text-foreground-subtle">
              vs {duel.opponentName}
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-[13.5px] font-bold" style={{ color: meta.color }}>
              {duel.myScore} <span className="text-[12px] font-normal text-foreground-subtle">vs</span> {duel.opponentScore}
            </div>
            <div className="mt-0.5 text-[10.5px] text-foreground-subtle">{timeAgo(duel.startedAt)}</div>
          </div>
        </>
      }
    >
      <div className="flex items-center justify-center gap-8">
        <div className="text-center">
          <div className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: RESULT_COLORS.win }}>You</div>
          <div className="text-[36px] font-black text-foreground">{duel.myScore}</div>
          <div className="mt-0.5 text-[11px] text-foreground-subtle">pts</div>
        </div>
        <div className="text-base font-black text-foreground-subtle">VS</div>
        <div className="text-center">
          <div className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-signal-ethics">{duel.opponentName}</div>
          <div className="text-[36px] font-black text-foreground">{duel.opponentScore}</div>
          <div className="mt-0.5 text-[11px] text-foreground-subtle">pts</div>
        </div>
      </div>
      <div className="mt-3 text-center text-[11px] text-foreground-subtle">
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
          <div className="w-[42px] flex-shrink-0 text-center">
            <div className="text-xl leading-none">{meta.emoji}</div>
            <div className="mt-0.5 font-mono text-[9px] font-extrabold tracking-[0.06em]" style={{ color: meta.color }}>
              {meta.label}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-foreground">
              {raid.codebaseFolder}
            </div>
            <div className="mt-0.5 text-[11.5px] text-foreground-subtle">
              Team {TEAM_LABELS[raid.myTeamId ?? 0]} vs Team {TEAM_LABELS[raid.myTeamId === 0 ? 1 : 0]}
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-[13.5px] font-bold" style={{ color: meta.color }}>
              {myTeam?.totalScore ?? 0}{" "}
              <span className="text-[12px] font-normal text-foreground-subtle">vs</span>{" "}
              {opp?.totalScore ?? 0}
            </div>
            <div className="mt-0.5 text-[10.5px] text-foreground-subtle">{timeAgo(raid.startedAt)}</div>
          </div>
        </>
      }
    >
      <div className="flex gap-4">
        {[myTeam, opp].filter(Boolean).map((team, i) => {
          const color    = i === 0 ? myTeamColor : oppTeamColor;
          const isWinner = raid.winnerTeam === team.teamId;
          return (
            <div
              key={team.teamId}
              className="flex-1 rounded-lg border p-3.5"
              style={{ background: `${color}08`, borderColor: `${color}25` }}
            >
              <div className="mb-2 font-mono text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color }}>
                Team {TEAM_LABELS[team.teamId]}{isWinner ? " 🏆" : ""}
                {i === 0 && <span className="font-normal text-foreground-subtle"> (You)</span>}
              </div>
              {team.players.map((p) => (
                <div key={p.clerkId} className="flex items-center justify-between py-0.5">
                  <span className={`text-xs ${p.isMe ? "font-bold text-foreground" : "text-foreground-muted"}`}>
                    {p.isMe ? "◆ " : ""}{p.displayName}
                  </span>
                  <span className="text-xs font-bold" style={{ color }}>{p.totalScore} pts</span>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t pt-1.5" style={{ borderColor: `${color}20` }}>
                <span className="text-[10px] uppercase tracking-[0.06em] text-foreground-subtle">Team Total</span>
                <span className="text-sm font-black" style={{ color }}>{team.totalScore}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 text-center text-[11px] text-foreground-subtle">
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
          <div className="flex-shrink-0 text-lg">📄</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-foreground">
              {duel.challengeSlot}
            </div>
            <div className="mt-0.5 text-[11px] text-foreground-subtle">{timeAgo(duel.startedAt)}</div>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-[13px] font-bold" style={{ color: meta.color }}>{duel.myScore} pts</div>
            <div className="mt-0.5 text-[10px] tracking-[0.04em]" style={{ color: meta.color }}>
              {meta.emoji} {meta.label}
            </div>
          </div>
        </>
      }
    >
      <div className="flex items-center justify-center gap-8">
        <div className="text-center">
          <div className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: RESULT_COLORS.win }}>You</div>
          <div className="text-[36px] font-black text-foreground">{duel.myScore}</div>
          <div className="mt-0.5 text-[11px] text-foreground-subtle">pts</div>
        </div>
        <div className="text-base font-black text-foreground-subtle">VS</div>
        <div className="text-center">
          <div className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-signal-ethics">{duel.opponentName}</div>
          <div className="text-[36px] font-black text-foreground">{duel.opponentScore}</div>
          <div className="mt-0.5 text-[11px] text-foreground-subtle">pts</div>
        </div>
      </div>
      <div className="mt-3 text-center text-[11px] text-foreground-subtle">
        {duel.challengeSlot} · Match #{duel.matchId}
      </div>
    </ExpandableRow>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ icon, msg, hint, href, cta }) {
  return (
    <div className="py-14 text-center">
      <div className="mb-3.5 text-4xl">{icon}</div>
      <p className="mb-1.5 text-[15px] text-foreground-muted">{msg}</p>
      {hint && <p className="mb-5 text-[13px] text-foreground-subtle">{hint}</p>}
      {href && cta && (
        <Link href={href} className="rounded-lg bg-brand px-6 py-2.5 text-[13px] font-extrabold text-background">
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

  const heroRef = useRef(null);
  const trophyRef = useRef(null);
  const statChipRefs = useRef([]);
  const cardRefs = useRef([]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      if (trophyRef.current) {
        const counter = { value: 0 };
        const target = hasStats ? Number(stats.bestScore) || 0 : 0;
        tl.from(trophyRef.current, { y: 20, opacity: 0, duration: 0.6 }, 0);
        if (hasStats) {
          tl.to(
            counter,
            {
              value: target,
              duration: 1.2,
              ease: "power2.out",
              onUpdate: () => {
                if (trophyRef.current) trophyRef.current.textContent = fmt(Math.round(counter.value));
              },
            },
            0.1
          );
        }
      }

      if (statChipRefs.current.length) {
        tl.from(statChipRefs.current, { y: 16, opacity: 0, duration: 0.5, stagger: 0.08 }, 0.3);
      }

      if (cardRefs.current.length) {
        tl.from(cardRefs.current, { y: 24, opacity: 0, duration: 0.55, stagger: 0.1 }, 0.4);
      }
    }, heroRef);

    return () => ctx.revert();
  }, [hasStats]);

  useLayoutEffect(() => {
    const card = cardRefs.current[focused];
    if (!card) return;
    gsap.fromTo(
      card,
      { boxShadow: "0 0 0 0 rgba(255,93,58,0)" },
      { boxShadow: "0 0 0 1px rgba(255,93,58,0.15)", duration: 0.35, ease: "power2.out" }
    );
  }, [focused]);

  return (
    <div ref={heroRef} className="relative">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-10 pb-13 pt-18">
        <ScannerField className="z-0" accent={COLORS.brand} density={360} intensity={0.5} />

        <div className="relative z-10 mx-auto max-w-[1100px]">
          {/* Return-to-duel badge — top-right of hero */}
          <div className="absolute right-0 top-6">
            <ReturnToDuelButton />
          </div>

          {/* Welcome + name */}
          <div className="mb-11 text-center">
            <p className="mb-2.5 font-mono text-xs font-bold uppercase tracking-[0.1em] text-brand">
              {hasStats ? "Welcome back," : "Welcome to"}
            </p>
            <h1 className="text-[clamp(28px,5vw,42px)] font-bold leading-tight tracking-tight text-foreground font-display">
              {hasStats ? stats.name : "DebugRoyale"}
            </h1>
            {!hasStats && (
              <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-foreground-muted">
                The competitive arena where engineers hunt bugs — category by category, round by round.
              </p>
            )}
          </div>

          {/* Trophy number */}
          <div className="relative mb-11 text-center">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: "300px", height: "180px", background: "radial-gradient(ellipse, var(--brand-dim), transparent 70%)" }}
            />

            <div className="mb-0 text-[52px] leading-none">🏆</div>
            <div
              ref={trophyRef}
              className="font-display text-[clamp(80px,13vw,130px)] font-bold leading-none tracking-tight text-brand text-glow-brand"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {hasStats ? fmt(stats.bestScore) : "—"}
            </div>
            <div className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-foreground-subtle">
              Bug Slayer Score
            </div>
          </div>

          {/* Stats row */}
          {hasStats ? (
            <div className="flex flex-wrap justify-center gap-3.5">
              <StatChip chipRef={(el) => (statChipRefs.current[0] = el)} label="Total Points"  value={fmt(stats.totalPoints)}        color="#22d3ee" />
              <StatChip chipRef={(el) => (statChipRefs.current[1] = el)} label="Wins"          value={fmt(stats.wins)}               color="#2dd881" />
              <StatChip chipRef={(el) => (statChipRefs.current[2] = el)} label="Losses"        value={fmt(stats.losses)}             color="#ff3b5c" />
              <StatChip chipRef={(el) => (statChipRefs.current[3] = el)} label="Practiced"     value={fmt(stats.questionsPracticed)} color="#b794f6" />
            </div>
          ) : (
            <div className="text-center">
              <Link
                href="/sign-in"
                className="inline-block rounded-lg bg-brand px-8 py-3.5 text-sm font-extrabold text-background shadow-[0_0_40px_var(--brand-dim)]"
              >
                Sign In to See Your Stats →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Carousel ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1100px] px-10 pb-16 pt-2">
        <div className="mb-9 text-center">
          <h2 className="mb-1.5 font-display text-[clamp(18px,3vw,24px)] font-bold tracking-tight text-foreground">
            Choose Your Arena
          </h2>
          <p className="text-[13px] text-foreground-subtle">
            Hover a card to explore each mode
          </p>
        </div>

        <div
          onMouseLeave={() => setFocused(DEFAULT_FOCUSED)}
          className="flex items-center justify-center gap-5"
          style={{ minHeight: "310px" }}
        >
          {CARDS.map((card, i) => {
            const isActive = focused === i;
            return (
              <div
                key={card.id}
                ref={(el) => (cardRefs.current[i] = el)}
                onMouseEnter={() => setFocused(i)}
                onClick={() => setFocused(i)}
                className="flex flex-shrink-0 cursor-pointer flex-col items-center gap-2.5 overflow-hidden rounded-[20px] border text-center transition-all duration-[350ms]"
                style={{
                  width:      isActive ? "360px" : "215px",
                  minHeight:  isActive ? "290px" : "220px",
                  opacity:    isActive ? 1 : 0.48,
                  background: isActive ? `${card.color}0c` : "color-mix(in oklab, var(--surface) 70%, transparent)",
                  borderColor: isActive ? `${card.color}48` : "var(--border)",
                  padding:    isActive ? "32px 28px" : "24px 20px",
                  boxShadow:  isActive
                    ? `0 0 0 1px ${card.color}20, 0 16px 56px ${card.color}18, 0 4px 20px rgba(0,0,0,0.3)`
                    : "none",
                  transform:  isActive ? "translateY(-10px)" : "translateY(0)",
                }}
              >
                {/* Sub-label */}
                <div
                  className="font-mono text-[9px] font-extrabold uppercase tracking-[0.1em] transition-colors duration-[350ms]"
                  style={{ color: isActive ? card.color : "var(--foreground-subtle)" }}
                >
                  {card.sub}
                </div>

                {/* Icon */}
                <div
                  className="mb-0.5 leading-none transition-[font-size] duration-[350ms]"
                  style={{ fontSize: isActive ? "60px" : "40px" }}
                >
                  {card.icon}
                </div>

                {/* Title */}
                <div
                  className="font-display font-bold tracking-tight transition-all duration-[350ms]"
                  style={{ fontSize: isActive ? "22px" : "15px", color: isActive ? "var(--foreground)" : "var(--foreground-muted)" }}
                >
                  {card.label}
                </div>

                {/* Description — only when active */}
                <div
                  className="overflow-hidden text-[13px] leading-relaxed text-foreground-muted transition-[max-height,opacity] duration-[400ms]"
                  style={{ maxHeight: isActive ? "120px" : "0px", opacity: isActive ? 1 : 0 }}
                >
                  {card.desc}
                </div>

                {/* CTA — only when active */}
                <div
                  className="mt-auto flex w-full justify-center overflow-hidden transition-[max-height,opacity] duration-[400ms]"
                  style={{ maxHeight: isActive ? "60px" : "0px", opacity: isActive ? 1 : 0 }}
                >
                  {card.available ? (
                    <Link
                      href={card.href}
                      className="inline-block rounded-[9px] px-7 py-2.5 text-[13px] font-extrabold tracking-tight text-background"
                      style={{ background: card.color, boxShadow: `0 0 28px ${card.color}48` }}
                    >
                      {card.cta}
                    </Link>
                  ) : (
                    <span
                      className="inline-block rounded-[9px] border px-7 py-2.5 text-[13px] font-bold"
                      style={{ color: card.color, borderColor: `${card.color}48` }}
                    >
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
      <section className="mx-auto max-w-[1100px] px-10 pb-24">

        {/* Tab bar */}
        <div className="mb-7 flex border-b border-border">
          {TABS.map((tab, i) => {
            const isActive = activeTab === i;
            return (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-4.5 py-2.5 text-[13px] transition-all ${
                  isActive ? "border-brand font-bold text-brand" : "border-transparent font-normal text-foreground-subtle"
                }`}
              >
                <span className="text-sm">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
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
            <div className="flex flex-col gap-2">
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
            <div className="flex flex-col gap-2">
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
            <div className="flex flex-col gap-2">
              {raidHistory.map((r) => <RaidRow key={r.matchId} raid={r} />)}
            </div>
          )
        )}
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="border-t border-border">
        <footer className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-10 py-6">
          <div className="flex items-center gap-0.5 font-display text-sm font-bold tracking-tight">
            <span className="text-foreground">Debug</span>
            <span className="text-brand">Royale</span>
          </div>
          <span className="text-xs text-foreground-subtle">Powered by Groq — Competitive Code Review Arena</span>
        </footer>
      </div>
    </div>
  );
}
