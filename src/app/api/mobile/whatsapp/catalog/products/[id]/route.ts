import { NextResponse } from "next/server";
import {
  deleteTourPackage,
  updateTourPackage,
} from "@/lib/whatsapp-catalog";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const id = params.id?.trim();
    if (!id) {
      return NextResponse.json({ error: "Package id is required" }, { status: 400 });
    }
    const body = await req.json();
    const tourPackage = await updateTourPackage(id, body);

    await recordMobileAudit({
      userId: admin.userId,
      entityType: "WhatsAppTourPackage",
      entityId: id,
      action: "UPDATE",
      metadata: { fields: Object.keys(body || {}) },
    });

    return NextResponse.json({ tourPackage });
  } catch (error: any) {
    console.log("[MOBILE_WA_CATALOG_PRODUCT_PATCH]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update catalog entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const id = params.id?.trim();
    if (!id) {
      return NextResponse.json({ error: "Package id is required" }, { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const removeFromMeta = searchParams.get("removeFromMeta") === "true";

    await deleteTourPackage(id, { removeFromMeta });

    await recordMobileAudit({
      userId: admin.userId,
      entityType: "WhatsAppTourPackage",
      entityId: id,
      action: "DELETE",
      metadata: { removeFromMeta },
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.log("[MOBILE_WA_CATALOG_PRODUCT_DELETE]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete catalog entry" },
      { status: 500 }
    );
  }
}
