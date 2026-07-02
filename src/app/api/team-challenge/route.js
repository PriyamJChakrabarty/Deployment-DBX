import { getRequestAuth } from "@/lib/clerk-guard";
import { createTeamChallenge } from "@/lib/db-team-challenge";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { challengeeTeamId } = await request.json().catch(() => ({}));
  if (!challengeeTeamId) return Response.json({ error: "challengeeTeamId required" }, { status: 400 });

  try {
    const ch = await createTeamChallenge(session.userId, challengeeTeamId);
    return Response.json({ ok: true, challengeId: ch.id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
