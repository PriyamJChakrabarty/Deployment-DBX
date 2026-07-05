"use client";

import { useEffect, useState } from "react";

function displayName(u) {
  if (u.username) return u.username;
  const f = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return f || "Anonymous";
}

function stateLabel(state) {
  if (state === "in_match") return "In Match";
  if (state === "queueing") return "Queuing";
  return "Online";
}

function stateColor(state) {
  if (state === "in_match") return "#ffb020";
  if (state === "queueing") return "#22d3ee";
  return "#2dd881";
}

function PlayerPip({ user }) {
  const name = displayName(user);
  const color = stateColor(user.state);
  return (
    <div
      title={`${name} — ${stateLabel(user.state)}`}
      className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface/40 px-3 py-1.5"
    >
      <div className="relative flex-shrink-0">
        <div
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-xs font-bold"
          style={{ background: `linear-gradient(135deg, ${color}28, ${color}08)`, border: `1.5px solid ${color}44`, color }}
        >
          {name[0].toUpperCase()}
        </div>
        <div
          className="absolute bottom-0 right-0 h-[9px] w-[9px] rounded-full border-2"
          style={{ background: color, borderColor: "var(--background)" }}
        />
      </div>
      <div className="min-w-0">
        <div className="max-w-[100px] truncate text-xs font-semibold text-foreground">
          {name}
        </div>
        <div className="mt-0.5 text-[10px]" style={{ color }}>
          {stateLabel(user.state)}
        </div>
      </div>
    </div>
  );
}

export default function OnlinePlayersWidget() {
  const [players, setPlayers] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/presence/online");
        if (r.ok) setPlayers(await r.json());
      } catch {}
    };
    load();
    const id = setInterval(load, 5_000);
    return () => clearInterval(id);
  }, []);

  if (players === null) return null;

  const count = players.length;

  return (
    <div className="mt-8">
      <div className="mb-4 inline-flex items-center gap-1.5">
        <div className="flex items-center">
          <div className="h-2 w-2 rounded-full bg-[#2dd881] shadow-[0_0_8px_rgba(45,216,129,0.6)]" />
        </div>
        <span className="text-[13px] text-foreground-muted">
          {count === 0
            ? "No other players online right now"
            : `${count} player${count !== 1 ? "s" : ""} online now`}
        </span>
      </div>

      {count > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {players.slice(0, 12).map((u) => (
            <PlayerPip key={u.clerkId} user={u} />
          ))}
          {players.length > 12 && (
            <div className="flex items-center rounded-lg border border-border bg-surface/40 px-3 py-1.5 text-xs text-foreground-subtle">
              +{players.length - 12} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
