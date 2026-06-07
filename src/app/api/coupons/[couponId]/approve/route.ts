import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError, noStore } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

const schema = z.object({
  redemptionId: z.string().uuid(),
  approvalNotes: z.string().max(2000).optional().nullable(),
});

export async function POST(
  req: Request,
  props: { params: Promise<{ couponId: string }> }
) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 403, "AUTH");
    await requireOrgAdmin(userId);

    const params = await props.params;
    const body = schema.parse(await req.json());
    const redemption = await (prismadb as any).couponRedemption.findUnique({
      where: { id: body.redemptionId },
      select: { id: true, campaignId: true, status: true },
    });
    if (!redemption || redemption.campaignId !== params.couponId) {
      return jsonError("Redemption not found", 404, "NOT_FOUND");
    }
    if (!["APPROVAL_REQUIRED", "VALIDATED", "REQUESTED"].includes(redemption.status)) {
      return jsonError("Only pending coupon redemptions can be approved.", 409, "INVALID_STATUS");
    }

    const updated = await (prismadb as any).couponRedemption.update({
      where: { id: redemption.id },
      data: {
        status: "APPROVED",
        approvedByUserId: userId,
        approvalNotes: body.approvalNotes || null,
        approvedAt: new Date(),
        validationMessage: null,
      },
    });

    return noStore(NextResponse.json(updated));
  });
}
