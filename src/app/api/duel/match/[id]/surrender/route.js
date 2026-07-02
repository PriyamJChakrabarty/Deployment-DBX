import { getRequestAuth } from "@/lib/clerk-guard";
import { surrenderDuelMatch } from "@/lib/db-duel";

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

  try {
    await surrenderDuelMatch(matchId, session.userId);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message ?? "Surrender failed" }, { status: 400 });
  }
}
