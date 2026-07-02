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
    <nav style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 40px",
      height: "57px",
      borderBottom: "1px solid rgba(201,214,218,0.08)",
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "rgba(13,26,31,0.9)",
      backdropFilter: "blur(16px)",
      flexShrink: 0,
    }}>

      {/* Logo */}
      <Link href="/home" style={{ display: "flex", alignItems: "center", gap: "2px", textDecoration: "none", flexShrink: 0 }}>
        <span style={{ fontSize: "17px", fontWeight: 900, color: "#3ddc84", letterSpacing: "-0.03em" }}>Debug</span>
        <span style={{ fontSize: "17px", fontWeight: 900, color: "#e8f0f3", letterSpacing: "-0.03em" }}>Royale</span>
      </Link>

      {/* Nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = active === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#3ddc84" : "#8ba0a6",
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                background: isActive ? "rgba(61,220,132,0.08)" : "transparent",
                transition: "color 0.15s, background 0.15s",
              }}
            >
              {label}
            </Link>
          );
        })}

      </div>

      {/* Raid notification bell + Auth */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <RaidNotificationBell />
        <SiteAuthControls />
      </div>
    </nav>
  );
}
