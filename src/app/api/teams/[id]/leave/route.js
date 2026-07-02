import { getRequestAuth } from "@/lib/clerk-guard";
import { leaveTeam } from "@/lib/db-teams";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (isNaN(teamId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  try {
    const result = await leaveTeam(teamId, session.userId);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
