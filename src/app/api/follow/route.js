import { getRequestAuth } from "@/lib/clerk-guard";
import { followUser, unfollowUser } from "@/lib/db-social";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.userId) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { targetClerkId } = await request.json();
  if (!targetClerkId || targetClerkId === session.userId) {
    return Response.json({ error: "Invalid target" }, { status: 400 });
  }

  await followUser(session.userId, targetClerkId);
  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.userId) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { targetClerkId } = await request.json();
  if (!targetClerkId) return Response.json({ error: "Invalid target" }, { status: 400 });

  await unfollowUser(session.userId, targetClerkId);
  return Response.json({ ok: true });
}
