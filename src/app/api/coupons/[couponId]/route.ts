import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError, noStore } from "@/lib/api-response";
import { requireFinanceOrAdmin, requireOrgAdmin } from "@/lib/authz";
import { normalizeCouponCode, parseEligibilityRules } from "@/lib/coupons";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().max(4000).nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "EXPIRED", "ARCHIVED"]).optional(),
  discountType: z.enum(["PERCENT", "FIXED"]).optional(),
  discountValue: z.coerce.number().positive().optional(),
  maxDiscountAmount: z.coerce.number().min(0).nullable().optional(),
  minBookingAmount: z.coerce.number().min(0).nullable().optional(),
  startsAt: z.union([z.string(), z.literal(""), z.null()]).optional(),
  endsAt: z.union([z.string(), z.literal(""), z.null()]).optional(),
  totalRedemptionLimit: z.coerce.number().int().positive().nullable().optional(),
  perCustomerLimit: z.coerce.number().int().positive().nullable().optional(),
  requiresApproval: z.boolean().optional(),
  approvalRequiredAboveAmount: z.coerce.number().min(0).nullable().optional(),
  eligibilityRules: z.record(z.unknown()).optional(),
  codesToAdd: z.array(z.string()).optional().default([]),
});

function dateOrNull(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(
  _req: Request,
  props: { params: Promise<{ couponId: string }> }
) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 403, "AUTH");
    await requireFinanceOrAdmin(userId);

    const params = await props.params;
    const campaign = await (prismadb as any).couponCampaign.findUnique({
      where: { id: params.couponId },
      include: {
        codes: { orderBy: { createdAt: "asc" } },
        redemptions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            inquiry: { select: { id: true, customerName: true } },
            tourPackageQuery: {
              select: { id: true, tourPackageQueryName: true, tourPackageQueryNumber: true },
            },
            saleDetail: { select: { id: true, invoiceNumber: true } },
          },
        },
      },
    });
    if (!campaign) return jsonError("Not found", 404, "NOT_FOUND");

    return noStore(
      NextResponse.json({
        ...campaign,
        eligibilityRules: parseEligibilityRules(campaign.eligibilityRules),
      })
    );
  });
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ couponId: string }> }
) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 403, "AUTH");
    await requireOrgAdmin(userId);

    const params = await props.params;
    const parsed = patchSchema.parse(await req.json());
    const existing = await (prismadb as any).couponCampaign.findUnique({
      where: { id: params.couponId },
      select: { id: true },
    });
    if (!existing) return jsonError("Not found", 404, "NOT_FOUND");

    const data: Record<string, unknown> = { updatedByUserId: userId };
    for (const key of [
      "name",
      "description",
      "status",
      "discountType",
      "discountValue",
      "maxDiscountAmount",
      "minBookingAmount",
      "totalRedemptionLimit",
      "perCustomerLimit",
      "requiresApproval",
      "approvalRequiredAboveAmount",
      "eligibilityRules",
    ] as const) {
      if (parsed[key] !== undefined) data[key] = parsed[key];
    }
    if (parsed.startsAt !== undefined) data.startsAt = dateOrNull(parsed.startsAt);
    if (parsed.endsAt !== undefined) data.endsAt = dateOrNull(parsed.endsAt);

    const codesToAdd = Array.from(
      new Set(parsed.codesToAdd.map((code) => normalizeCouponCode(code)).filter(Boolean))
    );

    const updated = await (prismadb as any).couponCampaign.update({
      where: { id: params.couponId },
      data: {
        ...data,
        ...(codesToAdd.length
          ? {
              codes: {
                create: codesToAdd.map((code) => ({ code })),
              },
            }
          : {}),
      },
      include: { codes: { orderBy: { createdAt: "asc" } } },
    });

    return noStore(NextResponse.json(updated));
  });
}
