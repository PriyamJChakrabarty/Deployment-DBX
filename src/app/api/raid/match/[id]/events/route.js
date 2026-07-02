import { getRequestAuth } from "@/lib/clerk-guard";
import { getRaidMatchState, autoCompleteRaidIfExpired } from "@/lib/db-raid";
import { getAblyRealtimeChannel } from "@/lib/ably-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request, { params }) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const matchId = parseInt(id, 10);
  if (Number.isNaN(matchId)) {
    return Response.json({ error: "Invalid match id" }, { status: 400 });
  }

  console.log(`[SSE] client connected matchId=${matchId} user=${session.userId.slice(-6)}`);

  await autoCompleteRaidIfExpired(matchId).catch(() => {});

  const initial = await getRaidMatchState(matchId, session.userId);
  if (!initial) {
    console.log(`[SSE] match not found matchId=${matchId} — closing`);
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const channel = getAblyRealtimeChannel(matchId);

  console.log(`[SSE] Ably channel state: ${channel.state} (connection: ${channel.connectionManager?.state?.state ?? "unknown"})`);

  const stream = new ReadableStream({
    async start(controller) {
      const sendSnapshot = async (trigger) => {
        try {
          const snapshot = await getRaidMatchState(matchId, session.userId);
          if (!snapshot) {
            console.log(`[SSE] sendSnapshot(${trigger}): getRaidMatchState returned null matchId=${matchId}`);
            return;
          }
          console.log(`[SSE] sendSnapshot(${trigger}): pushing snapshot matchId=${matchId} updatedAt=${snapshot.updatedAt} teams=${JSON.stringify(snapshot.teams?.map(t => ({ id: t.teamId, score: t.totalScore })))}`);
          controller.enqueue(
            encoder.encode(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`)
          );
        } catch (err) {
          console.error(`[SSE] sendSnapshot(${trigger}) error:`, err?.message ?? err);
        }
      };

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {}
      }, 20000);

      const onUpdate = async (msg) => {
        console.log(`[SSE] Ably event received matchId=${matchId} user=${session.userId.slice(-6)} msg=${JSON.stringify(msg?.data)}`);
        await sendSnapshot("ably");
      };

      await sendSnapshot("initial");

      console.log(`[SSE] subscribing to Ably channel for matchId=${matchId}`);
      await channel.subscribe("raid-match-updated", onUpdate);
      console.log(`[SSE] Ably subscribed OK matchId=${matchId} channel.state=${channel.state}`);

      request.signal.addEventListener("abort", async () => {
        console.log(`[SSE] client disconnected matchId=${matchId} user=${session.userId.slice(-6)}`);
        clearInterval(heartbeat);
        try { await channel.unsubscribe("raid-match-updated", onUpdate); } catch {}
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Connection": "keep-alive",
    },
  });
}
