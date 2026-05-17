import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireFlightTicketsRead,
  requireFlightTicketsWrite,
} from "@/app/api/mobile/lib/assert-flight-ticket-access";
import {
  findPriorIdempotentEntityId,
  readIdempotencyKey,
} from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const passengerSchema = z.object({
  name: z.string().min(1, "Passenger name is required"),
  type: z.string().optional().default("Adult"),
  seatNumber: z.string().optional().nullable(),
  age: z.coerce.number().int().min(0).optional().nullable(),
  gender: z.string().optional().nullable(),
});

const ticketSchema = z.object({
  pnr: z.string().min(1, "PNR is required"),
  airline: z.string().min(1, "Airline is required"),
  flightNumber: z.string().min(1, "Flight number is required"),
  departureAirport: z.string().min(1, "Departure airport is required"),
  arrivalAirport: z.string().min(1, "Arrival airport is required"),
  departureTime: z.union([z.string(), z.date()]),
  arrivalTime: z.union([z.string(), z.date()]),
  ticketClass: z.string().min(1, "Ticket class is required"),
  status: z.string().optional().default("confirmed"),
  baggageAllowance: z.string().optional().nullable(),
  bookingReference: z.string().optional().nullable(),
  fareAmount: z.coerce.number().optional().nullable(),
  taxAmount: z.coerce.number().optional().nullable(),
  totalAmount: z.coerce.number().optional().nullable(),
  tourPackageQueryId: z.string().optional().nullable(),
  passengers: z.array(passengerSchema).min(1, "At least one passenger is required"),
});

function format(row: any) {
  return {
    id: row.id,
    pnr: row.pnr,
    airline: row.airline,
    flightNumber: row.flightNumber,
    departureAirport: row.departureAirport,
    arrivalAirport: row.arrivalAirport,
    departureTime: row.departureTime?.toISOString?.() ?? row.departureTime,
    arrivalTime: row.arrivalTime?.toISOString?.() ?? row.arrivalTime,
    ticketClass: row.ticketClass,
    status: row.status,
    baggageAllowance: row.baggageAllowance,
    bookingReference: row.bookingReference,
    fareAmount: row.fareAmount,
    taxAmount: row.taxAmount,
    totalAmount: row.totalAmount,
    tourPackageQueryId: row.tourPackageQueryId,
    tourPackageQueryName: row.tourPackageQuery?.tourPackageQueryName ?? null,
    customerName: row.tourPackageQuery?.customerName ?? null,
    passengers: row.passengers ?? [],
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
  };
}

export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireFlightTicketsRead(userId);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const tourPackageQueryId = searchParams.get("tourPackageQueryId")?.trim() ?? "";
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "30", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 30, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const where: any = {};
    if (tourPackageQueryId) where.tourPackageQueryId = tourPackageQueryId;
    if (search) {
      where.OR = [
        { pnr: { contains: search } },
        { airline: { contains: search } },
        { flightNumber: { contains: search } },
        { departureAirport: { contains: search } },
        { arrivalAirport: { contains: search } },
        { tourPackageQuery: { customerName: { contains: search } } },
        { tourPackageQuery: { tourPackageQueryName: { contains: search } } },
      ];
    }

    const [rows, total] = await Promise.all([
      prismadb.flightTicket.findMany({
        where,
        include: {
          passengers: true,
          tourPackageQuery: { select: { id: true, tourPackageQueryName: true, customerName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prismadb.flightTicket.count({ where }),
    ]);

    return NextResponse.json({
      items: rows.map(format),
      total,
      hasMore: offset + rows.length < total,
      nextOffset: offset + rows.length,
    });
  } catch (error) {
    console.log("[MOBILE_FLIGHT_TICKETS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireFlightTicketsWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("FlightTicket", key);
    if (prior) {
      const existing = await prismadb.flightTicket.findUnique({
        where: { id: prior },
        include: { passengers: true, tourPackageQuery: true },
      });
      return NextResponse.json({ id: prior, ticket: existing ? format(existing) : null, idempotentReplay: true });
    }

    const parsed = ticketSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid flight ticket payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;
    const departureTime = dateToUtc(v.departureTime);
    const arrivalTime = dateToUtc(v.arrivalTime);
    if (!departureTime || !arrivalTime) {
      return NextResponse.json({ error: "Invalid flight times" }, { status: 400 });
    }

    const existingPnr = await prismadb.flightTicket.findUnique({
      where: { pnr: v.pnr },
      select: { id: true },
    });
    if (existingPnr) {
      return NextResponse.json({ error: "A ticket with this PNR already exists" }, { status: 409 });
    }

    const ticket = await prismadb.flightTicket.create({
      data: {
        pnr: v.pnr.trim(),
        airline: v.airline.trim(),
        flightNumber: v.flightNumber.trim(),
        departureAirport: v.departureAirport.trim(),
        arrivalAirport: v.arrivalAirport.trim(),
        departureTime,
        arrivalTime,
        ticketClass: v.ticketClass,
        status: v.status,
        baggageAllowance: v.baggageAllowance?.trim() || null,
        bookingReference: v.bookingReference?.trim() || null,
        fareAmount: v.fareAmount ?? null,
        taxAmount: v.taxAmount ?? null,
        totalAmount: v.totalAmount ?? null,
        tourPackageQueryId: v.tourPackageQueryId || null,
        passengers: {
          createMany: {
            data: v.passengers.map((p) => ({
              name: p.name.trim(),
              type: p.type || "Adult",
              seatNumber: p.seatNumber?.trim() || null,
              age: p.age ?? null,
              gender: p.gender?.trim() || null,
            })),
          },
        },
      },
      include: { passengers: true, tourPackageQuery: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "FlightTicket",
      entityId: ticket.id,
      action: "CREATE",
      metadata: { idempotencyKey: key ?? undefined, pnr: ticket.pnr },
    });

    return NextResponse.json(format(ticket), { status: 201 });
  } catch (error) {
    console.log("[MOBILE_FLIGHT_TICKETS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
