import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { hasClerkCredentials } from "@/lib/clerk-config";
import { getMyNotifications } from "@/lib/db-raid-invite";
import SiteNav from "@/components/site-nav";
import HeartbeatClient from "@/components/heartbeat";
import NotificationsClient from "./notifications-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Raid Invitations — DebugRoyale" };

export default async function NotificationsPage() {
  if (!hasClerkCredentials()) redirect("/sign-in");
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const rows = await getMyNotifications(userId).catch(() => []);
  const now  = new Date();

  const notifications = rows.map((n) => ({
    id:             n.id,
    inviterClerkId: n.inviterClerkId,
    inviteeClerkId: n.inviteeClerkId,
    inviterName:    n.inviterName,
    inviteeName:    n.inviteeName,
    status:         n.status,
    teamGroupId:    n.teamGroupId ?? null,
    isLive:         n.status === "pending" && new Date(n.expiresAt) > now,
    isSent:         n.inviterClerkId === userId,
    createdAt:      n.createdAt?.toISOString?.() ?? null,
    expiresAt:      n.expiresAt?.toISOString?.() ?? null,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <HeartbeatClient />
      <SiteNav active="/notifications" />
      <NotificationsClient initialNotifications={notifications} myClerkId={userId} />
    </div>
  );
}
