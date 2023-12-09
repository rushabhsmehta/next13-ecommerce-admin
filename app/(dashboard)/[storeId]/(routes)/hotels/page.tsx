import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { HotelColumn } from "./components/columns"
import { HotelsClient } from "./components/client";

const HotelsPage = async ({
  params
}: {
  params: { storeId: string }
}) => {
  const hotels = await prismadb.hotel.findMany({
    where: {
      storeId: params.storeId
    },
    include: {
      location : true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedHotels: HotelColumn[] = hotels.map((item) => ({
    id: item.id,
    name: item.name,
    locationLabel: item.location.label,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <HotelsClient data={formattedHotels} />
      </div>
    </div>
  );
};

export default HotelsPage;
