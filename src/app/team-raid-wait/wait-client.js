"use client";

import { useEffect, useRef, useState } from "react";
import RaidMatchmakingClient from "@/app/group-raid-page/raid-matchmaking-client";

const KEYFRAMES = `
@keyframes wt-float {
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes wt-pulse {
  0%, 100% { opacity: 0.5; transform: scale(0.95); }
  50%       { opacity: 1;   transform: scale(1.05); }
}
@keyframes wt-check {
  0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
  60%  { transform: scale(1.3) rotate(4deg); opacity: 1; }
  100% { transform: scale(1) rotate(0);      opacity: 1; }
}
`;

function formatSeconds(s) {
  if (s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function TeamRaidWaitClient({
  myName, myClerkId, teamGroupId, teamId, initialTeamName, initialTeamEmoji,
}) {
  const [phase, setPhase] = useState("waiting"); // waiting | all_ready | matchmaking | expired | cancelled
  const [invites, setInvites] = useState([]);
  const [teamName, setTeamName] = useState(initialTeamName);
  const [teamEmoji, setTeamEmoji] = useState(initialTeamEmoji);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [partnerName, setPartnerName] = useState(null);

  const pollRef  = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    let active = true;

    const tick = async () => {
      if (!active) return;
      try {
        const r = await fetch(`/api/teams/${teamId}/raid-status?teamGroupId=${teamGroupId}`);
        if (!r.ok || !active) return;
        const data = await r.json();

        if (data.teamName)  setTeamName(data.teamName);
        if (data.teamEmoji) setTeamEmoji(data.teamEmoji);
        setInvites(data.invites ?? []);

        // Update countdown from server's expiresAt
        if (data.expiresAt) {
          const secs = Math.max(0, Math.round((new Date(data.expiresAt) - Date.now()) / 1000));
          setSecondsLeft(secs);
          if (secs === 0 && active) {
            active = false;
            clearInterval(pollRef.current);
            setPhase("expired");
            return;
          }
        }

        if (!active) return;
        if (data.anyCancelled) { active = false; clearInterval(pollRef.current); setPhase("cancelled"); return; }
        if (data.anyExpired)   { active = false; clearInterval(pollRef.current); setPhase("expired");   return; }

        if (data.allAccepted && data.invites.length > 0) {
          active = false;
          clearInterval(pollRef.current);
          // Find partner name (first accepted invitee who isn't me, or just the first invitee)
          const partner = data.invites.find((i) => i.inviteeClerkId !== myClerkId)
                       ?? data.invites[0];
          setPartnerName(partner?.inviteeName ?? "Teammate");
          setPhase("all_ready");
          // Brief "All ready!" flash before entering matchmaking
          setTimeout(() => setPhase("matchmaking"), 1800);
        }
      } catch {}
    };

    tick();
    pollRef.current = setInterval(tick, 2000);
    return () => { active = false; clearInterval(pollRef.current); };
  }, [teamGroupId, teamId, myClerkId]);

  // Client-side countdown backup (decrement every second)
  useEffect(() => {
    if (phase !== "waiting") return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          setPhase("expired");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  async function handleCancel() {
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
    try { await fetch("/api/raid/queue/cancel", { method: "DELETE" }); } catch {}
    window.location.href = "/home";
  }

  // ── Matchmaking phase — hand off to the existing client ──────────
  if (phase === "matchmaking") {
    return (
      <RaidMatchmakingClient
        myName={myName}
        myClerkId={myClerkId}
        teamGroupId={teamGroupId}
        partnerName={partnerName ?? "Teammate"}
        teamName={teamName}
        onBack={() => window.location.href = "/home"}
      />
    );
  }

  const wrap = (children) => (
    <>
      <style>{KEYFRAMES}</style>
      <div
        className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-hidden bg-background"
        style={{
          backgroundImage: [
            "linear-gradient(color-mix(in oklab, var(--foreground) 8%, transparent) 1px, transparent 1px)",
            "linear-gradient(90deg, color-mix(in oklab, var(--foreground) 8%, transparent) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "48px 48px",
        }}
      >
        {children}
      </div>
    </>
  );

  // ── Expired ───────────────────────────────────────────────────
  if (phase === "expired" || phase === "cancelled") {
    return wrap(
      <div className="text-center" style={{ animation: "wt-float 0.4s ease forwards" }}>
        <div className="mb-4 text-[52px]">⏰</div>
        <div className="mb-2 text-lg font-extrabold text-foreground">
          {phase === "cancelled" ? "Raid Cancelled" : "Invitation Expired"}
        </div>
        <div className="mb-7 text-[13px] text-foreground-subtle">
          {phase === "cancelled"
            ? "A teammate cancelled the raid."
            : "Not everyone accepted in time."}
        </div>
        <button
          onClick={() => window.location.href = "/home"}
          className="rounded-lg bg-signal-performance px-7 py-2.5 text-[13px] font-extrabold text-background"
        >
          Back to Home
        </button>
      </div>
    );
  }

  // ── All ready flash ───────────────────────────────────────────
  if (phase === "all_ready") {
    return wrap(
      <div className="text-center" style={{ animation: "wt-float 0.3s ease forwards" }}>
        <div className="mb-4 text-[56px]" style={{ animation: "wt-check 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
          {teamEmoji}
        </div>
        <div className="mb-1.5 text-xl font-black tracking-[-0.02em] text-signal-scalability">
          All Ready!
        </div>
        <div className="text-[13px] text-foreground-subtle">Entering matchmaking…</div>
      </div>
    );
  }

  // ── Waiting ───────────────────────────────────────────────────
  const urgentColor = secondsLeft <= 30 ? "var(--signal-security)" : secondsLeft <= 60 ? "var(--signal-performance)" : "var(--signal-scalability)";
  const iAmInvitee  = invites.some((i) => i.inviteeClerkId === myClerkId);

  return wrap(
    <div className="z-[1] flex w-full max-w-[440px] flex-col items-center gap-8 px-6">

      {/* Team identity */}
      <div className="text-center" style={{ animation: "wt-float 0.4s ease forwards" }}>
        <div className="mb-2.5 text-[56px]" style={{ animation: "wt-pulse 2s ease-in-out infinite" }}>
          {teamEmoji}
        </div>
        <div className="mb-1 text-[22px] font-black tracking-[-0.02em] text-foreground">
          {teamName}
        </div>
        <div className="text-xs text-foreground-subtle">
          {iAmInvitee ? "Waiting for your squad to get here…" : "Waiting for teammates to accept…"}
        </div>
      </div>

      {/* Member status cards */}
      <div className="flex w-full flex-col gap-2">
        {/* Captain (you, if you're captain) */}
        <MemberStatusRow
          name={myName}
          isMe={true}
          status="accepted"
          isVisible={!iAmInvitee}
        />

        {/* Invitees */}
        {invites.map((inv) => (
          <MemberStatusRow
            key={inv.id}
            name={inv.inviteeName}
            isMe={inv.inviteeClerkId === myClerkId}
            status={inv.status}
          />
        ))}
      </div>

      {/* Countdown */}
      <div className="text-center">
        <div
          className="font-mono text-[48px] font-black leading-none tracking-[-0.04em] transition-colors duration-300"
          style={{
            color: urgentColor,
            fontVariantNumeric: "tabular-nums",
            textShadow: `0 0 24px color-mix(in oklab, ${urgentColor} 55%, transparent)`,
          }}
        >
          {formatSeconds(secondsLeft)}
        </div>
        <div className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-foreground-subtle">
          Time Remaining
        </div>
      </div>

      {/* Cancel */}
      <button
        onClick={handleCancel}
        className="rounded-lg border border-border px-7 py-2 text-[13px] font-semibold text-foreground-subtle transition-colors hover:border-border-strong hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  );
}

function MemberStatusRow({ name, isMe, status, isVisible = true }) {
  if (!isVisible) return null;

  const accepted = status === "accepted";
  const rejected = status === "rejected" || status === "expired";

  const iconColor = accepted ? "var(--signal-scalability)" : rejected ? "var(--signal-security)" : "var(--signal-performance)";
  const icon      = accepted ? "✓" : rejected ? "✗" : "…";
  const label     = accepted ? "Ready" : rejected ? "Declined" : "Waiting";

  return (
    <div
      className="flex items-center gap-3 rounded-[10px] bg-surface-2 px-4 py-3"
      style={{
        border: `1px solid color-mix(in oklab, ${iconColor} 22%, transparent)`,
        animation: "wt-float 0.35s ease forwards",
      }}
    >
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
        style={{
          background: `color-mix(in oklab, ${iconColor} 12%, transparent)`,
          border: `1.5px solid color-mix(in oklab, ${iconColor} 44%, transparent)`,
          color: iconColor,
        }}
      >
        {(name || "?")[0].toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-bold text-foreground">
          {name}{isMe ? " (you)" : ""}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        <span className="text-xs font-bold" style={{ color: iconColor }}>{icon}</span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
          style={{
            color: iconColor,
            background: `color-mix(in oklab, ${iconColor} 12%, transparent)`,
            border: `1px solid color-mix(in oklab, ${iconColor} 30%, transparent)`,
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
