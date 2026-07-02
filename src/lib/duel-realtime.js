import { getAblyDuelChannel } from "./ably-server";

export async function publishDuelMatchUpdated(matchId, reason = "score") {
  const channel = getAblyDuelChannel(matchId);
  await channel.publish("duel-match-updated", {
    matchId,
    reason,
    sentAt: new Date().toISOString(),
  });
}
