import { NextResponse } from "next/server";
import { listWhatsAppTemplates } from "@/lib/whatsapp";
import { validateAdminToken } from "@/app/api/mobile/lib/auth";

export async function GET(req: Request) {
  try {
    const admin = await validateAdminToken(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const templates: any[] = [];
    let after: string | undefined;
    let page = 0;

    do {
      const response = await listWhatsAppTemplates(50, after);
      const data: any[] = response?.data || [];
      data
        .filter((t: any) => t.status === "APPROVED")
        .forEach((t: any) => {
          templates.push({
            id: `${t.name}:${t.language}`,
            name: t.name,
            language: t.language,
            status: t.status,
            category: t.category,
            components: t.components,
            qualityScore: t.quality_score?.score ?? null,
          });
        });
      after = response?.paging?.cursors?.after;
      page += 1;
    } while (after && page < 10);

    templates.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(templates);
  } catch (error) {
    console.log("[MOBILE_WA_TEMPLATES]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
