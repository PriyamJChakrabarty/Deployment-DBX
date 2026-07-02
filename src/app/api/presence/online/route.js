import { getRequestAuth } from "@/lib/clerk-guard";
import { getOnlineUsers } from "@/lib/db-presence";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getRequestAuth();

  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.userId) {
    return Response.json([]);
  }

  const users = await getOnlineUsers(session.userId);
  return Response.json(users);
}
