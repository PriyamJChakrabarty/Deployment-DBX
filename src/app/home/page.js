import { redirect } from "next/navigation";
import { getRequestAuth } from "@/lib/clerk-guard";
import { getUserStats, getUserDuelHistory, getUserRaidHistory } from "@/lib/db-users";
import SiteNav from "@/components/site-nav";
import HeartbeatClient from "@/components/heartbeat";
import HomeClient from "../home-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getRequestAuth();
  const userId  = session?.userId ?? null;

  if (session.clerkEnabled && !session.isAuthenticated) {
    redirect("/sign-in");
  }

  let stats       = null;
  let history     = [];
  let raidHistory = [];

  if (userId) {
    try {
      [stats, history, raidHistory] = await Promise.all([
        getUserStats(userId),
        getUserDuelHistory(userId, 20),
        getUserRaidHistory(userId, 20),
      ]);
    } catch {}
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d1a1f",
      color: "#c9d6da",
      fontFamily: "'Segoe UI', 'Aptos', 'Trebuchet MS', sans-serif",
    }}>
      <HeartbeatClient />
      <SiteNav active="/home" />
      <HomeClient stats={stats} history={history} raidHistory={raidHistory} />
    </div>
  );
}
