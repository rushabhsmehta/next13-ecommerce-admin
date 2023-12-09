//modify the file for itinerary instead of Billboard

import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { ItineraryColumn } from "./components/columns"
import { ItineraryClient } from "./components/client";

const ItinerariesPage = async ({
  params
}: {
  params: { storeId: string }
}) => {
  const itineraries = await prismadb.itinerary.findMany({
    where: {
      storeId: params.storeId
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedItineraries : ItineraryColumn[] = itineraries.map((item) => ({
    id: item.id,
    label: item.label,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ItineraryClient data={formattedItineraries} />
      </div>
    </div>
  );
};

export default ItinerariesPage;
