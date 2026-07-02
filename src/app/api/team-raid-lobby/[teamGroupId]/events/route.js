import { and, eq } from "drizzle-orm";
import { getRequestAuth } from "@/lib/clerk-guard";
import { db } from "@/lib/db";
import { raidInvitations } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs";

async function getLobbyState(teamGroupId) {
  const invites = await db.select().from(raidInvitations)
    .where(eq(raidInvitations.teamGroupId, teamGroupId));
  if (invites.length === 0) return null;

  const first = invites[0];

  // Signal start to all clients
  if (invites.some((i) => i.status === "raid_started")) {
    return {
      event:       "start",
      teamGroupId,
      teamId:      first.sourceTeamId,
      teamName:    first.sourceTeamName,
    };
  }

  return {
    teamGroupId,
    captainClerkId: first.inviterClerkId,
    captainName:    first.inviterName,
    teamId:         first.sourceTeamId,
    teamName:       first.sourceTeamName,
    members: invites.map((inv) => ({
      clerkId: inv.inviteeClerkId,
      name:    inv.inviteeName,
      status:  inv.status,
      present: inv.present ?? false,
    })),
  };
}

export async function GET(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamGroupId } = await params;
  console.log(`[lobby/events] open user=${session.userId}`);

  const invites = await db.select().from(raidInvitations)
    .where(eq(raidInvitations.teamGroupId, teamGroupId));
  console.log(`[lobby/events] ${invites.length} rows, present values:`,
    invites.map((i) => `${i.inviteeClerkId.slice(-6)}:present=${i.present}`));

  if (invites.length === 0) return Response.json({ error: "Lobby not found" }, { status: 404 });

  const first     = invites[0];
  const isCaptain = session.userId === first.inviterClerkId;
  const myInvite  = invites.find((i) => i.inviteeClerkId === session.userId);
  if (!isCaptain && !myInvite) return Response.json({ error: "Not a participant" }, { status: 403 });

  // Mark member present on connect
  if (myInvite) {
    try {
      const updated = await db.update(raidInvitations)
        .set({ present: true, updatedAt: new Date() })
        .where(and(
          eq(raidInvitations.teamGroupId, teamGroupId),
          eq(raidInvitations.inviteeClerkId, session.userId),
        ))
        .returning();
      console.log(`[lobby/events] marked present=true, rows updated: ${updated.length}`);
    } catch (e) {
      console.error(`[lobby/events] present=true update FAILED:`, e?.message);
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        try {
          controller.enqueue(encoder.encode(`event: raid-lobby\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      // Send initial state
      const initial = await getLobbyState(teamGroupId).catch(() => null);
      if (initial) send(initial);

      // Poll DB every 2s — no Ably Realtime needed
      let lastSig = JSON.stringify(initial);
      const poll = setInterval(async () => {
        try {
          const state = await getLobbyState(teamGroupId);
          if (!state) return;
          const sig = JSON.stringify(state);
          if (sig !== lastSig) {
            lastSig = sig;
            console.log(`[lobby/events] state changed for user=${session.userId}, sending update`);
            send(state);
          }
        } catch {}
      }, 2000);

      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: keepalive\n\n`)); } catch {}
      }, 20_000);

      request.signal.addEventListener("abort", async () => {
        console.log(`[lobby/events] disconnect user=${session.userId}`);
        clearInterval(poll);
        clearInterval(heartbeat);
        try { controller.close(); } catch {}

        if (myInvite) {
          // Only clear presence if lobby isn't started yet
          const current = await getLobbyState(teamGroupId).catch(() => null);
          if (current && current.event !== "start") {
            await db.update(raidInvitations)
              .set({ present: false, updatedAt: new Date() })
              .where(and(
                eq(raidInvitations.teamGroupId, teamGroupId),
                eq(raidInvitations.inviteeClerkId, session.userId),
              ))
              .catch((e) => console.error(`[lobby/events] present=false failed:`, e?.message));
          }
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Connection":    "keep-alive",
    },
  });
}
