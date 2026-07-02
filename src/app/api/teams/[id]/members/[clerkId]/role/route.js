import { getRequestAuth } from "@/lib/clerk-guard";
import { promoteOrDemote } from "@/lib/db-teams";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, clerkId: targetClerkId } = await params;
  const teamId = parseInt(id, 10);
  if (isNaN(teamId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const { action } = await request.json().catch(() => ({}));
  if (action !== "promote" && action !== "demote") {
    return Response.json({ error: "action must be promote or demote" }, { status: 400 });
  }

  try {
    await promoteOrDemote(teamId, session.userId, targetClerkId, action);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 403 });
  }
}
