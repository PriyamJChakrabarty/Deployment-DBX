import { getRequestAuth } from "@/lib/clerk-guard";
import { autoCompleteRaidIfExpired, getRaidMatchState } from "@/lib/db-raid";
import { resolveTeamRaidResult } from "@/lib/db-teams";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const matchId = parseInt(id, 10);
  if (isNaN(matchId)) return Response.json({ error: "Invalid match id" }, { status: 400 });

  await autoCompleteRaidIfExpired(matchId).catch(() => {});

  const state = await getRaidMatchState(matchId, session.userId);
  if (!state)     return Response.json({ error: "Match not found" }, { status: 404 });
  if (!state.me)  return Response.json({ error: "Not in this match" }, { status: 403 });

  if (state.status === "completed") {
    const players = state.teams.flatMap((team) =>
      team.players.map((player) => ({
        clerkId: player.clerkId,
        displayName: player.displayName,
        totalScore: player.totalScore,
        status: player.status,
        teamId: team.teamId,
      }))
    );

    await resolveTeamRaidResult(matchId, players, state.winnerTeam ?? null).catch((err) => {
      console.error("[raid/match route] resolveTeamRaidResult failed:", err?.message ?? err);
    });
  }

  return Response.json(state, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
