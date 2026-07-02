import { and, asc, desc, eq, inArray, isNotNull, lt, ne, sql } from "drizzle-orm";
import { db } from "./db";
import { duelMatchPlayers, duelMatches, raidMatchPlayers, raidMatches, teamMembers, teams, users } from "./schema";

export async function upsertUser({ clerkId, email, firstName, lastName, imageUrl, username }) {
  const rows = await db
    .insert(users)
    .values({ clerkId, email: email ?? null, firstName: firstName ?? null, lastName: lastName ?? null, imageUrl: imageUrl ?? null, username: username ?? null })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email:     email     ?? null,
        firstName: firstName ?? null,
        lastName:  lastName  ?? null,
        imageUrl:  imageUrl  ?? null,
        username:  username  ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return rows[0];
}

export async function updateBestScore(clerkId, newScore) {
  await db
    .update(users)
    .set({ bestScore: newScore, updatedAt: new Date() })
    .where(and(eq(users.clerkId, clerkId), lt(users.bestScore, newScore)));
}

export async function getLeaderboard(limit = 100) {
  return db
    .select({
      id:        users.id,
      clerkId:   users.clerkId,
      firstName: users.firstName,
      lastName:  users.lastName,
      username:  users.username,
      imageUrl:  users.imageUrl,
      bestScore: users.bestScore,
    })
    .from(users)
    .orderBy(desc(users.bestScore), asc(users.createdAt))
    .limit(limit);
}

export async function getUserByClerkId(clerkId) {
  const rows = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  return rows[0] ?? null;
}

export async function deleteUserByClerkId(clerkId) {
  await db.delete(users).where(eq(users.clerkId, clerkId));
}

// ── Home dashboard stats ──────────────────────────────────────

export async function getUserStats(clerkId) {
  const [userRow] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!userRow) return null;

  const playerJoin = and(
    eq(duelMatchPlayers.matchId, duelMatches.id),
    eq(duelMatchPlayers.clerkId, clerkId),
  );

  const raidPlayerJoin = and(
    eq(raidMatchPlayers.matchId, raidMatches.id),
    eq(raidMatchPlayers.clerkId, clerkId),
  );

  const [pts, winsRow, lossesRow, slotsRow, raidPts, raidWinsRow, raidLossesRow] = await Promise.all([
    db
      .select({ total: sql`coalesce(sum(${duelMatchPlayers.score}), 0)` })
      .from(duelMatchPlayers)
      .where(eq(duelMatchPlayers.clerkId, clerkId))
      .then((r) => r[0]),

    db
      .select({ n: sql`count(*)` })
      .from(duelMatches)
      .innerJoin(duelMatchPlayers, playerJoin)
      .where(and(eq(duelMatches.status, "completed"), eq(duelMatches.winnerClerkId, clerkId)))
      .then((r) => r[0]),

    // ne(col, val) generates col != val; NULL != val → NULL (falsy) — draws excluded correctly
    db
      .select({ n: sql`count(*)` })
      .from(duelMatches)
      .innerJoin(duelMatchPlayers, playerJoin)
      .where(and(eq(duelMatches.status, "completed"), ne(duelMatches.winnerClerkId, clerkId)))
      .then((r) => r[0]),

    db
      .select({ n: sql`count(distinct ${duelMatches.challengeSlot})` })
      .from(duelMatches)
      .innerJoin(duelMatchPlayers, playerJoin)
      .where(isNotNull(duelMatches.challengeSlot))
      .then((r) => r[0]),

    // Raid total points
    db
      .select({ total: sql`coalesce(sum(${raidMatchPlayers.totalScore}), 0)` })
      .from(raidMatchPlayers)
      .where(eq(raidMatchPlayers.clerkId, clerkId))
      .then((r) => r[0]),

    // Raid wins: my team won
    db
      .select({ n: sql`count(*)` })
      .from(raidMatches)
      .innerJoin(raidMatchPlayers, raidPlayerJoin)
      .where(and(
        eq(raidMatches.status, "completed"),
        sql`${raidMatches.winnerTeam} = ${raidMatchPlayers.teamId}`,
      ))
      .then((r) => r[0]),

    // Raid losses: other team won (winnerTeam not null, not my team)
    db
      .select({ n: sql`count(*)` })
      .from(raidMatches)
      .innerJoin(raidMatchPlayers, raidPlayerJoin)
      .where(and(
        eq(raidMatches.status, "completed"),
        isNotNull(raidMatches.winnerTeam),
        sql`${raidMatches.winnerTeam} != ${raidMatchPlayers.teamId}`,
      ))
      .then((r) => r[0]),
  ]);

  const name =
    [userRow.firstName, userRow.lastName].filter(Boolean).join(" ").trim() ||
    userRow.username ||
    "Bug Slayer";

  return {
    name,
    bestScore:          userRow.bestScore ?? 0,
    totalPoints:        Number(pts?.total ?? 0) + Number(raidPts?.total ?? 0),
    wins:               Number(winsRow?.n ?? 0)  + Number(raidWinsRow?.n ?? 0),
    losses:             Number(lossesRow?.n ?? 0) + Number(raidLossesRow?.n ?? 0),
    questionsPracticed: Number(slotsRow?.n ?? 0),
  };
}

// ── Leaderboard sub-sections ──────────────────────────────────

