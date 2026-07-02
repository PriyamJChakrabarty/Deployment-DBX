import { and, desc, eq, gt, inArray, or } from "drizzle-orm";
import { db } from "./db";
import { duelChallenges, duelMatches, duelMatchPlayers } from "./schema";
import { getAblyPlayerChannel, getAblyRestChallengeChannel } from "./ably-server";
import { pickRandomProblem } from "./db-duel";

const CHALLENGE_TTL_MS  = 5 * 60_000;  // 5 minutes
const MATCH_DURATION_MS = 10 * 60_000; // 10 minutes

// ── Internal publish helper ───────────────────────────────────

async function pub(challengeId, payload) {
  await getAblyRestChallengeChannel(challengeId)
    .publish("challenge-updated", { ...payload, sentAt: new Date().toISOString() })
    .catch((e) => console.error("[challenge] Ably publish failed:", e?.message));
}

// ── Create ────────────────────────────────────────────────────

export async function createChallenge(challengerClerkId, challengerName, challengeeClerkId, challengeeName) {
  const now       = new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);

  // Cancel any pending/accepted challenge the challenger already has open
  await db.update(duelChallenges)
    .set({ status: "cancelled", updatedAt: now })
    .where(and(
      eq(duelChallenges.challengerClerkId, challengerClerkId),
      inArray(duelChallenges.status, ["pending", "accepted"]),
    )).catch(() => {});

  const [ch] = await db.insert(duelChallenges)
    .values({ challengerClerkId, challengerName, challengeeClerkId, challengeeName, expiresAt })
    .returning();

  // Push notification to challengee's personal channel
  await getAblyPlayerChannel(challengeeClerkId)
    .publish("duel-challenge", {
      challengeId:    ch.id,
      challengerName,
      expiresAt:      expiresAt.toISOString(),
    })
    .catch(() => {});

  return ch;
}

// ── Read ──────────────────────────────────────────────────────

export async function getChallengeState(challengeId) {
  const [ch] = await db.select().from(duelChallenges)
    .where(eq(duelChallenges.id, challengeId)).limit(1);
  if (!ch) return null;

  // Auto-expire stale pending challenges
  if (ch.status === "pending" && new Date(ch.expiresAt) < new Date()) {
    await db.update(duelChallenges)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(eq(duelChallenges.id, challengeId), eq(duelChallenges.status, "pending")))
      .catch(() => {});
    return { ...ch, status: "expired" };
  }
  return ch;
}

export async function getPendingChallengesForMe(clerkId) {
  return db.select().from(duelChallenges)
    .where(and(
      eq(duelChallenges.challengeeClerkId, clerkId),
      eq(duelChallenges.status, "pending"),
      gt(duelChallenges.expiresAt, new Date()),
    ))
    .orderBy(desc(duelChallenges.createdAt));
}

export async function getActiveChallengeForUser(clerkId) {
  const [ch] = await db.select().from(duelChallenges)
    .where(and(
      or(
        eq(duelChallenges.challengerClerkId, clerkId),
        eq(duelChallenges.challengeeClerkId, clerkId),
      ),
      inArray(duelChallenges.status, ["pending", "accepted"]),
      gt(duelChallenges.expiresAt, new Date()),
    ))
    .orderBy(desc(duelChallenges.createdAt))
    .limit(1);
  return ch ?? null;
}

// ── State transitions ─────────────────────────────────────────

export async function acceptChallenge(challengeId, clerkId) {
  const now = new Date();
  const [updated] = await db.update(duelChallenges)
    .set({ status: "accepted", updatedAt: now })
    .where(and(
      eq(duelChallenges.id, challengeId),
      eq(duelChallenges.challengeeClerkId, clerkId),
      eq(duelChallenges.status, "pending"),
      gt(duelChallenges.expiresAt, now),
    ))
    .returning();
  if (!updated) return null;
  await pub(challengeId, { status: "accepted", matchId: null, challengerPresent: updated.challengerPresent, challengeePresent: updated.challengeePresent });
  return updated;
}

export async function rejectChallenge(challengeId, clerkId) {
  const now = new Date();
  const [updated] = await db.update(duelChallenges)
    .set({ status: "rejected", updatedAt: now })
    .where(and(
      eq(duelChallenges.id, challengeId),
      eq(duelChallenges.challengeeClerkId, clerkId),
      eq(duelChallenges.status, "pending"),
    ))
    .returning();
  if (!updated) return null;
  await pub(challengeId, { status: "rejected" });
  return updated;
}

export async function cancelChallenge(challengeId) {
  const now = new Date();
  const [updated] = await db.update(duelChallenges)
    .set({ status: "cancelled", challengerPresent: false, challengeePresent: false, updatedAt: now })
    .where(and(
      eq(duelChallenges.id, challengeId),
      inArray(duelChallenges.status, ["pending", "accepted"]),
    ))
    .returning();
  if (!updated) return null;
  await pub(challengeId, { status: "cancelled" });
  return updated;
}

// ── Presence ──────────────────────────────────────────────────

export async function setPresence(challengeId, role, present) {
  const field = role === "challenger" ? { challengerPresent: present } : { challengeePresent: present };
  const [updated] = await db.update(duelChallenges)
    .set({ ...field, updatedAt: new Date() })
    .where(eq(duelChallenges.id, challengeId))
    .returning();
  if (!updated) return null;
  await pub(challengeId, {
    status:             updated.status,
    matchId:            updated.matchId,
    challengerPresent:  updated.challengerPresent,
    challengeePresent:  updated.challengeePresent,
  });
  return updated;
}

// ── Start match ───────────────────────────────────────────────

export async function startChallengeMatch(challengeId, clerkId) {
  const [ch] = await db.select().from(duelChallenges)
    .where(and(eq(duelChallenges.id, challengeId), eq(duelChallenges.status, "accepted")))
    .limit(1);
  if (!ch) return { error: "not_accepted" };

  const isParticipant = ch.challengerClerkId === clerkId || ch.challengeeClerkId === clerkId;
  if (!isParticipant) return { error: "not_participant" };

  if (!ch.challengerPresent || !ch.challengeePresent) return { error: "not_both_present" };

  const now    = new Date();
  const endsAt = new Date(now.getTime() + MATCH_DURATION_MS);
  const { challengeSlot, challengeData } = pickRandomProblem();

  const [match] = await db.insert(duelMatches)
    .values({ status: "active", startedAt: now, endsAt, challengeSlot, challengeData })
    .returning();

  await db.insert(duelMatchPlayers).values([
    { matchId: match.id, clerkId: ch.challengerClerkId, displayName: ch.challengerName },
    { matchId: match.id, clerkId: ch.challengeeClerkId, displayName: ch.challengeeName },
  ]);

  // Atomic flip to "matched" — only first caller wins if both click Start simultaneously
  const [updated] = await db.update(duelChallenges)
    .set({ status: "matched", matchId: match.id, updatedAt: now })
    .where(and(eq(duelChallenges.id, challengeId), eq(duelChallenges.status, "accepted")))
    .returning();

  if (!updated) {
    // Race: another Start request already created the real match — abandon ours
    await db.update(duelMatches).set({ status: "abandoned" }).where(eq(duelMatches.id, match.id)).catch(() => {});
    const [current] = await db.select().from(duelChallenges).where(eq(duelChallenges.id, challengeId)).limit(1);
    return { data: current ?? null };
  }

  await pub(challengeId, { status: "matched", matchId: match.id });
  return { data: updated, matchId: match.id };
}
