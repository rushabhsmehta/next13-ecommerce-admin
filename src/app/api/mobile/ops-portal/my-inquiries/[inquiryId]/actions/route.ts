import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  findPriorIdempotentEntityId,
  readIdempotencyKey,
} from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import { requireMobileOpsPortalStaff } from "@/app/api/mobile/lib/ops-portal-staff";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  actionType: z.string().min(1, "Action type is required"),
  remarks: z.string().min(1, "Remarks are required"),
  actionDate: z.string().optional(),
});

export async function POST(
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
    const prior = await findPriorIdempotentEntityId("InquiryAction", key);
    if (prior) {
      const action = await prismadb.inquiryAction.findUnique({ where: { id: prior } });
      return NextResponse.json({ action, idempotentReplay: true });
    }

    const parsed = actionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid inquiry action", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const inquiry = await prismadb.inquiry.findFirst({
      where: {
        id: params.inquiryId,
        assignedToStaffId: staffResult.staff.id,
      },
      select: { id: true },
    });
    if (!inquiry) {
      return NextResponse.json(
        { error: "Inquiry not found or not assigned to you" },
        { status: 404 }
      );
    }

    const action = await prismadb.inquiryAction.create({
      data: {
        inquiryId: params.inquiryId,
        actionType: parsed.data.actionType.trim(),
        remarks: parsed.data.remarks.trim(),
        actionDate: parsed.data.actionDate
          ? dateToUtc(parsed.data.actionDate) ?? new Date()
          : new Date(),
      },
    });

    await recordMobileAudit({
      userId,
      entityType: "InquiryAction",
      entityId: action.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        source: "ops-portal",
        inquiryId: params.inquiryId,
        staffId: staffResult.staff.id,
      },
    });

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_OPS_PORTAL_INQUIRY_ACTION_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
