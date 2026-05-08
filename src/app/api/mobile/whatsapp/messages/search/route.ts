import { NextResponse } from "next/server";
import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export async function GET(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const phone = searchParams.get("phone");
    const limit = Math.min(
      Math.max(
        parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) ||
          DEFAULT_LIMIT,
        1,
      ),
      MAX_LIMIT,
    );
    const cursor = searchParams.get("cursor");
    const cursorDate = cursor ? new Date(cursor) : null;
    if (cursorDate && Number.isNaN(cursorDate.getTime())) {
      return new NextResponse("invalid cursor", { status: 400 });
    }

    if (q.length < 2) {
      return NextResponse.json({ items: [], nextCursor: null });
    }

    const phoneFilter = phone
      ? (() => {
          const normalized = phone.startsWith("+") ? phone : `+${phone}`;
          const wa = `whatsapp:${normalized}`;
          const waNoPlus = `whatsapp:${normalized.replace(/^\+/, "")}`;
          return [
            { from: { in: [normalized, wa, waNoPlus] } },
            { to: { in: [normalized, wa, waNoPlus] } },
          ];
        })()
      : null;

    const messages = await whatsappPrisma.whatsAppMessage.findMany({
      where: {
        AND: [
          { message: { contains: q, mode: "insensitive" } },
          ...(phoneFilter ? [{ OR: phoneFilter }] : []),
          ...(cursorDate ? [{ createdAt: { lt: cursorDate } }] : []),
        ],
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { whatsappCustomer: true },
    });

    const nextCursor =
      messages.length === limit
        ? messages[messages.length - 1].createdAt.toISOString()
        : null;

    return NextResponse.json({ items: messages, nextCursor });
  } catch (error) {
    console.log("[MOBILE_WA_MESSAGE_SEARCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
