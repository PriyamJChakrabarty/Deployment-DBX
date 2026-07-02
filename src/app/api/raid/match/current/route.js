import { getRequestAuth } from "@/lib/clerk-guard";
import { getRaidMatchForUser } from "@/lib/db-raid";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.userId) {
    return Response.json({ match: null });
  }

  const match = await getRaidMatchForUser(session.userId);
  return Response.json({ match: match ?? null });
}
