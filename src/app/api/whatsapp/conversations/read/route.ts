import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { handleApi, jsonError } from "@/lib/api-response";
import { markWhatsAppConversationRead } from "@/lib/whatsapp-read-state";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) {
      return jsonError("Unauthenticated", 403);
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

    const result = await markWhatsAppConversationRead(userId, phone, lastReadAt);
    return NextResponse.json({ success: true, ...result });
  });
}
