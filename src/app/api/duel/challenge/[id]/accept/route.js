import { getRequestAuth } from "@/lib/clerk-guard";
import { acceptChallenge } from "@/lib/db-duel-challenge";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const challengeId = parseInt(id, 10);
  if (isNaN(challengeId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const ch = await acceptChallenge(challengeId, session.userId);
  if (!ch) return Response.json({ error: "Challenge not found, expired, or already resolved" }, { status: 404 });

  return Response.json({ ok: true, challengeId: ch.id });
}
