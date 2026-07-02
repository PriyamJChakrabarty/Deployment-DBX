"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ReturnToDuelButton() {
  const [match, setMatch] = useState(null);

  useEffect(() => {
    const check = () =>
      fetch("/api/duel/match/current")
        .then((r) => r.json())
        .then(({ match }) => setMatch(match ?? null))
        .catch(() => {});

    check();

    // Re-check whenever the tab regains focus (browser back, alt-tab, etc.)
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  if (!match) return null;

  return (
    <Link
      href={`/live-battle/arena/${match.matchId}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: "rgba(245,185,66,0.08)",
        color: "#f5b942",
        textDecoration: "none",
        border: "1px solid rgba(245,185,66,0.28)",
        padding: "14px 20px",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: 600,
        whiteSpace: "nowrap",
        letterSpacing: "-0.01em",
      }}
    >
      ↩ Return to Previous Duel
    </Link>
  );
}
