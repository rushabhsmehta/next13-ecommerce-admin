import { NextResponse } from "next/server";
import {
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  checkWhatsAppMessagingWindow,
} from "@/lib/whatsapp";
import { validateAdminToken } from "@/app/api/mobile/lib/auth";

export async function POST(req: Request) {
  try {
    const admin = await validateAdminToken(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { type, phone, message, templateName, parameters, mediaUrl, mediaType, caption } = body;

    if (!phone) return new NextResponse("phone required", { status: 400 });

    const to = phone.startsWith("+") ? phone : `+${phone}`;

    if (type === "text" || !type) {
      if (!message) return new NextResponse("message required", { status: 400 });
      const result = await sendWhatsAppMessage({ to, message });
      return NextResponse.json(result);
    }

    if (type === "template") {
      if (!templateName) return new NextResponse("templateName required", { status: 400 });
      const result = await sendWhatsAppTemplate({
        to,
        templateName,
        language: "en_US",
        bodyParams: parameters ?? [],
      });
      return NextResponse.json(result);
    }

    if (type === "image" || type === "video" || type === "audio" || type === "document") {
      if (!mediaUrl) return new NextResponse("mediaUrl required", { status: 400 });
      const result = await sendWhatsAppMessage({
        to,
        message: caption ?? "",
        mediaUrl,
        mediaType: mediaType ?? type,
      });
      return NextResponse.json(result);
    }

    return new NextResponse("Unknown message type", { status: 400 });
  } catch (error) {
    console.log("[MOBILE_WA_SEND]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

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
    console.log("[MOBILE_WA_WINDOW_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
