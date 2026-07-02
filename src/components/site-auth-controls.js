import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import { getRequestAuth } from "@/lib/clerk-guard";

export default async function SiteAuthControls() {
  const { clerkEnabled, isAuthenticated } = await getRequestAuth();

  if (!clerkEnabled) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "12px", color: "#8ba0a6" }}>
          Add Clerk keys to enable login.
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <Link href="/sign-in" style={{
          color: "#c9d6da",
          textDecoration: "none",
          border: "1px solid rgba(201,214,218,0.16)",
          borderRadius: "999px",
          padding: "8px 16px",
          fontSize: "13px",
          fontWeight: 600,
        }}>
          Log In
        </Link>
        <Link href="/sign-up" style={{
          background: "#3ddc84",
          color: "#0d1a1f",
          textDecoration: "none",
          borderRadius: "999px",
          padding: "8px 18px",
          fontSize: "13px",
          fontWeight: 700,
          boxShadow: "0 0 24px rgba(61,220,132,0.18)",
        }}>
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
