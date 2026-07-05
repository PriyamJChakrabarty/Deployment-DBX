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

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-6">

      {/* Header */}
      <div className="text-center">
        <div className="mb-1.5 font-mono text-[13px] font-extrabold uppercase tracking-[0.1em] text-signal-performance">
          Team Raid Lobby
        </div>
        <div className="text-lg font-bold text-foreground">
          {state.teamName ?? "Your Team"}
        </div>
        <div className="mt-1 text-xs text-foreground-subtle">
          {allPresent ? "All members present — ready to raid!" : `Waiting for members to join…`}
        </div>
      </div>

      {/* Member list */}
      <div className="w-full max-w-[380px] overflow-hidden rounded-xl border border-border bg-surface">
        {/* Captain row */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="h-2 w-2 flex-shrink-0 rounded-full bg-signal-scalability shadow-[0_0_6px_var(--signal-scalability)]" />
          <span className="flex-1 text-[13px] font-semibold text-foreground">
            {state.captainName}
          </span>
          <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] text-signal-performance">
            Captain
          </span>
        </div>

        {/* Member rows */}
        {members.map((m) => {
          const isPresent = m.present;
          return (
            <div key={m.clerkId} className="flex items-center gap-3 border-b border-border px-4 py-3">
              <div
                className={`h-2 w-2 flex-shrink-0 rounded-full ${
                  isPresent ? "bg-signal-scalability shadow-[0_0_6px_var(--signal-scalability)]" : "bg-foreground-subtle"
                }`}
              />
              <span className={`flex-1 text-[13px] font-semibold ${isPresent ? "text-foreground" : "text-foreground-muted"}`}>
                {m.name}
                {m.clerkId === myClerkId && <span className="font-normal text-foreground-subtle"> (you)</span>}
              </span>
              <span className={`text-[11px] ${isPresent ? "text-signal-scalability" : "text-foreground-subtle"}`}>
                {isPresent ? "In lobby" : m.status === "pending" ? "Pending…" : m.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Start button (captain only) */}
      {isCaptain && (
        <div className="w-full max-w-[380px]">
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`w-full rounded-[10px] py-[13px] text-sm font-extrabold tracking-[0.05em] transition-all duration-200 ${
              canStart
                ? "cursor-pointer bg-signal-performance text-background"
                : "cursor-not-allowed border border-border bg-foreground/5 text-foreground-subtle"
            }`}
          >
            {starting ? "Starting…" : "⚔ Start Raid"}
          </button>
          {!allPresent && (
            <div className="mt-2 text-center text-[11px] text-foreground-subtle">
              Start unlocks when all members join the lobby
            </div>
          )}
        </div>
      )}

      {!isCaptain && (
        <div className="text-xs italic text-foreground-subtle">
          Waiting for captain to start the raid…
        </div>
      )}

      {err && (
        <div className="text-center text-xs text-signal-security">{err}</div>
      )}
    </div>
  );
}
