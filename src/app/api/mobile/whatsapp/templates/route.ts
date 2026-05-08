import { NextResponse } from "next/server";
import { listWhatsAppTemplates } from "@/lib/whatsapp";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

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
