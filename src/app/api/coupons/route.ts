import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError, noStore } from "@/lib/api-response";
import { requireFinanceOrAdmin, requireOrgAdmin } from "@/lib/authz";
import { COUPONS_ENABLED, normalizeCouponCode, parseEligibilityRules } from "@/lib/coupons";

export const dynamic = "force-dynamic";

const optionalDate = z
  .union([z.string(), z.literal(""), z.null()])
  .optional();

const campaignSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().max(4000).optional().nullable(),
    status: z
      .enum(["DRAFT", "ACTIVE", "PAUSED", "EXPIRED", "ARCHIVED"])
      .default("ACTIVE"),
    discountType: z.enum(["PERCENT", "FIXED"]),
    discountValue: z.coerce.number().positive(),
    maxDiscountAmount: z.coerce.number().min(0).optional().nullable(),
    minBookingAmount: z.coerce.number().min(0).optional().nullable(),
    startsAt: optionalDate,
    endsAt: optionalDate,
    totalRedemptionLimit: z.coerce.number().int().positive().optional().nullable(),
    perCustomerLimit: z.coerce.number().int().positive().optional().nullable(),
    requiresApproval: z.boolean().default(false),
    approvalRequiredAboveAmount: z.coerce.number().min(0).optional().nullable(),
    eligibilityRules: z.record(z.unknown()).optional().default({ publicVisible: true }),
    code: z.string().optional().nullable(),
    codes: z.array(z.string()).optional().default([]),
    maxRedemptionsPerCode: z.coerce.number().int().positive().optional().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.discountType === "PERCENT" && v.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountValue"],
        message: "Percent coupons cannot exceed 100%.",
      });
    }
  });

function dateOrNull(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function cleanCodeList(code?: string | null, codes?: string[]) {
  const all = [code, ...(codes ?? [])]
    .map((item) => normalizeCouponCode(item))
    .filter(Boolean);
  return Array.from(new Set(all));
}

export async function GET(req: Request) {
  return handleApi(async () => {
    if (!COUPONS_ENABLED) return noStore(NextResponse.json({ campaigns: [] }));

    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 403, "AUTH");
    await requireFinanceOrAdmin(userId);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const q = searchParams.get("q")?.trim();

    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { codes: { some: { code: { contains: q.toUpperCase() } } } },
      ];
    }

    const campaigns = await (prismadb as any).couponCampaign.findMany({
      where,
      include: {
        codes: { orderBy: { createdAt: "asc" } },
        _count: { select: { redemptions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = await Promise.all(
      campaigns.map(async (campaign: any) => {
        const [applied, discountAgg, revenueAgg] = await Promise.all([
          (prismadb as any).couponRedemption.count({
            where: { campaignId: campaign.id, status: "APPLIED" },
          }),
          (prismadb as any).couponRedemption.aggregate({
            where: { campaignId: campaign.id, status: "APPLIED" },
            _sum: { discountAmount: true },
          }),
          (prismadb as any).couponRedemption.aggregate({
            where: { campaignId: campaign.id, status: "APPLIED" },
            _sum: { taxableAmountAfterDiscount: true },
          }),
        ]);
        return {
          ...campaign,
          eligibilityRules: parseEligibilityRules(campaign.eligibilityRules),
          stats: {
            requested: campaign._count.redemptions,
            applied,
            discountCost: discountAgg._sum.discountAmount ?? 0,
            revenueInfluenced: revenueAgg._sum.taxableAmountAfterDiscount ?? 0,
          },
        };
      })
    );

    return noStore(NextResponse.json({ campaigns: rows }));
  });
}

export async function POST(req: Request) {
  return handleApi(async () => {
    if (!COUPONS_ENABLED) return jsonError("Coupons are disabled.", 404, "DISABLED");

    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 403, "AUTH");
    await requireOrgAdmin(userId);

    const parsed = campaignSchema.parse(await req.json());
    const codes = cleanCodeList(parsed.code, parsed.codes);
    if (codes.length === 0) {
      return jsonError("At least one coupon code is required.", 422, "VALIDATION");
    }

    const created = await (prismadb as any).couponCampaign.create({
      data: {
        name: parsed.name,
        description: parsed.description || null,
        status: parsed.status,
        discountType: parsed.discountType,
        discountValue: parsed.discountValue,
        maxDiscountAmount: parsed.maxDiscountAmount ?? null,
        minBookingAmount: parsed.minBookingAmount ?? null,
        startsAt: dateOrNull(parsed.startsAt),
        endsAt: dateOrNull(parsed.endsAt),
        totalRedemptionLimit: parsed.totalRedemptionLimit ?? null,
        perCustomerLimit: parsed.perCustomerLimit ?? null,
        requiresApproval: parsed.requiresApproval,
        approvalRequiredAboveAmount: parsed.approvalRequiredAboveAmount ?? null,
        eligibilityRules: parsed.eligibilityRules,
        createdByUserId: userId,
        updatedByUserId: userId,
        codes: {
          create: codes.map((code) => ({
            code,
            maxRedemptions: parsed.maxRedemptionsPerCode ?? null,
          })),
        },
      },
      include: { codes: true },
    });

    return noStore(NextResponse.json(created, { status: 201 }));
  });
}
