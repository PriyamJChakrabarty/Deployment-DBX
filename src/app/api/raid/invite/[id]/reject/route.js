import { getRequestAuth } from "@/lib/clerk-guard";
import { rejectInvite } from "@/lib/db-raid-invite";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const inviteId = parseInt(id, 10);
  if (isNaN(inviteId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  await rejectInvite(inviteId, session.userId);
  return Response.json({ ok: true });
}
