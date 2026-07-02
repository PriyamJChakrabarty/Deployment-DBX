import { getRequestAuth } from "@/lib/clerk-guard";
import { getUserByClerkId } from "@/lib/db-users";
import { sendInvite } from "@/lib/db-raid-invite";

export const dynamic = "force-dynamic";

function resolveDisplayName(user) {
  if (!user) return "Player";
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || user.username || "Player";
}

export async function POST(request) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { inviteeClerkId } = await request.json().catch(() => ({}));
  if (!inviteeClerkId) {
    return Response.json({ error: "inviteeClerkId required" }, { status: 400 });
  }
  if (inviteeClerkId === session.userId) {
    return Response.json({ error: "Cannot invite yourself" }, { status: 400 });
  }

  let inviterName = "Player";
  try {
    const user = await getUserByClerkId(session.userId);
    inviterName = resolveDisplayName(user);
  } catch {}

  const invite = await sendInvite(session.userId, inviterName, inviteeClerkId);
  return Response.json({ ok: true, inviteId: invite.id });
}
