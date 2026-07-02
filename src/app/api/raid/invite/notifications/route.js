import { getRequestAuth } from "@/lib/clerk-guard";
import { getMyNotifications } from "@/lib/db-raid-invite";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await getMyNotifications(session.userId);
  const now = new Date();
  return Response.json({
    notifications: notifications.map((n) => ({
      id:              n.id,
      inviterClerkId:  n.inviterClerkId,
      inviteeClerkId:  n.inviteeClerkId,
      inviterName:     n.inviterName,
      inviteeName:     n.inviteeName,
      status:          n.status,
      teamGroupId:     n.teamGroupId      ?? null,
      sourceTeamId:    n.sourceTeamId     ?? null,
      sourceTeamName:  n.sourceTeamName   ?? null,
      isLive:          n.status === "pending" && new Date(n.expiresAt) > now,
      isSent:          n.inviterClerkId === session.userId,
      createdAt:       n.createdAt?.toISOString?.() ?? null,
      expiresAt:       n.expiresAt?.toISOString?.() ?? null,
    })),
  });
}
