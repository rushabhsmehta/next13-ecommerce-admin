import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { FlightTicketForm } from "../../components/flight-ticket-form";

interface EditFlightTicketPageProps {
  params: Promise<{
    pnr: string;
  }>;
}

export default async function EditFlightTicketPage(props: EditFlightTicketPageProps) {
  const params = await props.params;
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch the flight ticket by PNR
  const flightTicket = await prismadb.flightTicket.findUnique({
    where: {
      pnr: params.pnr
    },
    include: {
      passengers: true,
    }
  });

  if (!flightTicket) {
    redirect("/flight-tickets");
  }

  // Format dates for the form
  const formattedTicket = {
    ...flightTicket,
    departureTime: flightTicket.departureTime,
    arrivalTime: flightTicket.arrivalTime,
  };

  // Fetch tour package queries for the dropdown
  const tourPackageQueries = await prismadb.tourPackageQuery.findMany({
    where: {
      isFeatured: true, // Only show confirmed packages
    },
    select: {
      id: true,
      tourPackageQueryName: true,
      customerName: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <FlightTicketForm 
          initialData={formattedTicket} 
          tourPackageQueries={tourPackageQueries} 
        />
      </div>
    </div>
  );
}