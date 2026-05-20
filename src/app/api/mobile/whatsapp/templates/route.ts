import { NextResponse } from "next/server";
import { listWhatsAppTemplates } from "@/lib/whatsapp";
import { createTemplate, type CreateTemplateRequest } from "@/lib/whatsapp-templates";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 60 * 1000;

interface MobileTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string | null;
  components: unknown;
  qualityScore: string | null;
}

interface CacheEntry {
  templates: MobileTemplate[];
  fetchedAt: number;
}

const cache: { entry: CacheEntry | null } = { entry: null };
let inflight: Promise<MobileTemplate[]> | null = null;

async function loadApprovedTemplates(): Promise<MobileTemplate[]> {
  const templates: MobileTemplate[] = [];
  let after: string | undefined;
  let page = 0;

  do {
    const response: any = await listWhatsAppTemplates(50, after);
    const data: any[] = response?.data || [];
    for (const t of data) {
      if (t.status !== "APPROVED") continue;
      templates.push({
        id: `${t.name}:${t.language}`,
        name: t.name,
        language: t.language,
        status: t.status,
        category: t.category ?? null,
        components: t.components,
        qualityScore: t.quality_score?.score ?? null,
      });
    }
    after = response?.paging?.cursors?.after;
    page += 1;
  } while (after && page < 10);

  templates.sort((a, b) => a.name.localeCompare(b.name));
  return templates;
}

async function getTemplates(): Promise<{ templates: MobileTemplate[]; fetchedAt: number }> {
  const now = Date.now();
  if (cache.entry && now - cache.entry.fetchedAt < CACHE_TTL_MS) {
    return cache.entry;
  }
  if (inflight) {
    const templates = await inflight;
    return cache.entry ?? { templates, fetchedAt: now };
  }
  inflight = loadApprovedTemplates();
  try {
    const templates = await inflight;
    cache.entry = { templates, fetchedAt: now };
    return cache.entry;
  } finally {
    inflight = null;
  }
}

function invalidateCache() {
  cache.entry = null;
}

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    }
    const guard = await requireMobileAdminPermission(userId, "communications.write");
    if (!guard.ok) return guard.response;

    const body = (await req.json()) as CreateTemplateRequest;

    if (!body?.name || !body?.language || !body?.category || !Array.isArray(body?.components)) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, language, category, components",
        },
        { status: 400 }
      );
    }
    if (!/^[a-z0-9_]+$/.test(body.name)) {
      return NextResponse.json(
        {
          error:
            "Template name must be lowercase letters, digits, and underscores only",
        },
        { status: 400 }
      );
    }
    if (body.components.length === 0) {
      return NextResponse.json(
        { error: "At least one component is required" },
        { status: 400 }
      );
    }
    if (!body.components.some((c) => c.type === "BODY")) {
      return NextResponse.json(
        { error: "Template must include a BODY component" },
        { status: 400 }
      );
    }

    const result = await createTemplate(body);
    invalidateCache();

    await recordMobileAudit({
      userId,
      entityType: "WhatsAppTemplate",
      entityId: (result as any)?.id ?? body.name,
      action: "CREATE",
      metadata: {
        name: body.name,
        language: body.language,
        category: body.category,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Template created and submitted for review",
    });
  } catch (error: any) {
    console.log("[MOBILE_WA_TEMPLATE_CREATE]", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to create template",
        details: error?.response?.data ?? null,
      },
      { status: error?.status || 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");
    const sinceMs = since ? Number(since) : null;
    const validSince =
      sinceMs !== null && Number.isFinite(sinceMs) && sinceMs > 0 ? sinceMs : null;

    const { templates, fetchedAt } = await getTemplates();

    if (validSince !== null && fetchedAt <= validSince) {
      return NextResponse.json({
        items: [],
        fetchedAt,
        notModified: true,
      });
    }

    return NextResponse.json({
      items: templates,
      fetchedAt,
      notModified: false,
    });
  } catch (error) {
    console.log("[MOBILE_WA_TEMPLATES]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
