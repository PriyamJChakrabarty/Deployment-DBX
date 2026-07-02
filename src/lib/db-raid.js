import { and, asc, desc, eq, gt, gte, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "./db";
import { raidMatches, raidMatchPlayers, raidQueue, userPresence } from "./schema";
import { updateBestScore } from "./db-users";
import { resolveTeamRaidResult } from "./db-teams";
import { publishRaidMatchUpdated } from "./raid-realtime";
import { getAblyPlayerChannel } from "./ably-server";

// ── Constants ── change RAID_MATCH_DURATION_MS to adjust match length ──
const QUEUE_TTL_MS           = 60_000;
const PRESENCE_WINDOW_MS     = 20_000;
const REQUIRED_PLAYERS       = 4;           // 2 per team
const RAID_MATCH_DURATION_MS = 6000_000;      // 30 seconds
const DEFAULT_CODEBASE       = "AstroStructure";

// ── Queue ──────────────────────────────────────────────────────

export async function enqueueForRaid(clerkId, displayName, teamGroupId = null) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + QUEUE_TTL_MS);
  console.log(`[QUEUE] enqueue  clerkId=${clerkId.slice(-6)} name="${displayName}" teamGroupId=${teamGroupId ?? "null"}`);
  await db
    .insert(raidQueue)
    .values({ clerkId, displayName, teamGroupId, joinedAt: now, expiresAt, matchId: null })
    .onConflictDoUpdate({
      target: raidQueue.clerkId,
      set: {
        displayName, teamGroupId, joinedAt: now, expiresAt, updatedAt: now,
        // Preserve matchId if already claimed — prevents a concurrent poll from wiping a match assignment
        matchId: sql`COALESCE(${raidQueue.matchId}, excluded.match_id)`,
      },
    });
}

export async function cancelRaidQueue(clerkId) {
  // Guard: only delete if not already claimed in a match — prevents erasing a live match assignment
  await db.delete(raidQueue).where(and(eq(raidQueue.clerkId, clerkId), isNull(raidQueue.matchId)));
}

// Nulls a stale matchId so the player can be found by opponent searches again.
// Only called when getRaidMatchForUser already confirmed no active match exists.
export async function clearStaleQueueMatchId(clerkId) {
  await db.update(raidQueue).set({ matchId: null }).where(eq(raidQueue.clerkId, clerkId));
}

export async function getRaidQueueEntry(clerkId) {
  const [row] = await db.select().from(raidQueue).where(eq(raidQueue.clerkId, clerkId)).limit(1);
  return row ?? null;
}

// ── Matchmaking ────────────────────────────────────────────────

async function createMatch(playerQuad) {
  // playerQuad = [{clerkId, displayName, teamId}, ...]
  const now    = new Date();
  const endsAt = new Date(now.getTime() + RAID_MATCH_DURATION_MS);

  const [match] = await db
    .insert(raidMatches)
    .values({ status: "active", codebaseFolder: DEFAULT_CODEBASE, startedAt: now, endsAt })
    .returning();

  // Atomically claim everyone except the caller (index 0)
  const claimIds = playerQuad.slice(1).map((p) => p.clerkId);
  const claimed  = await db
    .update(raidQueue)
    .set({ matchId: match.id, updatedAt: now })
    .where(and(inArray(raidQueue.clerkId, claimIds), isNull(raidQueue.matchId)))
    .returning({ clerkId: raidQueue.clerkId });

  if (claimed.length < claimIds.length) {
    await db.update(raidMatches).set({ status: "abandoned" }).where(eq(raidMatches.id, match.id)).catch(() => {});
    return null;
  }

  // Claim the caller
  await db.update(raidQueue).set({ matchId: match.id, updatedAt: now }).where(eq(raidQueue.clerkId, playerQuad[0].clerkId));

  await db.insert(raidMatchPlayers).values(
    playerQuad.map((p) => ({ matchId: match.id, clerkId: p.clerkId, displayName: p.displayName, teamId: p.teamId }))
  );

  // Abandon any older active matches these players were previously in so
  // getRaidMatchForUser always finds this new match instead of a stale one.
  const allClerkIds = playerQuad.map((p) => p.clerkId);
  const oldMatches = await db
    .select({ matchId: raidMatchPlayers.matchId })
    .from(raidMatchPlayers)
    .where(and(inArray(raidMatchPlayers.clerkId, allClerkIds), ne(raidMatchPlayers.matchId, match.id)));
  const oldMatchIds = [...new Set(oldMatches.map((r) => r.matchId))];
  if (oldMatchIds.length > 0) {
    await db
      .update(raidMatches)
      .set({ status: "abandoned", updatedAt: now })
      .where(and(inArray(raidMatches.id, oldMatchIds), eq(raidMatches.status, "active")))
      .catch(() => {});
    console.log(`[createMatch] abandoned stale matches ${oldMatchIds.join(",")} for new match ${match.id}`);
  }

  const result = { matchId: match.id, endsAt: match.endsAt?.toISOString?.() ?? null };

  // Push match notification to every player's personal channel so the matchmaking
  // page can redirect instantly via SSE instead of waiting for the next 2s poll.
  await Promise.allSettled(
    playerQuad.map((p) =>
      getAblyPlayerChannel(p.clerkId).publish("matched", result).catch((err) => {
        console.error(`[createMatch] Ably push failed for ${p.clerkId.slice(-6)}:`, err?.message ?? err);
      })
    )
  );
  console.log(`[createMatch] pushed match-found to ${playerQuad.length} players for match ${match.id}`);

  return result;
}

