import { getRequestAuth } from "@/lib/clerk-guard";
import { advanceCategory, getMatchState } from "@/lib/db-duel";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const matchId = parseInt(id, 10);
  if (isNaN(matchId)) return Response.json({ error: "Invalid match id" }, { status: 400 });

  const result = await advanceCategory(matchId, session.userId);
  if (!result) return Response.json({ error: "Not in this match." }, { status: 403 });

  const snapshot = await getMatchState(matchId, session.userId).catch(() => null);

  return Response.json({ ...result, snapshot });
}
