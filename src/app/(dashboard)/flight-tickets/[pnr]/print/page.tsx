import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { FlightTicketPrint } from "../../components/flight-ticket-print";

interface PrintFlightTicketPageProps {
  params: Promise<{
    pnr: string;
  }>;
}

export default async function PrintFlightTicketPage(props: PrintFlightTicketPageProps) {
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
    redirect("/flight-tickets");
  }

  // Fetch organization details for the ticket
  const organization = await prismadb.organization.findFirst();

  return (
    <div className="print:p-0 p-4">
      <FlightTicketPrint flightTicket={flightTicket} organization={organization} />
    </div>
  );
}