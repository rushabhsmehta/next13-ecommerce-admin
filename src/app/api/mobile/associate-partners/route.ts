import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  mobileNumber: z.string().min(1, "Mobile number is required").max(40),
  email: z.string().email().optional().nullable().or(z.literal("")),
  gmail: z.string().email().optional().nullable().or(z.literal("")),
});

/**
 * Mobile associate-partners listing. Mirrors `/api/associate-partners` but
 * accepts a mobile bearer token. Includes `total` + pagination for list screens.
 */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const access = await resolveInquiryAccessContext(userId);
    if (!access.isAdminLike) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const search = searchParams.get("search")?.trim() ?? "";
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "50", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const where: Record<string, unknown> = {};
    if (activeOnly) where.isActive = true;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { gmail: { contains: search } },
        { mobileNumber: { contains: search } },
      ];
    }

    const [partners, total] = await Promise.all([
      prismadb.associatePartner.findMany({
        where,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          gmail: true,
          mobileNumber: true,
          isActive: true,
        },
        skip: offset,
        take: limit,
      }),
      prismadb.associatePartner.count({ where }),
    ]);

    return NextResponse.json({
      partners,
      total,
      hasMore: offset + partners.length < total,
      nextOffset: offset + partners.length,
    });
  } catch (error) {
    console.log("[MOBILE_ASSOCIATE_PARTNERS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const access = await resolveInquiryAccessContext(userId);
    if (!access.isAdminLike) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid partner payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { name, mobileNumber, email, gmail } = parsed.data;
    const partner = await prismadb.associatePartner.create({
      data: {
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email && email.trim() ? email.trim() : null,
        gmail: gmail && gmail.trim() ? gmail.trim() : null,
      },
    });

    await recordMobileAudit({
      userId,
      entityType: "AssociatePartner",
      entityId: partner.id,
      action: "CREATE",
      metadata: { name: partner.name },
    });

    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_ASSOCIATE_PARTNERS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
