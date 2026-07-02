import { getRequestAuth } from "@/lib/clerk-guard";
import { rejectTeamChallenge } from "@/lib/db-team-challenge";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const challengeId = parseInt(id, 10);
  if (isNaN(challengeId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const result = await rejectTeamChallenge(challengeId, session.userId);
  if (!result) return Response.json({ error: "Challenge not found or already resolved" }, { status: 400 });
  if (result.error === "not_challengee_captain") return Response.json({ error: "Only the challengee captain can reject" }, { status: 403 });

  return Response.json({ ok: true });
}
