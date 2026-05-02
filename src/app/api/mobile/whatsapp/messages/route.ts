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

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 200);
    const cursor = searchParams.get("cursor"); // ISO date string for pagination

    if (!phone) {
      return new NextResponse("phone query param required", { status: 400 });
    }

    const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;
    const waPhone = `whatsapp:${normalizedPhone}`;

    const messages = await whatsappPrisma.whatsAppMessage.findMany({
      where: {
        AND: [
          {
            OR: [
              { from: { in: [normalizedPhone, waPhone] } },
              { to: { in: [normalizedPhone, waPhone] } },
            ],
          },
          ...(cursor
            ? [{ createdAt: { lt: new Date(cursor) } }]
            : []),
        ],
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { whatsappCustomer: true },
    });

    // Return in ascending order for display (oldest → newest)
    const sorted = [...messages].reverse();

    const nextCursor =
      messages.length === limit
        ? messages[messages.length - 1].createdAt.toISOString()
        : null;

    return NextResponse.json({ messages: sorted, nextCursor });
  } catch (error) {
    console.log("[MOBILE_WA_MESSAGES]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
