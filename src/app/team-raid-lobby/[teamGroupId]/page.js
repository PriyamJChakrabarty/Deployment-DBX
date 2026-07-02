import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { hasClerkCredentials } from "@/lib/clerk-config";
import { db } from "@/lib/db";
import { raidInvitations } from "@/lib/schema";
import SiteNav from "@/components/site-nav";
import HeartbeatClient from "@/components/heartbeat";
import LobbyClient from "./lobby-client";

export const dynamic = "force-dynamic";

export default async function TeamRaidLobbyPage({ params }) {
  if (!hasClerkCredentials()) redirect("/sign-in");

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { teamGroupId } = await params;

  const invites = await db.select().from(raidInvitations)
    .where(eq(raidInvitations.teamGroupId, teamGroupId));
  if (invites.length === 0) redirect("/home");

  const first     = invites[0];
  const isCaptain = userId === first.inviterClerkId;
  const isMember  = isCaptain || invites.some((i) => i.inviteeClerkId === userId);
  if (!isMember) redirect("/home");

  const initialState = {
    teamGroupId,
    captainClerkId: first.inviterClerkId,
    captainName:    first.inviterName,
    teamId:         first.sourceTeamId,
    teamName:       first.sourceTeamName,
    members: invites.map((inv) => ({
      clerkId: inv.inviteeClerkId,
      name:    inv.inviteeName,
      status:  inv.status,
      present: inv.present,
    })),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0d1a1f" }}>
      <HeartbeatClient />
      <SiteNav active="" />
      <LobbyClient
        teamGroupId={teamGroupId}
        myClerkId={userId}
        isCaptain={isCaptain}
        initialState={initialState}
      />
    </div>
  );
}
