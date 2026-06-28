import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { handleApi, jsonError } from "@/lib/api-response";
import { getWhatsAppReadStates } from "@/lib/whatsapp-read-state";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) {
      return jsonError("Unauthenticated", 403);
    }

    const { searchParams } = new URL(req.url);
    const phonesParam = searchParams.get("phones");
    const phones = phonesParam
      ? phonesParam.split(",").map((p) => p.trim()).filter(Boolean)
      : undefined;

    const readStates = await getWhatsAppReadStates(userId, phones);
    return NextResponse.json({ success: true, readStates });
  });
}
