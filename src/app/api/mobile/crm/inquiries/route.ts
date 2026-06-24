import { NextResponse } from "next/server";
import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek, subMonths } from "date-fns";
import type { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import {
  canActOnInquiries,
  resolveInquiryAccessContext,
} from "@/lib/inquiry-access";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

function parseBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

/** Map mobile tab ids to DB status values (mixed legacy casing). */
function inquiryStatusFilter(status: string | undefined): Prisma.InquiryWhereInput {
  if (!status || status === "ALL") return {};
  const key = status.toLowerCase();
  switch (key) {
    case "pending":
      return { status: { in: ["pending", "PENDING"] } };
    case "completed":
      return { status: { in: ["completed", "COMPLETED", "CONFIRMED", "confirmed"] } };
    case "cancelled":
      return { status: { in: ["cancelled", "CANCELLED"] } };
    default:
      return { status };
  }
}

/**
 * CRM inquiry list for mobile staff — same filters as GET /api/inquiries but
 * lives under /api/mobile/* so Clerk session middleware never intercepts
 * bearer-only native requests.
 */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessContext = await resolveInquiryAccessContext(userId);
    if (!canActOnInquiries(accessContext)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const url = new URL(req.url);
    const associateId = url.searchParams.get("associateId") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const period = url.searchParams.get("period") || undefined;
    const startDate = url.searchParams.get("startDate") || undefined;
    const endDate = url.searchParams.get("endDate") || undefined;
    const followUpsOnly = url.searchParams.get("followUpsOnly") === "1";
    const noTourPackageQuery = url.searchParams.get("noTourPackageQuery") === "1";
    const search = url.searchParams.get("search")?.trim();
    const limit = parseBoundedInt(url.searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = parseBoundedInt(url.searchParams.get("offset"), 0, 0, Number.MAX_SAFE_INTEGER);

    let dateFilter: Prisma.InquiryWhereInput = {};
    const now = new Date();

    if (period) {
      switch (period) {
        case "TODAY":
          dateFilter = {
            createdAt: { gte: startOfDay(now), lte: endOfDay(now) },
          };
          break;
        case "THIS_WEEK":
          dateFilter = {
            createdAt: {
              gte: startOfWeek(now, { weekStartsOn: 1 }),
              lte: endOfWeek(now, { weekStartsOn: 1 }),
            },
          };
          break;
        case "THIS_MONTH":
          dateFilter = {
            createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) },
          };
          break;
        case "LAST_MONTH": {
          const lastMonth = subMonths(now, 1);
          dateFilter = {
            createdAt: {
              gte: startOfMonth(lastMonth),
              lte: endOfMonth(lastMonth),
            },
          };
          break;
        }
        case "CUSTOM":
          if (startDate && endDate) {
            try {
              const parsedStartDate = dateToUtc(startDate);
              const parsedEndDate = dateToUtc(endDate);
              if (parsedStartDate && parsedEndDate) {
                parsedEndDate.setHours(23, 59, 59, 999);
                dateFilter = {
                  createdAt: { gte: parsedStartDate, lte: parsedEndDate },
                };
              }
            } catch (error) {
              console.error("[MOBILE_CRM_INQUIRIES_GET] Invalid date format:", error);
            }
          }
          break;
      }
    }

    const where: Prisma.InquiryWhereInput = {
      ...(associateId && { associatePartnerId: associateId }),
      ...inquiryStatusFilter(status),
      ...dateFilter,
    };
    if (accessContext.isAssociate && accessContext.associatePartnerId) {
      where.associatePartnerId = accessContext.associatePartnerId;
    }
    if (noTourPackageQuery) {
      where.tourPackageQueries = { none: {} };
    }
    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { customerMobileNumber: { contains: search } },
        { status: { contains: search } },
        { location: { label: { contains: search } } },
        { associatePartner: { name: { contains: search } } },
      ];
    }

    const finalWhere: Prisma.InquiryWhereInput = followUpsOnly
        ? {
            ...where,
            nextFollowUpDate: { not: null },
            ...(status && status !== "ALL"
              ? {}
              : { status: { notIn: ["CANCELLED", "CONFIRMED"] } }),
          }
        : where;

    const [inquiries, total] = await Promise.all([
      prismadb.inquiry.findMany({
        where: finalWhere,
        select: {
          id: true,
          status: true,
          customerName: true,
          customerMobileNumber: true,
          numAdults: true,
          numChildren5to11: true,
          journeyDate: true,
          nextFollowUpDate: true,
          createdAt: true,
          location: { select: { id: true, label: true } },
          associatePartner: { select: { id: true, name: true } },
          tourPackageQueries: {
            select: {
              id: true,
              inquiryId: true,
              tourPackageQueryName: true,
              tourPackageQueryNumber: true,
              tourPackageQueryType: true,
              isFeatured: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: "desc" },
          },
        },
        orderBy: followUpsOnly
          ? [{ nextFollowUpDate: "asc" }, { updatedAt: "desc" }]
          : { updatedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prismadb.inquiry.count({ where: finalWhere }),
    ]);

    const nextOffset = offset + inquiries.length;
    return NextResponse.json({
      items: inquiries,
      inquiries,
      total,
      limit,
      offset,
      nextOffset,
      hasMore: nextOffset < total,
    });
  } catch (error) {
    console.log("[MOBILE_CRM_INQUIRIES_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
