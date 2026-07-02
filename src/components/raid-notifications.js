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

      <div ref={wrapperRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {/* Bell button */}
        <button
          onClick={() => setIsOpen((o) => !o)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "6px 8px", borderRadius: "8px", position: "relative",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(245,185,66,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
          title="Raid Invitations"
        >
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke={count > 0 ? "#f5b942" : "#6b7280"}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: ringing ? "bell-ring 0.7s ease" : "none", display: "block" }}
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>

          {count > 0 && (
            <span style={{
              position: "absolute", top: "3px", right: "3px",
              background: "#ef4444", color: "#fff",
              fontSize: "9px", fontWeight: 800,
              width: "15px", height: "15px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1, border: "1.5px solid #0d1a1f",
              animation: "badge-pop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}>
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>

        {/* Speech bubble dropdown */}
        {isOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 10px)", right: 0,
            background: "#12232b", border: "1.5px solid #f5b942",
            borderRadius: "12px 4px 12px 12px", padding: "16px", width: "280px",
            boxShadow: "0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,185,66,0.08)",
            zIndex: 200,
            animation: "bubble-drop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
            fontFamily: "'Segoe UI','Aptos','Trebuchet MS',sans-serif",
          }}>
            {/* Tail pointing up toward bell */}
            <div style={{
              position: "absolute", top: "-8px", right: "16px",
              width: 0, height: 0,
              borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
              borderBottom: "8px solid #f5b942",
            }} />
            <div style={{
              position: "absolute", top: "-5px", right: "17px",
              width: 0, height: 0,
              borderLeft: "7px solid transparent", borderRight: "7px solid transparent",
              borderBottom: "7px solid #12232b",
            }} />

            <div style={{
              fontSize: "11px", fontWeight: 800, color: "#f5b942",
              letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px",
            }}>
              Notifications{count > 0 ? ` (${count})` : ""}
            </div>

            {count === 0 && (
              <div style={{ color: "#4a6570", fontSize: "13px", textAlign: "center", padding: "12px 0" }}>
                No pending notifications
              </div>
            )}

            {/* Duel challenge card */}
            {topDuel && (
              <div style={{
                background: "rgba(245,185,66,0.06)", border: "1px solid rgba(245,185,66,0.25)",
                borderRadius: "10px", padding: "12px",
                marginBottom: "8px",
              }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#f5b942", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "6px" }}>
                  ⚔️ Duel Challenge
                </div>
                <div style={{ fontSize: "13px", color: "#e8f0f3", marginBottom: "10px", lineHeight: 1.4 }}>
                  <strong style={{ color: "#f5b942" }}>{topDuel.challengerName}</strong> challenged you to a 1v1 duel!
                </div>
                <div style={{ display: "flex", gap: "7px" }}>
                  <button
                    onClick={() => handleChallengeAccept(topDuel)}
                    style={{
                      flex: 1, background: "#f5b942", color: "#0d1a1f",
                      border: "none", borderRadius: "7px", padding: "7px 0",
                      fontWeight: 800, cursor: "pointer", fontSize: "12px",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#d4a017"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#f5b942"; }}
                  >Accept</button>
                  <button
                    onClick={() => handleChallengeReject(topDuel)}
                    style={{
                      flex: 1, background: "#1f2d34", color: "#9ca3af",
                      border: "1px solid #334155", borderRadius: "7px", padding: "7px 0",
                      cursor: "pointer", fontSize: "12px",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#e8f0f3"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
                  >Decline</button>
                </div>
              </div>
            )}

            {/* Team challenge card */}
            {topTeam && (
              <div style={{
                background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.22)",
                borderRadius: "10px", padding: "12px", marginBottom: "8px",
              }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#22d3ee", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "6px" }}>
                  🛡️ Team Challenge
                </div>
                <div style={{ fontSize: "13px", color: "#e8f0f3", marginBottom: "10px", lineHeight: 1.4 }}>
                  <strong style={{ color: "#f5b942" }}>{topTeam.challengerTeamEmoji} {topTeam.challengerTeamName}</strong>
                  {" challenged "}<strong style={{ color: "#22d3ee" }}>{topTeam.challengeeTeamEmoji} {topTeam.challengeeTeamName}</strong>!
                </div>
                {topTeam.amChallengeeCaptain && topTeam.status === "pending" ? (
                  <div style={{ display: "flex", gap: "7px" }}>
                    <button
                      onClick={() => handleTeamChallengeAccept(topTeam)}
                      style={{ flex: 1, background: "#22d3ee", color: "#0d1a1f", border: "none", borderRadius: "7px", padding: "7px 0", fontWeight: 800, cursor: "pointer", fontSize: "12px" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#0ea5e9"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#22d3ee"; }}
                    >Accept</button>
                    <button
                      onClick={() => handleTeamChallengeReject(topTeam)}
                      style={{ flex: 1, background: "#1f2d34", color: "#9ca3af", border: "1px solid #334155", borderRadius: "7px", padding: "7px 0", cursor: "pointer", fontSize: "12px" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#e8f0f3"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
                    >Decline</button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleTeamChallengeView(topTeam)}
                    style={{ width: "100%", background: "rgba(34,211,238,0.1)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.3)", borderRadius: "7px", padding: "7px 0", fontWeight: 700, cursor: "pointer", fontSize: "12px" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,211,238,0.18)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(34,211,238,0.1)"; }}
                  >View Lobby →</button>
                )}
              </div>
            )}

            {topInvite && (
              <div style={{
                background: "rgba(245,185,66,0.05)", border: "1px solid rgba(245,185,66,0.15)",
                borderRadius: "10px", padding: "12px",
                marginBottom: count > 1 ? "8px" : "12px",
              }}>
                <div style={{ fontSize: "13px", color: "#e8f0f3", marginBottom: "10px", lineHeight: 1.4 }}>
                  <strong style={{ color: "#f5b942" }}>{topInvite.inviterName}</strong>{" "}
                  {topInvite.sourceTeamName
                    ? <>is launching a <strong style={{ color: "#3ddc84" }}>{topInvite.sourceTeamName}</strong> Team Raid!</>
                    : "wants you on their team!"}
                </div>
                <div style={{ display: "flex", gap: "7px" }}>
                  <button
                    onClick={() => handleAccept(topInvite)}
                    style={{
                      flex: 1, background: "#22c55e", color: "#000",
                      border: "none", borderRadius: "7px", padding: "7px 0",
                      fontWeight: 800, cursor: "pointer", fontSize: "12px",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#16a34a"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#22c55e"; }}
                  >Accept</button>
                  <button
                    onClick={() => handleReject(topInvite)}
                    style={{
                      flex: 1, background: "#1f2d34", color: "#9ca3af",
                      border: "1px solid #334155", borderRadius: "7px", padding: "7px 0",
                      cursor: "pointer", fontSize: "12px",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#e8f0f3"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
                  >Reject</button>
                </div>
              </div>
            )}

            {count > (topInvite ? 1 : 0) + (topDuel ? 1 : 0) && (
              <div style={{ fontSize: "11px", color: "#4a6570", textAlign: "center", marginBottom: "10px" }}>
                +{count - (topInvite ? 1 : 0) - (topDuel ? 1 : 0)} more notification{count - (topInvite ? 1 : 0) - (topDuel ? 1 : 0) > 1 ? "s" : ""}
              </div>
            )}

            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                display: "block", width: "100%", textAlign: "center",
                background: "rgba(201,214,218,0.04)", border: "1px solid rgba(201,214,218,0.1)",
                color: "#6b7280", padding: "7px 0", borderRadius: "8px",
                fontSize: "12px", fontWeight: 600, textDecoration: "none",
                transition: "color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#e8f0f3"; e.currentTarget.style.borderColor = "rgba(201,214,218,0.25)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.borderColor = "rgba(201,214,218,0.1)"; }}
            >
              View past notifications →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
