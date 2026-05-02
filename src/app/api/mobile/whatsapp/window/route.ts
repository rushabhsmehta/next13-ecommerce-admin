import { NextResponse } from "next/server";
import { checkWhatsAppMessagingWindow } from "@/lib/whatsapp";
import { validateAdminToken } from "@/app/api/mobile/lib/auth";

export async function GET(req: Request) {
  try {
    const admin = await validateAdminToken(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    if (!phone) return new NextResponse("phone required", { status: 400 });

    const to = phone.startsWith("+") ? phone : `+${phone}`;
    const windowStatus = await checkWhatsAppMessagingWindow(to);
    return NextResponse.json(windowStatus);
  } catch (error) {
    console.log("[MOBILE_WA_WINDOW]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
