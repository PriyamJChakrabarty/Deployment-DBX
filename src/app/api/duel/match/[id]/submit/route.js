import { getRequestAuth } from "@/lib/clerk-guard";
import { applyRateLimit } from "@/lib/rate-limit";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { duelMatchPlayers, duelMatches } from "@/lib/schema";
import { updatePlayerProgress, getMatchState } from "@/lib/db-duel";
import { publishDuelMatchUpdated } from "@/lib/duel-realtime";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a strict code vulnerability reviewer for a security training exercise.

For each vulnerability entry you will receive:
- The original vulnerable code at specific line numbers (exactly as it appeared before the user's edits)
- The user's current code at those same line numbers (what they have written now)
- A description of why the original is vulnerable
- A remediation specification ("Correct Code"), which may contain required code patterns, APIs/functions, validation rules, and example syntax.

The Correct Code field is authoritative.

Your task: compare the original vulnerable lines to the user's current lines at the same range and decide whether the vulnerability has been genuinely mitigated according to the remediation specification.

Mark as fixed ONLY if:
1. The vulnerable logic is gone or meaningfully replaced in those lines according to the remediation specification.
2. The replacement makes logical sense for the described vulnerability.

Do NOT mark fixed if:
- The user's lines still contain the same vulnerable logic unchanged.
- The change is purely cosmetic (rename, whitespace, formatting) with no semantic improvement.
- The vulnerability code was merely commented out without a real replacement.

Return exactly one JSON object with two fields:
- "fixed": array of 0-based index numbers that are now fixed
- "analysis": array of objects — one per evaluated vulnerability — each with:
  { "index": <number>, "fixed": <boolean>, "reason": "<one concise sentence>" }`;

function extractLines(code, start, end) {
  const lines = code.split("\n");
  return lines.slice(Math.max(0, start - 1), Math.min(lines.length, end)).join("\n");
}

export async function POST(request, { params }) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimited = await applyRateLimit(request, "duel-submit", session.userId);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const matchId = parseInt(id, 10);
  if (isNaN(matchId)) return Response.json({ error: "Invalid match id" }, { status: 400 });

  const body = await request.json();
  const { userCode, categoryKey, alreadyFixed = [] } = body;

  if (!userCode?.trim()) return Response.json({ error: "No code provided." }, { status: 400 });
  if (!categoryKey)       return Response.json({ error: "No category." },      { status: 400 });
  if (!process.env.GROQ_API_KEY) return Response.json({ error: "GROQ_API_KEY not set." }, { status: 500 });

  // Load match + verify user is a player
  const [match] = await db.select().from(duelMatches).where(eq(duelMatches.id, matchId)).limit(1);
  if (!match || match.status !== "active") return Response.json({ error: "Match not active." }, { status: 400 });

  const [player] = await db
    .select()
    .from(duelMatchPlayers)
    .where(and(eq(duelMatchPlayers.matchId, matchId), eq(duelMatchPlayers.clerkId, session.userId)))
    .limit(1);
  if (!player) return Response.json({ error: "Not in this match." }, { status: 403 });

  const vulnerabilities = JSON.parse(match.challengeData || "{}")[categoryKey] ?? [];
  if (vulnerabilities.length === 0) return Response.json({ fixed: [], score: player.score, categoryFixed: alreadyFixed });

  // Only send unfixed vulns to Groq
  const toCheck = vulnerabilities
    .map((v, i) => ({ ...v, index: i }))
    .filter(({ index }) => !alreadyFixed.includes(index));

  if (toCheck.length === 0) {
    return Response.json({ fixed: [], score: player.score, categoryFixed: alreadyFixed });
  }

  const vulnList = toCheck.map((vuln) => {
    const [start, end] = Array.isArray(vuln["Line Number"]) ? vuln["Line Number"] : [1, 1];
    const userLines = extractLines(userCode, start, end);
    return `[index ${vuln.index}] Lines ${start}–${end}
Description: ${vuln.Description}
Original vulnerable code:
\`\`\`cpp
${vuln["Vulnerability Code"]}
\`\`\`
User's current code at lines ${start}–${end}:
\`\`\`cpp
${userLines}
\`\`\`
Required remediation: ${vuln["Correct Code"]}`;
  }).join("\n\n---\n\n");

  const userContent = `Evaluate the following vulnerabilities.\n\n${vulnList}\n\nReturn JSON with which indices are now fixed.`;

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model:                 process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature:           0.1,
      max_completion_tokens: 1024,
      response_format:       { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userContent },
      ],
    }),
  });

  if (!groqRes.ok) {
    const details = await groqRes.text();
    return Response.json({ error: details || "Groq request failed." }, { status: 502 });
  }

  const groqPayload = await groqRes.json();
  const content     = groqPayload?.choices?.[0]?.message?.content;
  if (!content) return Response.json({ error: "Groq returned empty response." }, { status: 502 });

  let newFixed = [];
  try {
    const parsed = JSON.parse(content);
    const raw    = Array.isArray(parsed.fixed) ? parsed.fixed : [];
    newFixed = raw.filter((i) => typeof i === "number" && i >= 0 && i < vulnerabilities.length);
  } catch { /* stays empty */ }

  // Merge with already-fixed and update DB
  const merged        = [...new Set([...alreadyFixed, ...newFixed])];
  const scoreDelta    = merged.length - alreadyFixed.length;
  const updatedScore  = player.score + scoreDelta;

  const currentFixed  = JSON.parse(player.fixedCounts || "{}");
  currentFixed[categoryKey] = merged;

  await updatePlayerProgress(matchId, session.userId, { score: updatedScore, fixedCounts: currentFixed });

  await publishDuelMatchUpdated(matchId, "score").catch((err) => {
    console.error("[duel/submit] publishDuelMatchUpdated failed:", err?.message ?? err);
  });

  const snapshot = await getMatchState(matchId, session.userId).catch(() => null);

  return Response.json({ fixed: newFixed, score: updatedScore, categoryFixed: merged, snapshot });
}
