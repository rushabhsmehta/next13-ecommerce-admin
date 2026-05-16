import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
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

const updateSchema = z.object({
  name: z.string().min(1).max(200),
  contact: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  associatePartnerId: z.string().optional().nullable(),
  birthdate: z.string().optional().nullable(),
  marriageAnniversary: z.string().optional().nullable(),
});

/**
 * Mobile customer detail: returns customer profile + most recent inquiries
 * + a lightweight financial snapshot (open sales count + outstanding amount).
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const customer = await prismadb.customer.findUnique({
      where: { id: params.id },
      include: {
        associatePartner: { select: { id: true, name: true, mobileNumber: true } },
      },
    });
    if (!customer) return new NextResponse("Not found", { status: 404 });

    const [inquiries, sales] = await Promise.all([
      prismadb.inquiry.findMany({
        where: { customerMobileNumber: customer.contact ?? undefined },
        select: {
          id: true,
          status: true,
          numAdults: true,
          numChildren5to11: true,
          journeyDate: true,
          createdAt: true,
          location: { select: { id: true, label: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prismadb.saleDetail.findMany({
        where: { customerId: params.id },
        select: {
          id: true,
          invoiceNumber: true,
          salePrice: true,
          gstAmount: true,
          status: true,
          saleDate: true,
          receiptAllocations: { select: { allocatedAmount: true } },
        },
        orderBy: { saleDate: "desc" },
      }),
    ]);

    let outstanding = 0;
    for (const s of sales) {
      const billed = Number(s.salePrice ?? 0) + Number(s.gstAmount ?? 0);
      const paid = s.receiptAllocations.reduce(
        (acc, a) => acc + Number(a.allocatedAmount ?? 0),
        0
      );
      outstanding += Math.max(billed - paid, 0);
    }

    return NextResponse.json({
      customer,
      inquiries,
      sales: sales.slice(0, 10),
      summary: {
        salesCount: sales.length,
        outstanding,
      },
    });
  } catch (error) {
    console.log("[MOBILE_CUSTOMER_DETAIL]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    if (!params.id) {
      return new NextResponse("Customer ID is required", { status: 400 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
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
    let shouldUpdateContact = false;
    if (contact !== undefined) {
      shouldUpdateContact = true;
      if (typeof contact === "string" && contact.trim().length > 0) {
        const normalizedContact = normalizePhoneNumber(contact);
        if (!normalizedContact) {
          return new NextResponse("Invalid contact number", { status: 400 });
        }
        contactValue = normalizedContact.e164;
      } else {
        contactValue = null;
      }
    }

    const updateData: Prisma.CustomerUpdateInput = {
      name: normalizedName,
      email: normalizedEmail,
      birthdate: dateToUtc(birthdate),
      marriageAnniversary: dateToUtc(marriageAnniversary),
    };
    if (shouldUpdateContact) {
      updateData.contact = contactValue;
    }
    if (associatePartnerId !== undefined) {
      updateData.associatePartner = sanitizedPartnerId
        ? { connect: { id: sanitizedPartnerId } }
        : { disconnect: true };
    }

    const customer = await prismadb.customer.update({
      where: { id: params.id },
      data: updateData,
      include: {
        associatePartner: { select: { id: true, name: true } },
      },
    });

    await recordMobileAudit({
      userId,
      entityType: "Customer",
      entityId: customer.id,
      action: "UPDATE",
      metadata: { name: customer.name, contact: customer.contact },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.log("[MOBILE_CUSTOMER_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
