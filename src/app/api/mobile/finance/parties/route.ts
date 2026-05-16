import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";

export const dynamic = "force-dynamic";

/**
 * Customer/supplier picker for receipt & payment creation. Read-only,
 * finance.read.
 */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const [membership, ia] = await Promise.all([
      prismadb.organizationMember.findFirst({
        where: { userId, isActive: true },
        select: { role: true },
      }),
      resolveInquiryAccessContext(userId),
    ]);
    if (
      !buildMobileAdminProfile(membership?.role ?? null, ia.isAssociate)
        .permissions.includes("finance.read")
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") === "supplier" ? "supplier" : "customer";
    const search = searchParams.get("search")?.trim() ?? "";
    const take = 40;

    if (type === "customer") {
      const rows = await prismadb.customer.findMany({
        where: search
          ? {
              OR: [
                { name: { contains: search } },
                { contact: { contains: search } },
              ],
            }
          : undefined,
        select: { id: true, name: true, contact: true },
        orderBy: { name: "asc" },
        take,
      });
      return NextResponse.json({
        type,
        parties: rows.map((r) => ({
          id: r.id,
          name: r.name,
          subtitle: r.contact ?? "",
        })),
      });
    }

    const rows = await prismadb.supplier.findMany({
      where: search ? { name: { contains: search } } : undefined,
      select: { id: true, name: true, contact: true },
      orderBy: { name: "asc" },
      take,
    });
    return NextResponse.json({
      type,
      parties: rows.map((r) => ({
        id: r.id,
        name: r.name,
        subtitle: r.contact ?? "",
      })),
    });
  } catch (error) {
    console.log("[MOBILE_FINANCE_PARTIES_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
