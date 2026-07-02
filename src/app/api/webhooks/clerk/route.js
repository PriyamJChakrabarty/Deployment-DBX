import { Webhook } from "svix";
import { upsertUser, deleteUserByClerkId } from "@/lib/db-users";

export const dynamic = "force-dynamic";

function primaryEmail(emailAddresses) {
  if (!Array.isArray(emailAddresses) || emailAddresses.length === 0) return null;
  return emailAddresses[0]?.email_address ?? null;
}

export async function POST(request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "CLERK_WEBHOOK_SECRET not configured" }, { status: 500 });
  }

  const svixId        = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event;
  try {
    event = new Webhook(secret).verify(rawBody, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const { type, data } = event;

  try {
    if (type === "user.created" || type === "user.updated") {
      await upsertUser({
        clerkId:   data.id,
        email:     primaryEmail(data.email_addresses),
        firstName: data.first_name ?? null,
        lastName:  data.last_name  ?? null,
        imageUrl:  data.image_url  ?? null,
        username:  data.username   ?? null,
      });
    } else if (type === "user.deleted") {
      await deleteUserByClerkId(data.id);
    }
  } catch (err) {
    console.error("[clerk-webhook] DB error:", err);
    return Response.json({ error: "Database operation failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
