import { getRequestAuth } from "@/lib/clerk-guard";
import { updateBestScore } from "@/lib/db-users";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const session = await getRequestAuth();

  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.userId) {
    return Response.json({ ok: true, skipped: true });
  }

  const body = await request.json();
  const { score } = body;

  if (typeof score !== "number" || score < 0 || !Number.isInteger(score)) {
    return Response.json({ error: "Invalid score" }, { status: 400 });
  }

  await updateBestScore(session.userId, score);
  return Response.json({ ok: true });
}
