import crypto from "crypto";
import prismadb from "@/lib/prismadb";

export async function validateAdminToken(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prismadb.adminMobileToken.findUnique({
    where: { tokenHash },
  });
  if (!record) return null;

  await prismadb.adminMobileToken.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return record;
}
