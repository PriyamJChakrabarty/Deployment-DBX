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
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-signal-performance/30 bg-signal-performance/10 px-5 py-3.5 text-[13px] font-semibold tracking-tight text-signal-performance"
    >
      ↩ Return to Previous Duel
    </Link>
  );
}
