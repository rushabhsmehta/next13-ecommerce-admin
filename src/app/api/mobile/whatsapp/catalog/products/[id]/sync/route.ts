import { NextResponse } from "next/server";
import { GraphApiError } from "@/lib/whatsapp";
import { syncTourPackageToMeta } from "@/lib/whatsapp-catalog";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const id = params.id?.trim();
    if (!id) {
      return NextResponse.json({ error: "Package id is required" }, { status: 400 });
    }

    const tourPackage = await syncTourPackageToMeta(id);

    await recordMobileAudit({
      userId: admin.userId,
      entityType: "WhatsAppTourPackage",
      entityId: id,
      action: "UPDATE",
      metadata: { event: "sync", syncStatus: tourPackage.syncStatus },
    });

    return NextResponse.json({ tourPackage });
  } catch (error: any) {
    if (error instanceof GraphApiError) {
      console.log("[MOBILE_WA_CATALOG_PRODUCT_SYNC_META]", error);
      return NextResponse.json(
        { error: error.message, meta: error.response },
        { status: 502 }
      );
    }
    console.log("[MOBILE_WA_CATALOG_PRODUCT_SYNC]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to sync to Meta" },
      { status: 500 }
    );
  }
}
