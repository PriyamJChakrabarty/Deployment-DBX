import { getRequestAuth } from "@/lib/clerk-guard";
import { getPendingChallengesForMe } from "@/lib/db-duel-challenge";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const challenges = await getPendingChallengesForMe(session.userId);
  return Response.json(challenges);
}
