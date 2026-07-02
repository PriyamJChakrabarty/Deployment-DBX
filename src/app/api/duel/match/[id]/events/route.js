import { getRequestAuth } from "@/lib/clerk-guard";
import { getMatchState, autoCompleteIfExpired } from "@/lib/db-duel";
import { getAblyRealtimeDuelChannel } from "@/lib/ably-server";

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

  await autoCompleteIfExpired(matchId).catch(() => {});

  const initial = await getMatchState(matchId, session.userId);
  if (!initial) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const channel = getAblyRealtimeDuelChannel(matchId);

  const stream = new ReadableStream({
    async start(controller) {
      const sendSnapshot = async () => {
        try {
          const snapshot = await getMatchState(matchId, session.userId);
          if (!snapshot) return;
          controller.enqueue(
            encoder.encode(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`)
          );
        } catch {}
      };

      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: keepalive\n\n`)); } catch {}
      }, 20000);

      const onUpdate = async () => { await sendSnapshot(); };

      await sendSnapshot();
      await channel.subscribe("duel-match-updated", onUpdate);

      request.signal.addEventListener("abort", async () => {
        clearInterval(heartbeat);
        try { await channel.unsubscribe("duel-match-updated", onUpdate); } catch {}
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
