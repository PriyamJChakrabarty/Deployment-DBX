import { getRequestAuth } from "@/lib/clerk-guard";
import { getChallengeState, setPresence, cancelChallenge } from "@/lib/db-duel-challenge";
import { getAblyRealtimeChallengeChannel } from "@/lib/ably-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const challengeId = parseInt(id, 10);
  if (isNaN(challengeId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const initial = await getChallengeState(challengeId);
  if (!initial) return Response.json({ error: "Not found" }, { status: 404 });

  const role = initial.challengerClerkId === session.userId ? "challenger"
             : initial.challengeeClerkId === session.userId ? "challengee"
             : null;
  if (!role) return Response.json({ error: "Not a participant" }, { status: 403 });

  // Mark this player as present in the lobby
  await setPresence(challengeId, role, true);

  const encoder = new TextEncoder();
  const ablyCh  = getAblyRealtimeChallengeChannel(challengeId);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        try { controller.enqueue(encoder.encode(`event: challenge\ndata: ${JSON.stringify(data)}\n\n`)); } catch {}
      };

      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: keepalive\n\n`)); } catch {}
      }, 20_000);

      const onUpdate = async () => {
        const state = await getChallengeState(challengeId).catch(() => null);
        if (state) send(state);
      };

      // Send current state immediately (presence is now set so client sees accurate flags)
      await onUpdate();
      await ablyCh.subscribe("challenge-updated", onUpdate);

      request.signal.addEventListener("abort", async () => {
        clearInterval(heartbeat);
        try { await ablyCh.unsubscribe("challenge-updated", onUpdate); } catch {}
        try { controller.close(); } catch {}

        // If challenge is still open, the disconnect means they left — cancel it
        const current = await getChallengeState(challengeId).catch(() => null);
        if (current && ["pending", "accepted"].includes(current.status)) {
          await cancelChallenge(challengeId).catch(() => {});
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
