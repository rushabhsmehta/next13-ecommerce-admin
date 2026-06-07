import prismadb from "@/lib/prismadb";

export const COUPONS_ENABLED = process.env.COUPONS_ENABLED !== "0";

export type CouponDiscountType = "PERCENT" | "FIXED";
export type CouponRedemptionStatus =
  | "REQUESTED"
  | "VALIDATED"
  | "APPROVAL_REQUIRED"
  | "APPROVED"
  | "APPLIED"
  | "REJECTED"
  | "VOIDED";

type PrismaLike = typeof prismadb | any;

export type CouponEligibilityRules = {
  locationIds?: string[];
  tourPackageIds?: string[];
  tourCategories?: string[];
  customerMobiles?: string[];
  publicVisible?: boolean;
  minAdults?: number;
  travelStartAfter?: string;
  travelStartBefore?: string;
  whatsappShareEnabled?: boolean;
  referralEnabled?: boolean;
  budgetCapAmount?: number;
};

export type CouponValidationContext = {
  bookingAmount?: number | null;
  locationId?: string | null;
  tourPackageId?: string | null;
  tourCategory?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerMobile?: string | null;
  travelAppUserId?: string | null;
  inquiryId?: string | null;
  tourPackageQueryId?: string | null;
  travelDate?: Date | string | null;
  numAdults?: number | string | null;
  excludeRedemptionId?: string | null;
};

export type CouponValidationResult = {
  valid: boolean;
  reason?: string;
  code?: any;
  campaign?: any;
  discountAmount: number;
  taxableAmountAfterDiscount: number;
  approvalRequired: boolean;
};

export class CouponError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status = 400, code = "COUPON_ERROR", details?: unknown) {
    super(message);
    this.name = "CouponError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function normalizeCouponCode(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const code = raw.trim().toUpperCase();
  if (!code) return "";
  if (!/^[A-Z0-9_-]{3,64}$/.test(code)) {
    throw new CouponError(
      "Coupon code can contain letters, numbers, hyphens, and underscores only.",
      422,
      "INVALID_CODE_FORMAT"
    );
  }
  return code;
}

export function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

export function parseEligibilityRules(value: unknown): CouponEligibilityRules {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    locationIds: asStringArray(source.locationIds),
    tourPackageIds: asStringArray(source.tourPackageIds),
    tourCategories: asStringArray(source.tourCategories),
    customerMobiles: asStringArray(source.customerMobiles),
    publicVisible: source.publicVisible === undefined ? true : Boolean(source.publicVisible),
    minAdults: toNumber(source.minAdults) ?? undefined,
    travelStartAfter:
      typeof source.travelStartAfter === "string" ? source.travelStartAfter : undefined,
    travelStartBefore:
      typeof source.travelStartBefore === "string" ? source.travelStartBefore : undefined,
    whatsappShareEnabled: Boolean(source.whatsappShareEnabled),
    referralEnabled: Boolean(source.referralEnabled),
    budgetCapAmount: toNumber(source.budgetCapAmount) ?? undefined,
  };
}

function normalizeMobile(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "").slice(-10);
}

function hasListRestriction(items?: string[]) {
  return Array.isArray(items) && items.length > 0;
}

function listIncludes(items: string[] | undefined, value?: string | null) {
  if (!hasListRestriction(items)) return true;
  if (!value) return false;
  return items!.includes(value);
}

function categoryIncludes(items: string[] | undefined, value?: string | null) {
  if (!hasListRestriction(items)) return true;
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return items!.some((item) => item.trim().toLowerCase() === normalized);
}

function mobileIncludes(items: string[] | undefined, value?: string | null) {
  if (!hasListRestriction(items)) return true;
  const normalized = normalizeMobile(value);
  if (!normalized) return false;
  return items!.some((item) => normalizeMobile(item) === normalized);
}