export async function tryMatchRaid(myClerkId, myDisplayName, teamGroupId = null) {
  const presenceThreshold = new Date(Date.now() - PRESENCE_WINDOW_MS);
  const now = new Date();

  console.log(`[MATCH] tryMatch caller=${myClerkId.slice(-6)} name="${myDisplayName}" teamGroupId=${teamGroupId ?? "null"} presenceWindow=${PRESENCE_WINDOW_MS}ms`);

  // Dump the full queue for visibility
  const fullQueue = await db
    .select({ clerkId: raidQueue.clerkId, displayName: raidQueue.displayName, teamGroupId: raidQueue.teamGroupId, matchId: raidQueue.matchId, expiresAt: raidQueue.expiresAt })
    .from(raidQueue);
  console.log(`[MATCH] queue snapshot (${fullQueue.length} rows):`, fullQueue.map((r) => ({
    id: r.clerkId.slice(-6), name: r.displayName, tgId: r.teamGroupId?.slice(-6) ?? "null", matchId: r.matchId, expired: r.expiresAt < now,
  })));

  // Dump presence table
  const allPresence = await db.select({ clerkId: userPresence.clerkId, lastSeenAt: userPresence.lastSeenAt }).from(userPresence);
  console.log(`[MATCH] presence snapshot (${allPresence.length} rows):`, allPresence.map((p) => ({
    id: p.clerkId.slice(-6), lastSeen: p.lastSeenAt, fresh: p.lastSeenAt >= presenceThreshold,
  })));

  if (teamGroupId) {
    // Pre-formed team: find the partner who queued with the same teamGroupId
    const [partner] = await db
      .select({ clerkId: raidQueue.clerkId, displayName: raidQueue.displayName })
      .from(raidQueue)
      .where(and(
        eq(raidQueue.teamGroupId, teamGroupId),
        ne(raidQueue.clerkId, myClerkId),
        isNull(raidQueue.matchId),
        gt(raidQueue.expiresAt, now),
      ))
      .limit(1);

    console.log(`[MATCH] [team] partner search for teamGroupId=${teamGroupId.slice(-6)}:`, partner ? `found ${partner.clerkId.slice(-6)} "${partner.displayName}"` : "NOT FOUND");
    if (!partner) return null;

    // Find 2 random opponents
    const opponents = await db
      .select({ clerkId: raidQueue.clerkId, displayName: raidQueue.displayName })
      .from(raidQueue)
      .innerJoin(userPresence, eq(userPresence.clerkId, raidQueue.clerkId))
      .where(and(
        ne(raidQueue.clerkId, myClerkId),
        ne(raidQueue.clerkId, partner.clerkId),
        isNull(raidQueue.matchId),
        gt(raidQueue.expiresAt, now),
        gte(userPresence.lastSeenAt, presenceThreshold),
      ))
      .orderBy(asc(raidQueue.joinedAt))
      .limit(2);

    console.log(`[MATCH] [team] opponent search: found ${opponents.length}/2`, opponents.map((o) => `${o.clerkId.slice(-6)} "${o.displayName}"`));
    if (opponents.length < 2) return null;

    console.log(`[MATCH] [team] creating match: team0=[${myClerkId.slice(-6)},${partner.clerkId.slice(-6)}] team1=[${opponents[0].clerkId.slice(-6)},${opponents[1].clerkId.slice(-6)}]`);
    return createMatch([
      { clerkId: myClerkId,          displayName: myDisplayName,           teamId: 0 },
      { clerkId: partner.clerkId,    displayName: partner.displayName,     teamId: 0 },
      { clerkId: opponents[0].clerkId, displayName: opponents[0].displayName, teamId: 1 },
      { clerkId: opponents[1].clerkId, displayName: opponents[1].displayName, teamId: 1 },
    ]);
  }

  // Random 4-player path
  const needed = REQUIRED_PLAYERS - 1;
  const others = await db
    .select({ clerkId: raidQueue.clerkId, displayName: raidQueue.displayName })
    .from(raidQueue)
    .innerJoin(userPresence, eq(userPresence.clerkId, raidQueue.clerkId))
    .where(and(
      ne(raidQueue.clerkId, myClerkId),
      isNull(raidQueue.matchId),
      gt(raidQueue.expiresAt, now),
      gte(userPresence.lastSeenAt, presenceThreshold),
    ))
    .orderBy(asc(raidQueue.joinedAt))
    .limit(needed);

  console.log(`[MATCH] [random] found ${others.length}/${needed} others:`, others.map((o) => `${o.clerkId.slice(-6)} "${o.displayName}"`));
  if (others.length < needed) return null;

  console.log(`[MATCH] [random] creating match: team0=[${myClerkId.slice(-6)},${others[0].clerkId.slice(-6)}] team1=[${others[1].clerkId.slice(-6)},${others[2].clerkId.slice(-6)}]`);
  return createMatch([
    { clerkId: myClerkId,         displayName: myDisplayName,           teamId: 0 },
    { clerkId: others[0].clerkId, displayName: others[0].displayName,   teamId: 0 },
    { clerkId: others[1].clerkId, displayName: others[1].displayName,   teamId: 1 },
    { clerkId: others[2].clerkId, displayName: others[2].displayName,   teamId: 1 },
  ]);
}

