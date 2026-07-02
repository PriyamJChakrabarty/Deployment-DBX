import { getRequestAuth } from "@/lib/clerk-guard";
import { getMyTeam } from "@/lib/db-teams";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const team = await getMyTeam(session.userId);
  return Response.json(team ?? null);
}
