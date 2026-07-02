import { getRequestAuth } from "@/lib/clerk-guard";
import { updateNote } from "@/lib/db-social";

export const dynamic = "force-dynamic";

export async function PATCH(request) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.userId) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { noteText } = await request.json();
  await updateNote(session.userId, noteText ?? "");
  return Response.json({ ok: true });
}
