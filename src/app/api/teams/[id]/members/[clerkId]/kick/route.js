import { getRequestAuth } from "@/lib/clerk-guard";
import { kickMember } from "@/lib/db-teams";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, clerkId: targetClerkId } = await params;
  const teamId = parseInt(id, 10);
  if (isNaN(teamId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  try {
    await kickMember(teamId, session.userId, targetClerkId);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 403 });
  }
}
