import { auth } from "@clerk/nextjs/server";

import { hasClerkCredentials } from "@/lib/clerk-config";

export async function getRequestAuth() {
  if (!hasClerkCredentials()) {
    return {
      clerkEnabled: false,
      isAuthenticated: false,
      userId: null,
    };
  }

  const session = await auth();

  return {
    clerkEnabled: true,
    ...session,
  };
}

export async function requireAuthenticatedRequest() {
  const session = await getRequestAuth();

  if (!session.clerkEnabled) {
    return null;
  }

  if (!session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
