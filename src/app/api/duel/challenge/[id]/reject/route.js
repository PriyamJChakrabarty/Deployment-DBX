import { getRequestAuth } from "@/lib/clerk-guard";
import { rejectChallenge } from "@/lib/db-duel-challenge";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const challengeId = parseInt(id, 10);
  if (isNaN(challengeId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  await rejectChallenge(challengeId, session.userId);
  return Response.json({ ok: true });
}
