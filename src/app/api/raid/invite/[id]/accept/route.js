import { getRequestAuth } from "@/lib/clerk-guard";
import { acceptInvite } from "@/lib/db-raid-invite";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const inviteId = parseInt(id, 10);
  if (isNaN(inviteId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const result = await acceptInvite(inviteId, session.userId);
  if (!result) return Response.json({ error: "Invite not found or expired" }, { status: 404 });

  return Response.json({
    ok:             true,
    teamGroupId:    result.teamGroupId,
    inviterClerkId: result.inviterClerkId,
    inviterName:    result.inviterName,
    sourceTeamId:   result.sourceTeamId,
    sourceTeamName: result.sourceTeamName,
  });
}
