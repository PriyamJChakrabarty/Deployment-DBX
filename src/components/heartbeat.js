"use client";

import { useEffect } from "react";

export default function HeartbeatClient() {
  useEffect(() => {
    const beat = () =>
      fetch("/api/presence/heartbeat", { method: "POST" }).catch(() => {});

    // Fire immediately on mount, then every 10s while tab is visible
    beat();
    const id = setInterval(beat, 10_000);

    // Best-effort beacon when tab is hidden — keeps lastSeenAt fresh at hide time
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        navigator.sendBeacon("/api/presence/heartbeat");
      } else {
        beat();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
