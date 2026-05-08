import { NextResponse } from "next/server";
import {
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
} from "@/lib/whatsapp";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const {
      type,
      phone,
      message,
      templateName,
      templateLanguage,
      parameters,
      headerParams,
      buttonParams,
      mediaUrl,
      mediaType,
      caption,
      filename,
      replyToWamid,
      reactionEmoji,
      reactToWamid,
    } = body;

    if (!phone) return new NextResponse("phone required", { status: 400 });

    const to = phone.startsWith("+") ? phone : `+${phone}`;

    const context = typeof replyToWamid === "string" && replyToWamid.length > 0
      ? { messageId: replyToWamid }
      : undefined;

    if (type === "reaction") {
      const wamid = typeof reactToWamid === "string" ? reactToWamid : null;
      if (!wamid) {
        return new NextResponse("reactToWamid required", { status: 400 });
      }
      const emoji = typeof reactionEmoji === "string" ? reactionEmoji : "";
      const result = await sendWhatsAppMessage({
        to,
        reaction: { messageId: wamid, emoji },
        metadata: { reactionTo: wamid, sentByAdmin: admin.userId },
      });
      return NextResponse.json(result);
    }

    if (type === "text" || !type) {
      if (!message) return new NextResponse("message required", { status: 400 });
      const result = await sendWhatsAppMessage({ to, message, context });
      return NextResponse.json(result);
    }

    if (type === "template") {
      if (!templateName) return new NextResponse("templateName required", { status: 400 });
      const result = await sendWhatsAppTemplate({
        to,
        templateName,
        languageCode:
          typeof templateLanguage === "string" && templateLanguage.length > 0
            ? templateLanguage
            : "en_US",
        bodyParams: Array.isArray(parameters) ? parameters : [],
        headerParams:
          headerParams && typeof headerParams === "object" ? headerParams : undefined,
        buttonParams: Array.isArray(buttonParams) ? buttonParams : undefined,
      });
      return NextResponse.json(result);
    }

    if (type === "image" || type === "video" || type === "audio" || type === "document") {
      if (!mediaUrl) return new NextResponse("mediaUrl required", { status: 400 });
      const result = await sendWhatsAppMessage({
        to,
        media: {
          url: mediaUrl,
          type: (mediaType ?? type) as "image" | "video" | "audio" | "document",
          caption: caption ?? undefined,
          filename: filename ?? undefined,
        },
        context,
      });
      return NextResponse.json(result);
    }

    return new NextResponse("Unknown message type", { status: 400 });
  } catch (error) {
    console.log("[MOBILE_WA_SEND]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
