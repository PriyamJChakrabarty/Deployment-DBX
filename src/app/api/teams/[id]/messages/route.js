import { getRequestAuth } from "@/lib/clerk-guard";
import { getUserByClerkId } from "@/lib/db-users";
import { getTeamMessages, sendTeamMessage } from "@/lib/db-teams";

export const dynamic = "force-dynamic";

function resolveDisplayName(u) {
  if (!u) return "Player";
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return full || u.username || "Player";
}

export async function GET(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (isNaN(teamId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const messages = await getTeamMessages(teamId);
  return Response.json(messages);
}

export async function POST(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (isNaN(teamId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const { content } = await request.json().catch(() => ({}));
  if (!content?.trim()) return Response.json({ error: "Content required" }, { status: 400 });

  const user = await getUserByClerkId(session.userId).catch(() => null);
  const senderName = resolveDisplayName(user);

  try {
    const msg = await sendTeamMessage(teamId, session.userId, senderName, content.trim().slice(0, 500));
    return Response.json(msg);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 403 });
  }
}
