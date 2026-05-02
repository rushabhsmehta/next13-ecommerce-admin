import { NextResponse } from "next/server";
import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { validateAdminToken } from "@/app/api/mobile/lib/auth";

export async function GET(req: Request) {
  try {
    const admin = await validateAdminToken(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    // Fetch from the WhatsAppTemplate table (synced from Meta)
    const templates = await whatsappPrisma.whatsAppTemplate.findMany({
      where: { status: "APPROVED" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        language: true,
        status: true,
        category: true,
        components: true,
        qualityScore: true,
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.log("[MOBILE_WA_TEMPLATES]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
