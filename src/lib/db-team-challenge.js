import { and, desc, eq, gt, inArray, or } from "drizzle-orm";
import { db } from "./db";
import {
  teamChallenges, teamChallengeLobbyMembers,
  teams, teamMembers, raidMatches, raidMatchPlayers, users,
} from "./schema";
import { getAblyPlayerChannel, getAblyRestTeamChallengeChannel } from "./ably-server";
import { getMyTeam } from "./db-teams";

const CHALLENGE_TTL_MS  = 5 * 60_000;
const MATCH_DURATION_MS = 20 * 60_000;
const DEFAULT_CODEBASE  = "AstroStructure";

function resolveDisplayName(u) {
  if (!u) return "Player";
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return full || u.username || u.displayName || "Player";
}

async function pub(challengeId, state) {
  await getAblyRestTeamChallengeChannel(challengeId)
    .publish("team-challenge-updated", { ...state, sentAt: new Date().toISOString() })
    .catch((e) => console.error("[team-challenge] Ably publish failed:", e?.message));
}

// ── Read ──────────────────────────────────────────────────────────

export async function getTeamChallengeState(challengeId) {
  const [ch] = await db.select().from(teamChallenges)
    .where(eq(teamChallenges.id, challengeId)).limit(1);
  if (!ch) return null;

  if (ch.status === "pending" && new Date(ch.expiresAt) < new Date()) {
    await db.update(teamChallenges)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(eq(teamChallenges.id, challengeId), eq(teamChallenges.status, "pending")))
      .catch(() => {});
    ch.status = "expired";
  }

  const members = await db.select().from(teamChallengeLobbyMembers)
    .where(eq(teamChallengeLobbyMembers.challengeId, challengeId));

  return { ...ch, members };
}

export async function getPendingChallengesForMember(clerkId) {
  const mySlots = await db
    .select({ challengeId: teamChallengeLobbyMembers.challengeId, teamSide: teamChallengeLobbyMembers.teamSide })
    .from(teamChallengeLobbyMembers)
    .where(eq(teamChallengeLobbyMembers.clerkId, clerkId));

  if (mySlots.length === 0) return [];

  const challengeIds = mySlots.map((s) => s.challengeId);
  const sideMap = Object.fromEntries(mySlots.map((s) => [s.challengeId, s.teamSide]));

  const rows = await db.select().from(teamChallenges)
    .where(and(
      inArray(teamChallenges.id, challengeIds),
      inArray(teamChallenges.status, ["pending", "accepted"]),
      gt(teamChallenges.expiresAt, new Date()),
    ))
    .orderBy(desc(teamChallenges.createdAt));

  return rows.map((r) => ({
    ...r,
    myTeamSide:         sideMap[r.id] ?? null,
    amChallengeeCaptain: r.challengeeCaptainId === clerkId,
  }));
}

// ── Create ────────────────────────────────────────────────────────

