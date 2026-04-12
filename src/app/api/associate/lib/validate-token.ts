import prismadb from "@/lib/prismadb";

/**
 * Extracts the Bearer token from an Authorization header and validates it
 * against AssociatePartner.accessToken. Returns the associate or null.
 */
export async function validateAssociateToken(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const associate = await prismadb.associatePartner.findFirst({
    where: {
      accessToken: token,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      mobileNumber: true,
      email: true,
      accessToken: true,
    },
  });

  return associate;
}
