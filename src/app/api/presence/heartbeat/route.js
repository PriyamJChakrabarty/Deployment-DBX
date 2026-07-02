import { getRequestAuth } from "@/lib/clerk-guard";
import { markUserOnline } from "@/lib/db-presence";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getRequestAuth();

  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.userId) {
    return Response.json({ ok: true, skipped: true });
  }

  await markUserOnline(session.userId);
  return Response.json({ ok: true });
}
