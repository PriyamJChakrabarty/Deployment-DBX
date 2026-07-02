"use client";

import { useEffect, useRef, useState } from "react";
import RaidMatchmakingClient from "./raid-matchmaking-client";

const KEYFRAMES = `
@keyframes lobby-float {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes card-glow {
  0%, 100% { box-shadow: 0 0 0px rgba(245,185,66,0); }
  50%       { box-shadow: 0 0 28px rgba(245,185,66,0.18); }
}
`;

function FriendAvatar({ name, imageUrl, size = 40 }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #f5b94220, #f5b94208)",
      border: "2px solid #f5b94240",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, fontWeight: 900, color: "#f5b942", flexShrink: 0,
    }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GroupRaidLobbyClient({ myName, myClerkId, initialTeamGroupId = null, initialPartnerName = null }) {
  // phase: "lobby" | "random" | "invite" | "team-matching"
  const [phase, setPhase] = useState(initialTeamGroupId ? "team-matching" : "lobby");
  const [teamGroupId, setTeamGroupId]   = useState(initialTeamGroupId);
  const [partnerName, setPartnerName]   = useState(initialPartnerName ?? "Your teammate");

  // Invite-page state
  const [friends, setFriends]           = useState([]);
  const [friendsLoading, setFriendLoading] = useState(false);
  // { [inviteeClerkId]: { status, id, teamGroupId, inviteeName } }
  const [inviteMap, setInviteMap]       = useState({});
  const [activeInviteId, setActiveInviteId] = useState(null);
  const [search, setSearch]             = useState("");

  const pollRef = useRef(null);

  // ── Load friends when entering invite phase ─────────────────
  useEffect(() => {
    if (phase !== "invite") return;
    fetch("/api/raid/invite/friends")
      .then((r) => r.json())
      .then((d) => {
        const list = d.friends ?? [];
        setFriends(list);
        // Seed inviteMap from server-known pending invites
        const seed = {};
        for (const f of list) {
          if (f.pendingInviteId) seed[f.clerkId] = { status: "pending", id: f.pendingInviteId };
        }
        setInviteMap((prev) => ({ ...seed, ...prev }));
      })
      .catch(() => {})
      .finally(() => setFriendLoading(false));
  }, [phase]);

  // ── Poll sent invite statuses while on invite page ──────────
  useEffect(() => {
    if (phase !== "invite") return;
    let active = true;

    const tick = async () => {
      if (!active) return;
      try {
        const r = await fetch("/api/raid/invite/sent");
        if (!r.ok || !active) return;
        const data = await r.json();
        const map = {};
        for (const inv of (data.invites ?? [])) {
          map[inv.inviteeClerkId] = {
            status:      inv.status,
            id:          inv.id,
            teamGroupId: inv.teamGroupId,
            inviteeName: inv.inviteeName,
            expiresAt:   inv.expiresAt,
          };
        }
        if (!active) return;
        setInviteMap(map);

        // Detect acceptance — transition to team matching
        const accepted = activeInviteId
          ? (data.invites ?? []).find((i) =>
              i.id === activeInviteId && i.status === "accepted" && i.teamGroupId
            )
          : null;
        if (accepted && active) {
          active = false;
          setTeamGroupId(accepted.teamGroupId);
          setPartnerName(accepted.inviteeName ?? "Your teammate");
          setPhase("team-matching");
        }
      } catch {}
    };

    tick();
    pollRef.current = setInterval(tick, 2000);
    return () => { active = false; clearInterval(pollRef.current); };
  }, [phase, activeInviteId]);

  async function handleInvite(friend) {
    const r = await fetch("/api/raid/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteeClerkId: friend.clerkId }),
    });
    if (r.ok) {
      const data = await r.json();
      setActiveInviteId(data.inviteId);
      setInviteMap((prev) => ({
        ...prev,
        [friend.clerkId]: { status: "pending", id: data.inviteId },
      }));
    }
  }

  function handleBackFromMatchmaking() {
    // Cancel queue and return to lobby
    fetch("/api/raid/queue/cancel", { method: "DELETE" }).catch(() => {});
    setActiveInviteId(null);
    setPhase("lobby");
  }

  // ── Render ────────────────────────────────────────────────────

  if (phase === "random") {
    return (
      <RaidMatchmakingClient
        myName={myName}
        myClerkId={myClerkId}
        onBack={handleBackFromMatchmaking}
      />
    );
  }

  if (phase === "team-matching") {
    return (
      <RaidMatchmakingClient
        myName={myName}
        myClerkId={myClerkId}
        teamGroupId={teamGroupId}
        partnerName={partnerName}
        onBack={handleBackFromMatchmaking}
      />
    );
  }

  if (phase === "invite") {
    const filtered = search
      ? friends.filter((f) => f.displayName.toLowerCase().includes(search.toLowerCase()))
      : friends;

    return (
      <>
        <style>{KEYFRAMES}</style>
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          overflow: "hidden", background: "#0d1a1f",
        }}>
          {/* Top bar */}
          <div style={{
            padding: "18px 28px", borderBottom: "1px solid rgba(245,185,66,0.12)",
            display: "flex", alignItems: "center", gap: "16px", flexShrink: 0,
          }}>
            <button
              onClick={() => {
                setActiveInviteId(null);
                setPhase("lobby");
              }}
              style={{
                background: "transparent", border: "1px solid rgba(201,214,218,0.15)",
                color: "#9ca3af", cursor: "pointer", padding: "6px 14px",
                borderRadius: "8px", fontSize: "13px", fontWeight: 600,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#e8f0f3"; e.currentTarget.style.borderColor = "rgba(201,214,218,0.35)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; e.currentTarget.style.borderColor = "rgba(201,214,218,0.15)"; }}
            >
              ← Back
            </button>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#f5b942" }}>
              👥 Invite a Teammate
            </h2>
            <div style={{ flex: 1 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search friends…"
              style={{
                background: "rgba(201,214,218,0.06)", border: "1px solid rgba(201,214,218,0.15)",
                color: "#e8f0f3", borderRadius: "8px", padding: "7px 14px",
                fontSize: "13px", outline: "none", width: "200px",
              }}
            />
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
            {friendsLoading && (
              <div style={{ textAlign: "center", color: "#4a6570", padding: "48px", fontSize: "14px" }}>
                Loading your friends…
              </div>
            )}
            {!friendsLoading && friends.length === 0 && (
              <div style={{ textAlign: "center", padding: "64px 24px" }}>
                <div style={{ fontSize: "40px", marginBottom: "16px" }}>🤝</div>
                <div style={{ color: "#4a6570", fontSize: "14px" }}>
                  You aren&apos;t following anyone yet. Follow players from the Leaderboard to invite them here.
                </div>
              </div>
            )}
            {!friendsLoading && filtered.map((friend) => {
              const inv = inviteMap[friend.clerkId];
              const status = inv?.status ?? "idle";
              const isExpiredOrRejected = status === "rejected" || status === "expired";
              const isPending = status === "pending" && !isExpiredOrRejected;
              const btnLabel = isPending ? "Inviting…" : "Invite";
              const btnBg    = isPending ? "#374151"  : "#f5b942";
              const btnColor = isPending ? "#6b7280"  : "#0d1a1f";

              return (
                <div key={friend.clerkId} style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  padding: "14px 18px", borderRadius: "12px",
                  border: "1px solid rgba(201,214,218,0.08)",
                  background: "rgba(201,214,218,0.025)",
                  marginBottom: "8px",
                  animation: "lobby-float 0.3s ease forwards",
                }}>
                  <FriendAvatar name={friend.displayName} imageUrl={friend.imageUrl} />
                  <span style={{ flex: 1, fontSize: "14px", fontWeight: 700, color: "#e8f0f3" }}>
                    {friend.displayName}
                  </span>
                  <button
                    disabled={isPending}
                    onClick={() => !isPending && handleInvite(friend)}
                    style={{
                      background: btnBg, color: btnColor,
                      border: "none", borderRadius: "8px",
                      padding: "7px 18px", fontSize: "13px", fontWeight: 700,
                      cursor: isPending ? "default" : "pointer",
                      transition: "opacity 0.15s",
                    }}
                  >
                    {btnLabel}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer hint */}
          <div style={{
            padding: "12px 28px", borderTop: "1px solid rgba(201,214,218,0.06)",
            fontSize: "11px", color: "#4a6570", textAlign: "center", flexShrink: 0,
          }}>
            Your invited friend will get a notification. Once they accept, you&apos;ll both search for 2 opponents together.
          </div>
        </div>
      </>
    );
  }

  // ── Lobby choice screen ────────────────────────────────────────
  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0d1a1f",
        backgroundImage: [
          "linear-gradient(rgba(201,214,218,0.02) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(201,214,218,0.02) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "48px 48px",
        gap: "40px", padding: "32px",
      }}>
        <div style={{ textAlign: "center", animation: "lobby-float 0.4s ease forwards" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🛡️</div>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 900, color: "#f5b942", letterSpacing: "-0.02em" }}>
            Group Raid
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#4a6570" }}>
            2v2 — Find bugs faster as a squad
          </p>
        </div>

        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center" }}>
          {/* Random Squad */}
          <button
            onClick={() => setPhase("random")}
            style={{
              background: "rgba(245,185,66,0.06)", border: "1px solid rgba(245,185,66,0.25)",
              borderRadius: "16px", padding: "32px 36px", cursor: "pointer",
              textAlign: "center", width: "220px",
              transition: "border-color 0.15s, background 0.15s",
              animation: "lobby-float 0.45s ease 0.05s both",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(245,185,66,0.6)";
              e.currentTarget.style.background  = "rgba(245,185,66,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(245,185,66,0.25)";
              e.currentTarget.style.background  = "rgba(245,185,66,0.06)";
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "14px" }}>🎲</div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "#f5b942", marginBottom: "8px" }}>
              Random Squad
            </div>
            <div style={{ fontSize: "12px", color: "#4a6570", lineHeight: 1.5 }}>
              Queue with 3 random players. Fast and easy.
            </div>
          </button>

          {/* Invite Friends */}
          <button
            onClick={() => {
              setActiveInviteId(null);
              setFriendLoading(true);
              setPhase("invite");
            }}
            style={{
              background: "rgba(61,220,132,0.05)", border: "1px solid rgba(61,220,132,0.2)",
              borderRadius: "16px", padding: "32px 36px", cursor: "pointer",
              textAlign: "center", width: "220px",
              transition: "border-color 0.15s, background 0.15s",
              animation: "lobby-float 0.45s ease 0.1s both",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(61,220,132,0.5)";
              e.currentTarget.style.background  = "rgba(61,220,132,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(61,220,132,0.2)";
              e.currentTarget.style.background  = "rgba(61,220,132,0.05)";
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "14px" }}>👥</div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "#3ddc84", marginBottom: "8px" }}>
              Invite Friends
            </div>
            <div style={{ fontSize: "12px", color: "#4a6570", lineHeight: 1.5 }}>
              Pick your teammate and find 2 opponents together.
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
