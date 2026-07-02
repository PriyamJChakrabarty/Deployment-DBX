import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { hasClerkCredentials } from "@/lib/clerk-config";
import { getTeamChallengeState } from "@/lib/db-team-challenge";
import HeartbeatClient from "@/components/heartbeat";
import SiteNav from "@/components/site-nav";
import LobbyClient from "./lobby-client";

export const dynamic = "force-dynamic";

export default async function TeamChallengePage({ params }) {
  if (!hasClerkCredentials()) redirect("/sign-in");

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const challengeId = parseInt(id, 10);
  if (isNaN(challengeId)) redirect("/home");

  const state = await getTeamChallengeState(challengeId);
  if (!state) redirect("/home");

  const isMember = state.members?.some((m) => m.clerkId === userId);
  if (!isMember) redirect("/home");

  if (state.status === "matched" && state.matchId) {
    redirect(`/group-raid-page/arena/${state.matchId}`);
  }

  const mySlot     = state.members.find((m) => m.clerkId === userId);
  const mySide     = mySlot?.teamSide ?? "challenger";
  const isCaptain  = state.challengerCaptainId === userId || state.challengeeCaptainId === userId;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      overflow: "hidden", background: "#0d1a1f",
      fontFamily: "'Segoe UI', 'Aptos', 'Trebuchet MS', sans-serif",
    }}>
      <HeartbeatClient />
      <SiteNav active="" />
      <LobbyClient
        challengeId={challengeId}
        myClerkId={userId}
        mySide={mySide}
        isCaptain={isCaptain}
        initialChallenge={state}
      />
    </div>
  );
}
