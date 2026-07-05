import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import { getRequestAuth } from "@/lib/clerk-guard";

export default async function SiteAuthControls() {
  const { clerkEnabled, isAuthenticated } = await getRequestAuth();

  if (!clerkEnabled) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-foreground-muted">
          Add Clerk keys to enable login.
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/sign-in"
          className="rounded-full border border-border-strong px-4 py-2 text-[13px] font-semibold text-foreground-muted transition-colors hover:text-foreground"
        >
          Log In
        </Link>
        <Link
          href="/sign-up"
          className="rounded-full bg-brand px-4.5 py-2 text-[13px] font-bold text-background shadow-[0_0_24px_var(--brand-dim)]"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
