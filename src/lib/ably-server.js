import Ably from "ably";

const REST_KEY      = "__ablyRestClient";
const REALTIME_KEY  = "__ablyRealtimeClient";

function getRestClient() {
  if (!process.env.ABLY_API_KEY) throw new Error("ABLY_API_KEY is not configured");
  if (!globalThis[REST_KEY]) {
    globalThis[REST_KEY] = new Ably.Rest(process.env.ABLY_API_KEY);
  }
  return globalThis[REST_KEY];
}

function getRealtimeClient() {
  if (!process.env.ABLY_API_KEY) throw new Error("ABLY_API_KEY is not configured");
  if (!globalThis[REALTIME_KEY]) {
    globalThis[REALTIME_KEY] = new Ably.Realtime({ key: process.env.ABLY_API_KEY });
  }
  return globalThis[REALTIME_KEY];
}

export function getRaidChannelName(matchId) {
  const prefix = process.env.ABLY_CHANNEL_PREFIX || "debug-battle";
  return `${prefix}:raid:${matchId}`;
}

export function getTeamCodeChannelName(matchId, teamId) {
  const prefix = process.env.ABLY_CHANNEL_PREFIX || "debug-battle";
  return `${prefix}:raid:${matchId}:team:${teamId}:code`;
}

export function getDuelChannelName(matchId) {
  const prefix = process.env.ABLY_CHANNEL_PREFIX || "debug-battle";
  return `${prefix}:duel:${matchId}`;
}

// REST channel for duel publishing
export function getAblyDuelChannel(matchId) {
  return getRestClient().channels.get(getDuelChannelName(matchId));
}

// Realtime channel for duel SSE subscribing
export function getAblyRealtimeDuelChannel(matchId) {
  return getRealtimeClient().channels.get(getDuelChannelName(matchId));
}

export function getAblyRestClient() {
  return getRestClient();
}

// REST channel — for publishing only (no WebSocket overhead)
export function getAblyChannel(matchId) {
  const name = getRaidChannelName(matchId);
  console.log(`✋ [ably-server.js] getAblyChannel (REST publish) channel="${name}"`);
  return getRestClient().channels.get(name);
}

// Realtime channel — for subscribing in SSE routes (requires WebSocket)
export function getAblyRealtimeChannel(matchId) {
  const name = getRaidChannelName(matchId);
  console.log(`✋ [ably-server.js] getAblyRealtimeChannel (Realtime subscribe) channel="${name}"`);
  return getRealtimeClient().channels.get(name);
}

// Per-player personal channel for push matchmaking notifications
export function getPlayerChannelName(clerkId) {
  const prefix = process.env.ABLY_CHANNEL_PREFIX || "debug-battle";
  return `${prefix}:player:${clerkId}:match-found`;
}

export function getAblyPlayerChannel(clerkId) {
  return getRestClient().channels.get(getPlayerChannelName(clerkId));
}

export function getAblyRealtimePlayerChannel(clerkId) {
  return getRealtimeClient().channels.get(getPlayerChannelName(clerkId));
}

// Per-challenge lobby channel for both parties
export function getChallengeChannelName(challengeId) {
  const prefix = process.env.ABLY_CHANNEL_PREFIX || "debug-battle";
  return `${prefix}:duel-challenge:${challengeId}`;
}

export function getAblyRestChallengeChannel(challengeId) {
  return getRestClient().channels.get(getChallengeChannelName(challengeId));
}

export function getAblyRealtimeChallengeChannel(challengeId) {
  return getRealtimeClient().channels.get(getChallengeChannelName(challengeId));
}

// Team raid lobby channel (keyed by teamGroupId UUID)
export function getTeamRaidLobbyChannelName(teamGroupId) {
  const prefix = process.env.ABLY_CHANNEL_PREFIX || "debug-battle";
  return `${prefix}:team-raid-lobby:${teamGroupId}`;
}
export function getAblyRestTeamRaidLobbyChannel(teamGroupId) {
  return getRestClient().channels.get(getTeamRaidLobbyChannelName(teamGroupId));
}
export function getAblyRealtimeTeamRaidLobbyChannel(teamGroupId) {
  return getRealtimeClient().channels.get(getTeamRaidLobbyChannelName(teamGroupId));
}

// Per-team-challenge lobby channel
export function getTeamChallengeChannelName(challengeId) {
  const prefix = process.env.ABLY_CHANNEL_PREFIX || "debug-battle";
  return `${prefix}:team-challenge:${challengeId}`;
}

export function getAblyRestTeamChallengeChannel(challengeId) {
  return getRestClient().channels.get(getTeamChallengeChannelName(challengeId));
}

export function getAblyRealtimeTeamChallengeChannel(challengeId) {
  return getRealtimeClient().channels.get(getTeamChallengeChannelName(challengeId));
}
