import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { hasClerkCredentials } from "@/lib/clerk-config";
import { getUserByClerkId } from "@/lib/db-users";
import { getRaidMatchState } from "@/lib/db-raid";
import { getFormalTeamInfoForMatch } from "@/lib/db-teams";
import { loadCodebase } from "@/lib/load-codebase";
import HeartbeatClient from "@/components/heartbeat";
import LiveRaidClient from "./live-raid-client";

export const dynamic = "force-dynamic";

function resolveDisplayName(user) {
  if (!user) return "Player";
  if (user.username) return user.username;
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || "Player";
}

export default async function RaidArenaPage({ params, searchParams }) {
  if (!hasClerkCredentials()) redirect("/sign-in");

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const { teamName: teamNameParam = null } = await searchParams;
  const matchId = parseInt(id, 10);
  if (isNaN(matchId)) redirect("/group-raid-page");

  const state = await getRaidMatchState(matchId, userId);
  if (!state || state.status === "abandoned") redirect("/group-raid-page");

  const codebaseData = loadCodebase(state.codebaseFolder);

  let myName = "Player";
  try {
    const user = await getUserByClerkId(userId);
    myName = resolveDisplayName(user);
  } catch {}

  const dbTeamInfo = await getFormalTeamInfoForMatch(matchId).catch(() => null);
  const fallbackTeamName = teamNameParam ? decodeURIComponent(teamNameParam) : null;
  const formalTeams = dbTeamInfo?.formalTeams?.length
    ? dbTeamInfo.formalTeams
    : fallbackTeamName
    ? [{ sourceTeamId: null, teamName: fallbackTeamName, teamSideId: state.me.teamId }]
    : [];

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: "#0d1a1f", color: "#c9d6da",
      fontFamily: "'Segoe UI', 'Aptos', 'Trebuchet MS', sans-serif",
      overflow: "hidden",
    }}>
      <HeartbeatClient />
      <LiveRaidClient
        matchId={matchId}
        myClerkId={userId}
        myName={myName}
        initialState={state}
        codebaseName={codebaseData.codebaseName}
        files={codebaseData.files}
        filesCode={codebaseData.filesCode}
        fileTree={codebaseData.fileTree}
        formalTeams={formalTeams}
      />
    </div>
  );
}
