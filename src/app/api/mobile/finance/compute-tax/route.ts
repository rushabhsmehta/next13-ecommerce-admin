import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";
import {
  computeBaseAmount,
  calcTdsAmount,
  pickApplicableRate,
  getFinancialYear,
  getQuarter,
} from "@/lib/tds";

export const dynamic = "force-dynamic";

const schema = z.object({
  baseAmount: z.number().nonnegative(),
  gstPercentage: z.number().min(0).max(100).optional().default(0),
  /** true = inter-state (IGST); false = intra-state (CGST+SGST split) */
  interState: z.boolean().optional().default(false),
  tds: z
    .object({
      tdsType: z.enum(["INCOME_TAX", "GST"]),
      tdsMasterId: z.string().uuid().optional().nullable(),
      overrideRate: z.number().min(0).max(100).optional().nullable(),
      supplierId: z.string().uuid().optional().nullable(),
      onDate: z.string().optional().nullable(),
    })
    .optional(),
});

/**
 * Authoritative GST + TDS computation that REUSES the exact production
 * helpers in src/lib/tds.ts (computeBaseAmount / pickApplicableRate /
 * calcTdsAmount / getFinancialYear / getQuarter). No tax math is
 * reimplemented here, so mobile cannot diverge from the web. Read-only
 * (finance.read) — pure calculation, persists nothing.
 */
export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const [membership, ia] = await Promise.all([
      prismadb.organizationMember.findFirst({
        where: { userId, isActive: true },
        select: { role: true },
      }),
      resolveInquiryAccessContext(userId),
    ]);
    if (
      !buildMobileAdminProfile(membership?.role ?? null, ia.isAssociate)
        .permissions.includes("finance.read")
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;

    const gstAmount = +(
      (v.baseAmount * (v.gstPercentage || 0)) /
      100
    ).toFixed(2);
    const cgst = v.interState ? 0 : +(gstAmount / 2).toFixed(2);
    const sgst = v.interState ? 0 : +(gstAmount - cgst).toFixed(2);
    const igst = v.interState ? gstAmount : 0;
    const total = +(v.baseAmount + gstAmount).toFixed(2);

    let tdsResult:
      | {
          tdsType: string;
          base: number;
          rate: number | null;
          tdsAmount: number;
          financialYear: string;
          quarter: string;
        }
      | null = null;

    if (v.tds) {
      const onDate = v.tds.onDate ? new Date(v.tds.onDate) : new Date();
      const base = computeBaseAmount(total, gstAmount, v.tds.tdsType);

      let master: {
        rateWithPan: number | null;
        rateWithoutPan: number | null;
        rateIndividual: number | null;
        rateCompany: number | null;
      } | null = null;
      if (v.tds.tdsMasterId) {
        const m = await prismadb.tDSMaster.findUnique({
          where: { id: v.tds.tdsMasterId },
          select: {
            rateWithPan: true,
            rateWithoutPan: true,
            rateIndividual: true,
            rateCompany: true,
          },
        });
        if (m) master = m;
      }

      let supplierHasPan = false;
      if (v.tds.supplierId) {
        const s = await prismadb.supplier.findUnique({
          where: { id: v.tds.supplierId },
          select: { panNumber: true },
        });
        supplierHasPan = !!s?.panNumber;
      }

      const rate = pickApplicableRate({
        overrideRate: v.tds.overrideRate ?? null,
        supplierLowerRate: null,
        supplierLowerValidFrom: null,
        supplierLowerValidTo: null,
        tdsMaster: master,
        supplierHasPan,
        onDate,
      });
      tdsResult = {
        tdsType: v.tds.tdsType,
        base,
        rate,
        tdsAmount: rate != null ? calcTdsAmount(base, rate) : 0,
        financialYear: getFinancialYear(onDate),
        quarter: getQuarter(onDate),
      };
    }

    return NextResponse.json({
      baseAmount: v.baseAmount,
      gstPercentage: v.gstPercentage ?? 0,
      gstAmount,
      cgst,
      sgst,
      igst,
      total,
      tds: tdsResult,
    });
  } catch (error) {
    console.log("[MOBILE_FINANCE_COMPUTE_TAX]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
