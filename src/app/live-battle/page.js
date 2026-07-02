import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { hasClerkCredentials } from "@/lib/clerk-config";
import { getUserByClerkId } from "@/lib/db-users";
import SiteNav from "@/components/site-nav";
import HeartbeatClient from "@/components/heartbeat";
import MatchmakingClient from "./matchmaking-client";

export const metadata = { title: "Live Battle — DebugRoyale" };

function resolveDisplayName(user) {
  if (!user) return "Player";
  if (user.username) return user.username;
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || "Player";
}

export default async function LiveBattlePage() {
  if (!hasClerkCredentials()) {
    redirect("/sign-in");
  }

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let myName = "Player";
  try {
    const me = await getUserByClerkId(userId);
    myName = resolveDisplayName(me);
  } catch {}

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      overflow: "hidden",
      background: "#0d1a1f",
      fontFamily: "'Segoe UI', 'Aptos', 'Trebuchet MS', sans-serif",
    }}>
      <HeartbeatClient />
      <SiteNav active="/live-battle" />
      <MatchmakingClient myClerkId={userId} myName={myName} />
    </div>
  );
}
