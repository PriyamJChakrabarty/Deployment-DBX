import SiteNav from "@/components/site-nav";
import { getRequestAuth } from "@/lib/clerk-guard";
import {
  getLeaderboard,
  getDuelWinsLeaderboard,
  getGroupWinsLeaderboard,
  getTeamsLeaderboard,
  getUserTeamId,
} from "@/lib/db-users";
import LeaderboardClient from "./leaderboard-client";

export const metadata = { title: "Leaderboard — DebugRoyale" };
export const dynamic = "force-dynamic";

function prepareIndividual(allRows, myClerkId) {
  const myIdx = myClerkId ? allRows.findIndex(r => r.clerkId === myClerkId) : -1;
  const rows = allRows.slice(0, 10).map((r, i) => ({ ...r, rank: i + 1, isMe: r.clerkId === myClerkId }));
  const myEntry = myIdx >= 10 ? { ...allRows[myIdx], rank: myIdx + 1, isMe: true } : null;
  return { rows, myEntry };
}

function prepareTeams(allRows, myTeamId) {
  const myIdx = myTeamId != null ? allRows.findIndex(t => t.id === myTeamId) : -1;
  const rows = allRows.slice(0, 10).map((t, i) => ({ ...t, rank: i + 1, isMyTeam: t.id === myTeamId }));
  const myEntry = myIdx >= 10 ? { ...allRows[myIdx], rank: myIdx + 1, isMyTeam: true } : null;
  return { rows, myEntry };
}

async function fetchData(userId) {
  try {
    const [allTrophies, allDuelWins, allGroupWins, allTeams, myTeamId] = await Promise.all([
      getLeaderboard(200),
      getDuelWinsLeaderboard(200),
      getGroupWinsLeaderboard(200),
      getTeamsLeaderboard(200),
      userId ? getUserTeamId(userId) : Promise.resolve(null),
    ]);
    return {
      trophies:     prepareIndividual(allTrophies,  userId),
      duelWins:     prepareIndividual(allDuelWins,   userId),
      groupWins:    prepareIndividual(allGroupWins,  userId),
      teamRankings: prepareTeams(allTeams, myTeamId),
    };
  } catch {
    return null;
  }
}

export default async function LeaderboardPage() {
  const session = await getRequestAuth();
  const userId  = session?.userId ?? null;
  const data    = await fetchData(userId);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d1a1f",
      color: "#c9d6da",
      fontFamily: "'Segoe UI', 'Aptos', 'Trebuchet MS', sans-serif",
      backgroundImage: [
        "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(61,220,132,0.07), transparent 70%)",
        "linear-gradient(rgba(201,214,218,0.025) 1px, transparent 1px)",
        "linear-gradient(90deg, rgba(201,214,218,0.025) 1px, transparent 1px)",
      ].join(", "),
      backgroundSize: "100% 100%, 44px 44px, 44px 44px",
    }}>
      <SiteNav active="/leaderboard" />

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "60px 24px 100px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "52px" }}>
          <div style={{
            fontSize: "96px", lineHeight: 1, marginBottom: "16px",
            filter: "drop-shadow(0 0 32px rgba(245,197,24,0.35))",
          }}>
            🏆
          </div>
          <h1 style={{
            fontSize: "clamp(28px, 5vw, 44px)",
            fontWeight: 900, color: "#e8f0f3",
            letterSpacing: "-0.03em", margin: "0 0 14px",
          }}>
            Leaderboard
          </h1>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            background: "rgba(61,220,132,0.08)",
            border: "1px solid rgba(61,220,132,0.25)",
            padding: "5px 16px", borderRadius: "999px",
            fontSize: "12px", color: "#3ddc84", fontWeight: 600,
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3ddc84", display: "inline-block" }} />
            Global Rankings
          </div>
        </div>

        {data === null && (
          <div style={{
            background: "rgba(245,90,90,0.07)",
            border: "1px solid rgba(245,90,90,0.2)",
            borderRadius: "10px", padding: "24px",
            textAlign: "center", color: "#ff8080", fontSize: "14px",
          }}>
            Could not load leaderboard — database not connected yet.
            <br />
            <span style={{ fontSize: "12px", color: "#8ba0a6", marginTop: "6px", display: "block" }}>
              Make sure DATABASE_URL is set and <code style={{ color: "#3ddc84" }}>npm run db:push</code> has been run.
            </span>
          </div>
        )}

        {data !== null && (
          <LeaderboardClient
            trophies={data.trophies}
            duelWins={data.duelWins}
            groupWins={data.groupWins}
            teamRankings={data.teamRankings}
          />
        )}
      </main>
    </div>
  );
}
