import { getRequestAuth } from "@/lib/clerk-guard";
import { getUserByClerkId } from "@/lib/db-users";
import { createTeam, listOpenTeams } from "@/lib/db-teams";

export const dynamic = "force-dynamic";

function resolveDisplayName(u) {
  if (!u) return "Player";
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return full || u.username || "Player";
}

export async function GET() {
  const teams = await listOpenTeams();
  return Response.json(teams);
}

export async function POST(request) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, emoji, size } = await request.json().catch(() => ({}));
  if (!name?.trim()) return Response.json({ error: "Name required" }, { status: 400 });

  const user = await getUserByClerkId(session.userId).catch(() => null);
  const captainName = resolveDisplayName(user);

  try {
    const team = await createTeam(session.userId, captainName, name.trim(), emoji || "🛡️", Math.min(10, Math.max(2, parseInt(size) || 5)));
    return Response.json(team);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 409 });
  }
}
