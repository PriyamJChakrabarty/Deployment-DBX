import { getRequestAuth } from "@/lib/clerk-guard";
import { getConversationMember, sendMessage } from "@/lib/db-social";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.userId) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const convId = Number(id);

  const member = await getConversationMember(convId, session.userId);
  if (!member) return Response.json({ error: "Not found" }, { status: 404 });

  const { body } = await request.json();
  if (!body?.trim()) return Response.json({ error: "Empty message" }, { status: 400 });

  const msg = await sendMessage(convId, session.userId, body);
  return Response.json(msg);
}
