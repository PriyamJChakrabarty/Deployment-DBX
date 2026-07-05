"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const KEYFRAMES = `
@keyframes bubble-drop {
  0%   { transform: translateY(-8px) scale(0.95); opacity: 0; }
  60%  { transform: translateY(2px)  scale(1.01); opacity: 1; }
  100% { transform: translateY(0)    scale(1);    opacity: 1; }
}
@keyframes bell-ring {
  0%,100% { transform: rotate(0deg); }
  15%      { transform: rotate(18deg); }
  30%      { transform: rotate(-14deg); }
  45%      { transform: rotate(10deg); }
  60%      { transform: rotate(-6deg); }
  75%      { transform: rotate(3deg); }
}
@keyframes badge-pop {
  0%   { transform: scale(0); }
  70%  { transform: scale(1.2); }
  100% { transform: scale(1); }
}
`;

export default function RaidNotificationBell() {
  const [isOpen,         setIsOpen]         = useState(false);
  const [pending,        setPending]        = useState([]);
  const [challenges,     setChallenges]     = useState([]);
  const [teamChallenges, setTeamChallenges] = useState([]);
  const [ringing,        setRinging]        = useState(false);
  const [authFailed,     setAuthFailed]     = useState(false);
  const wrapperRef   = useRef(null);
  const prevCountRef = useRef(0);
  const router       = useRouter();

  // Poll for raid invites + duel challenges + team challenges every 5s
  useEffect(() => {
    if (authFailed) return;
    let active = true;

    const tick = async () => {
      if (!active) return;
      try {
        const [raidRes, duelRes, teamRes] = await Promise.all([
          fetch("/api/raid/invite/pending"),
          fetch("/api/duel/challenge/pending"),
          fetch("/api/team-challenge/pending"),
        ]);
        if (raidRes.status === 401) { setAuthFailed(true); return; }
        if (!active) return;

        const raidData = raidRes.ok ? await raidRes.json() : {};
        const duelData = duelRes.ok ? await duelRes.json() : [];
        const teamData = teamRes.ok ? await teamRes.json() : [];
        const invites  = raidData.invites ?? [];
        const duels    = Array.isArray(duelData) ? duelData : [];
        const teams    = Array.isArray(teamData) ? teamData : [];
        const total    = invites.length + duels.length + teams.length;

        if (total > prevCountRef.current) {
          setRinging(true);
          setTimeout(() => setRinging(false), 700);
        }
        prevCountRef.current = total;
        setPending(invites);
        setChallenges(duels);
        setTeamChallenges(teams);
      } catch {}
    };

    tick();
    const id = setInterval(tick, 5000);
    return () => { active = false; clearInterval(id); };
  }, [authFailed]);

  // Close bubble on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isOpen]);

  async function handleAccept(invite) {
    try {
      const r    = await fetch(`/api/raid/invite/${invite.id}/accept`, { method: "POST" });
      const data = await r.json();
      if (data.teamGroupId) {
        setPending([]);
        setIsOpen(false);
        if (data.sourceTeamId) {
          router.push(`/team-raid-lobby/${data.teamGroupId}`);
        } else {
          router.push(`/group-raid-page?teamGroupId=${data.teamGroupId}&partnerName=${encodeURIComponent(data.inviterName ?? "")}`);
        }
      }
    } catch {}
  }

  async function handleReject(invite) {
    try { await fetch(`/api/raid/invite/${invite.id}/reject`, { method: "POST" }); } catch {}
    setPending((prev) => prev.filter((i) => i.id !== invite.id));
  }

  async function handleChallengeAccept(ch) {
    try {
      const r = await fetch(`/api/duel/challenge/${ch.id}/accept`, { method: "POST" });
      if (r.ok) {
        setChallenges((prev) => prev.filter((c) => c.id !== ch.id));
        setIsOpen(false);
        router.push(`/duel-challenge/${ch.id}`);
      }
    } catch {}
  }

  async function handleChallengeReject(ch) {
    try { await fetch(`/api/duel/challenge/${ch.id}/reject`, { method: "POST" }); } catch {}
    setChallenges((prev) => prev.filter((c) => c.id !== ch.id));
  }

  function handleTeamChallengeView(tc) {
    setIsOpen(false);
    router.push(`/team-challenge/${tc.id}`);
  }

  async function handleTeamChallengeAccept(tc) {
    try {
      const r = await fetch(`/api/team-challenge/${tc.id}/accept`, { method: "POST" });
      if (r.ok) {
        setTeamChallenges((prev) => prev.filter((c) => c.id !== tc.id));
        setIsOpen(false);
        router.push(`/team-challenge/${tc.id}`);
      }
    } catch {}
  }

  async function handleTeamChallengeReject(tc) {
    try { await fetch(`/api/team-challenge/${tc.id}/reject`, { method: "POST" }); } catch {}
    setTeamChallenges((prev) => prev.filter((c) => c.id !== tc.id));
  }

  const count     = pending.length + challenges.length + teamChallenges.length;
  const topInvite = pending[0] ?? null;
  const topDuel   = challenges[0] ?? null;
  const topTeam   = teamChallenges[0] ?? null;

  return (
    <>
      <style>{KEYFRAMES}</style>

      <div ref={wrapperRef} className="relative flex items-center">
        {/* Bell button */}
        <button
          onClick={() => setIsOpen((o) => !o)}
          className="relative flex items-center justify-center rounded-lg px-2 py-1.5 transition-colors hover:bg-signal-performance/10"
          title="Raid Invitations"
        >
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke={count > 0 ? "#ffb020" : "#6b7280"}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: ringing ? "bell-ring 0.7s ease" : "none", display: "block" }}
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>

          {count > 0 && (
            <span
              className="absolute right-[3px] top-[3px] flex h-[15px] w-[15px] items-center justify-center rounded-full border-[1.5px] border-background bg-signal-security text-[9px] font-extrabold leading-none text-white"
              style={{ animation: "badge-pop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
            >
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>

        {/* Speech bubble dropdown */}
        {isOpen && (
          <div
            className="absolute right-0 top-[calc(100%+10px)] z-[200] w-[280px] rounded-tr-[4px] rounded-bl-[12px] rounded-br-[12px] rounded-tl-[12px] border-[1.5px] border-signal-performance bg-surface-raised p-4 font-sans shadow-[0_12px_48px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,176,32,0.08)]"
            style={{ animation: "bubble-drop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
          >
            {/* Tail pointing up toward bell */}
            <div className="absolute right-4 top-[-8px] h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-signal-performance" />
            <div className="absolute right-[17px] top-[-5px] h-0 w-0 border-x-[7px] border-b-[7px] border-x-transparent border-b-surface-raised" />

            <div className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-signal-performance">
              Notifications{count > 0 ? ` (${count})` : ""}
            </div>

            {count === 0 && (
              <div className="py-3 text-center text-[13px] text-foreground-subtle">
                No pending notifications
              </div>
            )}

            {/* Duel challenge card */}
            {topDuel && (
              <div className="mb-2 rounded-[10px] border border-signal-performance/25 bg-signal-performance/[0.06] p-3">
                <div className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.07em] text-signal-performance">
                  ⚔️ Duel Challenge
                </div>
                <div className="mb-2.5 text-[13px] leading-snug text-foreground">
                  <strong className="text-signal-performance">{topDuel.challengerName}</strong> challenged you to a 1v1 duel!
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleChallengeAccept(topDuel)}
                    className="flex-1 rounded-md bg-signal-performance py-1.5 text-xs font-extrabold text-background hover:brightness-90"
                  >Accept</button>
                  <button
                    onClick={() => handleChallengeReject(topDuel)}
                    className="flex-1 rounded-md border border-border-strong bg-surface-2 py-1.5 text-xs text-foreground-muted hover:text-foreground"
                  >Decline</button>
                </div>
              </div>
            )}

            {/* Team challenge card */}
            {topTeam && (
              <div className="mb-2 rounded-[10px] border border-signal-ethics/20 bg-signal-ethics/5 p-3">
                <div className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.07em] text-signal-ethics">
                  🛡️ Team Challenge
                </div>
                <div className="mb-2.5 text-[13px] leading-snug text-foreground">
                  <strong className="text-signal-performance">{topTeam.challengerTeamEmoji} {topTeam.challengerTeamName}</strong>
                  {" challenged "}<strong className="text-signal-ethics">{topTeam.challengeeTeamEmoji} {topTeam.challengeeTeamName}</strong>!
                </div>
                {topTeam.amChallengeeCaptain && topTeam.status === "pending" ? (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleTeamChallengeAccept(topTeam)}
                      className="flex-1 rounded-md bg-signal-ethics py-1.5 text-xs font-extrabold text-background hover:brightness-90"
                    >Accept</button>
                    <button
                      onClick={() => handleTeamChallengeReject(topTeam)}
                      className="flex-1 rounded-md border border-border-strong bg-surface-2 py-1.5 text-xs text-foreground-muted hover:text-foreground"
                    >Decline</button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleTeamChallengeView(topTeam)}
                    className="w-full rounded-md border border-signal-ethics/30 bg-signal-ethics/10 py-1.5 text-xs font-bold text-signal-ethics hover:bg-signal-ethics/[0.18]"
                  >View Lobby →</button>
                )}
              </div>
            )}

            {topInvite && (
              <div className="rounded-[10px] border border-signal-performance/15 bg-signal-performance/5 p-3" style={{ marginBottom: count > 1 ? "8px" : "12px" }}>
                <div className="mb-2.5 text-[13px] leading-snug text-foreground">
                  <strong className="text-signal-performance">{topInvite.inviterName}</strong>{" "}
                  {topInvite.sourceTeamName
                    ? <>is launching a <strong className="text-signal-scalability">{topInvite.sourceTeamName}</strong> Team Raid!</>
                    : "wants you on their team!"}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleAccept(topInvite)}
                    className="flex-1 rounded-md bg-signal-scalability py-1.5 text-xs font-extrabold text-background hover:brightness-90"
                  >Accept</button>
                  <button
                    onClick={() => handleReject(topInvite)}
                    className="flex-1 rounded-md border border-border-strong bg-surface-2 py-1.5 text-xs text-foreground-muted hover:text-foreground"
                  >Reject</button>
                </div>
              </div>
            )}

            {count > (topInvite ? 1 : 0) + (topDuel ? 1 : 0) && (
              <div className="mb-2.5 text-center text-[11px] text-foreground-subtle">
                +{count - (topInvite ? 1 : 0) - (topDuel ? 1 : 0)} more notification{count - (topInvite ? 1 : 0) - (topDuel ? 1 : 0) > 1 ? "s" : ""}
              </div>
            )}

            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="block w-full rounded-lg border border-border bg-foreground/[0.04] py-1.5 text-center text-xs font-semibold text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground"
            >
              View past notifications →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
