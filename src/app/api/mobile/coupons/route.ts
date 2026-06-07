import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { COUPONS_ENABLED, parseEligibilityRules } from "@/lib/coupons";

export const dynamic = "force-dynamic";

function formatDiscount(campaign: any) {
  if (campaign.discountType === "PERCENT") {
    const cap = campaign.maxDiscountAmount
      ? ` up to ₹${Math.round(campaign.maxDiscountAmount).toLocaleString("en-IN")}`
      : "";
    return `${campaign.discountValue}% off${cap}`;
  }
  return `₹${Math.round(campaign.discountValue).toLocaleString("en-IN")} off`;
}

export async function GET() {
  try {
    if (!COUPONS_ENABLED) return NextResponse.json({ offers: [] });

    const now = new Date();
    const campaigns = await (prismadb as any).couponCampaign.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        codes: { some: { status: "ACTIVE" } },
      },
      include: {
        codes: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const offers = campaigns
      .map((campaign: any) => {
        const rules = parseEligibilityRules(campaign.eligibilityRules);
        if (rules.publicVisible === false) return null;
        const code = campaign.codes?.[0]?.code;
        if (!code) return null;
        return {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          code,
          discountText: formatDiscount(campaign),
          minBookingAmount: campaign.minBookingAmount,
          startsAt: campaign.startsAt,
          endsAt: campaign.endsAt,
          eligibilityRules: rules,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ offers });
  } catch (error) {
    console.log("[MOBILE_COUPONS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
