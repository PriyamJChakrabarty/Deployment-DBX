import { getRequestAuth } from "@/lib/clerk-guard";
import { getMatchForUser } from "@/lib/db-duel";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.userId) {
    return Response.json({ match: null });
  }

  const match = await getMatchForUser(session.userId);
  return Response.json({ match: match ?? null });
}
