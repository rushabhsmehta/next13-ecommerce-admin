import { NextResponse } from "next/server";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";
import { GraphApiError } from "@/lib/whatsapp";
import { createTemplate, type CreateTemplateRequest } from "@/lib/whatsapp-templates";
import {
  buildMetaTemplatePayload,
  validateWhatsAppTemplateDraft,
} from "@/lib/whatsapp-template-validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const validation = validateWhatsAppTemplateDraft(body);

    if (!validation.success || !validation.draft) {
      return NextResponse.json(
        {
          success: false,
          error: "Template validation failed",
          issues: validation.issues,
          readinessScore: validation.readinessScore,
        },
        { status: 422 },
      );
    }

    const payload = validation.payload ?? buildMetaTemplatePayload(validation.draft);

    try {
      const result = await createTemplate(payload as unknown as CreateTemplateRequest);

      return NextResponse.json({
        success: true,
        data: result,
        payload,
        readinessScore: validation.readinessScore,
        warnings: validation.issues.filter((issue) => issue.level === "warning"),
        message: "Template created successfully and submitted for Meta review",
      });
    } catch (error: any) {
      if (error instanceof GraphApiError) {
        return NextResponse.json(
          {
            success: false,
            error: error.message || "Meta rejected the template request",
            provider: "meta",
            meta: {
              status: error.status,
              code: error.response?.error?.code ?? null,
              subcode: error.response?.error?.error_subcode ?? null,
              details: error.response?.error?.error_data?.details ?? null,
              raw: error.response?.error ?? null,
            },
            payload,
          },
          { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
        );
      }

      throw error;
    }
  } catch (error) {
    console.log("[MOBILE_WA_TEMPLATE_CREATE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
