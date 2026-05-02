import { verifyToken } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export async function validateClerkAdmin(
  req: Request
): Promise<{ userId: string; role: string } | null> {
  const header = req.headers.get("Authorization");
  const jwt = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!jwt) return null;

  let payload: any;
  try {
    payload = await verifyToken(jwt, { secretKey: process.env.CLERK_SECRET_KEY! });
  } catch {
    return null;
  }

  const userId = payload?.sub as string | undefined;
  if (!userId) return null;

  const membership = await (prismadb as any).organizationMember.findFirst({
    where: { userId, isActive: true, role: { in: ["ADMIN", "OWNER"] } },
  });
  if (!membership) return null;

  return { userId, role: membership.role as string };
}
