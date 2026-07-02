import { getAblyChannel } from "./ably-server";

export async function publishRaidMatchUpdated(matchId, reason = "score") {
  console.log(`[ABLY] publishing raid-match-updated matchId=${matchId} reason=${reason}`);
  try {
    const channel = getAblyChannel(matchId);
    await channel.publish("raid-match-updated", {
      matchId,
      reason,
      sentAt: new Date().toISOString(),
    });
    console.log(`[ABLY] publish OK matchId=${matchId}`);
  } catch (err) {
    console.error(`[ABLY] publish FAILED matchId=${matchId}:`, err?.message ?? err);
    throw err;
  }
}
