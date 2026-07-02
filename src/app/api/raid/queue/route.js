import { getRequestAuth } from "@/lib/clerk-guard";
import { getUserByClerkId } from "@/lib/db-users";
import { cancelRaidQueue, clearStaleQueueMatchId, enqueueForRaid, getRaidMatchForUser, tryMatchRaid } from "@/lib/db-raid";
import { isTeamCancelled } from "@/lib/db-raid-invite";
import { markUserQueueing } from "@/lib/db-presence";
import { writeQueueLog } from "@/lib/queue-logger";

export const dynamic = "force-dynamic";

function getDisplayName(user) {
  if (!user) return "Player";
  if (user.username) return user.username;
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || "Player";
}

export async function POST(request) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkId = session.userId;
  const body = await request.json().catch(() => ({}));
  const teamGroupId = body?.teamGroupId ?? null;

  // Already matched from a previous poll?
  const existing = await getRaidMatchForUser(clerkId);
  if (existing) {
    return Response.json({ matched: true, ...existing });
  }

  // For preformed teams: check if a teammate cancelled — stop re-enqueuing and signal the client
  if (teamGroupId) {
    const cancelled = await isTeamCancelled(teamGroupId);
    if (cancelled) {
      await cancelRaidQueue(clerkId).catch(() => {});
      return Response.json({ teamCancelled: true });
    }
  }

  let displayName = "Player";
  try {
    const user = await getUserByClerkId(clerkId);
    displayName = getDisplayName(user);
  } catch {}

  // Clear any stale matchId so COALESCE in enqueueForRaid doesn't lock this player
  // out of opponent searches (getRaidMatchForUser already confirmed no active match above)
  await clearStaleQueueMatchId(clerkId).catch(() => {});

  await enqueueForRaid(clerkId, displayName, teamGroupId);
  await markUserQueueing(clerkId).catch(() => {});

  const match = await tryMatchRaid(clerkId, displayName, teamGroupId);
  if (match) {
    console.log(`[QUEUE/route] matched! clerkId=${clerkId.slice(-6)} matchId=${match.matchId}`);
    return Response.json({ matched: true, ...match });
  }

  // A concurrent request may have claimed this player between our pre-enqueue check and now
  const lateMatch = await getRaidMatchForUser(clerkId);
  if (lateMatch) {
    console.log(`[QUEUE/route] late-match! clerkId=${clerkId.slice(-6)} matchId=${lateMatch.matchId}`);
    return Response.json({ matched: true, ...lateMatch });
  }

  // Fire-and-forget: write full queue snapshot to logs/queue_log.json (rate-limited to 5s)
  writeQueueLog(clerkId).catch(() => {});

  return Response.json({ matched: false });
}
