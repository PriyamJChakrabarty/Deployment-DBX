import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { hasClerkCredentials } from "@/lib/clerk-config";
import { getUserByClerkId } from "@/lib/db-users";
import { getChallengeState } from "@/lib/db-duel-challenge";
import HeartbeatClient from "@/components/heartbeat";
import SiteNav from "@/components/site-nav";
import LobbyClient from "./lobby-client";

export const dynamic = "force-dynamic";

function resolveDisplayName(u) {
  if (!u) return "Player";
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return full || u.username || "Player";
}

export default async function DuelChallengePage({ params }) {
  if (!hasClerkCredentials()) redirect("/sign-in");

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const challengeId = parseInt(id, 10);
  if (isNaN(challengeId)) redirect("/home");

  const ch = await getChallengeState(challengeId);
  if (!ch) redirect("/home");

  const isParticipant = ch.challengerClerkId === userId || ch.challengeeClerkId === userId;
  if (!isParticipant) redirect("/home");

  // Already matched — go straight to arena
  if (ch.status === "matched" && ch.matchId) {
    redirect(`/live-battle/arena/${ch.matchId}`);
  }

  let myName = "Player";
  try {
    const user = await getUserByClerkId(userId);
    myName = resolveDisplayName(user);
  } catch {}

  const role = ch.challengerClerkId === userId ? "challenger" : "challengee";

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
        myName={myName}
        role={role}
        initialChallenge={ch}
      />
    </div>
  );
}
