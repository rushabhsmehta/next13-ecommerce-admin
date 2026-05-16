import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";

export type MobileSalesTripsAccess = {
  userId: string;
  associatePartnerId: string | null;
  isAssociate: boolean;
};

/**
 * `/api/mobile/**` is excluded from `assertCrmApiAccessForRequest` path RBAC, so
 * each mobile handler must enforce module permissions explicitly.
 */
export async function requireSalesTripsRead(
  userId: string
): Promise<
  { ok: true; access: MobileSalesTripsAccess } | { ok: false; response: NextResponse }
> {
  const [membership, inquiryAccess] = await Promise.all([
    prismadb.organizationMember.findFirst({
      where: { userId, isActive: true },
      select: { role: true },
    }),
    resolveInquiryAccessContext(userId),
  ]);
  const profile = buildMobileAdminProfile(
    membership?.role ?? null,
    inquiryAccess.isAssociate
  );
  if (!profile.permissions.includes("salesTrips.read")) {
    return { ok: false, response: new NextResponse("Forbidden", { status: 403 }) };
  }
  if (inquiryAccess.isAssociate && !inquiryAccess.associatePartnerId) {
    return { ok: false, response: new NextResponse("Forbidden", { status: 403 }) };
  }
  return {
    ok: true,
    access: {
      userId,
      associatePartnerId: inquiryAccess.isAssociate
        ? inquiryAccess.associatePartnerId
        : null,
      isAssociate: inquiryAccess.isAssociate,
    },
  };
}

export async function requireSalesTripsWrite(
  userId: string
): Promise<
  { ok: true; access: MobileSalesTripsAccess } | { ok: false; response: NextResponse }
> {
  const [membership, inquiryAccess] = await Promise.all([
    prismadb.organizationMember.findFirst({
      where: { userId, isActive: true },
      select: { role: true },
    }),
    resolveInquiryAccessContext(userId),
  ]);
  const profile = buildMobileAdminProfile(
    membership?.role ?? null,
    inquiryAccess.isAssociate
  );
  if (!profile.permissions.includes("salesTrips.write")) {
    return { ok: false, response: new NextResponse("Forbidden", { status: 403 }) };
  }
  if (inquiryAccess.isAssociate && !inquiryAccess.associatePartnerId) {
    return { ok: false, response: new NextResponse("Forbidden", { status: 403 }) };
  }
  return {
    ok: true,
    access: {
      userId,
      associatePartnerId: inquiryAccess.isAssociate
        ? inquiryAccess.associatePartnerId
        : null,
      isAssociate: inquiryAccess.isAssociate,
    },
  };
}

/** Row-level filter: associates only see their partner's queries (direct or via linked inquiry). */
export function tourPackageQueryWhereForAssociate(
  partnerId: string
): Prisma.TourPackageQueryWhereInput {
  return {
    OR: [
      { associatePartnerId: partnerId },
      { inquiry: { is: { associatePartnerId: partnerId } } },
    ],
  };
}

export function associateCanViewTourPackageQuery(
  access: MobileSalesTripsAccess,
  row: {
    associatePartnerId: string | null;
    inquiry: { associatePartnerId: string | null } | null;
  }
): boolean {
  if (!access.isAssociate || !access.associatePartnerId) return true;
  const pid = access.associatePartnerId;
  if (row.associatePartnerId === pid) return true;
  if (
    row.associatePartnerId == null &&
    row.inquiry?.associatePartnerId === pid
  ) {
    return true;
  }
  return false;
}
