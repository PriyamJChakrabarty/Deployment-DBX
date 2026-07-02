"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function timeAgo(isoStr) {
  if (!isoStr) return "";
  const s = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

const STATUS_COLOR = {
  pending:  "#f5b942",
  accepted: "#22c55e",
  rejected: "#ef4444",
  expired:  "#4a6570",
};

export default function NotificationsClient({ initialNotifications, myClerkId }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [busy, setBusy] = useState(null);
  const router = useRouter();

  async function handleAccept(n) {
    setBusy(n.id);
    try {
      const r    = await fetch(`/api/raid/invite/${n.id}/accept`, { method: "POST" });
      const data = await r.json();
      if (data.teamGroupId) {
        if (data.sourceTeamId) {
          // Team raid — go to the team wait lobby
          const params = new URLSearchParams({
            teamGroupId: data.teamGroupId,
            teamId:      String(data.sourceTeamId),
            teamName:    data.sourceTeamName ?? "Your Team",
          });
          router.push(`/team-raid-wait?${params}`);
        } else {
          // Regular friend invite
          router.push(`/group-raid-page?teamGroupId=${data.teamGroupId}&partnerName=${encodeURIComponent(data.inviterName ?? "")}`);
        }
        return;
      }
    } catch {}
    setBusy(null);
  }

  async function handleReject(n) {
    setBusy(n.id);
    try { await fetch(`/api/raid/invite/${n.id}/reject`, { method: "POST" }); } catch {}
    setNotifications((prev) =>
      prev.map((x) => x.id === n.id ? { ...x, status: "rejected", isLive: false } : x)
    );
    setBusy(null);
  }

  const live = notifications.filter((n) => n.isLive && !n.isSent);
  const rest  = notifications.filter((n) => !(n.isLive && !n.isSent));

  const renderRow = (n) => {
    const isLive = n.isLive && !n.isSent;
    const isBusy = busy === n.id;

    return (
      <div key={n.id} style={{
        display: "flex", alignItems: "center", gap: "16px",
        padding: "18px 24px",
        borderBottom: "1px solid rgba(201,214,218,0.06)",
        opacity: isLive ? 1 : 0.6,
      }}>
        {/* Icon */}
        <div style={{
          width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
          background: `${STATUS_COLOR[n.status] ?? "#4a6570"}14`,
          border: `1.5px solid ${STATUS_COLOR[n.status] ?? "#4a6570"}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "17px",
        }}>
          {n.isSent ? "📤" : "📨"}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#e8f0f3", marginBottom: "4px" }}>
            {n.isSent
              ? <>You invited <span style={{ color: "#f5b942" }}>{n.inviteeName}</span> to a {n.sourceTeamName ? <><span style={{ color: "#3ddc84" }}>{n.sourceTeamName}</span> Team Raid</> : "Group Raid"}</>
              : <><span style={{ color: "#f5b942" }}>{n.inviterName}</span> invited you to a {n.sourceTeamName ? <><span style={{ color: "#3ddc84" }}>{n.sourceTeamName}</span> Team Raid</> : "Group Raid"}</>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{
              fontSize: "11px", fontWeight: 700, letterSpacing: "0.07em",
              textTransform: "uppercase", color: STATUS_COLOR[n.status] ?? "#4a6570",
            }}>
              {n.status}
            </span>
            <span style={{ fontSize: "11px", color: "#334155" }}>·</span>
            <span style={{ fontSize: "11px", color: "#4a6570" }}>{timeAgo(n.createdAt)}</span>
            {!isLive && n.status !== "accepted" && (
              <>
                <span style={{ fontSize: "11px", color: "#334155" }}>·</span>
                <span style={{
                  fontSize: "10px", fontWeight: 700, color: "#2a3d48",
                  border: "1px solid #2a3d48", borderRadius: "4px",
                  padding: "1px 6px", letterSpacing: "0.08em", textTransform: "uppercase",
                }}>Dead</span>
              </>
            )}
          </div>
        </div>

        {/* Accept / Reject for live received invites */}
        {isLive && (
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button
              onClick={() => handleAccept(n)}
              disabled={isBusy}
              style={{
                background: "#22c55e", color: "#000", border: "none",
                borderRadius: "8px", padding: "7px 18px",
                fontWeight: 800, fontSize: "13px",
                cursor: isBusy ? "default" : "pointer",
                opacity: isBusy ? 0.6 : 1, transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (!isBusy) e.currentTarget.style.background = "#16a34a"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#22c55e"; }}
            >
              {isBusy ? "…" : "Accept"}
            </button>
            <button
              onClick={() => handleReject(n)}
              disabled={isBusy}
              style={{
                background: "transparent", color: "#9ca3af",
                border: "1px solid #334155", borderRadius: "8px",
                padding: "7px 18px", fontSize: "13px",
                cursor: isBusy ? "default" : "pointer",
                opacity: isBusy ? 0.6 : 1, transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { if (!isBusy) e.currentTarget.style.color = "#e8f0f3"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      maxWidth: "700px", margin: "0 auto", padding: "40px 24px",
      fontFamily: "'Segoe UI','Aptos','Trebuchet MS',sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <Link href="/home" style={{
          color: "#4a6570", textDecoration: "none", fontSize: "13px",
          display: "flex", alignItems: "center", gap: "4px",
          transition: "color 0.15s",
        }}>
          ← Back
        </Link>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: "#f5b942", letterSpacing: "-0.02em" }}>
          ⚔️ Raid Invitations
        </h1>
      </div>

      {notifications.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 24px", color: "#4a6570" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
          <div style={{ fontSize: "15px" }}>No invitations yet.</div>
          <div style={{ fontSize: "13px", marginTop: "8px" }}>
            Follow players from the <Link href="/leaderboard" style={{ color: "#f5b942" }}>Leaderboard</Link> and invite them to a Group Raid.
          </div>
        </div>
      )}

      {live.length > 0 && (
        <section style={{ marginBottom: "32px" }}>
          <div style={{
            fontSize: "10px", fontWeight: 800, color: "#f5b942",
            letterSpacing: "0.1em", textTransform: "uppercase",
            marginBottom: "8px",
          }}>
            Pending — waiting for your response
          </div>
          <div style={{
            background: "rgba(245,185,66,0.03)",
            border: "1px solid rgba(245,185,66,0.15)",
            borderRadius: "12px", overflow: "hidden",
          }}>
            {live.map(renderRow)}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <div style={{
            fontSize: "10px", fontWeight: 800, color: "#4a6570",
            letterSpacing: "0.1em", textTransform: "uppercase",
            marginBottom: "8px",
          }}>
            History
          </div>
          <div style={{
            background: "rgba(201,214,218,0.02)",
            border: "1px solid rgba(201,214,218,0.07)",
            borderRadius: "12px", overflow: "hidden",
          }}>
            {rest.map(renderRow)}
          </div>
        </section>
      )}
    </div>
  );
}
