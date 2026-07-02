import { getRequestAuth } from "@/lib/clerk-guard";
import { getPendingInvitesForMe } from "@/lib/db-raid-invite";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ invites: [] });
  }

  const invites = await getPendingInvitesForMe(session.userId);
  return Response.json({
    invites: invites.map((inv) => ({
      id:              inv.id,
      inviterClerkId:  inv.inviterClerkId,
      inviterName:     inv.inviterName,
      sourceTeamId:    inv.sourceTeamId    ?? null,
      sourceTeamName:  inv.sourceTeamName  ?? null,
      createdAt:       inv.createdAt?.toISOString?.() ?? null,
      expiresAt:       inv.expiresAt?.toISOString?.() ?? null,
    })),
  });
}
