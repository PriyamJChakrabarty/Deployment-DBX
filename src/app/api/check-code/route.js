import { getRequestAuth } from "@/lib/clerk-guard";
import { applyRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a strict code vulnerability reviewer for a security training exercise.

For each vulnerability entry you will receive:
- The original vulnerable code at specific line numbers (exactly as it appeared before the user's edits)
- The user's current code at those same line numbers (what they have written now)
- A description of why the original is vulnerable
- A remediation specification ("Correct Code"), which may contain:
  - Required code patterns
  - Required APIs/functions
  - Required validation rules
  - Required security controls
  - Example syntax

    The Correct Code field is authoritative. 

Your task: compare the original vulnerable lines to the user's current lines at the same range and decide whether the vulnerability has been genuinely mitigated according to the remediation specification in the Correct Code field.

Mark as fixed ONLY if:
1. The vulnerable logic is gone or meaningfully replaced in those lines according to the remediation specification in the Correct Code field.
2. The replacement makes logical sense for the described vulnerability (even if it differs in style from the example fix) according to the remediation specification in the Correct Code field.

Do NOT mark fixed if:
- The user's lines still contain the same vulnerable logic unchanged.
- The change is purely cosmetic (rename, whitespace, formatting) with no semantic improvement.
- The vulnerability code was merely commented out without a real replacement.
- The user added a comment but left the vulnerable line intact.

Be precise and strict — look at the logic, not just the surface text.

Return exactly one JSON object with two fields:
- "fixed": array of 0-based index numbers that are now fixed
- "analysis": array of objects — one per evaluated vulnerability — each with:
  { "index": <number>, "fixed": <boolean>, "reason": "<one concise sentence explaining why it is or is not fixed>" }`;

function extractLines(code, start, end) {
  const lines = code.split("\n");
  const s = Math.max(0, start - 1); // Line Number is 1-indexed
  const e = Math.min(lines.length, end);
  return lines.slice(s, e).join("\n");
}

function indent(text, spaces = 6) {
  return text
    .split("\n")
    .map((l) => " ".repeat(spaces) + l)
    .join("\n");
}

function logVuln(vuln, index, userCode, { alreadyFixed, groqFixed, groqAnalysis = {} }) {
  const [start, end] = Array.isArray(vuln["Line Number"])
    ? vuln["Line Number"]
    : [0, 0];
  const userLines = extractLines(userCode, start, end);

  const wasAlreadyFixed = alreadyFixed.includes(index);
  const nowFixed = groqFixed !== null ? groqFixed.includes(index) : null;
  const reason = groqAnalysis[index] ?? null;

  console.log(`\n  ┌─ Vulnerability [${index}]`);
  console.log(`  │  Line Number      : ${start}–${end}`);
  console.log(`  │  Original Code    :\n${indent(vuln["Vulnerability Code"])}`);
  console.log(`  │  User Code        :\n${indent(userLines || "(empty)")}`);
  console.log(`  │  Correct Code Ref :\n${indent(vuln["Correct Code"])}`);
  console.log(`  │  Already Fixed    : ${wasAlreadyFixed ? "Yes ✓ (skipped)" : "No"}`);
  if (!wasAlreadyFixed && nowFixed !== null) {
    console.log(`  │  Groq's Analysis  : ${nowFixed ? "FIXED ✓" : "NOT FIXED ✗"}`);
    if (reason) {
      console.log(`  │  Reason           : ${reason}`);
    }
  }
  console.log(`  └${"─".repeat(50)}`);
}

