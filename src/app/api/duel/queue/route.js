import { getRequestAuth } from "@/lib/clerk-guard";
import { getUserByClerkId } from "@/lib/db-users";
import { enqueuePlayer, getMatchForUser, getQueueEntry, tryMatchPlayer } from "@/lib/db-duel";
import { markUserQueueing } from "@/lib/db-presence";

export const dynamic = "force-dynamic";

function getDisplayName(user) {
  if (!user) return "Player";
  if (user.username) return user.username;
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || "Player";
}

export async function POST() {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkId = session.userId;

  // 1. Check if already matched
  const existing = await getMatchForUser(clerkId);
  if (existing) {
    return Response.json({ matched: true, ...existing });
  }

  // 2. Resolve display name
  let displayName = "Player";
  try {
    const user = await getUserByClerkId(clerkId);
    displayName = getDisplayName(user);
  } catch {}

  // 3. Enqueue / refresh queue row
  await enqueuePlayer(clerkId, displayName);
  await markUserQueueing(clerkId).catch(() => {});

  // 4. Try to match with the oldest waiting opponent
  const match = await tryMatchPlayer(clerkId, displayName);
  if (match) {
    return Response.json({ matched: true, ...match });
  }

  // 5. No opponent yet — still searching
  return Response.json({ matched: false });
}
