import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { db } from "./db";
import { userPresence, users } from "./schema";

const ONLINE_WINDOW_MS = 20_000;

function onlineThreshold() {
  return new Date(Date.now() - ONLINE_WINDOW_MS);
}

export async function markUserOnline(clerkId) {
  const now = new Date();
  await db
    .insert(userPresence)
    .values({ clerkId, state: "idle", lastSeenAt: now })
    .onConflictDoUpdate({
      target: userPresence.clerkId,
      set: {
        // Preserve in_match state; only reset queueing/idle to idle on heartbeat
        state: sql`CASE WHEN ${userPresence.state} = 'in_match' THEN 'in_match' ELSE 'idle' END`,
        lastSeenAt: now,
        updatedAt: now,
      },
    });
}

export async function markUserQueueing(clerkId) {
  const now = new Date();
  await db
    .insert(userPresence)
    .values({ clerkId, state: "queueing", lastSeenAt: now })
    .onConflictDoUpdate({
      target: userPresence.clerkId,
      set: { state: "queueing", lastSeenAt: now, updatedAt: now },
    });
}

export async function markUserInMatch(clerkId, matchId) {
  const now = new Date();
  await db
    .insert(userPresence)
    .values({ clerkId, state: "in_match", currentMatchId: String(matchId), lastSeenAt: now })
    .onConflictDoUpdate({
      target: userPresence.clerkId,
      set: { state: "in_match", currentMatchId: String(matchId), lastSeenAt: now, updatedAt: now },
    });
}

export async function clearPresenceMatch(clerkId) {
  await db
    .update(userPresence)
    .set({ state: "idle", currentMatchId: null, updatedAt: new Date() })
    .where(eq(userPresence.clerkId, clerkId));
}

export async function getOnlineUsers(excludeClerkId) {
  const rows = await db
    .select({
      clerkId: userPresence.clerkId,
      state: userPresence.state,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      bestScore: users.bestScore,
      lastSeenAt: userPresence.lastSeenAt,
    })
    .from(userPresence)
    .innerJoin(users, eq(userPresence.clerkId, users.clerkId))
    .where(
      and(
        gte(userPresence.lastSeenAt, onlineThreshold()),
        ne(userPresence.clerkId, excludeClerkId),
      ),
    )
    .orderBy(desc(userPresence.lastSeenAt));

  return rows.map((r) => ({
    clerkId: r.clerkId,
    state: r.state,
    bestScore: r.bestScore,
    username: r.username,
    firstName: r.firstName,
    lastName: r.lastName,
  }));
}

export async function getOnlineUserIds() {
  const rows = await db
    .select({ clerkId: userPresence.clerkId })
    .from(userPresence)
    .where(gte(userPresence.lastSeenAt, onlineThreshold()));
  return rows.map((r) => r.clerkId);
}
