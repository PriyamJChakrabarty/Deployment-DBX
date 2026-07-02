import { getRequestAuth } from "@/lib/clerk-guard";
import { getAblyRealtimePlayerChannel } from "@/lib/ably-server";
import { getMatchForUser } from "@/lib/db-duel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkId = session.userId;
  console.log(`[duel/queue/events] SSE opened for ${clerkId.slice(-6)}`);

  const existing = await getMatchForUser(clerkId).catch(() => null);

  const encoder = new TextEncoder();
  const channel = getAblyRealtimePlayerChannel(clerkId);

  const stream = new ReadableStream({
    async start(controller) {
      if (existing) {
        console.log(`[duel/queue/events] already matched matchId=${existing.matchId} — flushing immediately`);
        controller.enqueue(encoder.encode(`event: matched\ndata: ${JSON.stringify(existing)}\n\n`));
        controller.close();
        return;
      }

      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: keepalive\n\n`)); } catch {}
      }, 20000);

      const onMatched = (msg) => {
        console.log(`[duel/queue/events] Ably push received matchId=${msg.data?.matchId} for ${clerkId.slice(-6)}`);
        try {
          controller.enqueue(encoder.encode(`event: matched\ndata: ${JSON.stringify(msg.data)}\n\n`));
        } catch {}
      };

      await channel.subscribe("matched", onMatched);

      request.signal.addEventListener("abort", async () => {
        clearInterval(heartbeat);
        try { await channel.unsubscribe("matched", onMatched); } catch {}
        try { controller.close(); } catch {}
        console.log(`[duel/queue/events] SSE closed for ${clerkId.slice(-6)}`);
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
