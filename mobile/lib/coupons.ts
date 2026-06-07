import { API_BASE_URL } from "@/constants/api";
import { mobileAppVariantHeaders } from "@/lib/app-variant";

export interface CouponOffer {
  id: string;
  name: string;
  description: string | null;
  code: string;
  discountText: string;
  minBookingAmount: number | null;
  startsAt: string | null;
  endsAt: string | null;
}

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  code: string;
  campaignName: string | null;
  discountAmount: number;
  taxableAmountAfterDiscount: number;
  approvalRequired: boolean;
}

export async function listCouponOffers(): Promise<CouponOffer[]> {
  const res = await fetch(`${API_BASE_URL}/api/mobile/coupons`, {
    headers: mobileAppVariantHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.offers ?? [];
}

export async function validateMobileCoupon(input: {
  couponCode: string;
  bookingAmount?: number | null;
  locationId?: string | null;
  tourPackageId?: string | null;
  tourPackageQueryId?: string | null;
  tourCategory?: string | null;
  customerMobile?: string | null;
  travelDate?: string | null;
  numAdults?: number | string | null;
}): Promise<CouponValidationResult> {
  const res = await fetch(`${API_BASE_URL}/api/mobile/coupons/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...mobileAppVariantHeaders(),
    },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return {
      valid: false,
      message: data?.message || "Could not validate coupon.",
      code: input.couponCode,
      campaignName: null,
      discountAmount: 0,
      taxableAmountAfterDiscount: input.bookingAmount ?? 0,
      approvalRequired: false,
    };
  }
  return data;
}
