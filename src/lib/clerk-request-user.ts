import { auth, clerkClient } from "@clerk/nextjs/server";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";

/**
 * Clerk user id from `Authorization: Bearer` (JWT or dev bypass) or session cookies.
 */
export async function getRequestClerkUserId(req: Request): Promise<string | null> {
  const fromBearer = await verifyMobileBearerUserId(req);
  if (fromBearer) return fromBearer;
  const { userId } = await auth();
  return userId ?? null;
}

/** Primary email for a Clerk user (mobile Bearer or web session). */
export async function getClerkPrimaryEmailByUserId(
  userId: string
): Promise<string | undefined> {
  const clerk = await clerkClient();
  const u = await clerk.users.getUser(userId);
  return u.emailAddresses[0]?.emailAddress;
}
