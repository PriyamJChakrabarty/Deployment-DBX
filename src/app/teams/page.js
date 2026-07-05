import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { hasClerkCredentials } from "@/lib/clerk-config";
import SiteNav from "@/components/site-nav";
import TeamsPanel from "@/app/social/team-panel";

export const metadata = { title: "Teams — DebugRoyale" };

const PAGE_CLASS = "flex flex-col h-screen overflow-hidden bg-background font-sans";

export default async function TeamsPage() {
  if (!hasClerkCredentials()) {
    return (
      <div className={PAGE_CLASS}>
        <SiteNav active="/teams" />
        <div className="flex flex-1 overflow-hidden">
          <TeamsPanel myClerkId={null} />
        </div>
      </div>
    );
  }

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className={PAGE_CLASS}>
      <SiteNav active="/teams" />
      <div className="flex flex-1 overflow-hidden">
        <TeamsPanel myClerkId={userId} />
      </div>
    </div>
  );
}
