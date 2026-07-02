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

const C = {
  bg:     "#0d1a1f",
  panel:  "#0a1419",
  card:   "#0e191f",
  border: "rgba(201,214,218,0.07)",
  green:  "#3ddc84",
  gold:   "#f5b942",
  red:    "#ef4444",
  text:   "#e8f0f3",
  sub:    "#8ba0a6",
  muted:  "#4a6570",
};

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
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: C.bg, position: "relative", overflow: "hidden", minHeight: 0,
        backgroundImage: [
          "linear-gradient(rgba(201,214,218,0.02) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(201,214,218,0.02) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "48px 48px",
        gap: 32,
      }}>
        {children}
      </div>
    </>
  );

  // ── Expired ───────────────────────────────────────────────────
  if (phase === "expired" || phase === "cancelled") {
    return wrap(
      <div style={{ textAlign: "center", animation: "wt-float 0.4s ease forwards" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>⏰</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>
          {phase === "cancelled" ? "Raid Cancelled" : "Invitation Expired"}
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 28 }}>
          {phase === "cancelled"
            ? "A teammate cancelled the raid."
            : "Not everyone accepted in time."}
        </div>
        <button
          onClick={() => window.location.href = "/home"}
          style={{
            background: C.gold, color: "#0d1a1f", border: "none",
            borderRadius: 8, padding: "10px 28px",
            fontSize: 13, fontWeight: 800, cursor: "pointer",
          }}
        >
          Back to Home
        </button>
      </div>
    );
  }

  // ── All ready flash ───────────────────────────────────────────
  if (phase === "all_ready") {
    return wrap(
      <div style={{ textAlign: "center", animation: "wt-float 0.3s ease forwards" }}>
        <div style={{ fontSize: 56, marginBottom: 16, animation: "wt-check 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
          {teamEmoji}
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.green, marginBottom: 6, letterSpacing: "-0.02em" }}>
          All Ready!
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>Entering matchmaking…</div>
      </div>
    );
  }

  // ── Waiting ───────────────────────────────────────────────────
  const urgentColor = secondsLeft <= 30 ? C.red : secondsLeft <= 60 ? C.gold : C.green;
  const iAmInvitee  = invites.some((i) => i.inviteeClerkId === myClerkId);

  return wrap(
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, zIndex: 1, width: "100%", maxWidth: 440, padding: "0 24px" }}>

      {/* Team identity */}
      <div style={{ textAlign: "center", animation: "wt-float 0.4s ease forwards" }}>
        <div style={{ fontSize: 56, marginBottom: 10, animation: "wt-pulse 2s ease-in-out infinite" }}>
          {teamEmoji}
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: "-0.02em", marginBottom: 4 }}>
          {teamName}
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>
          {iAmInvitee ? "Waiting for your squad to get here…" : "Waiting for teammates to accept…"}
        </div>
      </div>

      {/* Member status cards */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
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
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 48, fontWeight: 900, color: urgentColor,
          fontVariantNumeric: "tabular-nums",
          textShadow: `0 0 24px ${urgentColor}55`,
          letterSpacing: "-0.04em", lineHeight: 1,
          transition: "color 0.3s",
        }}>
          {formatSeconds(secondsLeft)}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Time Remaining
        </div>
      </div>

      {/* Cancel */}
      <button
        onClick={handleCancel}
        style={{
          background: "transparent", border: `1px solid ${C.border}`,
          color: C.muted, borderRadius: 8, padding: "8px 28px",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = "rgba(201,214,218,0.3)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}
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

  const iconColor = accepted ? C.green : rejected ? C.red : C.gold;
  const icon      = accepted ? "✓" : rejected ? "✗" : "…";
  const label     = accepted ? "Ready" : rejected ? "Declined" : "Waiting";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px", borderRadius: 10,
      background: C.card, border: `1px solid ${iconColor}22`,
      animation: "wt-float 0.35s ease forwards",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: `${iconColor}12`,
        border: `1.5px solid ${iconColor}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 800, color: iconColor,
      }}>
        {(name || "?")[0].toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
          {name}{isMe ? " (you)" : ""}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: iconColor, fontWeight: 700 }}>{icon}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.08em", color: iconColor,
          background: `${iconColor}12`, border: `1px solid ${iconColor}30`,
          borderRadius: 99, padding: "2px 8px",
        }}>
          {label}
        </span>
      </div>
    </div>
  );
}
