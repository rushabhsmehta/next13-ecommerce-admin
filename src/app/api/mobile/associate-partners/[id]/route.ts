import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).max(200),
  mobileNumber: z.string().min(1).max(40),
  email: z.string().email().optional().nullable().or(z.literal("")),
  gmail: z.string().email().optional().nullable().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const access = await resolveInquiryAccessContext(userId);
    if (!access.isAdminLike) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (!params.id) return new NextResponse("Partner ID is required", { status: 400 });

    const partner = await prismadb.associatePartner.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        gmail: true,
        mobileNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!partner) return new NextResponse("Not found", { status: 404 });

    const [inquiryCount, recentInquiries] = await Promise.all([
      prismadb.inquiry.count({ where: { associatePartnerId: params.id } }),
      prismadb.inquiry.findMany({
        where: { associatePartnerId: params.id },
        select: {
          id: true,
          customerName: true,
          status: true,
          journeyDate: true,
          createdAt: true,
          location: { select: { id: true, label: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      partner,
      summary: { inquiryCount },
      recentInquiries,
    });
  } catch (error) {
    console.log("[MOBILE_ASSOCIATE_PARTNER_GET]", error);
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

    const access = await resolveInquiryAccessContext(userId);
    if (!access.isAdminLike) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (!params.id) return new NextResponse("Partner ID is required", { status: 400 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid partner payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { name, mobileNumber, email, gmail, isActive } = parsed.data;
    const partner = await prismadb.associatePartner.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email && email.trim() ? email.trim() : null,
        gmail: gmail && gmail.trim() ? gmail.trim() : null,
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
    });

    await recordMobileAudit({
      userId,
      entityType: "AssociatePartner",
      entityId: partner.id,
      action: "UPDATE",
      metadata: { name: partner.name, isActive: partner.isActive },
    });

    return NextResponse.json(partner);
  } catch (error) {
    console.log("[MOBILE_ASSOCIATE_PARTNER_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const access = await resolveInquiryAccessContext(userId);
    if (!access.isAdminLike) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (!params.id) return new NextResponse("Partner ID is required", { status: 400 });

    const linkedCount = await prismadb.inquiry.count({
      where: { associatePartnerId: params.id },
    });
    if (linkedCount > 0) {
      const partner = await prismadb.associatePartner.update({
        where: { id: params.id },
        data: { isActive: false },
      });
      await recordMobileAudit({
        userId,
        entityType: "AssociatePartner",
        entityId: partner.id,
        action: "UPDATE",
        metadata: { softDelete: true, reason: "linked inquiries", linkedCount },
      });
      return NextResponse.json({ deactivated: true, partner });
    }

    const partner = await prismadb.associatePartner.delete({
      where: { id: params.id },
    });
    await recordMobileAudit({
      userId,
      entityType: "AssociatePartner",
      entityId: partner.id,
      action: "DELETE",
      metadata: { name: partner.name },
    });
    return NextResponse.json({ deleted: true, partner });
  } catch (error) {
    console.log("[MOBILE_ASSOCIATE_PARTNER_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
