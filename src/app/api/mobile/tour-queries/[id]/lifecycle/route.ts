import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  associateCanViewTourPackageQuery,
  requireSalesTripsWrite,
} from "@/app/api/mobile/lib/assert-sales-trips-access";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["confirm", "unconfirm", "archive", "unarchive"]),
});

/**
 * Minimal tour-query lifecycle for mobile (confirm / unconfirm / archive /
 * unarchive). Requires `salesTrips.write` and the same associate row scope as
 * GET /api/mobile/tour-queries/[id].
 *
 * `confirm` mirrors the web "confirm" path: sets `isFeatured` true, clears
 * `isArchived`, and when the query was not already featured and has an
 * `inquiryId`, sets inquiry status to CONFIRMED and appends an inquiry action.
 */
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsWrite(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const params = await props.params;
    const id = params.id?.trim();
    if (!id) return new NextResponse("Missing id", { status: 400 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const { action } = parsed.data;

    const existing = await prismadb.tourPackageQuery.findUnique({
      where: { id },
      select: {
        id: true,
        isFeatured: true,
        isArchived: true,
        inquiryId: true,
        associatePartnerId: true,
        inquiry: {
          select: { associatePartnerId: true },
        },
      },
    });

    if (!existing) return new NextResponse("Not found", { status: 404 });

    if (!associateCanViewTourPackageQuery(access, existing)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const wasFeatured = existing.isFeatured;

    let data: { isFeatured?: boolean; isArchived?: boolean } = {};

    if (action === "confirm") {
      data = { isFeatured: true, isArchived: false };
    } else if (action === "unconfirm") {
      data = { isFeatured: false };
    } else if (action === "archive") {
      data = { isArchived: true };
    } else if (action === "unarchive") {
      data = { isArchived: false };
    }

    const updated = await prismadb.$transaction(async (tx) => {
      const row = await tx.tourPackageQuery.update({
        where: { id },
        data,
        select: {
          id: true,
          isFeatured: true,
          isArchived: true,
          inquiryId: true,
        },
      });

      if (
        action === "confirm" &&
        !wasFeatured &&
        row.isFeatured &&
        row.inquiryId
      ) {
        await tx.inquiry.update({
          where: { id: row.inquiryId },
          data: { status: "CONFIRMED" },
        });
        await tx.inquiryAction.create({
          data: {
            inquiryId: row.inquiryId,
            actionType: "STATUS_CHANGE",
            remarks:
              "Status updated to CONFIRMED automatically when tour package query was confirmed (mobile).",
          },
        });
      }

      return row;
    });

    return NextResponse.json({
      id: updated.id,
      isFeatured: updated.isFeatured,
      isArchived: updated.isArchived,
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_LIFECYCLE_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
