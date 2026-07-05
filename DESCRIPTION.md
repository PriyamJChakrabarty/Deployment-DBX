# DebugRoyale Project Description

## What this project is

DebugRoyale is a competitive debugging platform built as a full-stack web app. The core idea is to turn code review and vulnerability hunting into a game: players inspect real-looking C++ code, identify issues across multiple categories, fix them or describe them, and compete for points, wins, and leaderboard placement.

At the product level, this is part coding game, part social platform, and part live multiplayer system. It supports solo practice, live head-to-head matches, group raids, direct challenges, teams, chat, notifications, and persistent rankings.

## The player experience

A new user lands on a marketing-style homepage that explains the arena concept and funnels them into sign-up or sign-in. Once authenticated, they arrive at a home dashboard that shows:

- Their best score and aggregate stats
- Past duel history
- Past group raid history
- Links into the available game modes
- Online player indicators

The app is centered around five bug-hunting categories:

- Security
- Performance
- Scalability
- Ethics
- Maintainability

These categories are used throughout the solo and competitive flows.

## Main game modes

### 1. Practice mode

Practice mode lets a player open a single vulnerable C++ file, edit it directly in the browser, and submit fixes category by category. The app checks whether the player actually mitigated the target vulnerabilities, then advances them through the five categories until the run is complete.

Important current-state note: practice mode exists in the codebase, but it is currently hidden from the main navigation and home screen behind `FEATURES.PRACTICE = false`.

### 2. Live 1v1 Duel

This is the main competitive PvP mode. Two players enter a matchmaking queue, are paired if both are online, and receive the same coding problem. They race through the five categories in real time. Scores are tracked per player, match state is synchronized live, and the winner is decided by total score when both finish, the timer expires, or someone surrenders.

The duel system includes:

- Queueing and cancellation
- Presence-aware matchmaking
- Real-time match updates
- Match reconnect support
- Direct 1v1 challenge flows between players
- History and leaderboard integration

### 3. Group Raid

Group Raid is the larger team-based mode. Four players are matched into two teams of two and work through a multi-file codebase instead of a single file. Players navigate a file tree, inspect multiple source files, and build team score through distributed progress.

This mode supports two entry patterns:

- Random matchmaking into a 2v2 raid
- Pre-formed duo entry through invitations or team raid flows

The raid system includes:

- Team-aware matchmaking
- Multi-file progress tracking
- Shared team scoring
- Live arena state updates
- Surrender and timeout completion
- Linking completed raids back to formal teams when relevant

## Social and community systems

DebugRoyale is not just a match screen. It also has a community layer designed to keep players connected between matches.

### Social page

The social area lets users:

- Follow and unfollow other players
- See suggested players to follow
- Store a short profile note
- Open direct conversations
- Send messages
- Launch direct duel challenges from the social graph

### Teams

Players can create or join a team, and each player can belong to only one team at a time. Teams support:

- Team roles such as captain, vice-captain, and member
- Team roster management
- Team chat
- Team wins/losses tracking
- Starting formal team raids
- Challenging other teams directly
- Past raid history for the team

### Notifications

There is also a notification system for raid invitations and related lobby state, so the app can support invite-based multiplayer flows instead of only anonymous queueing.

## How the gameplay content works

The project ships with structured game content inside `public/`.

### Practice and duel content

`public/data/data.json` contains a list of individual problems. Each problem points to a C++ file and includes vulnerability definitions for each category. Each vulnerability entry includes:

- The affected line range
- The vulnerable code
- The intended remediation guidance
- A hint
- A description

The C++ source files used for those problems live in `public/codes/`.

### Raid content

Group raid content is stored as codebase folders under `public/Codebases/`. Right now the included raid codebase is `AstroStructure`, defined by a `master.json` file plus the source files it references. The app loads the manifest, reads all source files, and builds a navigable file tree for the raid arena.

## How scoring and validation work

The app uses Groq-backed LLM checks for two important jobs:

