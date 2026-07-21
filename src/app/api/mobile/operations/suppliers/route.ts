import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireOperationsRead,
  requireOperationsWrite,
} from "@/app/api/mobile/lib/assert-operations-access";
import {
  readIdempotencyKey,
  findPriorIdempotentEntityId,
} from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import {
  mapSupplierLocations,
  supplierLocationCreateInput,
  supplierLocationsSelect,
} from "@/app/api/mobile/lib/supplier-locations";

import {
  formatSupplierEmails,
  isValidEmailAddress,
  parseSupplierEmails,
} from "@/lib/supplier-emails";

export const dynamic = "force-dynamic";

const optionalMultiEmail = z
  .string()
  .optional()
  .nullable()
  .or(z.literal(""))
  .superRefine((value, ctx) => {
    if (!value || !String(value).trim()) return;
    const emails = parseSupplierEmails(String(value));
    const invalid = emails.filter((email) => !isValidEmailAddress(email));
    if (emails.length === 0 || invalid.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          invalid.length > 0
            ? `Invalid email: ${invalid.join(", ")}`
            : "Invalid email",
      });
    }
  });

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  contact: z.string().max(40).optional().nullable(),
  email: optionalMultiEmail,
  gstNumber: z.string().max(30).optional().nullable(),
  address: z.string().max(2000).optional().nullable(),
  locationIds: z.array(z.string().min(1)).optional(),
});

/** Supplier directory — list + create. operations.read / .write. */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const locationId = searchParams.get("locationId")?.trim() ?? undefined;
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "30", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 30, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const and: Prisma.SupplierWhereInput[] = [];
    if (locationId) {
      and.push({ locations: { some: { locationId } } });
    }
    if (search) {
      and.push({
        OR: [
          { name: { contains: search } },
          { contact: { contains: search } },
          { email: { contains: search } },
          { locations: { some: { location: { label: { contains: search } } } } },
        ],
      });
    }
    const where: Prisma.SupplierWhereInput = and.length ? { AND: and } : {};

    const [rows, total] = await Promise.all([
      prismadb.supplier.findMany({
        where,
        select: {
          id: true,
          name: true,
          contact: true,
          email: true,
          gstNumber: true,
          address: true,
          ...supplierLocationsSelect,
        },
        orderBy: { name: "asc" },
        skip: offset,
        take: limit,
      }),
      prismadb.supplier.count({ where }),
    ]);

    const suppliers = rows.map((row) => ({
      id: row.id,
      name: row.name,
      contact: row.contact,
      email: row.email,
      gstNumber: row.gstNumber,
      address: row.address,
      locations: mapSupplierLocations(row.locations),
    }));

    return NextResponse.json({
      suppliers,
      total,
      hasMore: offset + suppliers.length < total,
      nextOffset: offset + suppliers.length,
    });
  } catch (error) {
    console.log("[MOBILE_OPS_SUPPLIERS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("Supplier", key);
    if (prior) {
      const existing = await prismadb.supplier.findUnique({
        where: { id: prior },
      });
      return NextResponse.json(
        { id: prior, supplier: existing, idempotentReplay: true },
        { status: 200 }
      );
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid supplier payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;

    const supplier = await prismadb.supplier.create({
      data: {
        name: v.name.trim(),
        contact: v.contact?.trim() || null,
        email: formatSupplierEmails(v.email),
        gstNumber: v.gstNumber?.trim() || null,
        address: v.address?.trim() || null,
        ...supplierLocationCreateInput(v.locationIds),
      },
      select: { id: true, name: true, ...supplierLocationsSelect },
    });

    await recordMobileAudit({
      userId,
      entityType: "Supplier",
      entityId: supplier.id,
      action: "CREATE",
      metadata: { idempotencyKey: key ?? undefined, name: supplier.name },
    });

    return NextResponse.json(
      {
        id: supplier.id,
        name: supplier.name,
        locations: mapSupplierLocations(supplier.locations),
      },
      { status: 201 }
    );
  } catch (error) {
    console.log("[MOBILE_OPS_SUPPLIERS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
