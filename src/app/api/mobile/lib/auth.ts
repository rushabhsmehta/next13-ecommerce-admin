import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";

export async function validateClerkAdmin(
  req: Request
): Promise<{ userId: string; role: string } | null> {
  const userId = await verifyMobileBearerUserId(req);
  if (!userId) return null;

  const membership = await prismadb.organizationMember.findFirst({
    where: { userId, isActive: true, role: { in: ["ADMIN", "OWNER"] } },
  });
  if (!membership) return null;

  return { userId, role: membership.role as string };
}
