import { redirect } from "next/navigation";
import { getRequestAuth } from "@/lib/clerk-guard";
import LandingPageClient from "@/app/landing-page-client";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const session = await getRequestAuth();

  if (session.clerkEnabled && session.isAuthenticated) {
    redirect("/home");
  }

  return <LandingPageClient />;
}
