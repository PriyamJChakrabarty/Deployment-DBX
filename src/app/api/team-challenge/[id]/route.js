import { getRequestAuth } from "@/lib/clerk-guard";
import { getTeamChallengeState } from "@/lib/db-team-challenge";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const challengeId = parseInt(id, 10);
  if (isNaN(challengeId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const state = await getTeamChallengeState(challengeId);
  if (!state) return Response.json({ error: "Not found" }, { status: 404 });

  const isParticipant = state.members?.some((m) => m.clerkId === session.userId);
  if (!isParticipant) return Response.json({ error: "Not a participant" }, { status: 403 });

  return Response.json(state);
}