// ── Match lookup (for queue polling / reconnect) ───────────────

export async function getRaidMatchForUser(clerkId) {
  // Query raidMatchPlayers directly — the queue's matchId can be stale (dead match ref
  // preserved by COALESCE even after that match completed/was abandoned).
  const [playerRow] = await db
    .select({ matchId: raidMatchPlayers.matchId })
    .from(raidMatchPlayers)
    .where(eq(raidMatchPlayers.clerkId, clerkId))
    .orderBy(desc(raidMatchPlayers.matchId))
    .limit(1);

  if (!playerRow) return null;

  const [match] = await db
    .select()
    .from(raidMatches)
    .where(and(eq(raidMatches.id, playerRow.matchId), eq(raidMatches.status, "active")))
    .limit(1);

  if (!match) return null;
  return { matchId: match.id, endsAt: match.endsAt?.toISOString?.() ?? null };
}

// ── Full match state (polled by arena client) ──────────────────

export async function getRaidMatchState(matchId, myClerkId) {
  const [match] = await db
    .select()
    .from(raidMatches)
    .where(eq(raidMatches.id, matchId))
    .limit(1);
  if (!match) return null;

  const players = await db
    .select()
    .from(raidMatchPlayers)
    .where(eq(raidMatchPlayers.matchId, matchId))
    .orderBy(asc(raidMatchPlayers.teamId), asc(raidMatchPlayers.id));

  const me = players.find((p) => p.clerkId === myClerkId);
  if (!me) return null;

  const teams = [0, 1].map((teamId) => {
    const members = players.filter((p) => p.teamId === teamId);
    return {
      teamId,
      totalScore: members.reduce((s, p) => s + p.totalScore, 0),
      players: members.map((p) => ({
        clerkId:     p.clerkId,
        displayName: p.displayName,
        totalScore:  p.totalScore,
        status:      p.status,
        isMe:        p.clerkId === myClerkId,
      })),
    };
  });

  return {
    matchId:        match.id,
    status:         match.status,
    codebaseFolder: match.codebaseFolder,
    endsAt:         match.endsAt?.toISOString?.() ?? null,
    updatedAt:      match.updatedAt?.toISOString?.() ?? null,
    winnerTeam:     match.winnerTeam ?? null,
    teams,
    me: {
      clerkId:      me.clerkId,
      displayName:  me.displayName,
      teamId:       me.teamId,
      totalScore:   me.totalScore,
      fileProgress: JSON.parse(me.fileProgress || "{}"),
      status:       me.status,
    },
  };
}

// ── Progress update ────────────────────────────────────────────

