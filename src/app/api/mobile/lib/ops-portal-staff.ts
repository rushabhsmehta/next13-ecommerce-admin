import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getClerkPrimaryEmailByUserId } from "@/lib/clerk-request-user";

export async function requireMobileOpsPortalStaff(userId: string): Promise<
  | { ok: true; staff: { id: string; name: string; email: string } }
  | { ok: false; response: NextResponse }
> {
  const email = await getClerkPrimaryEmailByUserId(userId);
  if (!email) {
    return {
      ok: false,
      response: NextResponse.json({ error: "User email not found" }, { status: 400 }),
    };
  }

  const staff = await prismadb.operationalStaff.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, isActive: true },
  });
  if (!staff) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Staff record not found" }, { status: 404 }),
    };
  }
  if (!staff.isActive) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Staff account is inactive" }, { status: 403 }),
    };
  }
  return {
    ok: true,
    staff: { id: staff.id, name: staff.name, email: staff.email },
  };
}

export function formatOpsInquiry(row: any) {
  return {
    id: row.id,
    customerName: row.customerName,
    customerMobileNumber: row.customerMobileNumber,
    status: row.status,
    journeyDate: row.journeyDate?.toISOString?.() ?? row.journeyDate,
    nextFollowUpDate: row.nextFollowUpDate?.toISOString?.() ?? row.nextFollowUpDate,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    remarks: row.remarks,
    numAdults: row.numAdults,
    numChildrenAbove11: row.numChildrenAbove11,
    numChildren5to11: row.numChildren5to11,
    numChildrenBelow5: row.numChildrenBelow5,
    location: row.location
      ? { id: row.location.id, label: row.location.label }
      : null,
    associatePartner: row.associatePartner
      ? { id: row.associatePartner.id, name: row.associatePartner.name }
      : null,
    actions: (row.actions ?? []).map((a: any) => ({
      id: a.id,
      actionType: a.actionType,
      remarks: a.remarks,
      actionDate: a.actionDate?.toISOString?.() ?? a.actionDate,
      createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
    })),
    tourPackageQueries: (row.tourPackageQueries ?? []).map((q: any) => ({
      id: q.id,
      tourPackageQueryNumber: q.tourPackageQueryNumber,
      tourPackageQueryName: q.tourPackageQueryName,
      customerName: q.customerName,
      tourStartsFrom: q.tourStartsFrom?.toISOString?.() ?? q.tourStartsFrom,
      tourEndsOn: q.tourEndsOn?.toISOString?.() ?? q.tourEndsOn,
      isFeatured: q.isFeatured,
      isArchived: q.isArchived,
      totalPrice: q.totalPrice,
    })),
  };
}

export const opsInquiryInclude = {
  location: { select: { id: true, label: true } },
  associatePartner: { select: { id: true, name: true } },
  actions: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      actionType: true,
      remarks: true,
      actionDate: true,
      createdAt: true,
    },
  },
  tourPackageQueries: {
    orderBy: { updatedAt: "desc" as const },
    select: {
      id: true,
      tourPackageQueryNumber: true,
      tourPackageQueryName: true,
      customerName: true,
      tourStartsFrom: true,
      tourEndsOn: true,
      isFeatured: true,
      isArchived: true,
      totalPrice: true,
    },
  },
};
