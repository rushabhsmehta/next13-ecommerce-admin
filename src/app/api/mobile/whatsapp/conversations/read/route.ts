import { NextResponse } from "next/server";
import { handleApi, jsonError } from "@/lib/api-response";
import { markWhatsAppConversationRead } from "@/lib/whatsapp-read-state";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleApi(async () => {
    const admin = await validateClerkAdmin(req);
    if (!admin) {
      return jsonError("Unauthorized", 401);
    }

    const body = await req.json();
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    if (!phone) {
      return jsonError("phone is required", 422);
    }

    let lastReadAt = new Date();
    if (body?.lastReadAt) {
      const parsed = new Date(body.lastReadAt);
      if (Number.isNaN(parsed.getTime())) {
        return jsonError("Invalid lastReadAt", 422);
      }
      lastReadAt = parsed;
    }

    const result = await markWhatsAppConversationRead(admin.userId, phone, lastReadAt);
    return NextResponse.json({ success: true, ...result });
  });
}
