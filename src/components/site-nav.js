import Link from "next/link";
import SiteAuthControls from "./site-auth-controls";
import RaidNotificationBell from "./raid-notifications";
import { FEATURES } from "@/lib/features";

const NAV_LINKS = [
  { href: "/home",        label: "Home"        },
  ...(FEATURES.PRACTICE ? [{ href: "/duel", label: "Practice" }] : []),
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/teams",       label: "Teams"       },
  { href: "/social",      label: "Social"      },
];

export default function SiteNav({ active }) {
  return (
    <nav className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/90 px-6 backdrop-blur-md sm:px-10">
      {/* Logo */}
      <Link href="/home" className="flex flex-shrink-0 items-center gap-0.5 font-display text-lg font-bold tracking-tight">
        <span className="text-foreground">Debug</span>
        <span className="text-brand">Royale</span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-0.5">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = active === href;
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                isActive ? "bg-brand-dim font-semibold text-brand" : "font-normal text-foreground-muted hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Raid notification bell + Auth */}
      <div className="flex items-center gap-1">
        <RaidNotificationBell />
        <SiteAuthControls />
      </div>
    </nav>
  );
}
