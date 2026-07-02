import { getRequestAuth } from "@/lib/clerk-guard";
import { applyRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = await applyRateLimit(request, "summarize", session.userId);
  if (rateLimited) return rateLimited;

  const { code } = await request.json();

  if (!code?.trim()) {
    return Response.json({ error: "No code provided." }, { status: 400 });
  }

  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: "GROQ_API_KEY is not set." }, { status: 500 });
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_completion_tokens: 120,
      messages: [
        {
          role: "system",
          content:
            "You summarize C++ code. Reply with exactly one sentence of at most 40 words describing what the code does. No markdown, no bullet points, no preamble.",
        },
        {
          role: "user",
          content: code,
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    return Response.json({ error: details || "Groq request failed." }, { status: 502 });
  }

  const payload = await response.json();
  const summary = payload?.choices?.[0]?.message?.content?.trim();

  if (!summary) {
    return Response.json({ error: "Groq returned an empty response." }, { status: 502 });
  }

  return Response.json({ summary });
}
