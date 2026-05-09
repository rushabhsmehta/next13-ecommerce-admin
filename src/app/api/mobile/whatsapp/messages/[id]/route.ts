import { NextResponse } from "next/server";
import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function extractTargetPhone(message: {
  from: string | null;
  to: string | null;
  direction: string;
}): string | null {
  // For outbound messages we react/reply against the recipient (`to`),
  // for inbound we target the sender (`from`).
  const raw =
    message.direction === "inbound" ? message.from : message.to;
  if (!raw) return null;
  return raw.replace(/^whatsapp:/i, "");
}

export async function DELETE(req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const existing = await whatsappPrisma.whatsAppMessage.findUnique({
      where: { id },
    });
    if (!existing) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Meta has no message-delete primitive; we soft-delete in our own DB so
    // the conversation hides it. The recipient still sees the original.
    const meta = (existing.metadata ?? {}) as Record<string, unknown>;
    await whatsappPrisma.whatsAppMessage.update({
      where: { id },
      data: {
        status: "deleted",
        metadata: {
          ...meta,
          deletedAt: new Date().toISOString(),
          deletedBy: admin.userId,
          previousMessage: existing.message,
        },
        message: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[MOBILE_WA_MESSAGE_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action as string | undefined;

    const existing = await whatsappPrisma.whatsAppMessage.findUnique({
      where: { id },
    });
    if (!existing) {
      return new NextResponse("Not found", { status: 404 });
    }

    if (action === "react") {
      const emoji = typeof body.emoji === "string" ? body.emoji.trim() : "";
      const wamid = existing.messageSid;
      if (!wamid) {
        return new NextResponse(
          "Cannot react: original message has no Meta wamid",
          { status: 400 },
        );
      }
      const target = extractTargetPhone(existing);
      if (!target) {
        return new NextResponse("Cannot resolve target phone", { status: 400 });
      }

      const result = await sendWhatsAppMessage({
        to: target,
        reaction: { messageId: wamid, emoji },
        metadata: { reactionTo: wamid, reactionFromAdmin: admin.userId },
      });

      return NextResponse.json({ success: true, reaction: result });
    }

    return new NextResponse("Unsupported action", { status: 400 });
  } catch (error) {
    console.log("[MOBILE_WA_MESSAGE_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
