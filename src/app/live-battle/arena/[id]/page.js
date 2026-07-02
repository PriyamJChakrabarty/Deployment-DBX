import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { readFileSync } from "fs";
import { join } from "path";
import { hasClerkCredentials } from "@/lib/clerk-config";
import { getUserByClerkId } from "@/lib/db-users";
import { getMatchState } from "@/lib/db-duel";
import HeartbeatClient from "@/components/heartbeat";
import LiveDuelClient from "./live-duel-client";

export const dynamic = "force-dynamic";

function resolveDisplayName(user) {
  if (!user) return "Player";
  if (user.username) return user.username;
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || "Player";
}

export default async function ArenaPage({ params }) {
  if (!hasClerkCredentials()) redirect("/sign-in");

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const matchId = parseInt(id, 10);
  if (isNaN(matchId)) redirect("/");

  const state = await getMatchState(matchId, userId);
  if (!state || state.status === "abandoned") redirect("/");

  // Load the shared code file
  let initialCode = "";
  try {
    const codePath = join(process.cwd(), "public", "codes", state.challengeSlot);
    initialCode = readFileSync(codePath, "utf-8");
  } catch {
    redirect("/");
  }

  const vulnerabilities = JSON.parse(state.challengeData || "{}");

  let myName = "Player";
  try {
    const me = await getUserByClerkId(userId);
    myName = resolveDisplayName(me);
  } catch {}

  // Strip raw challenge fields from the state passed to client (already parsed above)
  const { challengeSlot, challengeData, ...matchMeta } = state;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#0d1117" }}>
      <HeartbeatClient />
      <LiveDuelClient
        matchId={matchId}
        myClerkId={userId}
        myName={myName}
        initialCode={initialCode}
        challengeSlot={challengeSlot}
        vulnerabilities={vulnerabilities}
        matchMeta={matchMeta}
      />
    </div>
  );
}