export async function createTeamChallenge(challengerClerkId, challengeeTeamId) {
  const challengerTeam = await getMyTeam(challengerClerkId);
  if (!challengerTeam) throw new Error("You are not in a team");

  const { myRole } = challengerTeam;
  if (myRole !== "captain" && myRole !== "vice_captain") {
    throw new Error("Only captains and vice captains can send team challenges");
  }
  if (challengerTeam.id === challengeeTeamId) throw new Error("Cannot challenge your own team");

  // Get challengee team + members
  const [challengeeTeamRow] = await db.select().from(teams)
    .where(eq(teams.id, challengeeTeamId)).limit(1);
  if (!challengeeTeamRow) throw new Error("Target team not found");

  const challengeeRawMembers = await db
    .select({
      clerkId:   teamMembers.clerkId,
      role:      teamMembers.role,
      username:  users.username,
      firstName: users.firstName,
      lastName:  users.lastName,
    })
    .from(teamMembers)
    .leftJoin(users, eq(users.clerkId, teamMembers.clerkId))
    .where(eq(teamMembers.teamId, challengeeTeamId));

  const challengeeCaptain = challengeeRawMembers.find((m) => m.role === "captain");
  if (!challengeeCaptain) throw new Error("Target team has no captain");

  const challengerCaptain = challengerTeam.members.find((m) => m.role === "captain");
  if (!challengerCaptain) throw new Error("Your team has no captain");

  const now       = new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);

  // Cancel any open challenge this team already has
  const existingForTeam = await db.select({ id: teamChallenges.id }).from(teamChallenges)
    .where(and(
      or(
        eq(teamChallenges.challengerTeamId, challengerTeam.id),
        eq(teamChallenges.challengeeTeamId, challengerTeam.id),
      ),
      inArray(teamChallenges.status, ["pending", "accepted"]),
    ));
  if (existingForTeam.length > 0) {
    const ids = existingForTeam.map((r) => r.id);
    await db.update(teamChallenges)
      .set({ status: "cancelled", updatedAt: now })
      .where(inArray(teamChallenges.id, ids))
      .catch(() => {});
  }

  const [ch] = await db.insert(teamChallenges).values({
    challengerTeamId:    challengerTeam.id,
    challengerTeamName:  challengerTeam.name,
    challengerTeamEmoji: challengerTeam.emoji,
    challengeeTeamId,
    challengeeTeamName:  challengeeTeamRow.name,
    challengeeTeamEmoji: challengeeTeamRow.emoji,
    challengerCaptainId: challengerCaptain.clerkId,
    challengeeCaptainId: challengeeCaptain.clerkId,
    expiresAt,
  }).returning();

  // Pre-populate lobby member slots
  const challengerSlots = challengerTeam.members.map((m) => ({
    challengeId: ch.id, clerkId: m.clerkId, teamSide: "challenger", displayName: m.displayName,
  }));
  const challengeeSlots = challengeeRawMembers.map((m) => ({
    challengeId: ch.id, clerkId: m.clerkId, teamSide: "challengee", displayName: resolveDisplayName(m),
  }));

  await db.insert(teamChallengeLobbyMembers)
    .values([...challengerSlots, ...challengeeSlots])
    .onConflictDoNothing();

  // Notify everyone via their personal Ably channel
  const notifyPayload = {
    challengeId:         ch.id,
    challengerTeamName:  challengerTeam.name,
    challengerTeamEmoji: challengerTeam.emoji,
    challengeeTeamName:  challengeeTeamRow.name,
    challengeeTeamEmoji: challengeeTeamRow.emoji,
    expiresAt:           expiresAt.toISOString(),
  };
  await Promise.allSettled(
    [...challengerSlots, ...challengeeSlots].map((s) =>
      getAblyPlayerChannel(s.clerkId).publish("team-challenge", notifyPayload).catch(() => {})
    )
  );

  return ch;
}

// ── Accept / Reject / Cancel ──────────────────────────────────────

export async function acceptTeamChallenge(challengeId, clerkId) {
  const state = await getTeamChallengeState(challengeId);
  if (!state || state.status !== "pending") return null;
  if (state.challengeeCaptainId !== clerkId) return { error: "not_challengee_captain" };

  const [updated] = await db.update(teamChallenges)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(and(eq(teamChallenges.id, challengeId), eq(teamChallenges.status, "pending")))
    .returning();
  if (!updated) return null;

  const newState = { ...updated, members: state.members };
  await pub(challengeId, newState);
  return newState;
}

export async function rejectTeamChallenge(challengeId, clerkId) {
  const [ch] = await db.select().from(teamChallenges)
    .where(eq(teamChallenges.id, challengeId)).limit(1);
  if (!ch) return null;
  if (ch.challengeeCaptainId !== clerkId) return { error: "not_challengee_captain" };

  const [updated] = await db.update(teamChallenges)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(and(eq(teamChallenges.id, challengeId), eq(teamChallenges.status, "pending")))
    .returning();
  if (!updated) return null;

  await pub(challengeId, { ...updated, members: [] });
  return updated;
}

