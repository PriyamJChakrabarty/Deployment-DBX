import { getRequestAuth } from "@/lib/clerk-guard";
import { getTeamChallengeState, setTeamMemberPresence, cancelTeamChallenge } from "@/lib/db-team-challenge";
import { getAblyRealtimeTeamChallengeChannel } from "@/lib/ably-server";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs";

export async function GET(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const challengeId = parseInt(id, 10);
  if (isNaN(challengeId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const initial = await getTeamChallengeState(challengeId);
  if (!initial) return Response.json({ error: "Not found" }, { status: 404 });

  const isMember = initial.members?.some((m) => m.clerkId === session.userId);
  if (!isMember) return Response.json({ error: "Not a participant" }, { status: 403 });

  await setTeamMemberPresence(challengeId, session.userId, true);

  const encoder = new TextEncoder();
  const ablyCh  = getAblyRealtimeTeamChallengeChannel(challengeId);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        try {
          controller.enqueue(encoder.encode(`event: team-challenge\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: keepalive\n\n`)); } catch {}
      }, 20_000);

      const onUpdate = async () => {
        const state = await getTeamChallengeState(challengeId).catch(() => null);
        if (state) send(state);
      };

      await onUpdate();
      await ablyCh.subscribe("team-challenge-updated", onUpdate);

      request.signal.addEventListener("abort", async () => {
        clearInterval(heartbeat);
        try { await ablyCh.unsubscribe("team-challenge-updated", onUpdate); } catch {}
        try { controller.close(); } catch {}

        // Disconnect while lobby is live = cancel the challenge
        const current = await getTeamChallengeState(challengeId).catch(() => null);
        if (current && ["pending", "accepted"].includes(current.status)) {
          await cancelTeamChallenge(challengeId).catch(() => {});
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
