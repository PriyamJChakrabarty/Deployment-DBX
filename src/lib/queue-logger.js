import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "./db";
import { raidQueue, userPresence } from "./schema";

const LOG_DIR  = join(process.cwd(), "logs");
const LOG_FILE = join(LOG_DIR, "queue_log.json");
let lastWriteMs = 0;

export async function writeQueueLog(triggerClerkId = null) {
  const now = Date.now();
  if (now - lastWriteMs < 5000) return;
  lastWriteMs = now;

  try {
    const ts       = new Date();
    const expiryCutoff = new Date(ts);

    const [queueRows, presenceRows] = await Promise.all([
      db.select().from(raidQueue),
      db.select().from(userPresence),
    ]);

    const presenceMap = Object.fromEntries(presenceRows.map((p) => [p.clerkId, p]));
    const PRESENCE_WINDOW_MS = 20_000;

    const entries = queueRows.map((r) => {
      const presence = presenceMap[r.clerkId];
      const lastSeen = presence?.lastSeenAt ?? null;
      const freshPresence = lastSeen ? (ts - new Date(lastSeen)) < PRESENCE_WINDOW_MS : false;
      return {
        clerkId_tail:  r.clerkId.slice(-8),
        displayName:   r.displayName,
        teamGroupId:   r.teamGroupId ?? null,
        matchId:       r.matchId ?? null,
        expired:       r.expiresAt < ts,
        expiresIn_s:   Math.round((new Date(r.expiresAt) - ts) / 1000),
        freshPresence,
        lastSeen_ago_s: lastSeen ? Math.round((ts - new Date(lastSeen)) / 1000) : null,
      };
    });

    const eligible     = entries.filter((e) => !e.expired && e.matchId === null);
    const withPresence = eligible.filter((e) => e.freshPresence);
    const teamGroups   = [...new Set(entries.filter((e) => e.teamGroupId).map((e) => e.teamGroupId))];

    const snapshot = {
      timestamp:       ts.toISOString(),
      triggeredBy:     triggerClerkId?.slice(-8) ?? null,
      summary: {
        totalInQueue:           entries.length,
        eligible_noMatch:       eligible.length,
        eligible_withPresence:  withPresence.length,
        teamGroups:             teamGroups.length,
      },
      entries,
      teamGroupDetails: teamGroups.map((tgId) => {
        const members = entries.filter((e) => e.teamGroupId === tgId);
        return { teamGroupId_tail: tgId.slice(-8), members };
      }),
    };

    if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
    writeFileSync(LOG_FILE, JSON.stringify(snapshot, null, 2));
  } catch (err) {
    console.error("[queue-logger] write failed:", err.message);
  }
}
