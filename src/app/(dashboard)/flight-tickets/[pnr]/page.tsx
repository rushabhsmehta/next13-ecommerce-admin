import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { format } from "date-fns";
import { FlightTicketDetails } from "../components/flight-ticket-details";

interface ViewFlightTicketPageProps {
  params: Promise<{
    pnr: string;
  }>;
}

export default async function ViewFlightTicketPage(props: ViewFlightTicketPageProps) {
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

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <FlightTicketDetails flightTicket={flightTicket} />
      </div>
    </div>
  );
}