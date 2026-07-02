import { eq } from "drizzle-orm";
import { getRequestAuth } from "@/lib/clerk-guard";
import { db } from "@/lib/db";
import { raidInvitations } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamGroupId } = await params;
  const invites = await db.select().from(raidInvitations)
    .where(eq(raidInvitations.teamGroupId, teamGroupId));

  if (invites.length === 0) return Response.json({ error: "Lobby not found" }, { status: 404 });

  const first = invites[0];
  const isMember =
    session.userId === first.inviterClerkId ||
    invites.some((i) => i.inviteeClerkId === session.userId);
  if (!isMember) return Response.json({ error: "Not a participant" }, { status: 403 });

  // If raid already started, tell the client to redirect
  if (invites.some((i) => i.status === "raid_started")) {
    return Response.json({ event: "start", teamGroupId, teamId: first.sourceTeamId, teamName: first.sourceTeamName });
  }

  const result = {
    teamGroupId,
    captainClerkId: first.inviterClerkId,
    captainName:    first.inviterName,
    teamId:         first.sourceTeamId,
    teamName:       first.sourceTeamName,
    members: invites.map((inv) => ({
      clerkId: inv.inviteeClerkId,
      name:    inv.inviteeName,
      status:  inv.status,
      present: inv.present ?? false,
    })),
  };
  console.log(`[lobby/GET] teamGroupId=${teamGroupId} members=`, JSON.stringify(result.members));
  return Response.json(result);
}
