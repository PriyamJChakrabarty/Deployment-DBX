import { getRequestAuth } from "@/lib/clerk-guard";
import { getSentInviteStatuses } from "@/lib/db-raid-invite";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invites = await getSentInviteStatuses(session.userId);
  return Response.json({
    invites: invites.map((inv) => ({
      id:              inv.id,
      inviteeClerkId:  inv.inviteeClerkId,
      inviteeName:     inv.inviteeName,
      status:          inv.status,
      teamGroupId:     inv.teamGroupId ?? null,
      expiresAt:       inv.expiresAt?.toISOString?.() ?? null,
      createdAt:       inv.createdAt?.toISOString?.() ?? null,
    })),
  });
}
