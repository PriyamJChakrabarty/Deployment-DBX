import { getRequestAuth } from "@/lib/clerk-guard";
import { surrenderRaidMatch } from "@/lib/db-raid";

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
    const result = await surrenderRaidMatch(matchId, session.userId);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    const msg = err?.message ?? "Surrender failed";
    console.error("[surrender route]", msg);
    return Response.json({ error: msg }, { status: 400 });
  }
}
