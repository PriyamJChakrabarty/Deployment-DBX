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
  if (state === "in_match") return "#f5b942";
  if (state === "queueing") return "#22d3ee";
  return "#3ddc84";
}

function PlayerPip({ user }) {
  const name = displayName(user);
  const color = stateColor(user.state);
  return (
    <div
      title={`${name} — ${stateLabel(user.state)}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "rgba(201,214,218,0.04)",
        border: "1px solid rgba(201,214,218,0.08)",
        borderRadius: "8px",
        padding: "7px 12px",
        minWidth: 0,
      }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{
          width: "30px", height: "30px", borderRadius: "50%",
          background: `linear-gradient(135deg, ${color}28, ${color}08)`,
          border: `1.5px solid ${color}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "12px", fontWeight: 700, color,
        }}>
          {name[0].toUpperCase()}
        </div>
        <div style={{
          position: "absolute", bottom: 0, right: 0,
          width: "9px", height: "9px", borderRadius: "50%",
          background: color,
          border: "2px solid #0d1a1f",
        }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#e8f0f3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100px" }}>
          {name}
        </div>
        <div style={{ fontSize: "10px", color, marginTop: "1px" }}>
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
    <div style={{ marginTop: "32px" }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "7px",
        marginBottom: "16px",
      }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: "#3ddc84",
            boxShadow: "0 0 8px rgba(61,220,132,0.6)",
          }} />
        </div>
        <span style={{ fontSize: "13px", color: "#8ba0a6" }}>
          {count === 0
            ? "No other players online right now"
            : `${count} player${count !== 1 ? "s" : ""} online now`}
        </span>
      </div>

      {count > 0 && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          justifyContent: "center",
        }}>
          {players.slice(0, 12).map((u) => (
            <PlayerPip key={u.clerkId} user={u} />
          ))}
          {players.length > 12 && (
            <div style={{
              display: "flex", alignItems: "center",
              padding: "7px 12px", borderRadius: "8px",
              background: "rgba(201,214,218,0.04)",
              border: "1px solid rgba(201,214,218,0.08)",
              fontSize: "12px", color: "#4a6570",
            }}>
              +{players.length - 12} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
