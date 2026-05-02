import { NextResponse } from "next/server";
import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { validateAdminToken } from "@/app/api/mobile/lib/auth";

function extractPhone(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/^whatsapp:/i, "");
}

export async function GET(req: Request) {
  try {
    const admin = await validateAdminToken(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    // Fetch recent messages (last 2000 to build conversation list)
    const messages = await whatsappPrisma.whatsAppMessage.findMany({
      take: 2000,
      orderBy: { createdAt: "desc" },
      include: { whatsappCustomer: true },
    });

    // Group by customer phone — build a map of phone → conversation summary
    const conversationMap = new Map<
      string,
      {
        phone: string;
        customerName: string | null;
        lastMessage: string | null;
        lastMessageAt: Date;
        lastDirection: string;
        unreadCount: number;
        lastOutboundAt: Date | null;
      }
    >();

    // We need two passes: first find the last outbound per phone, then count unreads
    const lastOutboundMap = new Map<string, Date>();
    for (const msg of messages) {
      if (msg.direction !== "outbound") continue;
      const phone = extractPhone(msg.to);
      if (!phone) continue;
      if (!lastOutboundMap.has(phone)) {
        lastOutboundMap.set(phone, msg.createdAt);
      }
    }

    for (const msg of messages) {
      const phone =
        msg.direction === "inbound"
          ? extractPhone(msg.from)
          : extractPhone(msg.to);
      if (!phone || phone === "business") continue;

      if (!conversationMap.has(phone)) {
        const meta = msg.metadata as Record<string, any> | null;
        const customerName =
          msg.whatsappCustomer
            ? [msg.whatsappCustomer.firstName, msg.whatsappCustomer.lastName]
                .filter(Boolean)
                .join(" ") || null
            : (meta?.contactName as string | null) ?? null;

        conversationMap.set(phone, {
          phone,
          customerName,
          lastMessage: msg.message,
          lastMessageAt: msg.createdAt,
          lastDirection: msg.direction,
          unreadCount: 0,
          lastOutboundAt: lastOutboundMap.get(phone) ?? null,
        });
      }
    }

    // Count unread: inbound messages after the last outbound for that phone
    for (const msg of messages) {
      if (msg.direction !== "inbound") continue;
      const phone = extractPhone(msg.from);
      if (!phone) continue;
      const conv = conversationMap.get(phone);
      if (!conv) continue;
      const lastOut = lastOutboundMap.get(phone);
      if (!lastOut || msg.createdAt > lastOut) {
        conv.unreadCount++;
      }
    }

    const conversations = Array.from(conversationMap.values()).sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );

    return NextResponse.json(conversations);
  } catch (error) {
    console.log("[MOBILE_WA_CONVERSATIONS]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
