import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from '@/lib/timezone-utils';

export async function GET(
  req: Request,
  { params }: { params: { pnr: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const flightTicket = await prismadb.flightTicket.findUnique({
      where: {
        pnr: params.pnr
      },
      include: {
        passengers: true,
        tourPackageQuery: {
          select: {
            id: true,
            tourPackageQueryName: true,
            customerName: true
          }
        }
      }
    });
    
    if (!flightTicket) {
      return new NextResponse("Flight ticket not found", { status: 404 });
    }

    return NextResponse.json(flightTicket);
  } catch (error) {
    console.error('[FLIGHT_TICKET_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { pnr: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const {
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
    if (!airline || !flightNumber || !departureAirport || !arrivalAirport || 
        !departureTime || !arrivalTime || !ticketClass) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Validate passengers array
    if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
      return new NextResponse("At least one passenger is required", { status: 400 });
    }

    // Get the existing flight ticket to find its ID
    const existingTicket = await prismadb.flightTicket.findUnique({
      where: { pnr: params.pnr },
      include: { passengers: true }
    });

    if (!existingTicket) {
      return new NextResponse("Flight ticket not found", { status: 404 });
    }

    // Update flight ticket and passengers in a transaction
    const updatedFlightTicket = await prismadb.$transaction(async (tx) => {
      // Update the flight ticket first
      const ticket = await tx.flightTicket.update({
        where: { pnr: params.pnr },
        data: {
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

      // Delete existing passengers
      await tx.passenger.deleteMany({
        where: { flightTicketId: existingTicket.id }
      });

      // Create new passengers for the ticket
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

      // Return the updated ticket with passengers
      return await tx.flightTicket.findUnique({
        where: { id: ticket.id },
        include: { passengers: true }
      });
    });
    
    return NextResponse.json(updatedFlightTicket);
  } catch (error) {
    console.error('[FLIGHT_TICKET_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { pnr: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the existing flight ticket to find its ID
    const existingTicket = await prismadb.flightTicket.findUnique({
      where: { pnr: params.pnr }
    });

    if (!existingTicket) {
      return new NextResponse("Flight ticket not found", { status: 404 });
    }

    // Delete flight ticket (passengers will be cascade deleted)
    const flightTicket = await prismadb.flightTicket.delete({
      where: {
        pnr: params.pnr
      }
    });
    
    return NextResponse.json(flightTicket);
  } catch (error) {
    console.error('[FLIGHT_TICKET_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}