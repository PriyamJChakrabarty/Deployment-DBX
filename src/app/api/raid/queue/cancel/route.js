import { getRequestAuth } from "@/lib/clerk-guard";
import { cancelRaidQueue, getRaidQueueEntry } from "@/lib/db-raid";
import { markTeamCancelled } from "@/lib/db-raid-invite";
import { markUserOnline } from "@/lib/db-presence";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch queue entry BEFORE deleting so we can read teamGroupId
  const entry = await getRaidQueueEntry(session.userId);

  // Only cascade if the player isn't already in a match (don't break a live match)
  const teamGroupId = entry?.matchId == null ? (entry?.teamGroupId ?? null) : null;

  await Promise.all([
    cancelRaidQueue(session.userId),
    markUserOnline(session.userId).catch(() => {}),
    teamGroupId ? markTeamCancelled(teamGroupId).catch(() => {}) : Promise.resolve(),
  ]);
  return Response.json({ ok: true });
}
