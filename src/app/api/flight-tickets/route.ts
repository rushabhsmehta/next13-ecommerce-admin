import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from '@/lib/timezone-utils';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const {
      pnr,
      airline,
      flightNumber,
      departureAirport,
      arrivalAirport,
      departureTime,
      arrivalTime,
      ticketClass,
      status,
      baggageAllowance,
      bookingReference,
      fareAmount,
      taxAmount,
      totalAmount,
      tourPackageQueryId,
      passengers
    } = body;

    // Basic validation
    if (!pnr || !airline || !flightNumber || !departureAirport || !arrivalAirport || 
        !departureTime || !arrivalTime || !ticketClass) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Validate passengers array
    if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
      return new NextResponse("At least one passenger is required", { status: 400 });
    }

    // Check if ticket with this PNR already exists
    const existingTicket = await prismadb.flightTicket.findUnique({
      where: { pnr }
    });

    if (existingTicket) {
      return new NextResponse("A ticket with this PNR already exists", { status: 400 });
    }

    // Create flight ticket with passengers in a transaction
    const flightTicket = await prismadb.$transaction(async (tx) => {
      // Create the flight ticket first
      const ticket = await tx.flightTicket.create({
        data: {
          pnr,
          airline,
          flightNumber,
          departureAirport,
          arrivalAirport,          departureTime: dateToUtc(departureTime)!,
          arrivalTime: dateToUtc(arrivalTime)!,
          ticketClass,
          status,
          baggageAllowance,
          bookingReference,
          fareAmount: parseFloat(fareAmount) || null,
          taxAmount: parseFloat(taxAmount) || null,
          totalAmount: parseFloat(totalAmount) || null,
          tourPackageQueryId
        }
      });

      // Create passengers for the ticket
      for (const passenger of passengers) {
        await tx.passenger.create({
          data: {
            name: passenger.name,
            type: passenger.type || "Adult",
            seatNumber: passenger.seatNumber,
            age: passenger.age ? parseInt(passenger.age) : null,
            gender: passenger.gender,
            flightTicketId: ticket.id
          }
        });
      }

      // Return the created ticket with passengers
      return await tx.flightTicket.findUnique({
        where: { id: ticket.id },
        include: { passengers: true }
      });
    });

    return NextResponse.json(flightTicket);
  } catch (error) {
    console.error('[FLIGHT_TICKETS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pnr = searchParams.get('pnr');
    const tourPackageQueryId = searchParams.get('tourPackageQueryId');
    
    let query: any = {};
    
    if (pnr) {
      query.pnr = pnr;
    }
    
    if (tourPackageQueryId) {
      query.tourPackageQueryId = tourPackageQueryId;
    }

    const flightTickets = await prismadb.flightTicket.findMany({
      where: query,
      include: {
        passengers: true,
        tourPackageQuery: {
          select: {
            tourPackageQueryName: true,
            customerName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(flightTickets);
  } catch (error) {
    console.error('[FLIGHT_TICKETS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}