export async function getDuelWinsLeaderboard(limit = 10) {
  return db
    .select({
      id:        users.id,
      clerkId:   users.clerkId,
      firstName: users.firstName,
      lastName:  users.lastName,
      username:  users.username,
      count:     sql`cast(count(*) as int)`,
    })
    .from(duelMatches)
    .innerJoin(
      duelMatchPlayers,
      and(
        eq(duelMatchPlayers.matchId, duelMatches.id),
        eq(duelMatchPlayers.clerkId, duelMatches.winnerClerkId),
      ),
    )
    .innerJoin(users, eq(users.clerkId, duelMatchPlayers.clerkId))
    .where(and(eq(duelMatches.status, "completed"), isNotNull(duelMatches.winnerClerkId)))
    .groupBy(users.id, users.clerkId, users.firstName, users.lastName, users.username)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function getGroupWinsLeaderboard(limit = 10) {
  return db
    .select({
      id:        users.id,
      clerkId:   users.clerkId,
      firstName: users.firstName,
      lastName:  users.lastName,
      username:  users.username,
      count:     sql`cast(count(*) as int)`,
    })
    .from(raidMatches)
    .innerJoin(
      raidMatchPlayers,
      and(
        eq(raidMatchPlayers.matchId, raidMatches.id),
        sql`${raidMatches.winnerTeam} = ${raidMatchPlayers.teamId}`,
      ),
    )
    .innerJoin(users, eq(users.clerkId, raidMatchPlayers.clerkId))
    .where(and(eq(raidMatches.status, "completed"), isNotNull(raidMatches.winnerTeam)))
    .groupBy(users.id, users.clerkId, users.firstName, users.lastName, users.username)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function getUserTeamId(clerkId) {
  const [row] = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.clerkId, clerkId))
    .limit(1);
  return row?.teamId ?? null;
}

export async function getTeamsLeaderboard(limit = 50) {
  return db
    .select({
      id:     teams.id,
      name:   teams.name,
      emoji:  teams.emoji,
      wins:   teams.wins,
      losses: teams.losses,
    })
    .from(teams)
    .orderBy(desc(teams.wins), asc(teams.id))
    .limit(limit);
}

export async function getUserRaidHistory(clerkId, limit = 20) {
  const rows = await db
    .select({
      matchId:        raidMatches.id,
      startedAt:      raidMatches.startedAt,
      codebaseFolder: raidMatches.codebaseFolder,
      winnerTeam:     raidMatches.winnerTeam,
      myScore:        raidMatchPlayers.totalScore,
      myTeamId:       raidMatchPlayers.teamId,
    })
    .from(raidMatches)
    .innerJoin(
      raidMatchPlayers,
      and(eq(raidMatchPlayers.matchId, raidMatches.id), eq(raidMatchPlayers.clerkId, clerkId)),
    )
    .where(eq(raidMatches.status, "completed"))
    .orderBy(desc(raidMatches.startedAt))
    .limit(limit);

  if (rows.length === 0) return [];

  const matchIds  = rows.map((r) => r.matchId);
  const allPlayers = await db
    .select({
      matchId:     raidMatchPlayers.matchId,
      clerkId:     raidMatchPlayers.clerkId,
      displayName: raidMatchPlayers.displayName,
      totalScore:  raidMatchPlayers.totalScore,
      teamId:      raidMatchPlayers.teamId,
    })
    .from(raidMatchPlayers)
    .where(inArray(raidMatchPlayers.matchId, matchIds));

  return rows.map((row) => {
    const matchPlayers = allPlayers.filter((p) => p.matchId === row.matchId);
    const teams = [0, 1].map((teamId) => {
      const members = matchPlayers.filter((p) => p.teamId === teamId);
      return {
        teamId,
        totalScore: members.reduce((s, p) => s + p.totalScore, 0),
        players:    members.map((p) => ({
          clerkId:     p.clerkId,
          displayName: p.displayName,
          totalScore:  p.totalScore,
          isMe:        p.clerkId === clerkId,
        })),
      };
    });
    return {
      matchId:        row.matchId,
      startedAt:      row.startedAt?.toISOString?.() ?? null,
      codebaseFolder: row.codebaseFolder,
      myScore:        row.myScore,
      myTeamId:       row.myTeamId,
      winnerTeam:     row.winnerTeam ?? null,
      result:
        row.winnerTeam === null              ? "draw" :
        row.winnerTeam === row.myTeamId      ? "win"  : "loss",
      teams,
    };
  });
}

export async function getUserDuelHistory(clerkId, limit = 20) {
  const rows = await db
    .select({
      matchId:       duelMatches.id,
      startedAt:     duelMatches.startedAt,
      winnerClerkId: duelMatches.winnerClerkId,
      challengeSlot: duelMatches.challengeSlot,
      myScore:       duelMatchPlayers.score,
    })
    .from(duelMatches)
    .innerJoin(
      duelMatchPlayers,
      and(eq(duelMatchPlayers.matchId, duelMatches.id), eq(duelMatchPlayers.clerkId, clerkId)),
    )
    .where(eq(duelMatches.status, "completed"))
    .orderBy(desc(duelMatches.startedAt))
    .limit(limit);

  if (rows.length === 0) return [];

  const matchIds = rows.map((r) => r.matchId);
  const oppRows  = await db
    .select({ matchId: duelMatchPlayers.matchId, displayName: duelMatchPlayers.displayName, score: duelMatchPlayers.score })
    .from(duelMatchPlayers)
    .where(and(inArray(duelMatchPlayers.matchId, matchIds), ne(duelMatchPlayers.clerkId, clerkId)));

  const oppMap = Object.fromEntries(oppRows.map((o) => [o.matchId, o]));

  return rows.map((row) => ({
    matchId:       row.matchId,
    startedAt:     row.startedAt?.toISOString?.() ?? null,
    challengeSlot: row.challengeSlot ?? "Unknown",
    myScore:       row.myScore,
    opponentName:  oppMap[row.matchId]?.displayName ?? "Opponent",
    opponentScore: oppMap[row.matchId]?.score ?? 0,
    result:
      row.winnerClerkId === clerkId ? "win"  :
      row.winnerClerkId === null    ? "draw" :
                                      "loss",
  }));
}
