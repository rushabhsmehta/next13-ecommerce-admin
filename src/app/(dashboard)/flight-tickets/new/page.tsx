import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { FlightTicketForm } from "../components/flight-ticket-form";

export default async function NewFlightTicketPage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }
  
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
        <FlightTicketForm tourPackageQueries={tourPackageQueries} />
      </div>
    </div>
  );
}