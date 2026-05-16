import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  assertCrmApiAccessForRequest,
  crmAccessErrorResponse,
} from "@/lib/crm-route-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import { dateToUtc } from "@/lib/timezone-utils";
import { normalizePhoneNumber } from "@/lib/phone-utils";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  contact: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  associatePartnerId: z.string().optional().nullable(),
  birthdate: z.string().optional().nullable(),
  marriageAnniversary: z.string().optional().nullable(),
});

/**
 * Mobile customer listing — search + pagination, optional associate filter.
 * Reuses the dashboard's CRM RBAC rules via `assertCrmApiAccessForRequest`.
 */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    try {
      await assertCrmApiAccessForRequest(userId, req.url);
    } catch (e) {
      const denied = crmAccessErrorResponse(e);
      if (denied) return denied;
      throw e;
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const associatePartnerId = searchParams.get("associatePartnerId");
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "30", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 30, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const where: Record<string, unknown> = {};
    if (associatePartnerId) where.associatePartnerId = associatePartnerId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contact: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      prismadb.customer.findMany({
        where,
        select: {
          id: true,
          name: true,
          contact: true,
          email: true,
          createdAt: true,
          associatePartner: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prismadb.customer.count({ where }),
    ]);

    return NextResponse.json({
      customers,
      total,
      hasMore: offset + customers.length < total,
      nextOffset: offset + customers.length,
    });
  } catch (error) {
    console.log("[MOBILE_CUSTOMERS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    try {
      await assertCrmApiAccessForRequest(userId, req.url);
    } catch (e) {
      const denied = crmAccessErrorResponse(e);
      if (denied) return denied;
      throw e;
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid customer payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { name, contact, email, associatePartnerId, birthdate, marriageAnniversary } =
      parsed.data;

    const normalizedName = name.trim();
    if (!normalizedName) {
      return new NextResponse("Name is required", { status: 400 });
    }
    const normalizedEmail =
      typeof email === "string" && email.trim().length > 0 ? email.trim() : null;
    const sanitizedPartnerId =
      typeof associatePartnerId === "string" && associatePartnerId.trim().length > 0
        ? associatePartnerId.trim()
        : null;

    let contactValue: string | null = null;
    if (typeof contact === "string" && contact.trim().length > 0) {
      const normalizedContact = normalizePhoneNumber(contact);
      if (!normalizedContact) {
        return new NextResponse("Invalid contact number", { status: 400 });
      }
      contactValue = normalizedContact.e164;
    }

    const customer = await prismadb.customer.create({
      data: {
        name: normalizedName,
        contact: contactValue,
        email: normalizedEmail,
        associatePartner: sanitizedPartnerId
          ? { connect: { id: sanitizedPartnerId } }
          : undefined,
        birthdate: dateToUtc(birthdate),
        marriageAnniversary: dateToUtc(marriageAnniversary),
      },
      include: {
        associatePartner: { select: { id: true, name: true } },
      },
    });

    await recordMobileAudit({
      userId,
      entityType: "Customer",
      entityId: customer.id,
      action: "CREATE",
      metadata: { name: customer.name, contact: customer.contact },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_CUSTOMERS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
