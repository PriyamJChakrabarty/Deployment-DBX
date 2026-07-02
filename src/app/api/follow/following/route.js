import { getRequestAuth } from "@/lib/clerk-guard";
import { getFollowing } from "@/lib/db-social";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.userId) return Response.json([]);

  const rows = await getFollowing(session.userId);
  return Response.json(rows);
}