export async function updateRaidPlayerProgress(matchId, clerkId, fileProgress, totalScore) {
  console.log(`✋ [db-raid.js] updateRaidPlayerProgress matchId=${matchId} clerkId=${clerkId.slice(-6)} score=${totalScore}`);
  const now = new Date();
  await db
    .update(raidMatchPlayers)
    .set({ fileProgress: JSON.stringify(fileProgress), totalScore, updatedAt: now })
    .where(and(eq(raidMatchPlayers.matchId, matchId), eq(raidMatchPlayers.clerkId, clerkId)));
  await db
    .update(raidMatches)
    .set({ updatedAt: now })
    .where(eq(raidMatches.id, matchId));
  console.log(`✋ [db-raid.js] raidMatches.updatedAt bumped to ${now.toISOString()} matchId=${matchId}`);
}

function getRaidWinnerTeam(players) {
  const teamScores = [0, 1].map((teamId) =>
    players
      .filter((player) => player.teamId === teamId)
      .reduce((score, player) => score + player.totalScore, 0)
  );

  if (teamScores[0] > teamScores[1]) return 0;
  if (teamScores[1] > teamScores[0]) return 1;
  return null;
}

export async function finalizeRaidMatch(matchId, players = null) {
  const matchPlayers = players ?? await db
    .select()
    .from(raidMatchPlayers)
    .where(eq(raidMatchPlayers.matchId, matchId));

  if (matchPlayers.length === 0) return { winnerTeam: null, players: [] };

  const winnerTeam = getRaidWinnerTeam(matchPlayers);

  await db
    .update(raidMatches)
    .set({ status: "completed", winnerTeam, updatedAt: new Date() })
    .where(eq(raidMatches.id, matchId));

  await Promise.all(
    matchPlayers.map((player) => updateBestScore(player.clerkId, player.totalScore).catch(() => {}))
  );

  await resolveTeamRaidResult(matchId, matchPlayers, winnerTeam).catch((err) => {
    console.error("[finalizeRaidMatch] resolveTeamRaidResult failed:", err?.message ?? err);
  });

  await publishRaidMatchUpdated(matchId, "finalized").catch((err) => {
    console.error("[finalizeRaidMatch] publishRaidMatchUpdated failed:", err?.message ?? err);
  });

  return { winnerTeam, players: matchPlayers };
}

// ── Surrender ─────────────────────────────────────────────────

export async function surrenderRaidMatch(matchId, clerkId) {
  console.log(`[SURRENDER] matchId=${matchId} clerkId=${clerkId.slice(-6)}`);

  const [match] = await db
    .select()
    .from(raidMatches)
    .where(and(eq(raidMatches.id, matchId), eq(raidMatches.status, "active")))
    .limit(1);
  if (!match) throw new Error("Match not active");

  const [player] = await db
    .select()
    .from(raidMatchPlayers)
    .where(and(eq(raidMatchPlayers.matchId, matchId), eq(raidMatchPlayers.clerkId, clerkId)))
    .limit(1);
  if (!player) throw new Error("Player not in match");

  const surrenderingTeam = player.teamId;
  const winnerTeam = surrenderingTeam === 0 ? 1 : 0;
  console.log(`[SURRENDER] team ${surrenderingTeam} surrenders → team ${winnerTeam} wins`);

  const now = new Date();
  await db
    .update(raidMatches)
    .set({ status: "completed", winnerTeam, updatedAt: now })
    .where(eq(raidMatches.id, matchId));

  const allPlayers = await db
    .select()
    .from(raidMatchPlayers)
    .where(eq(raidMatchPlayers.matchId, matchId));

  await Promise.all(
    allPlayers.map((p) => updateBestScore(p.clerkId, p.totalScore).catch(() => {}))
  );

  await resolveTeamRaidResult(matchId, allPlayers, winnerTeam).catch((err) => {
    console.error("[surrenderRaidMatch] resolveTeamRaidResult failed:", err?.message ?? err);
  });

  await publishRaidMatchUpdated(matchId, "surrendered").catch((err) => {
    console.error("[surrenderRaidMatch] publishRaidMatchUpdated failed:", err?.message ?? err);
  });

  return { winnerTeam, surrenderingTeam };
}

// ── Auto-complete when timer expires ──────────────────────────

export async function autoCompleteRaidIfExpired(matchId) {
  const [match] = await db
    .select()
    .from(raidMatches)
    .where(and(eq(raidMatches.id, matchId), eq(raidMatches.status, "active")))
    .limit(1);

  if (!match || !match.endsAt || new Date() <= new Date(match.endsAt)) return false;

  await finalizeRaidMatch(matchId);
  return true;
}
