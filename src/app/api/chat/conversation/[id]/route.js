import { getRequestAuth } from "@/lib/clerk-guard";
import { getConversationMember, getMessages } from "@/lib/db-social";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.userId) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const convId = Number(id);

  const member = await getConversationMember(convId, session.userId);
  if (!member) return Response.json({ error: "Not found" }, { status: 404 });

  const msgs = await getMessages(convId, 50);
  return Response.json(msgs);
}
