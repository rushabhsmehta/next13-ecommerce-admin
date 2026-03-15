import prismadb from "@/lib/prismadb";
import { z } from "zod";
import { dateToUtc } from "@/lib/timezone-utils";
import { McpError, NotFoundError } from "../lib/errors";
import { isoDateString, type ToolHandlerMap } from "../lib/schemas";

// ── Schemas ──────────────────────────────────────────────────────────────────

const GetFlightTicketSchema = z.object({
  flightTicketId: z.string().optional(),
  pnr: z.string().optional(),
}).refine(
  (d) => !!(d.flightTicketId || d.pnr),
  { message: "Provide either flightTicketId or pnr", path: ["flightTicketId"] }
);

const ListFlightTicketsSchema = z.object({
  tourPackageQueryId: z.string().optional(),
  airline: z.string().optional(),
  status: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

const CreateFlightTicketSchema = z.object({
  pnr: z.string().min(1),
  airline: z.string().min(1),
  flightNumber: z.string().min(1),
  departureAirport: z.string().min(1),
  arrivalAirport: z.string().min(1),
  departureTime: z.string().min(1), // ISO datetime string
  arrivalTime: z.string().min(1),   // ISO datetime string
  ticketClass: z.string().min(1),
  issueDate: isoDateString.optional(),
  status: z.string().optional().default("confirmed"),
  baggageAllowance: z.string().optional(),
  bookingReference: z.string().optional(),
  fareAmount: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  totalAmount: z.number().min(0).optional(),
  tourPackageQueryId: z.string().optional(),
  passengers: z.array(z.object({
    name: z.string().min(1),
    type: z.string().optional().default("Adult"),
    seatNumber: z.string().optional(),
    age: z.number().int().optional(),
    gender: z.string().optional(),
  })).optional(),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

async function getFlightTicket(rawParams: unknown) {
  const { flightTicketId, pnr } = GetFlightTicketSchema.parse(rawParams);

  let ticket;
  if (flightTicketId) {
    ticket = await prismadb.flightTicket.findUnique({
      where: { id: flightTicketId },
      include: {
        passengers: true,
        tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
      },
    });
  } else if (pnr) {
    ticket = await prismadb.flightTicket.findUnique({
      where: { pnr },
      include: {
        passengers: true,
        tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
      },
    });
  }

  if (!ticket) throw new NotFoundError(`Flight ticket not found (id: ${flightTicketId}, pnr: ${pnr})`);
  return ticket;
}

async function listFlightTickets(rawParams: unknown) {
  const { tourPackageQueryId, airline, status, limit } = ListFlightTicketsSchema.parse(rawParams);
  return prismadb.flightTicket.findMany({
    where: {
      ...(tourPackageQueryId && { tourPackageQueryId }),
      ...(airline && { airline: { contains: airline } }),
      ...(status && { status }),
    },
    select: {
      id: true, pnr: true, airline: true, flightNumber: true,
      departureAirport: true, arrivalAirport: true,
      departureTime: true, arrivalTime: true,
      ticketClass: true, status: true,
      fareAmount: true, taxAmount: true, totalAmount: true,
      tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
      _count: { select: { passengers: true } },
    },
    orderBy: { departureTime: "desc" },
    take: limit,
  });
}

async function createFlightTicket(rawParams: unknown) {
  const params = CreateFlightTicketSchema.parse(rawParams);

  const departureTime = new Date(params.departureTime);
  const arrivalTime = new Date(params.arrivalTime);
  if (isNaN(departureTime.getTime())) throw new McpError("Invalid departureTime", "VALIDATION_ERROR", 422);
  if (isNaN(arrivalTime.getTime())) throw new McpError("Invalid arrivalTime", "VALIDATION_ERROR", 422);

  const issueDate = params.issueDate ? dateToUtc(params.issueDate) ?? new Date() : new Date();

  const ticket = await prismadb.flightTicket.create({
    data: {
      pnr: params.pnr,
      airline: params.airline,
      flightNumber: params.flightNumber,
      departureAirport: params.departureAirport,
      arrivalAirport: params.arrivalAirport,
      departureTime,
      arrivalTime,
      ticketClass: params.ticketClass,
      issueDate,
      status: params.status ?? "confirmed",
      baggageAllowance: params.baggageAllowance ?? null,
      bookingReference: params.bookingReference ?? null,
      fareAmount: params.fareAmount ?? null,
      taxAmount: params.taxAmount ?? null,
      totalAmount: params.totalAmount ?? null,
      tourPackageQueryId: params.tourPackageQueryId ?? null,
      passengers: params.passengers && params.passengers.length > 0
        ? {
            create: params.passengers.map((p) => ({
              name: p.name,
              type: p.type ?? "Adult",
              seatNumber: p.seatNumber ?? null,
              age: p.age ?? null,
              gender: p.gender ?? null,
            })),
          }
        : undefined,
    },
    include: {
      passengers: true,
      tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
    },
  });

  return ticket;
}

// ── Export ────────────────────────────────────────────────────────────────────

export const flightHandlers: ToolHandlerMap = {
  get_flight_ticket: getFlightTicket,
  list_flight_tickets: listFlightTickets,
  create_flight_ticket: createFlightTicket,
};
