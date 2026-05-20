import { NextResponse } from "next/server";
import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { deleteR2Object } from "@/lib/r2-client";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    }
    const guard = await requireMobileAdminPermission(userId, "communications.write");
    if (!guard.ok) return guard.response;

    const id = params.id?.trim();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const asset = await whatsappPrisma.whatsAppMediaAsset.findUnique({ where: { id } });
    if (!asset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (asset.publicId) {
      try {
        await deleteR2Object(asset.publicId);
      } catch (deleteError: any) {
        if (!`${deleteError?.name || ""}`.includes("NoSuchKey")) {
          console.log("[MOBILE_WA_MEDIA_DELETE_R2]", deleteError);
          return NextResponse.json(
            { error: deleteError?.message || "Failed to delete from R2" },
            { status: 502 }
          );
        }
      }
    }

    await whatsappPrisma.whatsAppMediaAsset.delete({ where: { id } });

    await recordMobileAudit({
      userId,
      entityType: "WhatsAppMediaAsset",
      entityId: id,
      action: "DELETE",
      metadata: { publicId: asset.publicId },
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.log("[MOBILE_WA_MEDIA_DELETE]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete media" },
      { status: 500 }
    );
  }
}
