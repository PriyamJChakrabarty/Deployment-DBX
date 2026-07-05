"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COLORS, CATEGORY_COLORS } from "@/lib/theme";

function timeAgo(isoStr) {
  if (!isoStr) return "";
  const s = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

const GOLD   = CATEGORY_COLORS.Performance;
const GREEN  = CATEGORY_COLORS.Scalability;
const RED    = CATEGORY_COLORS.Security;
const MUTED  = COLORS.foregroundSubtle;

const STATUS_COLOR = {
  pending:  GOLD,
  accepted: GREEN,
  rejected: RED,
  expired:  MUTED,
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
      <div
        key={n.id}
        className="flex items-center gap-4 border-b border-border px-6 py-4.5"
        style={{ opacity: isLive ? 1 : 0.6 }}
      >
        {/* Icon */}
        <div
          className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full text-[17px]"
          style={{
            background: `${STATUS_COLOR[n.status] ?? MUTED}14`,
            border: `1.5px solid ${STATUS_COLOR[n.status] ?? MUTED}30`,
          }}
        >
          {n.isSent ? "📤" : "📨"}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-sm font-semibold text-foreground">
            {n.isSent
              ? <>You invited <span className="text-signal-performance">{n.inviteeName}</span> to a {n.sourceTeamName ? <><span className="text-signal-scalability">{n.sourceTeamName}</span> Team Raid</> : "Group Raid"}</>
              : <><span className="text-signal-performance">{n.inviterName}</span> invited you to a {n.sourceTeamName ? <><span className="text-signal-scalability">{n.sourceTeamName}</span> Team Raid</> : "Group Raid"}</>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="font-mono text-[11px] font-bold uppercase tracking-[0.07em]"
              style={{ color: STATUS_COLOR[n.status] ?? MUTED }}
            >
              {n.status}
            </span>
            <span className="text-[11px] text-foreground-subtle">·</span>
            <span className="text-[11px] text-foreground-subtle">{timeAgo(n.createdAt)}</span>
            {!isLive && n.status !== "accepted" && (
              <>
                <span className="text-[11px] text-foreground-subtle">·</span>
                <span className="rounded border border-border-strong px-1.5 py-px font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-foreground-subtle">
                  Dead
                </span>
              </>
            )}
          </div>
        </div>

        {/* Accept / Reject for live received invites */}
        {isLive && (
          <div className="flex flex-shrink-0 gap-2">
            <button
              onClick={() => handleAccept(n)}
              disabled={isBusy}
              className={`rounded-lg bg-signal-scalability px-[18px] py-[7px] text-[13px] font-extrabold text-background transition ${
                isBusy ? "cursor-default opacity-60" : "cursor-pointer opacity-100 hover:brightness-90"
              }`}
            >
              {isBusy ? "…" : "Accept"}
            </button>
            <button
              onClick={() => handleReject(n)}
              disabled={isBusy}
              className={`rounded-lg border border-border-strong bg-transparent px-[18px] py-[7px] text-[13px] text-foreground-muted transition-colors ${
                isBusy ? "cursor-default opacity-60" : "cursor-pointer opacity-100 hover:text-foreground"
              }`}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[700px] px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/home"
          className="flex items-center gap-1 text-[13px] text-foreground-subtle transition-colors hover:text-foreground"
        >
          ← Back
        </Link>
        <h1 className="m-0 font-display text-[22px] font-black tracking-[-0.02em] text-signal-performance">
          ⚔️ Raid Invitations
        </h1>
      </div>

      {notifications.length === 0 && (
        <div className="px-6 py-20 text-center text-foreground-subtle">
          <div className="mb-4 text-5xl">📭</div>
          <div className="text-[15px]">No invitations yet.</div>
          <div className="mt-2 text-[13px]">
            Follow players from the <Link href="/leaderboard" className="text-signal-performance">Leaderboard</Link> and invite them to a Group Raid.
          </div>
        </div>
      )}

      {live.length > 0 && (
        <section className="mb-8">
          <div className="mb-2 font-mono text-[10px] font-extrabold uppercase tracking-[0.1em] text-signal-performance">
            Pending — waiting for your response
          </div>
          <div className="overflow-hidden rounded-xl border border-signal-performance/15 bg-signal-performance/3">
            {live.map(renderRow)}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <div className="mb-2 font-mono text-[10px] font-extrabold uppercase tracking-[0.1em] text-foreground-subtle">
            History
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-foreground/2">
            {rest.map(renderRow)}
          </div>
        </section>
      )}
    </div>
  );
}
