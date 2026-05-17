import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { readIdempotencyKey } from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import {
  formatOpsInquiry,
  opsInquiryInclude,
  requireMobileOpsPortalStaff,
} from "@/app/api/mobile/lib/ops-portal-staff";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.string().min(1).optional(),
  nextFollowUpDate: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
});

export async function GET(
  req: Request,
  props: { params: Promise<{ inquiryId: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const staffResult = await requireMobileOpsPortalStaff(userId);
    if (!staffResult.ok) return staffResult.response;

    const inquiry = await prismadb.inquiry.findFirst({
      where: {
        id: params.inquiryId,
        assignedToStaffId: staffResult.staff.id,
      },
      include: opsInquiryInclude,
    });
    if (!inquiry) {
      return NextResponse.json(
        { error: "Inquiry not found or not assigned to you" },
        { status: 404 }
      );
    }
    return NextResponse.json(formatOpsInquiry(inquiry));
  } catch (error) {
    console.log("[MOBILE_OPS_PORTAL_INQUIRY_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ inquiryId: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const staffResult = await requireMobileOpsPortalStaff(userId);
    if (!staffResult.ok) return staffResult.response;
    const key = readIdempotencyKey(req);

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid inquiry update", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const existing = await prismadb.inquiry.findFirst({
      where: {
        id: params.inquiryId,
        assignedToStaffId: staffResult.staff.id,
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Inquiry not found or not assigned to you" },
        { status: 404 }
      );
    }

    const nextFollowUp =
      parsed.data.nextFollowUpDate === undefined
        ? undefined
        : parsed.data.nextFollowUpDate
          ? dateToUtc(parsed.data.nextFollowUpDate)
          : null;

    const inquiry = await prismadb.inquiry.update({
      where: { id: params.inquiryId },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.remarks !== undefined ? { remarks: parsed.data.remarks } : {}),
        ...(nextFollowUp !== undefined ? { nextFollowUpDate: nextFollowUp } : {}),
      },
      include: opsInquiryInclude,
    });

    await recordMobileAudit({
      userId,
      entityType: "Inquiry",
      entityId: inquiry.id,
      action: "UPDATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        source: "ops-portal",
        staffId: staffResult.staff.id,
      },
    });

    return NextResponse.json(formatOpsInquiry(inquiry));
  } catch (error) {
    console.log("[MOBILE_OPS_PORTAL_INQUIRY_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
