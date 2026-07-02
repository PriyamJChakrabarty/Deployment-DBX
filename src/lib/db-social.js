import { and, asc, desc, eq, ne, notInArray, or, sql } from "drizzle-orm";
import { db } from "./db";
import { conversations, follows, messages, users } from "./schema";

function displayName(row) {
  if (row?.username) return row.username;
  const full = [row?.firstName, row?.lastName].filter(Boolean).join(" ").trim();
  return full || "Anonymous";
}

// ── Follow ────────────────────────────────────────────────────

export async function followUser(followerClerkId, followingClerkId) {
  await db
    .insert(follows)
    .values({ followerClerkId, followingClerkId })
    .onConflictDoNothing();
}

export async function unfollowUser(followerClerkId, followingClerkId) {
  await db
    .delete(follows)
    .where(and(
      eq(follows.followerClerkId, followerClerkId),
      eq(follows.followingClerkId, followingClerkId),
    ));
}

export async function isFollowing(followerClerkId, followingClerkId) {
  const rows = await db
    .select({ id: follows.id })
    .from(follows)
    .where(and(
      eq(follows.followerClerkId, followerClerkId),
      eq(follows.followingClerkId, followingClerkId),
    ))
    .limit(1);
  return rows.length > 0;
}

// ── Suggested users ───────────────────────────────────────────

export async function getSuggestedUsers(myClerkId, limit = 8) {
  const alreadyFollowing = await db
    .select({ id: follows.followingClerkId })
    .from(follows)
    .where(eq(follows.followerClerkId, myClerkId));

  const excludeIds = [myClerkId, ...alreadyFollowing.map((r) => r.id)];

  return db
    .select({
      clerkId:   users.clerkId,
      firstName: users.firstName,
      lastName:  users.lastName,
      username:  users.username,
      imageUrl:  users.imageUrl,
      bestScore: users.bestScore,
    })
    .from(users)
    .where(notInArray(users.clerkId, excludeIds))
    .orderBy(desc(users.bestScore))
    .limit(limit);
}

// ── Following list ────────────────────────────────────────────

export async function getFollowing(myClerkId) {
  return db
    .select({
      clerkId:   users.clerkId,
      firstName: users.firstName,
      lastName:  users.lastName,
      username:  users.username,
      imageUrl:  users.imageUrl,
      bestScore: users.bestScore,
      noteText:  users.noteText,
    })
    .from(follows)
    .innerJoin(users, eq(users.clerkId, follows.followingClerkId))
    .where(eq(follows.followerClerkId, myClerkId))
    .orderBy(asc(follows.createdAt));
}

export async function updateNote(clerkId, noteText) {
  const trimmed = noteText?.trim().slice(0, 60) ?? null;
  await db.update(users).set({ noteText: trimmed }).where(eq(users.clerkId, clerkId));
}

// ── Conversations ─────────────────────────────────────────────

function canonicalPair(a, b) {
  return a < b ? [a, b] : [b, a];
}

export async function getOrCreateConversation(myClerkId, targetClerkId) {
  const [u1, u2] = canonicalPair(myClerkId, targetClerkId);

  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.user1ClerkId, u1), eq(conversations.user2ClerkId, u2)))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const rows = await db
    .insert(conversations)
    .values({ user1ClerkId: u1, user2ClerkId: u2 })
    .onConflictDoNothing()
    .returning({ id: conversations.id });

  if (rows.length > 0) return rows[0].id;

  // Race condition fallback
  const retry = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.user1ClerkId, u1), eq(conversations.user2ClerkId, u2)))
    .limit(1);

  return retry[0]?.id ?? null;
}

export async function getConversationMember(convId, clerkId) {
  const rows = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, convId),
        or(eq(conversations.user1ClerkId, clerkId), eq(conversations.user2ClerkId, clerkId)),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

// ── Messages ──────────────────────────────────────────────────

export async function getMessages(convId, limit = 50) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(asc(messages.createdAt))
    .limit(limit);
}

export async function sendMessage(convId, senderClerkId, body) {
  const trimmed = body.trim().slice(0, 500);
  const rows = await db
    .insert(messages)
    .values({ conversationId: convId, senderClerkId, body: trimmed })
    .returning();

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, convId));

  return rows[0];
}

// ── Inbox ─────────────────────────────────────────────────────

export async function getInbox(myClerkId) {
  const convList = await db
    .select()
    .from(conversations)
    .where(or(
      eq(conversations.user1ClerkId, myClerkId),
      eq(conversations.user2ClerkId, myClerkId),
    ))
    .orderBy(desc(conversations.updatedAt))
    .limit(50);

  if (convList.length === 0) return [];

  const rows = await Promise.all(
    convList.map(async (conv) => {
      const otherClerkId =
        conv.user1ClerkId === myClerkId ? conv.user2ClerkId : conv.user1ClerkId;

      const [otherUsers, lastMsgs] = await Promise.all([
        db
          .select({ clerkId: users.clerkId, firstName: users.firstName, lastName: users.lastName, username: users.username, imageUrl: users.imageUrl })
          .from(users)
          .where(eq(users.clerkId, otherClerkId))
          .limit(1),
        db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.createdAt))
          .limit(1),
      ]);

      const otherUser = otherUsers[0] ?? null;
      return {
        id:          conv.id,
        updatedAt:   conv.updatedAt,
        otherClerkId,
        displayName: displayName(otherUser),
        imageUrl:    otherUser?.imageUrl ?? null,
        lastMessage: lastMsgs[0] ?? null,
      };
    }),
  );

  // Only surface conversations that actually have messages sent
  return rows.filter((r) => r.lastMessage !== null);
}
