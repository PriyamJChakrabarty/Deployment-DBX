"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function LobbyClient({ teamGroupId, myClerkId, isCaptain, initialState }) {
  const [state,      setState]     = useState(initialState);
  const [starting,   setStarting]  = useState(false);
  const [err,        setErr]       = useState(null);
  const router = useRouter();
  const sseRef = useRef(null);

  function apply(data) {
    console.log("[lobby-client] apply() called, event=", data?.event, "members=", JSON.stringify(data?.members));
    if (data.event === "start") {
      const params = new URLSearchParams({
        teamGroupId: data.teamGroupId,
        teamId:      String(data.teamId ?? ""),
        teamName:    data.teamName ?? "",
      });
      router.replace(`/group-raid-page?${params}`);
      return;
    }
    setState(data);
  }

  useEffect(() => {
    let active = true;
    console.log("[lobby-client] Opening SSE:", `/api/team-raid-lobby/${teamGroupId}/events`);
    const sse  = new EventSource(`/api/team-raid-lobby/${teamGroupId}/events`);
    sseRef.current = sse;
    sse.onopen = () => console.log("[lobby-client] SSE connection opened");
    sse.addEventListener("raid-lobby", (e) => {
      console.log("[lobby-client] SSE event received, raw data:", e.data);
      try {
        const parsed = JSON.parse(e.data);
        console.log("[lobby-client] Parsed SSE data:", JSON.stringify(parsed));
        if (active) apply(parsed);
      } catch (err) {
        console.error("[lobby-client] Failed to parse SSE data:", err);
      }
    });
    sse.onerror = (e) => console.error("[lobby-client] SSE error:", e);

    // Fallback poll every 3s — catches cases where Ably message doesn't arrive
    const poll = setInterval(async () => {
      if (!active) return;
      try {
        const r = await fetch(`/api/team-raid-lobby/${teamGroupId}`);
        if (!r.ok || !active) return;
        const data = await r.json();
        console.log("[lobby-client] poll result:", JSON.stringify(data?.members?.map((m) => ({ clerkId: m.clerkId, status: m.status, present: m.present }))));
        apply(data);
      } catch {}
    }, 3000);

    return () => {
      active = false;
      sse.close();
      clearInterval(poll);
      console.log("[lobby-client] SSE closed + poll cleared");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamGroupId]);

  async function handleStart() {
    setErr(null);
    setStarting(true);
    try {
      const r = await fetch(`/api/team-raid-lobby/${teamGroupId}/start`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "Failed to start"); setStarting(false); return; }
      const params = new URLSearchParams({
        teamGroupId: d.teamGroupId,
        teamId:      String(d.teamId ?? ""),
        teamName:    d.teamName ?? "",
      });
      router.replace(`/group-raid-page?${params}`);
    } catch { setErr("Network error"); setStarting(false); }
  }

  const members    = state.members ?? [];
  const active     = members.filter((m) => m.status !== "rejected" && m.status !== "expired");
  const allPresent = active.length > 0 && active.every((m) => m.present);
  const canStart   = isCaptain && allPresent && !starting;

  console.log("[lobby-client] render — isCaptain=", isCaptain, "allPresent=", allPresent, "canStart=", canStart,
    "members=", JSON.stringify(members.map((m) => ({ clerkId: m.clerkId, status: m.status, present: m.present }))));

  const C = {
    bg:     "#0d1a1f",
    panel:  "#0a1419",
    card:   "#0e191f",
    border: "rgba(201,214,218,0.07)",
    green:  "#3ddc84",
    gold:   "#f5b942",
    text:   "#e8f0f3",
    sub:    "#8ba0a6",
    muted:  "#4a6570",
    red:    "#ef4444",
  };

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px 16px", gap: 20,
    }}>

      {/* Header */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
          Team Raid Lobby
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
          {state.teamName ?? "Your Team"}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          {allPresent ? "All members present — ready to raid!" : `Waiting for members to join…`}
        </div>
      </div>

      {/* Member list */}
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`,
        borderRadius: 12, width: "100%", maxWidth: 380, overflow: "hidden",
      }}>
        {/* Captain row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px", borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: C.green,
            boxShadow: `0 0 6px ${C.green}`,
            flexShrink: 0,
          }} />
          <span style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 600 }}>
            {state.captainName}
          </span>
          <span style={{ fontSize: 10, color: C.gold, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Captain
          </span>
        </div>

        {/* Member rows */}
        {members.map((m) => {
          const isPresent = m.present;
          return (
            <div key={m.clerkId} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px", borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: isPresent ? C.green : C.muted,
                boxShadow: isPresent ? `0 0 6px ${C.green}` : "none",
                flexShrink: 0,
              }} />
              <span style={{ flex: 1, fontSize: 13, color: isPresent ? C.text : C.sub, fontWeight: 600 }}>
                {m.name}
                {m.clerkId === myClerkId && <span style={{ color: C.muted, fontWeight: 400 }}> (you)</span>}
              </span>
              <span style={{ fontSize: 11, color: isPresent ? C.green : C.muted }}>
                {isPresent ? "In lobby" : m.status === "pending" ? "Pending…" : m.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Start button (captain only) */}
      {isCaptain && (
        <div style={{ width: "100%", maxWidth: 380 }}>
          <button
            onClick={handleStart}
            disabled={!canStart}
            style={{
              width: "100%", padding: "13px 0",
              background: canStart ? C.gold : "rgba(201,214,218,0.05)",
              color: canStart ? "#0d1a1f" : C.muted,
              border: canStart ? "none" : `1px solid ${C.border}`,
              borderRadius: 10, fontSize: 14, fontWeight: 800,
              cursor: canStart ? "pointer" : "not-allowed",
              letterSpacing: "0.05em",
              transition: "all 0.2s",
            }}
          >
            {starting ? "Starting…" : "⚔ Start Raid"}
          </button>
          {!allPresent && (
            <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 8 }}>
              Start unlocks when all members join the lobby
            </div>
          )}
        </div>
      )}

      {!isCaptain && (
        <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>
          Waiting for captain to start the raid…
        </div>
      )}

      {err && (
        <div style={{ fontSize: 12, color: C.red, textAlign: "center" }}>{err}</div>
      )}
    </div>
  );
}