export async function POST(request) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = await applyRateLimit(request, "check-code", session.userId);
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const { userCode, vulnerabilities, alreadyFixed, category } = body;

  if (!userCode?.trim()) {
    return Response.json({ error: "No code provided." }, { status: 400 });
  }
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: "GROQ_API_KEY is not set." }, { status: 500 });
  }

  const toCheck = (vulnerabilities ?? [])
    .map((v, i) => ({ ...v, index: i }))
    .filter(({ index }) => !(alreadyFixed ?? []).includes(index));

  // ── Header ──────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  VULNERABILITY CHECK — ${category ?? "Unknown Category"}`);
  console.log(`${"═".repeat(60)}`);
  console.log(
    `  Total vulnerabilities : ${vulnerabilities?.length ?? 0}`
  );
  console.log(`  Already fixed         : [${(alreadyFixed ?? []).join(", ")}]`);
  console.log(`  Sending to Groq       : [${toCheck.map((v) => v.index).join(", ")}]`);

  // ── Already fixed (informational) ───────────────────────
  if ((alreadyFixed ?? []).length > 0) {
    console.log(`\n── Previously Fixed (not re-evaluated) ${"─".repeat(18)}`);
    (alreadyFixed ?? []).forEach((idx) => {
      if (vulnerabilities?.[idx]) {
        logVuln(vulnerabilities[idx], idx, userCode, {
          alreadyFixed: alreadyFixed ?? [],
          groqFixed: null,
        });
      }
    });
  }

  if (toCheck.length === 0) {
    console.log(`\n  All vulnerabilities already fixed. Nothing to evaluate.`);
    console.log(`${"═".repeat(60)}\n`);
    return Response.json({ fixed: [] });
  }

  // ── Items sent to Groq ───────────────────────────────────
  console.log(`\n── Sending to Groq for Evaluation ${"─".repeat(23)}`);
  toCheck.forEach((vuln) => {
    logVuln(vuln, vuln.index, userCode, {
      alreadyFixed: alreadyFixed ?? [],
      groqFixed: null,
    });
  });

  // ── Build prompt ─────────────────────────────────────────
  const vulnList = toCheck
    .map((vuln) => {
      const {
        index,
        Description,
        "Vulnerability Code": vc,
        "Correct Code": cc,
        "Line Number": lineRange,
      } = vuln;

      const [start, end] = Array.isArray(lineRange) ? lineRange : [1, 1];
      const userLines = extractLines(userCode, start, end);

      return `[index ${index}] Lines ${start}–${end}
Description: ${Description}
Original vulnerable code at those lines:
\`\`\`cpp
${vc}
\`\`\`
User's current code at lines ${start}–${end}:
\`\`\`cpp
${userLines}
\`\`\`
Required remediation specification:
${cc}`;
    })
    .join("\n\n---\n\n");

  const userContent = `Evaluate the following vulnerabilities.

For each vulnerability:

1. Verify that the original vulnerable logic has been removed.
2. Verify that the user's code satisfies the Mandatory Remediation Specification. For each one, compare the original vulnerable code to the user's current code at the specified line range and determine if the vulnerability is now fixed.\n\n${vulnList}\n\nReturn a JSON object with which indices are now fixed.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_completion_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.log(`\n  ✗ Groq request failed: ${details}`);
    console.log(`${"═".repeat(60)}\n`);
    return Response.json({ error: details || "Groq request failed." }, { status: 502 });
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (!content) {
    console.log(`\n  ✗ Groq returned empty content.`);
    console.log(`${"═".repeat(60)}\n`);
    return Response.json({ error: "Groq returned an empty response." }, { status: 502 });
  }

  let valid = [];
  let groqAnalysis = {}; // map: index → reason string
  try {
    const parsed = JSON.parse(content);
    const fixed = Array.isArray(parsed.fixed) ? parsed.fixed : [];
    valid = fixed.filter(
      (i) => typeof i === "number" && i >= 0 && i < (vulnerabilities ?? []).length
    );
    if (Array.isArray(parsed.analysis)) {
      parsed.analysis.forEach((item) => {
        if (typeof item.index === "number" && typeof item.reason === "string") {
          groqAnalysis[item.index] = item.reason;
        }
      });
    }
  } catch {
    // valid and groqAnalysis stay at defaults
  }

  // ── Groq analysis results ────────────────────────────────
  console.log(`\n── Groq's Analysis ${"─".repeat(38)}`);
  console.log(`  Raw response  : ${content}`);
  console.log(`  Valid fixed   : [${valid.join(", ")}]`);
  console.log(`\n  Per vulnerability:`);
  toCheck.forEach((vuln) => {
    logVuln(vuln, vuln.index, userCode, {
      alreadyFixed: alreadyFixed ?? [],
      groqFixed: valid,
      groqAnalysis,
    });
  });

  // ── Summary ──────────────────────────────────────────────
  const allNowFixed = [...new Set([...(alreadyFixed ?? []), ...valid])];
  console.log(`\n── Summary ${"─".repeat(46)}`);
  (vulnerabilities ?? []).forEach((_vuln, idx) => {
    const wasAlready = (alreadyFixed ?? []).includes(idx);
    const isNew = valid.includes(idx);
    const status = wasAlready
      ? "✓ previously fixed"
      : isNew
      ? "✓ NEWLY FIXED"
      : "✗ not fixed";
    console.log(`  [${idx}] ${status}`);
  });
  console.log(`\n  Score: ${allNowFixed.length} / ${vulnerabilities?.length ?? 0} fixed`);
  console.log(`${"═".repeat(60)}\n`);

  return Response.json({ fixed: valid });
}
