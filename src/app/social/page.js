import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { hasClerkCredentials } from "@/lib/clerk-config";
import { getUserByClerkId } from "@/lib/db-users";
import SiteNav from "@/components/site-nav";
import SocialClient from "./social-client";

export const metadata = { title: "Social — DebugRoyale" };

const PAGE_BG = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  overflow: "hidden",
  background: "#0d1a1f",
  fontFamily: "'Segoe UI', 'Aptos', 'Trebuchet MS', sans-serif",
};

export default async function SocialPage() {
  if (!hasClerkCredentials()) {
    return (
      <div style={PAGE_BG}>
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
    <div style={PAGE_BG}>
      <SiteNav active="/social" />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <SocialClient myClerkId={userId} myNote={myNote} />
      </div>
    </div>
  );
}
