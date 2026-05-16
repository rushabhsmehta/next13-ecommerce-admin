import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";

export type MobileCrmAccess = {
  userId: string;
  associatePartnerId: string | null;
  isAssociate: boolean;
};

/**
 * `/api/mobile/**` is excluded from `assertCrmApiAccessForRequest` path RBAC, so
 * each mobile handler must enforce module permissions explicitly. Mirrors
 * `assert-sales-trips-access.ts` but for the CRM module — customers, associate
 * partners, inquiry directory views.
 */
async function loadAccess(userId: string, permission: "crm.read" | "crm.write") {
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
  if (!profile.permissions.includes(permission)) {
    return { ok: false as const, response: new NextResponse("Forbidden", { status: 403 }) };
  }
  if (inquiryAccess.isAssociate && !inquiryAccess.associatePartnerId) {
    return { ok: false as const, response: new NextResponse("Forbidden", { status: 403 }) };
  }
  return {
    ok: true as const,
    access: {
      userId,
      associatePartnerId: inquiryAccess.isAssociate
        ? inquiryAccess.associatePartnerId
        : null,
      isAssociate: inquiryAccess.isAssociate,
    } satisfies MobileCrmAccess,
  };
}

export async function requireCrmRead(
  userId: string
): Promise<
  { ok: true; access: MobileCrmAccess } | { ok: false; response: NextResponse }
> {
  return loadAccess(userId, "crm.read");
}

export async function requireCrmWrite(
  userId: string
): Promise<
  { ok: true; access: MobileCrmAccess } | { ok: false; response: NextResponse }
> {
  return loadAccess(userId, "crm.write");
}

/**
 * Row-level filter: associates only see customers linked to their partner.
 * (Customer has a direct `associatePartnerId`; there is no `inquiries`
 * relation on Customer — inquiries link by phone, not FK.) Admin/staff see
 * all customers (no filter).
 */
export function customerWhereForAccess(
  access: MobileCrmAccess
): Prisma.CustomerWhereInput | undefined {
  if (!access.isAssociate || !access.associatePartnerId) return undefined;
  return { associatePartnerId: access.associatePartnerId };
}

/**
 * Row-level filter for associate partners — associates only ever see their own
 * partner row; admin/staff see all.
 */
export function associatePartnerWhereForAccess(
  access: MobileCrmAccess
): Prisma.AssociatePartnerWhereInput | undefined {
  if (!access.isAssociate || !access.associatePartnerId) return undefined;
  return { id: access.associatePartnerId };
}

export function associateCanViewCustomer(
  access: MobileCrmAccess,
  row: { associatePartnerId: string | null }
): boolean {
  if (!access.isAssociate || !access.associatePartnerId) return true;
  return row.associatePartnerId === access.associatePartnerId;
}

export function associateCanViewPartner(
  access: MobileCrmAccess,
  partnerId: string
): boolean {
  if (!access.isAssociate || !access.associatePartnerId) return true;
  return partnerId === access.associatePartnerId;
}