export async function cancelTeamChallenge(challengeId) {
  const [updated] = await db.update(teamChallenges)
    .set({ status: "cancelled", challengerReady: false, challengeeReady: false, updatedAt: new Date() })
    .where(and(
      eq(teamChallenges.id, challengeId),
      inArray(teamChallenges.status, ["pending", "accepted"]),
    ))
    .returning();
  if (!updated) return null;

  await db.update(teamChallengeLobbyMembers)
    .set({ present: false })
    .where(eq(teamChallengeLobbyMembers.challengeId, challengeId))
    .catch(() => {});

  await pub(challengeId, { ...updated, members: [] });
  return updated;
}

// ── Presence ──────────────────────────────────────────────────────

export async function setTeamMemberPresence(challengeId, clerkId, present) {
  const [member] = await db.update(teamChallengeLobbyMembers)
    .set({ present })
    .where(and(
      eq(teamChallengeLobbyMembers.challengeId, challengeId),
      eq(teamChallengeLobbyMembers.clerkId, clerkId),
    ))
    .returning();
  if (!member) return null;

  const state = await getTeamChallengeState(challengeId);
  if (state) await pub(challengeId, state);
  return member;
}

// ── Ready ─────────────────────────────────────────────────────────

export async function markTeamReady(challengeId, clerkId) {
  const state = await getTeamChallengeState(challengeId);
  if (!state || state.status !== "accepted") return { error: "not_accepted" };

  const side =
    state.challengerCaptainId === clerkId ? "challenger" :
    state.challengeeCaptainId === clerkId ? "challengee" : null;
  if (!side) return { error: "not_captain" };

  // All members of this team must be present
  const sideMembers = state.members.filter((m) => m.teamSide === side);
  if (!sideMembers.every((m) => m.present)) return { error: "not_all_present" };

  const patch = side === "challenger" ? { challengerReady: true } : { challengeeReady: true };
  const [updated] = await db.update(teamChallenges)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(teamChallenges.id, challengeId), eq(teamChallenges.status, "accepted")))
    .returning();
  if (!updated) return { error: "update_failed" };

  if (updated.challengerReady && updated.challengeeReady) {
    return startTeamMatch(challengeId, state.members, updated);
  }

  const newState = { ...updated, members: state.members };
  await pub(challengeId, newState);
  return { data: newState };
}

// ── Start match (internal) ────────────────────────────────────────

async function startTeamMatch(challengeId, members, challengeRow) {
  const now    = new Date();
  const endsAt = new Date(now.getTime() + MATCH_DURATION_MS);

  const [match] = await db.insert(raidMatches)
    .values({ status: "active", codebaseFolder: DEFAULT_CODEBASE, startedAt: now, endsAt })
    .returning();

  const playerRows = members.map((m) => ({
    matchId:     match.id,
    clerkId:     m.clerkId,
    displayName: m.displayName,
    teamId:      m.teamSide === "challenger" ? 0 : 1,
  }));
  await db.insert(raidMatchPlayers).values(playerRows);

  // Atomic flip — only the first caller wins if both captains race
  const [updated] = await db.update(teamChallenges)
    .set({ status: "matched", matchId: match.id, updatedAt: now })
    .where(and(eq(teamChallenges.id, challengeId), eq(teamChallenges.status, "accepted")))
    .returning();

  if (!updated) {
    await db.update(raidMatches).set({ status: "abandoned" })
      .where(eq(raidMatches.id, match.id)).catch(() => {});
    const [current] = await db.select().from(teamChallenges)
      .where(eq(teamChallenges.id, challengeId)).limit(1);
    return { data: current ?? null };
  }

  const newState = { ...updated, members };
  await pub(challengeId, newState);
  return { data: newState, matchId: match.id };
}
