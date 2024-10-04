import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { ItineraryColumn } from "./components/columns"
import { ItinerariesClient } from "./components/client";
import Navbar from "@/components/navbar";

const ItinerariesPage = async ({

}) => {
  const itineraries = await prismadb.itinerary.findMany({
    
    include: {
      location : true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedItineraries : ItineraryColumn[] = itineraries.map((item) => ({
    id: item.id,
    itineraryTitle : item.itineraryTitle || '',
  //  itineraryDescription : item.itineraryDescription,    
    locationLabel: item.location.label,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <>
    <Navbar />
      <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ItinerariesClient data={formattedItineraries} />
      </div>
    </div>
    </>
  );
};

export default ItinerariesPage;
