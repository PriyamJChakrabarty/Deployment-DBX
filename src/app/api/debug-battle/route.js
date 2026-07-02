import { getDebugBattlePayload } from "@/lib/debug-battle";
import { requireAuthenticatedRequest } from "@/lib/clerk-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAuthenticatedRequest();

  if (unauthorized) {
    return unauthorized;
  }

  return Response.json(await getDebugBattlePayload());
}
