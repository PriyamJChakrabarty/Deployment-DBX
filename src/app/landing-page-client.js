"use client";

import { useLayoutEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import LandingBattleDemo from "@/app/landing-battle-demo";

gsap.registerPlugin(ScrollTrigger);

const ScannerField = dynamic(() => import("@/components/scanner-field"), { ssr: false });

const MODES = [
  {
    icon: "🎯",
    label: "Practice",
    sub: "SOLO MODE",
    desc: "Debug real codebases at your own pace. Hunt across Security, Performance, Scalability, Ethics, and Maintainability.",
    color: "#2dd881",
  },
  {
    icon: "⚔️",
    label: "1v1 Duel",
    sub: "LIVE PvP",
    desc: "Race another engineer in real-time. First to find all five bug categories wins. Pure skill, zero luck.",
    color: "#ff5d3a",
  },
  {
    icon: "🛡️",
    label: "Group Raid",
    sub: "SQUADS",
    desc: "Form a team, divide by specialty, and assault a full codebase together. First squad to max score wins.",
    color: "#b794f6",
  },
];

export default function LandingPageClient() {
  const rootRef = useRef(null);
  const badgeRef = useRef(null);
  const headlineRefs = useRef([]);
  const ctaRef = useRef(null);
  const cardsSectionRef = useRef(null);
  const cardRefs = useRef([]);
  const demoSectionRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(badgeRef.current, { y: -16, opacity: 0, duration: 0.6 })
        .from(
          headlineRefs.current,
          { yPercent: 120, opacity: 0, duration: 0.85, stagger: 0.12 },
          "-=0.3"
        )
        .from(ctaRef.current?.children ?? [], { y: 20, opacity: 0, duration: 0.6, stagger: 0.1 }, "-=0.4");

      if (cardRefs.current.length) {
        gsap.from(cardRefs.current, {
          y: 56,
          opacity: 0,
          duration: 0.7,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: cardsSectionRef.current,
            start: "top 82%",
          },
        });
      }

      if (demoSectionRef.current) {
        gsap.from(demoSectionRef.current, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: demoSectionRef.current,
            start: "top 85%",
          },
        });
      }
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      {/* Top bar */}
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/90 px-6 backdrop-blur-md sm:px-10">
        <div className="flex items-center gap-0.5 font-display text-lg font-bold tracking-tight">
          <span className="text-foreground">Debug</span>
          <span className="text-brand">Royale</span>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/sign-in"
            className="rounded-full border border-border-strong px-4 py-1.5 text-sm font-semibold text-foreground-muted transition-colors hover:text-foreground"
          >
            Log In
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full bg-brand px-5 py-1.5 text-sm font-bold text-background shadow-[0_0_24px_var(--brand-dim)] transition-transform hover:scale-[1.03]"
          >
            Sign Up Free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24 text-center sm:py-28">
        <ScannerField className="z-0" accent="#ff5d3a" density={700} intensity={0.9} />

        {/* HUD grid texture */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: [
              "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px)",
              "linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 60% 60% at 50% 40%, black, transparent)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div
            ref={badgeRef}
            className="mb-7 inline-flex items-center rounded-full border border-brand/25 bg-brand-dim px-3.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-brand"
          >
            Threat Detected — Enter The Arena
          </div>

          <h1 className="mb-6 font-display text-[clamp(2.5rem,7vw,4.5rem)] font-bold leading-[1.05] tracking-tight text-foreground">
            <span ref={(el) => (headlineRefs.current[0] = el)} className="block overflow-hidden">
              Debug Code.
            </span>
            <span ref={(el) => (headlineRefs.current[1] = el)} className="block overflow-hidden">
              <span className="text-brand">Beat</span> Opponents.
            </span>
            <span ref={(el) => (headlineRefs.current[2] = el)} className="block overflow-hidden">
              <span className="text-signal-performance">Climb</span> the Ranks.
            </span>
          </h1>

          <p className="mx-auto mb-11 max-w-xl text-lg leading-relaxed text-foreground-muted">
            Hunt real bugs across five categories — Security, Performance, Scalability, Ethics, and
            Maintainability — in live competitive matches against other engineers.
          </p>

          <div ref={ctaRef} className="flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/sign-up"
              className="rounded-xl bg-brand px-8 py-3.5 text-[15px] font-extrabold tracking-tight text-background shadow-[0_0_32px_var(--brand-dim)] transition-transform hover:scale-[1.03]"
            >
              Start for Free →
            </Link>
            <Link
              href="/sign-in"
              className="rounded-xl border border-border-strong px-8 py-3.5 text-[15px] font-semibold text-foreground transition-colors hover:bg-surface"
            >
              Log In
            </Link>
          </div>
        </div>
      </section>

      <div ref={demoSectionRef}>
        <LandingBattleDemo />
      </div>

      {/* Game modes */}
      <section
        ref={cardsSectionRef}
        className="flex flex-col items-center gap-12 px-6 pb-24 sm:px-10"
      >
        <div className="text-center font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-foreground-subtle">
          Three ways to compete
        </div>

        <div className="flex w-full max-w-5xl flex-wrap justify-center gap-5">
          {MODES.map(({ icon, label, sub, desc, color }, i) => (
            <div
              key={label}
              ref={(el) => (cardRefs.current[i] = el)}
              className="flex-1 rounded-2xl border p-7"
              style={{
                minWidth: "260px",
                maxWidth: "300px",
                borderColor: `${color}30`,
                background: "color-mix(in oklab, var(--surface) 92%, transparent)",
              }}
            >
              <div className="mb-4 text-4xl">{icon}</div>
              <div
                className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em]"
                style={{ color }}
              >
                {sub}
              </div>
              <div className="mb-2.5 font-display text-lg font-bold tracking-tight text-foreground">
                {label}
              </div>
              <div className="text-[13px] leading-relaxed text-foreground-muted">{desc}</div>
            </div>
          ))}
        </div>

        <Link
          href="/sign-up"
          className="border-b border-brand/30 pb-0.5 text-sm font-bold text-brand"
        >
          Create your account and enter the arena →
        </Link>
      </section>

      {/* Footer */}
      <footer className="flex items-center justify-center border-t border-border px-10 py-5 font-mono text-xs text-foreground-subtle">
        DebugRoyale
      </footer>
    </div>
  );
}
