"use client";

import { useEffect, useRef, useState } from "react";
import RaidMatchmakingClient from "./raid-matchmaking-client";

const KEYFRAMES = `
@keyframes lobby-float {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes card-glow {
  0%, 100% { box-shadow: 0 0 0px rgba(255,176,32,0); }
  50%       { box-shadow: 0 0 28px rgba(255,176,32,0.18); }
}
`;

function FriendAvatar({ name, imageUrl, size = 40 }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="flex-shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex flex-shrink-0 select-none items-center justify-center rounded-full border-2 border-signal-performance/25 font-black text-signal-performance"
      style={{
        width: size, height: size,
        background: "linear-gradient(135deg, rgba(255,176,32,0.13), rgba(255,176,32,0.03))",
        fontSize: size * 0.42,
      }}
    >
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
        <div className="flex flex-1 flex-col overflow-hidden bg-background">
          {/* Top bar */}
          <div className="flex flex-shrink-0 items-center gap-4 border-b border-signal-performance/15 px-7 py-4.5">
            <button
              onClick={() => {
                setActiveInviteId(null);
                setPhase("lobby");
              }}
              className="cursor-pointer rounded-lg border border-border-strong bg-transparent px-3.5 py-1.5 text-[13px] font-semibold text-foreground-muted transition-colors hover:text-foreground"
            >
              ← Back
            </button>
            <h2 className="m-0 text-lg font-extrabold text-signal-performance">
              👥 Invite a Teammate
            </h2>
            <div className="flex-1" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search friends…"
              className="w-[200px] rounded-lg border border-border-strong bg-foreground/[0.04] px-3.5 py-1.5 text-[13px] text-foreground outline-none"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-7 py-5">
            {friendsLoading && (
              <div className="p-12 text-center text-sm text-foreground-subtle">
                Loading your friends…
              </div>
            )}
            {!friendsLoading && friends.length === 0 && (
              <div className="px-6 py-16 text-center">
                <div className="mb-4 text-4xl">🤝</div>
                <div className="text-sm text-foreground-subtle">
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

              return (
                <div
                  key={friend.clerkId}
                  className="mb-2 flex items-center gap-3.5 rounded-xl border border-border bg-foreground/[0.025] px-4.5 py-3.5"
                  style={{ animation: "lobby-float 0.3s ease forwards" }}
                >
                  <FriendAvatar name={friend.displayName} imageUrl={friend.imageUrl} />
                  <span className="flex-1 text-sm font-bold text-foreground">
                    {friend.displayName}
                  </span>
                  <button
                    disabled={isPending}
                    onClick={() => !isPending && handleInvite(friend)}
                    className="rounded-lg border-none px-4.5 py-1.5 text-[13px] font-bold transition-opacity"
                    style={{
                      background: isPending ? "var(--surface-raised)" : "var(--signal-performance)",
                      color:      isPending ? "var(--foreground-subtle)" : "var(--background)",
                      cursor:     isPending ? "default" : "pointer",
                    }}
                  >
                    {btnLabel}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="flex-shrink-0 border-t border-border px-7 py-3 text-center text-[11px] text-foreground-subtle">
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
      <div
        className="flex flex-1 flex-col items-center justify-center gap-10 bg-background p-8"
        style={{
          backgroundImage: [
            "linear-gradient(rgba(148,163,184,0.035) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(148,163,184,0.035) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "48px 48px",
        }}
      >
        <div className="text-center" style={{ animation: "lobby-float 0.4s ease forwards" }}>
          <div className="mb-3 text-5xl">🛡️</div>
          <h1 className="m-0 text-[26px] font-black tracking-tight text-signal-performance">
            Group Raid
          </h1>
          <p className="mt-2 text-[13px] text-foreground-subtle">
            2v2 — Find bugs faster as a squad
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {/* Random Squad */}
          <button
            onClick={() => setPhase("random")}
            className="w-[220px] cursor-pointer rounded-2xl border border-signal-performance/25 bg-signal-performance/[0.06] px-9 py-8 text-center transition-colors hover:border-signal-performance/60 hover:bg-signal-performance/10"
            style={{ animation: "lobby-float 0.45s ease 0.05s both" }}
          >
            <div className="mb-3.5 text-4xl">🎲</div>
            <div className="mb-2 text-[15px] font-extrabold text-signal-performance">
              Random Squad
            </div>
            <div className="text-xs leading-relaxed text-foreground-subtle">
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
            className="w-[220px] cursor-pointer rounded-2xl border border-signal-scalability/20 bg-signal-scalability/5 px-9 py-8 text-center transition-colors hover:border-signal-scalability/50 hover:bg-signal-scalability/10"
            style={{ animation: "lobby-float 0.45s ease 0.1s both" }}
          >
            <div className="mb-3.5 text-4xl">👥</div>
            <div className="mb-2 text-[15px] font-extrabold text-signal-scalability">
              Invite Friends
            </div>
            <div className="text-xs leading-relaxed text-foreground-subtle">
              Pick your teammate and find 2 opponents together.
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
