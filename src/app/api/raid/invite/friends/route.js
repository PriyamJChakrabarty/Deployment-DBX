import { getRequestAuth } from "@/lib/clerk-guard";
import { getEligibleFriends } from "@/lib/db-raid-invite";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const friends = await getEligibleFriends(session.userId);
  return Response.json({ friends });
}
