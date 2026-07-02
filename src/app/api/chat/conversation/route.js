import { getRequestAuth } from "@/lib/clerk-guard";
import { getOrCreateConversation } from "@/lib/db-social";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.userId) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { targetClerkId } = await request.json();
  if (!targetClerkId || targetClerkId === session.userId) {
    return Response.json({ error: "Invalid target" }, { status: 400 });
  }

  const convId = await getOrCreateConversation(session.userId, targetClerkId);
  if (!convId) return Response.json({ error: "Could not create conversation" }, { status: 500 });

  return Response.json({ conversationId: convId });
}
