import { getRequestAuth } from "@/lib/clerk-guard";
import { startChallengeMatch } from "@/lib/db-duel-challenge";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const challengeId = parseInt(id, 10);
  if (isNaN(challengeId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const result = await startChallengeMatch(challengeId, session.userId);

  if (result.error === "not_accepted")    return Response.json({ error: "Challenge is not in accepted state" }, { status: 400 });
  if (result.error === "not_participant") return Response.json({ error: "Not a participant" }, { status: 403 });
  if (result.error === "not_both_present") return Response.json({ error: "Both players must be in the lobby" }, { status: 400 });

  return Response.json({ ok: true, matchId: result.matchId ?? result.data?.matchId ?? null });
}
