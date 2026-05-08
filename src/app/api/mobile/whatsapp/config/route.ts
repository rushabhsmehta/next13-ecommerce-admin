import { NextResponse } from "next/server";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

const FALLBACK_BUSINESS_NUMBER = "919724444701";

export async function GET(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const businessNumber =
      process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER?.trim() ||
      process.env.WHATSAPP_BUSINESS_NUMBER?.trim() ||
      FALLBACK_BUSINESS_NUMBER;

    return NextResponse.json({
      businessNumber,
      businessNumberE164: businessNumber.startsWith("+")
        ? businessNumber
        : `+${businessNumber}`,
      apiVersion: process.env.META_GRAPH_API_VERSION ?? null,
      hasMetaPhoneNumberId: !!process.env.META_WHATSAPP_PHONE_NUMBER_ID,
    });
  } catch (error) {
    console.log("[MOBILE_WA_CONFIG]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
