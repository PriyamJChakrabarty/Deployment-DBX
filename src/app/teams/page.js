import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { hasClerkCredentials } from "@/lib/clerk-config";
import SiteNav from "@/components/site-nav";
import TeamsPanel from "@/app/social/team-panel";

export const metadata = { title: "Teams — DebugRoyale" };

const PAGE_BG = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  overflow: "hidden",
  background: "#0d1a1f",
  fontFamily: "'Segoe UI', 'Aptos', 'Trebuchet MS', sans-serif",
};

export default async function TeamsPage() {
  if (!hasClerkCredentials()) {
    return (
      <div style={PAGE_BG}>
        <SiteNav active="/teams" />
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <TeamsPanel myClerkId={null} />
        </div>
      </div>
    );
  }

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div style={PAGE_BG}>
      <SiteNav active="/teams" />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <TeamsPanel myClerkId={userId} />
      </div>
    </div>
  );
}
