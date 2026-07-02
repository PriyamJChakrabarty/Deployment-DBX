import { getRequestAuth } from "@/lib/clerk-guard";
import { markTeamReady } from "@/lib/db-team-challenge";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const challengeId = parseInt(id, 10);
  if (isNaN(challengeId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const result = await markTeamReady(challengeId, session.userId);
  if (result.error === "not_accepted")     return Response.json({ error: "Challenge is not in accepted state" }, { status: 400 });
  if (result.error === "not_captain")      return Response.json({ error: "Only captains can mark their team ready" }, { status: 403 });
  if (result.error === "not_all_present")  return Response.json({ error: "All team members must be in the lobby" }, { status: 400 });
  if (result.error === "update_failed")    return Response.json({ error: "Could not update ready state" }, { status: 500 });

  return Response.json({ ok: true, matchId: result.matchId ?? null });
}
