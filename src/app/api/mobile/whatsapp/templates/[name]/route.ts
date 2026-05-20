import { NextResponse } from "next/server";
import { deleteTemplate } from "@/lib/whatsapp-templates";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/mobile/whatsapp/templates/[name]
 *
 * Removes a template from Meta. `[name]` is the template name (e.g.
 * "order_confirmation"). Optional `?id=` query disambiguates when multiple
 * languages of the same template name exist.
 */
export async function DELETE(req: Request, props: { params: Promise<{ name: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    }
    const guard = await requireMobileAdminPermission(userId, "communications.write");
    if (!guard.ok) return guard.response;

    const name = decodeURIComponent(params.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Missing template name" }, { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") ?? undefined;

    const result = await deleteTemplate(name, id);

    await recordMobileAudit({
      userId,
      entityType: "WhatsAppTemplate",
      entityId: id ?? name,
      action: "DELETE",
      metadata: { name },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.log("[MOBILE_WA_TEMPLATE_DELETE]", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to delete template",
        details: error?.response?.data ?? null,
      },
      { status: error?.status || 500 }
    );
  }
}
