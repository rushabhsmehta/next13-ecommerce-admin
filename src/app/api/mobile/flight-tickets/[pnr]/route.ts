import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireFlightTicketsRead,
  requireFlightTicketsWrite,
} from "@/app/api/mobile/lib/assert-flight-ticket-access";
import { readIdempotencyKey } from "@/app/api/mobile/lib/finance-guard";
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
  };
}

export async function GET(req: Request, props: { params: Promise<{ pnr: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireFlightTicketsRead(userId);
    if (!guard.ok) return guard.response;

    const ticket = await prismadb.flightTicket.findUnique({
      where: { pnr: params.pnr },
      include: {
        passengers: true,
        tourPackageQuery: { select: { id: true, tourPackageQueryName: true, customerName: true } },
      },
    });
    if (!ticket) return new NextResponse("Flight ticket not found", { status: 404 });
    return NextResponse.json(format(ticket));
  } catch (error) {
    console.log("[MOBILE_FLIGHT_TICKET_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ pnr: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireFlightTicketsWrite(userId);
    if (!guard.ok) return guard.response;
    const key = readIdempotencyKey(req);

    const parsed = ticketSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid flight ticket payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const existing = await prismadb.flightTicket.findUnique({
      where: { pnr: params.pnr },
      select: { id: true },
    });
    if (!existing) return new NextResponse("Flight ticket not found", { status: 404 });

    const v = parsed.data;
    const departureTime = dateToUtc(v.departureTime);
    const arrivalTime = dateToUtc(v.arrivalTime);
    if (!departureTime || !arrivalTime) {
      return NextResponse.json({ error: "Invalid flight times" }, { status: 400 });
    }

    const ticket = await prismadb.$transaction(async (tx) => {
      const updated = await tx.flightTicket.update({
        where: { pnr: params.pnr },
        data: {
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
        },
      });
      await tx.passenger.deleteMany({ where: { flightTicketId: existing.id } });
      await tx.passenger.createMany({
        data: v.passengers.map((p) => ({
          flightTicketId: existing.id,
          name: p.name.trim(),
          type: p.type || "Adult",
          seatNumber: p.seatNumber?.trim() || null,
          age: p.age ?? null,
          gender: p.gender?.trim() || null,
        })),
      });
      return tx.flightTicket.findUnique({
        where: { id: updated.id },
        include: { passengers: true, tourPackageQuery: true },
      });
    });

    await recordMobileAudit({
      userId,
      entityType: "FlightTicket",
      entityId: existing.id,
      action: "UPDATE",
      metadata: { pnr: params.pnr, idempotencyKey: key ?? undefined },
    });

    return NextResponse.json(format(ticket));
  } catch (error) {
    console.log("[MOBILE_FLIGHT_TICKET_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ pnr: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireFlightTicketsWrite(userId);
    if (!guard.ok) return guard.response;
    const key = readIdempotencyKey(req);

    const existing = await prismadb.flightTicket.findUnique({
      where: { pnr: params.pnr },
      select: { id: true, pnr: true },
    });
    if (!existing) return new NextResponse("Flight ticket not found", { status: 404 });
    await prismadb.flightTicket.delete({ where: { pnr: params.pnr } });
    await recordMobileAudit({
      userId,
      entityType: "FlightTicket",
      entityId: existing.id,
      action: "DELETE",
      metadata: { pnr: params.pnr, idempotencyKey: key ?? undefined },
    });
    return NextResponse.json({ deleted: true, ticket: existing });
  } catch (error) {
    console.log("[MOBILE_FLIGHT_TICKET_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
