import { NextResponse } from "next/server";
import { listFlows } from "@/lib/whatsapp-flows";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    try {
      const result = await listFlows();
      return NextResponse.json({
        items: (result.data ?? []).map((f) => ({
          id: f.id,
          name: f.name,
          status: f.status,
          categories: f.categories ?? [],
          validationErrors: Array.isArray(f.validation_errors)
            ? f.validation_errors.length
            : 0,
          jsonVersion: f.json_version ?? null,
          dataApiVersion: f.data_api_version ?? null,
          endpointUri: f.endpoint_uri ?? null,
        })),
        count: result.data?.length ?? 0,
      });
    } catch (err: any) {
      // Most likely Meta misconfig; surface a 502 so the mobile UI can show a
      // clear "Flows API not reachable" empty state.
      console.log("[MOBILE_WA_FLOWS_GET] upstream", err);
      return NextResponse.json(
        {
          items: [],
          count: 0,
          error:
            err?.message ?? "Could not fetch flows from Meta — check WhatsApp Business credentials.",
        },
        { status: 502 },
      );
    }
  } catch (error) {
    console.log("[MOBILE_WA_FLOWS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
