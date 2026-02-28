import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { FlightTicketsClient } from "./components/client";

export default async function FlightTicketsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const flightTickets = await prismadb.flightTicket.findMany({
    orderBy: { 
      issueDate: "desc" 
    },
    include: {    
      passengers: true,
      tourPackageQuery: {
        select: {
          tourPackageQueryName: true,
          customerName: true,
        }
      }
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Flight Tickets</h1>
          <Link href="/flight-tickets/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </Link>
        </div>
        <FlightTicketsClient data={flightTickets} />
      </div>
    </div>
  );
}