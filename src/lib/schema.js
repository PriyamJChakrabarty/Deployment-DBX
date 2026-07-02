import { boolean, integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const duelQueue = pgTable("duel_queue", {
  id:          serial("id").primaryKey(),
  clerkId:     text("clerk_id").unique().notNull(),
  displayName: text("display_name").notNull(),
  joinedAt:    timestamp("joined_at",  { withTimezone: true }).defaultNow().notNull(),
  expiresAt:   timestamp("expires_at", { withTimezone: true }).notNull(),
  matchId:     integer("match_id"),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const duelMatches = pgTable("duel_matches", {
  id:             serial("id").primaryKey(),
  status:         text("status").default("active").notNull(), // active | completed | abandoned
  startedAt:      timestamp("started_at",  { withTimezone: true }).defaultNow(),
  endsAt:         timestamp("ends_at",     { withTimezone: true }),
  winnerClerkId:  text("winner_clerk_id"),
  challengeSlot:  text("challenge_slot"),   // code filename, e.g. "UserManager.cpp"
  challengeData:  text("challenge_data"),   // JSON of Vulnerabilities object
  createdAt:      timestamp("created_at",  { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp("updated_at",  { withTimezone: true }).defaultNow(),
});

export const duelMatchPlayers = pgTable("duel_match_players", {
  id:            serial("id").primaryKey(),
  matchId:       integer("match_id").notNull(),
  clerkId:       text("clerk_id").notNull(),
  displayName:   text("display_name").notNull(),
  score:         integer("score").default(0).notNull(),
  categoryIndex: integer("category_index").default(0).notNull(),
  fixedCounts:   text("fixed_counts").default("{}").notNull(), // JSON: {Security:[0,1],...}
  status:        text("status").default("active").notNull(),   // active | finished
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userPresence = pgTable("user_presence", {
  id:             serial("id").primaryKey(),
  clerkId:        text("clerk_id").unique().notNull(),
  state:          text("state").default("idle").notNull(), // idle | queueing | in_match
  currentMatchId: text("current_match_id"),
  lastSeenAt:     timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const users = pgTable("users", {
  id:        serial("id").primaryKey(),
  clerkId:   text("clerk_id").unique().notNull(),
  email:     text("email"),
  username:  text("username"),
  firstName: text("first_name"),
  lastName:  text("last_name"),
  imageUrl:  text("image_url"),
  noteText:  text("note_text"),
  bestScore: integer("best_score").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const follows = pgTable("follows", {
  id:               serial("id").primaryKey(),
  followerClerkId:  text("follower_clerk_id").notNull(),
  followingClerkId: text("following_clerk_id").notNull(),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("follows_pair").on(t.followerClerkId, t.followingClerkId),
]);

export const conversations = pgTable("conversations", {
  id:           serial("id").primaryKey(),
  user1ClerkId: text("user1_clerk_id").notNull(),
  user2ClerkId: text("user2_clerk_id").notNull(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("conversations_pair").on(t.user1ClerkId, t.user2ClerkId),
]);

export const messages = pgTable("messages", {
  id:             serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderClerkId:  text("sender_clerk_id").notNull(),
  body:           text("body").notNull(),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Group Raid (2v2) ──────────────────────────────────────────

export const raidQueue = pgTable("raid_queue", {
  id:           serial("id").primaryKey(),
  clerkId:      text("clerk_id").unique().notNull(),
  displayName:  text("display_name").notNull(),
  joinedAt:     timestamp("joined_at",  { withTimezone: true }).defaultNow().notNull(),
  expiresAt:    timestamp("expires_at", { withTimezone: true }).notNull(),
  matchId:      integer("match_id"),
  teamGroupId:  text("team_group_id"),   // UUID shared by pre-formed pairs
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const raidMatches = pgTable("raid_matches", {
  id:             serial("id").primaryKey(),
  status:         text("status").default("active").notNull(), // active | completed | abandoned
  codebaseFolder: text("codebase_folder").notNull(),
  startedAt:      timestamp("started_at", { withTimezone: true }).defaultNow(),
  endsAt:         timestamp("ends_at",    { withTimezone: true }),
  winnerTeam:     integer("winner_team"),                     // 0 or 1, null = draw
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const raidMatchPlayers = pgTable("raid_match_players", {
  id:           serial("id").primaryKey(),
  matchId:      integer("match_id").notNull(),
  clerkId:      text("clerk_id").notNull(),
  displayName:  text("display_name").notNull(),
  teamId:       integer("team_id").notNull(),                 // 0 or 1
  totalScore:   integer("total_score").default(0).notNull(),
  fileProgress: text("file_progress").default("{}").notNull(), // JSON: {[path]:{[cat]:{fixed:[],score:0}}}
  status:       text("status").default("active").notNull(),   // active | finished
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Teams ─────────────────────────────────────────────────────

export const teams = pgTable("teams", {
  id:             serial("id").primaryKey(),
  name:           text("name").notNull(),
  emoji:          text("emoji").default("🛡️").notNull(),
  size:           integer("size").default(5).notNull(),          // max members
  wins:           integer("wins").default(0).notNull(),
  losses:         integer("losses").default(0).notNull(),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id:       serial("id").primaryKey(),
  teamId:   integer("team_id").notNull(),
  clerkId:  text("clerk_id").unique().notNull(),       // unique: one team per player
  role:     text("role").default("member").notNull(),  // captain | vice_captain | member
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
});

export const teamMessages = pgTable("team_messages", {
  id:            serial("id").primaryKey(),
  teamId:        integer("team_id").notNull(),
  senderClerkId: text("sender_clerk_id").notNull(),
  senderName:    text("sender_name").notNull(),
  content:       text("content").notNull(),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Explicitly registered team raids (only created via the Team Raid button)
export const teamRaids = pgTable("team_raids", {
  id:        serial("id").primaryKey(),
  teamId:    integer("team_id").notNull(),
  matchId:   integer("match_id"),           // null until the match is created
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Raid Invitations ──────────────────────────────────────────

export const raidInvitations = pgTable("raid_invitations", {
  id:              serial("id").primaryKey(),
  inviterClerkId:  text("inviter_clerk_id").notNull(),
  inviteeClerkId:  text("invitee_clerk_id").notNull(),
  inviterName:     text("inviter_name").notNull(),     // cached for notification display
  inviteeName:     text("invitee_name").notNull(),     // cached for "Waiting for X" display
  status:          text("status").default("pending").notNull(), // pending|accepted|rejected|expired|team_cancelled
  teamGroupId:     text("team_group_id"),              // UUID: pre-set for team raids, set on accept for friend invites
  sourceTeamId:    integer("source_team_id"),          // non-null = triggered by team Raid button
  sourceTeamName:  text("source_team_name"),           // cached team name for notifications
  present:         boolean("present").default(false).notNull(), // true = member is in the lobby waiting room
  expiresAt:       timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt:       timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Team Challenges (team vs team direct invite) ──────────────────

export const teamChallenges = pgTable("team_challenges", {
  id:                  serial("id").primaryKey(),
  challengerTeamId:    integer("challenger_team_id").notNull(),
  challengerTeamName:  text("challenger_team_name").notNull(),
  challengerTeamEmoji: text("challenger_team_emoji").default("🛡️").notNull(),
  challengeeTeamId:    integer("challengee_team_id").notNull(),
  challengeeTeamName:  text("challengee_team_name").notNull(),
  challengeeTeamEmoji: text("challengee_team_emoji").default("🛡️").notNull(),
  challengerCaptainId: text("challenger_captain_id").notNull(),
  challengeeCaptainId: text("challengee_captain_id").notNull(),
  status:              text("status").default("pending").notNull(), // pending|accepted|cancelled|rejected|expired|matched
  matchId:             integer("match_id"),
  challengerReady:     boolean("challenger_ready").default(false).notNull(),
  challengeeReady:     boolean("challengee_ready").default(false).notNull(),
  expiresAt:           timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt:           timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:           timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const teamChallengeLobbyMembers = pgTable("team_challenge_lobby_members", {
  id:          serial("id").primaryKey(),
  challengeId: integer("challenge_id").notNull(),
  clerkId:     text("clerk_id").notNull(),
  teamSide:    text("team_side").notNull(), // "challenger" | "challengee"
  displayName: text("display_name").notNull(),
  present:     boolean("present").default(false).notNull(),
}, (t) => [
  unique("tc_lobby_member_unique").on(t.challengeId, t.clerkId),
]);

// ── Duel Challenges (1v1 direct invite) ──────────────────────────

export const duelChallenges = pgTable("duel_challenges", {
  id:                serial("id").primaryKey(),
  challengerClerkId: text("challenger_clerk_id").notNull(),
  challengerName:    text("challenger_name").notNull(),
  challengeeClerkId: text("challengee_clerk_id").notNull(),
  challengeeName:    text("challengee_name").notNull(),
  status:            text("status").default("pending").notNull(), // pending|accepted|cancelled|rejected|expired|matched
  matchId:           integer("match_id"),
  challengerPresent: boolean("challenger_present").default(false).notNull(),
  challengeePresent: boolean("challengee_present").default(false).notNull(),
  expiresAt:         timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt:         timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
