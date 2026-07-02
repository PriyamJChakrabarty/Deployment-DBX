import { getRequestAuth } from "@/lib/clerk-guard";
import { getTeamRaidInviteStatuses } from "@/lib/db-raid-invite";
import { getMyTeam } from "@/lib/db-teams";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (isNaN(teamId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const teamGroupId = searchParams.get("teamGroupId");
  if (!teamGroupId) return Response.json({ error: "teamGroupId required" }, { status: 400 });

  const [team, invites] = await Promise.all([
    getMyTeam(session.userId),
    getTeamRaidInviteStatuses(teamGroupId),
  ]);

  const allAccepted    = invites.length > 0 && invites.every((i) => i.status === "accepted" || i.status === "started");
  const anyCancelled   = invites.some((i) => i.status === "team_cancelled");
  const anyExpired     = invites.some((i) => i.status === "expired" || new Date(i.expiresAt) < new Date());

  return Response.json({
    invites:      invites.map((i) => ({
      id:            i.id,
      inviteeClerkId: i.inviteeClerkId,
      inviteeName:   i.inviteeName,
      status:        i.status === "started" ? "accepted" : i.status,
      expiresAt:     i.expiresAt,
    })),
    allAccepted,
    anyCancelled,
    anyExpired,
    teamName:  team?.name    ?? null,
    teamEmoji: team?.emoji   ?? null,
    expiresAt: invites[0]?.expiresAt ?? null,
  });
}
