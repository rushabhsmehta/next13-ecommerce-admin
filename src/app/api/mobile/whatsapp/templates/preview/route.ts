import { NextResponse } from "next/server";
import {
  extractTemplateParameters,
  previewTemplate,
  searchTemplates,
  validateTemplateParameters,
} from "@/lib/whatsapp-templates";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/whatsapp/templates/preview
 *
 * Renders a server-side preview of a template with the given parameters.
 * Body: { templateName: string; parameters?: Record<string, string> | unknown[] }
 *
 * Returns the rendered text, the list of required parameters, and (if
 * supplied) whether the provided parameters validate. No Meta send happens —
 * actual sending goes through /api/mobile/whatsapp/send.
 */
export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    }
    const guard = await requireMobileAdminPermission(userId, "communications.read");
    if (!guard.ok) return guard.response;

    const body = await req.json();
    const templateName: string | undefined = body?.templateName?.trim?.();
    const parameters = body?.parameters;

    if (!templateName) {
      return NextResponse.json({ error: "templateName is required" }, { status: 400 });
    }

    const results = await searchTemplates({ name: templateName });
    if (results.length === 0) {
      return NextResponse.json(
        { error: `Template not found: ${templateName}` },
        { status: 404 }
      );
    }
    const template = results[0];
    const required = extractTemplateParameters(template);

    let validation: { valid: boolean; errors?: string[] } | null = null;
    if (parameters) {
      const v = validateTemplateParameters(template, parameters);
      validation = { valid: v.valid, errors: v.valid ? undefined : v.errors };
    }

    const preview = previewTemplate(template, parameters);

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        language: template.language,
        status: template.status,
        category: template.category,
      },
      preview,
      required,
      validation,
    });
  } catch (error: any) {
    console.log("[MOBILE_WA_TEMPLATE_PREVIEW]", error);
    return NextResponse.json(
      { error: error?.message || "Preview failed" },
      { status: error?.status || 500 }
    );
  }
}
