import { NextResponse } from "next/server";
import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { checkWhatsAppMessagingWindow } from "@/lib/whatsapp";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

const WINDOW_HOURS = 24;

export async function GET(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "100", 10) || 100,
      200,
    );
    const cursor = searchParams.get("cursor");

    if (!phone) {
      return new NextResponse("phone query param required", { status: 400 });
    }

    const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;
    const waPhone = `whatsapp:${normalizedPhone}`;
    const waPhoneNoPlus = `whatsapp:${normalizedPhone.replace(/^\+/, "")}`;

    const cursorDate = cursor ? new Date(cursor) : null;
    if (cursorDate && Number.isNaN(cursorDate.getTime())) {
      return new NextResponse("invalid cursor", { status: 400 });
    }

    const [messages, customer, windowStatus] = await Promise.all([
      whatsappPrisma.whatsAppMessage.findMany({
        where: {
          AND: [
            {
              OR: [
                { from: { in: [normalizedPhone, waPhone, waPhoneNoPlus] } },
                { to: { in: [normalizedPhone, waPhone, waPhoneNoPlus] } },
              ],
            },
            ...(cursorDate ? [{ createdAt: { lt: cursorDate } }] : []),
          ],
        },
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { whatsappCustomer: true },
      }),
      whatsappPrisma.whatsAppCustomer.findFirst({
        where: {
          OR: [
            { phoneNumber: normalizedPhone },
            { phoneNumber: normalizedPhone.replace(/^\+/, "") },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          tags: true,
          notes: true,
          isOptedIn: true,
        },
      }),
      checkWhatsAppMessagingWindow(normalizedPhone),
    ]);

    const sorted = [...messages].reverse();

    const nextCursor =
      messages.length === limit
        ? messages[messages.length - 1].createdAt.toISOString()
        : null;

    const lastInboundAt = windowStatus.lastInboundMessage?.createdAt
      ? new Date(windowStatus.lastInboundMessage.createdAt)
      : null;
    const windowExpiresAt = lastInboundAt
      ? new Date(lastInboundAt.getTime() + WINDOW_HOURS * 60 * 60 * 1000).toISOString()
      : null;

    const customerSummary = customer
      ? {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          fullName:
            [customer.firstName, customer.lastName]
              .filter(Boolean)
              .join(" ")
              .trim() || null,
          email: customer.email,
          phoneNumber: customer.phoneNumber,
          tags: customer.tags ?? [],
          notes: customer.notes ?? null,
          isOptedIn: customer.isOptedIn,
        }
      : null;

    return NextResponse.json({
      messages: sorted,
      nextCursor,
      window: {
        canMessage: windowStatus.canMessage,
        hoursRemaining: windowStatus.hoursRemaining ?? null,
        expiresAt: windowExpiresAt,
      },
      customer: customerSummary,
    });
  } catch (error) {
    console.log("[MOBILE_WA_MESSAGES]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
