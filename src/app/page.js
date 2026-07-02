import { redirect } from "next/navigation";
import Link from "next/link";
import { getRequestAuth } from "@/lib/clerk-guard";

export const dynamic = "force-dynamic";

const MODES = [
  {
    icon: "🎯",
    label: "Practice",
    sub: "SOLO MODE",
    desc: "Debug real codebases at your own pace. Hunt across Security, Performance, Scalability, Ethics, and Maintainability.",
    color: "#22d3ee",
  },
  {
    icon: "⚔️",
    label: "1v1 Duel",
    sub: "LIVE PvP",
    desc: "Race another engineer in real-time. First to find all five bug categories wins. Pure skill, zero luck.",
    color: "#3ddc84",
  },
  {
    icon: "🛡️",
    label: "Group Raid",
    sub: "SQUADS",
    desc: "Form a team, divide by specialty, and assault a full codebase together. First squad to max score wins.",
    color: "#f5b942",
  },
];

export default async function LandingPage() {
  const session = await getRequestAuth();

  if (session.clerkEnabled && session.isAuthenticated) {
    redirect("/home");
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d1a1f",
      color: "#c9d6da",
      fontFamily: "'Segoe UI', 'Aptos', 'Trebuchet MS', sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px", height: "57px",
        borderBottom: "1px solid rgba(201,214,218,0.08)",
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(13,26,31,0.92)",
        backdropFilter: "blur(16px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <span style={{ fontSize: "17px", fontWeight: 900, color: "#3ddc84", letterSpacing: "-0.03em" }}>Debug</span>
          <span style={{ fontSize: "17px", fontWeight: 900, color: "#e8f0f3", letterSpacing: "-0.03em" }}>Royale</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href="/sign-in" style={{
            color: "#c9d6da", textDecoration: "none",
            border: "1px solid rgba(201,214,218,0.16)",
            borderRadius: "999px", padding: "7px 18px",
            fontSize: "13px", fontWeight: 600,
          }}>
            Log In
          </Link>
          <Link href="/sign-up" style={{
            background: "#3ddc84", color: "#0d1a1f",
            textDecoration: "none", borderRadius: "999px",
            padding: "7px 20px", fontSize: "13px", fontWeight: 700,
            boxShadow: "0 0 24px rgba(61,220,132,0.22)",
          }}>
            Sign Up Free
          </Link>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{
        flex: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "80px 32px 60px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Grid background */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: [
            "linear-gradient(rgba(61,220,132,0.03) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(61,220,132,0.03) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "48px 48px",
        }} />

        {/* Glow blob */}
        <div style={{
          position: "absolute", top: "10%", left: "50%",
          transform: "translateX(-50%)",
          width: "600px", height: "300px",
          background: "radial-gradient(ellipse at center, rgba(61,220,132,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "720px" }}>
          <div style={{
            display: "inline-block",
            fontSize: "11px", fontWeight: 800, letterSpacing: "0.15em",
            textTransform: "uppercase", color: "#3ddc84",
            background: "rgba(61,220,132,0.08)",
            border: "1px solid rgba(61,220,132,0.2)",
            borderRadius: "999px", padding: "4px 14px",
            marginBottom: "28px",
          }}>
            The Competitive Debugging Arena
          </div>

          <h1 style={{
            fontSize: "clamp(40px, 6vw, 68px)",
            fontWeight: 900, lineHeight: 1.08,
            letterSpacing: "-0.04em",
            color: "#e8f0f3",
            margin: "0 0 24px",
          }}>
            Debug Code.<br />
            <span style={{ color: "#3ddc84" }}>Beat</span> Opponents.<br />
            <span style={{ color: "#f5b942" }}>Climb</span> the Ranks.
          </h1>

          <p style={{
            fontSize: "17px", lineHeight: 1.65,
            color: "#8ba0a6", margin: "0 0 44px",
            maxWidth: "540px", marginLeft: "auto", marginRight: "auto",
          }}>
            Hunt real bugs across five categories — Security, Performance, Scalability, Ethics, and Maintainability — in live competitive matches against other engineers.
          </p>

          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/sign-up" style={{
              background: "#3ddc84", color: "#0d1a1f",
              textDecoration: "none", borderRadius: "12px",
              padding: "14px 32px", fontSize: "15px", fontWeight: 800,
              boxShadow: "0 0 32px rgba(61,220,132,0.3)",
              letterSpacing: "-0.01em",
            }}>
              Start for Free →
            </Link>
            <Link href="/sign-in" style={{
              color: "#c9d6da", textDecoration: "none",
              border: "1px solid rgba(201,214,218,0.18)",
              borderRadius: "12px", padding: "14px 32px",
              fontSize: "15px", fontWeight: 600,
            }}>
              Log In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Game modes ───────────────────────────────────────── */}
      <section style={{
        padding: "0 32px 80px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "48px",
      }}>
        <div style={{
          fontSize: "11px", fontWeight: 800, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "#4a6570",
          textAlign: "center",
        }}>
          Three ways to compete
        </div>

        <div style={{
          display: "flex", gap: "20px", flexWrap: "wrap",
          justifyContent: "center", maxWidth: "960px", width: "100%",
        }}>
          {MODES.map(({ icon, label, sub, desc, color }) => (
            <div key={label} style={{
              flex: "1 1 260px", maxWidth: "300px",
              background: "rgba(201,214,218,0.025)",
              border: `1px solid ${color}22`,
              borderRadius: "16px", padding: "28px 24px",
            }}>
              <div style={{ fontSize: "36px", marginBottom: "16px" }}>{icon}</div>
              <div style={{
                fontSize: "10px", fontWeight: 800, letterSpacing: "0.1em",
                textTransform: "uppercase", color, marginBottom: "6px",
              }}>
                {sub}
              </div>
              <div style={{
                fontSize: "18px", fontWeight: 800,
                color: "#e8f0f3", marginBottom: "10px",
                letterSpacing: "-0.02em",
              }}>
                {label}
              </div>
              <div style={{ fontSize: "13px", color: "#6b7f87", lineHeight: 1.6 }}>
                {desc}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <Link href="/sign-up" style={{
          color: "#3ddc84", textDecoration: "none",
          fontSize: "14px", fontWeight: 700,
          borderBottom: "1px solid rgba(61,220,132,0.3)",
          paddingBottom: "2px",
        }}>
          Create your account and enter the arena →
        </Link>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid rgba(201,214,218,0.06)",
        padding: "20px 40px",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "12px", color: "#2e4047",
      }}>
        DebugRoyale
      </footer>
    </div>
  );
}