function dateFrom(value?: Date | string | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isActiveCampaign(campaign: any, now = new Date()): string | null {
  if (!campaign) return "Coupon campaign not found.";
  if (campaign.status !== "ACTIVE") return "Coupon campaign is not active.";
  if (campaign.startsAt && new Date(campaign.startsAt) > now) {
    return "Coupon campaign has not started yet.";
  }
  if (campaign.endsAt && new Date(campaign.endsAt) < now) {
    return "Coupon campaign has expired.";
  }
  return null;
}

function isActiveCode(code: any): string | null {
  if (!code) return "Coupon code not found.";
  if (code.status !== "ACTIVE") return "Coupon code is not active.";
  if (
    code.maxRedemptions !== null &&
    code.maxRedemptions !== undefined &&
    Number(code.redeemedCount ?? 0) >= Number(code.maxRedemptions)
  ) {
    return "Coupon code has reached its redemption limit.";
  }
  return null;
}

export function calculateCouponDiscount(
  discountType: CouponDiscountType,
  discountValue: number,
  bookingAmount: number,
  maxDiscountAmount?: number | null
) {
  const base = Math.max(0, Number(bookingAmount) || 0);
  const raw =
    discountType === "PERCENT"
      ? (base * Math.max(0, Number(discountValue) || 0)) / 100
      : Math.max(0, Number(discountValue) || 0);
  const capped =
    maxDiscountAmount !== null && maxDiscountAmount !== undefined
      ? Math.min(raw, Math.max(0, Number(maxDiscountAmount) || 0))
      : raw;
  const discountAmount = roundMoney(Math.min(base, capped));
  return {
    discountAmount,
    taxableAmountAfterDiscount: roundMoney(Math.max(0, base - discountAmount)),
  };
}

async function countAppliedRedemptions(
  db: PrismaLike,
  where: Record<string, unknown>
) {
  return (db as any).couponRedemption.count({
    where: {
      ...where,
      status: "APPLIED",
    },
  });
}

export async function validateCouponEligibility(
  db: PrismaLike,
  opts: CouponValidationContext & {
    code?: string | null;
    couponCodeId?: string | null;
    couponCodeRow?: any;
  }
): Promise<CouponValidationResult> {
  if (!COUPONS_ENABLED) {
    return {
      valid: false,
      reason: "Coupons are disabled.",
      discountAmount: 0,
      taxableAmountAfterDiscount: roundMoney(opts.bookingAmount ?? 0),
      approvalRequired: false,
    };
  }

  let codeRow = opts.couponCodeRow;
  const normalizedCode = opts.code ? normalizeCouponCode(opts.code) : "";
  if (!codeRow && opts.couponCodeId) {
    codeRow = await (db as any).couponCode.findUnique({
      where: { id: opts.couponCodeId },
      include: { campaign: true },
    });
  }
  if (!codeRow && normalizedCode) {
    codeRow = await (db as any).couponCode.findUnique({
      where: { code: normalizedCode },
      include: { campaign: true },
    });
  }

  const codeError = isActiveCode(codeRow);
  const campaign = codeRow?.campaign;
  const campaignError = isActiveCampaign(campaign);
  const bookingAmount = Math.max(0, Number(opts.bookingAmount ?? 0) || 0);
  const emptyResult = {
    code: codeRow,
    campaign,
    discountAmount: 0,
    taxableAmountAfterDiscount: roundMoney(bookingAmount),
    approvalRequired: false,
  };

  if (codeError) return { ...emptyResult, valid: false, reason: codeError };
  if (campaignError) return { ...emptyResult, valid: false, reason: campaignError };

  if (
    campaign.minBookingAmount !== null &&
    campaign.minBookingAmount !== undefined &&
    opts.bookingAmount !== null &&
    opts.bookingAmount !== undefined &&
    bookingAmount < Number(campaign.minBookingAmount)
  ) {
    return {
      ...emptyResult,
      valid: false,
      reason: `Minimum booking amount is ${campaign.minBookingAmount}.`,
    };
  }

  const rules = parseEligibilityRules(campaign.eligibilityRules);
  if (!listIncludes(rules.locationIds, opts.locationId)) {
    return { ...emptyResult, valid: false, reason: "Coupon is not valid for this destination." };
  }
  if (!listIncludes(rules.tourPackageIds, opts.tourPackageId)) {
    return { ...emptyResult, valid: false, reason: "Coupon is not valid for this package." };
  }
  if (!categoryIncludes(rules.tourCategories, opts.tourCategory)) {
    return { ...emptyResult, valid: false, reason: "Coupon is not valid for this tour category." };
  }
  if (!mobileIncludes(rules.customerMobiles, opts.customerMobile)) {
    return { ...emptyResult, valid: false, reason: "Coupon is not valid for this customer." };
  }
  if (rules.minAdults !== undefined) {
    const adults = Number(opts.numAdults ?? 0);
    if (!Number.isFinite(adults) || adults < rules.minAdults) {
      return { ...emptyResult, valid: false, reason: "Coupon requires a larger group size." };
    }
  }

  const travelDate = dateFrom(opts.travelDate);
  if (rules.travelStartAfter && travelDate && travelDate < new Date(rules.travelStartAfter)) {
    return { ...emptyResult, valid: false, reason: "Coupon is not valid for this travel date." };
  }
  if (rules.travelStartBefore && travelDate && travelDate > new Date(rules.travelStartBefore)) {
    return { ...emptyResult, valid: false, reason: "Coupon is not valid for this travel date." };
  }

  if (campaign.totalRedemptionLimit !== null && campaign.totalRedemptionLimit !== undefined) {
    const applied = await countAppliedRedemptions(db, { campaignId: campaign.id });
    if (applied >= Number(campaign.totalRedemptionLimit)) {
      return { ...emptyResult, valid: false, reason: "Coupon campaign has reached its limit." };
    }
  }

  if (campaign.perCustomerLimit !== null && campaign.perCustomerLimit !== undefined) {
    const normalizedMobile = normalizeMobile(opts.customerMobile);
    const customerOr: Record<string, unknown>[] = [];
    if (opts.customerId) customerOr.push({ customerId: opts.customerId });
    if (normalizedMobile) {
      customerOr.push({ customerMobile: opts.customerMobile });
      customerOr.push({ customerMobile: normalizedMobile });
      customerOr.push({ customerMobile: `+91${normalizedMobile}` });
    }
    if (customerOr.length > 0) {
      const applied = await countAppliedRedemptions(db, {
        campaignId: campaign.id,
        OR: customerOr,
      });
      if (applied >= Number(campaign.perCustomerLimit)) {
        return { ...emptyResult, valid: false, reason: "Customer has already used this coupon." };
      }
    }
  }

  if (opts.inquiryId || opts.tourPackageQueryId) {
    const existing = await (db as any).couponRedemption.findFirst({
      where: {
        id: opts.excludeRedemptionId ? { not: opts.excludeRedemptionId } : undefined,
        status: { notIn: ["REJECTED", "VOIDED"] },
        OR: [
          ...(opts.inquiryId ? [{ inquiryId: opts.inquiryId }] : []),
          ...(opts.tourPackageQueryId
            ? [{ tourPackageQueryId: opts.tourPackageQueryId }]
            : []),
        ],
      },
      select: { id: true },
    });
    if (existing) {
      return { ...emptyResult, valid: false, reason: "A coupon is already attached to this booking." };
    }
  }

  const { discountAmount, taxableAmountAfterDiscount } = calculateCouponDiscount(
    campaign.discountType,
    Number(campaign.discountValue),
    bookingAmount,
    campaign.maxDiscountAmount
  );
  const budgetCap = rules.budgetCapAmount;
  if (budgetCap !== undefined) {
    const appliedDiscount = await (db as any).couponRedemption.aggregate({
      where: { campaignId: campaign.id, status: "APPLIED" },
      _sum: { discountAmount: true },
    });
    if (Number(appliedDiscount?._sum?.discountAmount ?? 0) + discountAmount > budgetCap) {
      return { ...emptyResult, valid: false, reason: "Coupon campaign budget is exhausted." };
    }
  }

  const approvalRequired =
    Boolean(campaign.requiresApproval) ||
    (campaign.approvalRequiredAboveAmount !== null &&
      campaign.approvalRequiredAboveAmount !== undefined &&
      discountAmount >= Number(campaign.approvalRequiredAboveAmount));

  return {
    valid: true,
    code: codeRow,
    campaign,
    discountAmount,
    taxableAmountAfterDiscount,
    approvalRequired,
  };
}

function statusFromValidation(
  result: CouponValidationResult,
  existingStatus?: CouponRedemptionStatus | null
): CouponRedemptionStatus {
  if (!result.valid) return "REJECTED";
  if (result.approvalRequired && existingStatus !== "APPROVED") {
    return "APPROVAL_REQUIRED";
  }
  return "VALIDATED";
}

export async function createRequestedCouponRedemption(
  opts: CouponValidationContext & {
    couponCode?: string | null;
    db?: PrismaLike;
  }
) {
  const db = opts.db ?? prismadb;
  const code = normalizeCouponCode(opts.couponCode);
  if (!COUPONS_ENABLED || !code) return null;

  const codeRow = await (db as any).couponCode.findUnique({
    where: { code },
    include: { campaign: true },
  });
  if (!codeRow) return null;

  const result = await validateCouponEligibility(db, {
    ...opts,
    code,
    couponCodeRow: codeRow,
  });
  const status = result.valid ? "REQUESTED" : "REJECTED";

  return (db as any).couponRedemption.create({
    data: {
      campaignId: codeRow.campaignId,
      couponCodeId: codeRow.id,
      code,
      status,
      inquiryId: opts.inquiryId || null,
      tourPackageQueryId: opts.tourPackageQueryId || null,
      customerId: opts.customerId || null,
      customerName: opts.customerName || null,
      customerMobile: opts.customerMobile || null,
      travelAppUserId: opts.travelAppUserId || null,
      originalBookingAmount: opts.bookingAmount ?? null,
      discountAmount: result.discountAmount || null,
      taxableAmountAfterDiscount: result.taxableAmountAfterDiscount || null,
      validationMessage: result.reason || null,
      validatedAt: result.valid ? new Date() : null,
      rejectedAt: result.valid ? null : new Date(),
    },
  });
}

export async function carryForwardInquiryCouponToTourQuery(
  opts: CouponValidationContext & {
    inquiryId: string;
    tourPackageQueryId: string;
    db?: PrismaLike;
  }
) {
  const db = opts.db ?? prismadb;
  if (!COUPONS_ENABLED) return null;

  const existingForQuery = await (db as any).couponRedemption.findFirst({
    where: {
      tourPackageQueryId: opts.tourPackageQueryId,
      status: { notIn: ["REJECTED", "VOIDED"] },
    },
  });
  if (existingForQuery) return existingForQuery;

  const redemption = await (db as any).couponRedemption.findFirst({
    where: {
      inquiryId: opts.inquiryId,
      status: { notIn: ["APPLIED", "VOIDED"] },
    },
    orderBy: { createdAt: "desc" },
    include: { couponCode: { include: { campaign: true } } },
  });
  if (!redemption) return null;

  const result = await validateCouponEligibility(db, {
    ...opts,
    code: redemption.code,
    couponCodeRow: redemption.couponCode,
    excludeRedemptionId: redemption.id,
  });

  return (db as any).couponRedemption.update({
    where: { id: redemption.id },
    data: {
      tourPackageQueryId: opts.tourPackageQueryId,
      originalBookingAmount: opts.bookingAmount ?? redemption.originalBookingAmount,
      discountAmount: result.discountAmount || null,
      taxableAmountAfterDiscount: result.taxableAmountAfterDiscount || null,
      status: statusFromValidation(result, redemption.status),
      validationMessage: result.reason || null,
      validatedAt: result.valid ? new Date() : redemption.validatedAt,
      rejectedAt: result.valid ? null : new Date(),
    },
  });
}

export async function prepareCouponApplication(
  db: PrismaLike,
  opts: CouponValidationContext & {
    couponCode?: string | null;
    couponRedemptionId?: string | null;
    appliedByUserId?: string | null;
  }
) {
  const code = opts.couponCode ? normalizeCouponCode(opts.couponCode) : "";
  if (!COUPONS_ENABLED || (!code && !opts.couponRedemptionId)) return null;

  let redemption: any = null;
  if (opts.couponRedemptionId) {
    redemption = await (db as any).couponRedemption.findUnique({
      where: { id: opts.couponRedemptionId },
      include: { couponCode: { include: { campaign: true } } },
    });
    if (!redemption) {
      throw new CouponError("Coupon redemption not found.", 404, "REDEMPTION_NOT_FOUND");
    }
  } else if (opts.tourPackageQueryId && code) {
    redemption = await (db as any).couponRedemption.findFirst({
      where: {
        tourPackageQueryId: opts.tourPackageQueryId,
        code,
        status: { notIn: ["APPLIED", "VOIDED"] },
      },
      orderBy: { createdAt: "desc" },
      include: { couponCode: { include: { campaign: true } } },
    });
  }

  let codeRow = redemption?.couponCode;
  if (!codeRow && code) {
    codeRow = await (db as any).couponCode.findUnique({
      where: { code },
      include: { campaign: true },
    });
  }
  if (!codeRow) {
    throw new CouponError("Coupon code not found.", 404, "CODE_NOT_FOUND");
  }

  if (!redemption) {
    redemption = await (db as any).couponRedemption.create({
      data: {
        campaignId: codeRow.campaignId,
        couponCodeId: codeRow.id,
        code: codeRow.code,
        status: "REQUESTED",
        inquiryId: opts.inquiryId || null,
        tourPackageQueryId: opts.tourPackageQueryId || null,
        customerId: opts.customerId || null,
        customerName: opts.customerName || null,
        customerMobile: opts.customerMobile || null,
        travelAppUserId: opts.travelAppUserId || null,
      },
    });
  }

  if (redemption.status === "APPLIED") {
    throw new CouponError("Coupon has already been applied.", 409, "ALREADY_APPLIED");
  }
  if (redemption.status === "VOIDED") {
    throw new CouponError("Coupon redemption is voided.", 409, "VOIDED");
  }

  const result = await validateCouponEligibility(db, {
    ...opts,
    code: codeRow.code,
    couponCodeRow: codeRow,
    excludeRedemptionId: redemption.id,
  });

  if (!result.valid) {
    await (db as any).couponRedemption.update({
      where: { id: redemption.id },
      data: {
        status: "REJECTED",
        validationMessage: result.reason || null,
        rejectedAt: new Date(),
      },
    });
    throw new CouponError(result.reason || "Coupon is not valid.", 422, "NOT_ELIGIBLE");
  }

  const nextStatus = statusFromValidation(result, redemption.status);
  await (db as any).couponRedemption.update({
    where: { id: redemption.id },
    data: {
      status: nextStatus,
      inquiryId: opts.inquiryId || redemption.inquiryId || null,
      tourPackageQueryId: opts.tourPackageQueryId || redemption.tourPackageQueryId || null,
      customerId: opts.customerId || redemption.customerId || null,
      customerName: opts.customerName || redemption.customerName || null,
      customerMobile: opts.customerMobile || redemption.customerMobile || null,
      travelAppUserId: opts.travelAppUserId || redemption.travelAppUserId || null,
      originalBookingAmount: opts.bookingAmount ?? redemption.originalBookingAmount,
      discountAmount: result.discountAmount,
      taxableAmountAfterDiscount: result.taxableAmountAfterDiscount,
      validationMessage: result.approvalRequired ? "Approval required before application." : null,
      validatedAt: new Date(),
      rejectedAt: null,
    },
  });

  if (nextStatus === "APPROVAL_REQUIRED") {
    throw new CouponError("Coupon requires approval before it can be applied.", 409, "APPROVAL_REQUIRED", {
      redemptionId: redemption.id,
      discountAmount: result.discountAmount,
    });
  }

  return {
    redemptionId: redemption.id,
    couponCodeId: codeRow.id,
    code: codeRow.code,
    campaignId: codeRow.campaignId,
    discountAmount: result.discountAmount,
    taxableAmountAfterDiscount: result.taxableAmountAfterDiscount,
    originalBookingAmount: roundMoney(opts.bookingAmount ?? 0),
  };
}

export async function markCouponApplied(
  db: PrismaLike,
  opts: {
    redemptionId: string;
    couponCodeId: string;
    originalBookingAmount: number;
    discountAmount: number;
    taxableAmountAfterDiscount: number;
    gstAfterDiscount?: number | null;
    appliedByUserId?: string | null;
  }
) {
  await (db as any).couponRedemption.update({
    where: { id: opts.redemptionId },
    data: {
      status: "APPLIED",
      originalBookingAmount: roundMoney(opts.originalBookingAmount),
      discountAmount: roundMoney(opts.discountAmount),
      taxableAmountAfterDiscount: roundMoney(opts.taxableAmountAfterDiscount),
      gstAfterDiscount:
        opts.gstAfterDiscount !== null && opts.gstAfterDiscount !== undefined
          ? roundMoney(opts.gstAfterDiscount)
          : null,
      appliedByUserId: opts.appliedByUserId || null,
      appliedAt: new Date(),
      validationMessage: null,
    },
  });
  await (db as any).couponCode.update({
    where: { id: opts.couponCodeId },
    data: { redeemedCount: { increment: 1 } },
  });
}

export function calculateDiscountedTaxAmounts(input: {
  originalSalePrice: number;
  taxableAmountAfterDiscount: number;
  gstPercentage?: number | null;
  isGst?: boolean | null;
  preferIgst?: boolean;
}) {
  const gstPercentage = Number(input.gstPercentage ?? 0);
  const isGst = input.isGst !== false && gstPercentage > 0;
  const gstAmount = isGst
    ? roundMoney((input.taxableAmountAfterDiscount * gstPercentage) / 100)
    : 0;
  if (!isGst) {
    return { gstAmount: null, cgstAmount: null, sgstAmount: null, igstAmount: null };
  }
  if (input.preferIgst) {
    return { gstAmount, cgstAmount: null, sgstAmount: null, igstAmount: gstAmount };
  }
  const cgstAmount = roundMoney(gstAmount / 2);
  return {
    gstAmount,
    cgstAmount,
    sgstAmount: roundMoney(gstAmount - cgstAmount),
    igstAmount: null,
  };
}
