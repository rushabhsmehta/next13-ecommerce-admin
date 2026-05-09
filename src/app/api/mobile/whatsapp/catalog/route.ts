import { NextResponse } from "next/server";
import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { ensureCatalogReady } from "@/lib/whatsapp-catalog";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const catalog = await ensureCatalogReady();

    const [catalogs, totalPackages, statusGroups, syncGroups] = await Promise.all([
      whatsappPrisma.whatsAppCatalog.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          metaCatalogId: true,
          currency: true,
          isActive: true,
          isPublic: true,
          autoSync: true,
        },
      }),
      whatsappPrisma.whatsAppTourPackage.count(),
      whatsappPrisma.whatsAppTourPackage.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      whatsappPrisma.whatsAppTourPackage.groupBy({
        by: ["syncStatus"],
        _count: { _all: true },
      }),
    ]);

    const byStatus = statusGroups.reduce<Record<string, number>>((acc, g) => {
      acc[g.status] = g._count._all;
      return acc;
    }, {});
    const bySyncStatus = syncGroups.reduce<Record<string, number>>((acc, g) => {
      acc[g.syncStatus] = g._count._all;
      return acc;
    }, {});

    return NextResponse.json({
      activeCatalog: catalog
        ? {
            id: catalog.id,
            name: catalog.name,
            metaCatalogId: catalog.metaCatalogId,
            currency: catalog.currency,
            isActive: catalog.isActive,
          }
        : null,
      catalogs,
      stats: {
        totalPackages,
        byStatus,
        bySyncStatus,
      },
    });
  } catch (error) {
    console.log("[MOBILE_WA_CATALOG_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
