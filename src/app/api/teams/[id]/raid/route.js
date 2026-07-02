import { randomUUID } from "node:crypto";
import { getRequestAuth } from "@/lib/clerk-guard";
import { getUserByClerkId } from "@/lib/db-users";
import { getMyTeam, registerTeamRaid } from "@/lib/db-teams";
import { sendTeamInvites } from "@/lib/db-raid-invite";

export const dynamic = "force-dynamic";

function resolveDisplayName(u) {
  if (!u) return "Player";
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return full || u.username || "Player";
}

export async function POST(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (isNaN(teamId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const team = await getMyTeam(session.userId);
  if (!team || team.id !== teamId) {
    return Response.json({ error: "Not in this team" }, { status: 403 });
  }
  if (team.myRole !== "captain") {
    return Response.json({ error: "Only the captain can start a team raid" }, { status: 403 });
  }

  const user = await getUserByClerkId(session.userId).catch(() => null);
  const captainName = resolveDisplayName(user);

  // Generate a shared group ID for all team members
  const teamGroupId = randomUUID();

  // Invite every non-captain member
  const otherMembers = team.members.filter((m) => m.clerkId !== session.userId);
  const memberClerkIds = otherMembers.map((m) => m.clerkId);

  await sendTeamInvites(
    session.userId,
    captainName,
    memberClerkIds,
    teamGroupId,
    team.id,
    team.name,
  );

  await registerTeamRaid(team.id, session.userId, teamGroupId);

  return Response.json({
    ok:          true,
    teamGroupId,
    teamId:      team.id,
    teamName:    team.name,
    teamEmoji:   team.emoji,
    membersInvited: memberClerkIds.length,
  });
}
