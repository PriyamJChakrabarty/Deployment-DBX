import { eq } from "drizzle-orm";
import { getRequestAuth } from "@/lib/clerk-guard";
import { db } from "@/lib/db";
import { raidInvitations } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamGroupId } = await params;
  const invites = await db.select().from(raidInvitations)
    .where(eq(raidInvitations.teamGroupId, teamGroupId));
  if (invites.length === 0) return Response.json({ error: "Lobby not found" }, { status: 404 });

  const first = invites[0];
  if (first.inviterClerkId !== session.userId) {
    return Response.json({ error: "Only the captain can start" }, { status: 403 });
  }

  // All non-rejected/expired members must be present
  const active = invites.filter((i) => i.status !== "rejected" && i.status !== "expired");
  const allPresent = active.length > 0 && active.every((i) => i.present ?? false);
  if (!allPresent) {
    console.log(`[lobby/start] Not all present:`, active.map((i) => `${i.inviteeClerkId.slice(-6)}:${i.present}`));
    return Response.json({ error: "Not all members are in the lobby" }, { status: 400 });
  }

  // Mark "raid_started" in DB — SSE pollers on all clients will detect this and redirect
  await db.update(raidInvitations)
    .set({ status: "raid_started", updatedAt: new Date() })
    .where(eq(raidInvitations.teamGroupId, teamGroupId))
    .catch((e) => console.error(`[lobby/start] status update failed:`, e?.message));

  console.log(`[lobby/start] Started teamGroupId=${teamGroupId}`);

  return Response.json({
    ok:          true,
    event:       "start",
    teamGroupId,
    teamId:      first.sourceTeamId,
    teamName:    first.sourceTeamName,
  });
}
