import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { validateAssociateToken } from "../lib/validate-token";

export const dynamic = "force-dynamic";

// ─── POST /api/associate/inquiries — Create a new inquiry ─────────────────────
export async function POST(req: Request) {
  try {
    const associate = await validateAssociateToken(req);
    if (!associate) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const {
      customerName,
      customerMobileNumber,
      locationId,
      numAdults,
      numChildrenAbove11,
      numChildren5to11,
      numChildrenBelow5,
      journeyDate,
      nextFollowUpDate,
      remarks,
      roomAllocations,
      transportDetails,
    } = body;

    if (!customerName?.trim()) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }
    if (!customerMobileNumber?.trim()) {
      return NextResponse.json({ error: "Mobile number is required" }, { status: 400 });
    }
    if (!journeyDate) {
      return NextResponse.json({ error: "Journey date is required" }, { status: 400 });
    }
    if (!locationId) {
      return NextResponse.json({ error: "Destination is required" }, { status: 400 });
    }

    // Validate location exists
    const location = await prismadb.location.findUnique({ where: { id: locationId } });
    if (!location) {
      return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
    }

    const inquiry = await prismadb.inquiry.create({
      data: {
        customerName: customerName.trim(),
        customerMobileNumber: customerMobileNumber.trim(),
        locationId,
        associatePartnerId: associate.id,
        numAdults: numAdults || 0,
        numChildrenAbove11: numChildrenAbove11 || 0,
        numChildren5to11: numChildren5to11 || 0,
        numChildrenBelow5: numChildrenBelow5 || 0,
        journeyDate: dateToUtc(new Date(journeyDate)),
        nextFollowUpDate: nextFollowUpDate ? dateToUtc(new Date(nextFollowUpDate)) : null,
        remarks: remarks || null,
        status: "pending",
        roomAllocations: roomAllocations?.length
          ? {
              create: roomAllocations.map((r: any) => ({
                roomTypeId: r.roomTypeId,
                occupancyTypeId: r.occupancyTypeId,
                mealPlanId: r.mealPlanId || null,
                quantity: r.quantity || 1,
                guestNames: r.guestNames || null,
                notes: r.notes || null,
              })),
            }
          : undefined,
        transportDetails: transportDetails?.length
          ? {
              create: transportDetails.map((t: any) => ({
                vehicleTypeId: t.vehicleTypeId,
                quantity: t.quantity || 1,
                isAirportPickupRequired: t.isAirportPickupRequired || false,
                isAirportDropRequired: t.isAirportDropRequired || false,
                pickupLocation: t.pickupLocation || null,
                dropLocation: t.dropLocation || null,
                requirementDate: dateToUtc(new Date(t.requirementDate)),
                notes: t.notes || null,
              })),
            }
          : undefined,
      },
      include: {
        location: { select: { id: true, label: true } },
        associatePartner: { select: { id: true, name: true } },
        roomAllocations: {
          include: {
            roomType: true,
            occupancyType: true,
            mealPlan: true,
          },
        },
        transportDetails: {
          include: { vehicleType: true },
        },
      },
    });

    console.log(`[ASSOCIATE_INQUIRY_POST] Created inquiry ${inquiry.id} by associate ${associate.id}`);
    return NextResponse.json(inquiry, { status: 201 });
  } catch (error) {
    console.log("[ASSOCIATE_INQUIRY_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// ─── GET /api/associate/inquiries — List associate's inquiries ────────────────
export async function GET(req: Request) {
  try {
    const associate = await validateAssociateToken(req);
    if (!associate) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = { associatePartnerId: associate.id };
    if (status) where.status = status;

    const [inquiries, total] = await Promise.all([
      prismadb.inquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          location: { select: { id: true, label: true } },
        },
      }),
      prismadb.inquiry.count({ where }),
    ]);

    return NextResponse.json({
      inquiries,
      total,
      limit,
      offset,
      hasMore: offset + inquiries.length < total,
    });
  } catch (error) {
    console.log("[ASSOCIATE_INQUIRY_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