- Evaluating whether a player's edited code genuinely fixes the intended vulnerabilities
- Matching free-text vulnerability descriptions to the expected answers

There is also a Groq-powered summarization endpoint that produces one-sentence summaries of C++ files, which helps support the code exploration experience.

This means the gameplay is not based on brittle string matching alone. The system tries to judge semantic correctness against the remediation instructions bundled with each challenge.

## Real-time architecture

Real-time behavior is a major part of the project.

- Ably is used for live event delivery
- Matchmaking notifications are pushed to per-player channels
- Match updates are published for duels, raids, and challenge lobbies
- The UI uses these live updates to redirect players quickly and keep arena state in sync

Presence is tracked in the database as well, so matchmaking only uses recently active players instead of blindly pairing stale queue entries.

## Backend and persistence

This app is a Next.js App Router project using server routes as its backend API layer. The data model is managed through Drizzle ORM and stored in a Neon Postgres database.

The schema covers most of the product surface, including:

- Users
- Follows
- Conversations and messages
- Player presence
- Duel queues and duel matches
- Raid queues and raid matches
- Teams and team membership
- Team chat
- Raid invitations
- Duel challenges
- Team challenges
- Team raid records

The backend logic in `src/lib/` contains the core domain rules for:

- Matchmaking
- Match creation and reconciliation
- Score/progress persistence
- Timeout and surrender handling
- Team result resolution
- Leaderboard queries
- User stat aggregation

## Authentication and account sync

Authentication is handled with Clerk. The app is written so that some experiences degrade gracefully if Clerk credentials are not configured, but the multiplayer and social parts expect authenticated users.

There is also a Clerk webhook endpoint that keeps the local `users` table synchronized when users are created, updated, or deleted.

## Abuse protection and operational safeguards

Several sensitive endpoints are rate-limited with Upstash Redis, especially the AI-backed routes and score submission flows. This helps keep the gameplay APIs from being spammed and limits repeated expensive model calls.

The codebase also contains a lot of logging around matchmaking and raid synchronization, which suggests the project has been actively debugged for real-time race conditions and stale-match issues.

## Frontend structure

The frontend is primarily built under `src/app/` and `src/components/`.

- `src/app/` contains the pages, arena routes, and API endpoints
- `src/components/` contains reusable UI pieces like navigation, online indicators, heartbeat tracking, and raid notifications
- Most of the UI is styled inline with a dark arcade/competitive aesthetic
- The code editor experience is powered by Ace Editor

## Current technical stack

- Next.js 16
- React 19
- Clerk for authentication
- Neon Postgres for the database
- Drizzle ORM for schema and queries
- Ably for real-time messaging
- Groq for AI evaluation/summarization
- Upstash Redis for rate limiting
- Tailwind is installed, though much of the current UI styling is inline rather than utility-class driven

## How to think about the project as a whole

The simplest mental model is:

DebugRoyale is a multiplayer coding arena where users compete by finding and fixing problems in curated code challenges, while the platform layers in matchmaking, real-time synchronization, team systems, social features, and persistent progression.

So this is not just a code editor, not just a quiz app, and not just a chat/social product. It is all three combined:

- A challenge engine for curated vulnerability content
- A competitive live-game system for duels and raids
- A lightweight engineering social network with teams and direct messaging

## Good starting points for a new developer

If someone new joins the project, the best files to read first are:

- `src/app/page.js` for the product positioning
- `src/app/home/page.js` and `src/app/home-client.js` for the main signed-in experience
- `src/lib/schema.js` for the data model
- `src/lib/db-duel.js` for 1v1 gameplay logic
- `src/lib/db-raid.js` for 2v2/codebase gameplay logic
- `src/app/social/social-client.js` for the social layer
- `src/app/social/team-panel.js` for team management
- `src/app/api/check-code/route.js` and `src/app/api/check-vulnerability/route.js` for the AI judging pipeline

That set gives a pretty complete picture of both the product and the architecture.
