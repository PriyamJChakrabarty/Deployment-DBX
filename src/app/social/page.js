import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { hasClerkCredentials } from "@/lib/clerk-config";
import { getUserByClerkId } from "@/lib/db-users";
import SiteNav from "@/components/site-nav";
import SocialClient from "./social-client";

export const metadata = { title: "Social — DebugRoyale" };

const PAGE_CLASS = "flex flex-col h-screen overflow-hidden bg-background font-sans";

export default async function SocialPage() {
  if (!hasClerkCredentials()) {
    return (
      <div className={PAGE_CLASS}>
        <SiteNav active="/social" />
        <SocialClient myClerkId={null} myNote={null} />
      </div>
    );
  }

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let myNote = null;
  try {
    const me = await getUserByClerkId(userId);
    myNote = me?.noteText ?? null;
  } catch { /* DB not connected yet */ }

  return (
    <div className={PAGE_CLASS}>
      <SiteNav active="/social" />
      <div className="flex flex-1 overflow-hidden">
        <SocialClient myClerkId={userId} myNote={myNote} />
      </div>
    </div>
  );
}
