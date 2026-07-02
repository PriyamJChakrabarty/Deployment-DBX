import { getRequestAuth } from "@/lib/clerk-guard";
import { getAblyRestClient, getTeamCodeChannelName } from "@/lib/ably-server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // matchId and teamId come from query params so the token can be scoped
  const { searchParams } = new URL(request.url);
  const matchId = parseInt(searchParams.get("matchId") ?? "", 10);
  const teamId  = parseInt(searchParams.get("teamId")  ?? "", 10);

  if (Number.isNaN(matchId) || Number.isNaN(teamId)) {
    return Response.json({ error: "matchId and teamId required" }, { status: 400 });
  }

  const channelName = getTeamCodeChannelName(matchId, teamId);

  try {
    const rest = getAblyRestClient();
    const tokenRequest = await rest.auth.createTokenRequest({
      clientId:   session.userId,
      capability: { [channelName]: ["publish", "subscribe", "presence"] },
      ttl:        3600_000, // 1 hour
    });
    return Response.json(tokenRequest);
  } catch (err) {
    console.error("[ably/token] createTokenRequest failed:", err?.message ?? err);
    return Response.json({ error: "Token creation failed" }, { status: 500 });
  }
}
