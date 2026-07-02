import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { hasClerkCredentials } from "@/lib/clerk-config";
import { getUserByClerkId } from "@/lib/db-users";
import { getRaidMatchForUser } from "@/lib/db-raid";
import SiteNav from "@/components/site-nav";
import HeartbeatClient from "@/components/heartbeat";
import GroupRaidLobbyClient from "./group-raid-lobby-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Group Raid - DebugRoyale" };

function resolveDisplayName(user) {
  if (!user) return "Player";
  if (user.username) return user.username;
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || "Player";
}

export default async function GroupRaidPage({ searchParams }) {
  if (!hasClerkCredentials()) redirect("/sign-in");

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const existing = await getRaidMatchForUser(userId);
  if (existing) redirect(`/group-raid-page/arena/${existing.matchId}`);

  let myName = "Player";
  try {
    const user = await getUserByClerkId(userId);
    myName = resolveDisplayName(user);
  } catch {}

  const { teamGroupId = null, partnerName = null } = await searchParams;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      overflow: "hidden", background: "#0d1a1f",
      fontFamily: "'Segoe UI', 'Aptos', 'Trebuchet MS', sans-serif",
    }}>
      <HeartbeatClient />
      <SiteNav active="/group-raid-page" />
      <GroupRaidLobbyClient
        myName={myName}
        myClerkId={userId}
        initialTeamGroupId={teamGroupId}
        initialPartnerName={partnerName ? decodeURIComponent(partnerName) : null}
      />
    </div>
  );
}
