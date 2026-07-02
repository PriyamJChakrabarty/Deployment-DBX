import { getRequestAuth } from "@/lib/clerk-guard";
import { getUserByClerkId } from "@/lib/db-users";
import { createChallenge } from "@/lib/db-duel-challenge";

export const dynamic = "force-dynamic";

function resolveDisplayName(u) {
  if (!u) return "Player";
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return full || u.username || "Player";
}

export async function POST(request) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { challengeeClerkId } = await request.json().catch(() => ({}));
  if (!challengeeClerkId) return Response.json({ error: "challengeeClerkId required" }, { status: 400 });
  if (challengeeClerkId === session.userId) return Response.json({ error: "Cannot challenge yourself" }, { status: 400 });

  const [challengerUser, challengeeUser] = await Promise.all([
    getUserByClerkId(session.userId).catch(() => null),
    getUserByClerkId(challengeeClerkId).catch(() => null),
  ]);

  const challengerName = resolveDisplayName(challengerUser);
  const challengeeName = resolveDisplayName(challengeeUser);

  const challenge = await createChallenge(session.userId, challengerName, challengeeClerkId, challengeeName);
  return Response.json({ ok: true, challengeId: challenge.id });
}
