import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { HotelColumn } from "./components/columns"
import { HotelsClient } from "./components/client";
import Navbar from "@/components/navbar";
import { Hotel } from "@prisma/client";

const HotelsPage = async ({

}) => {
  const hotels = await prismadb.hotel.findMany({

    include: {
      location: true,
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
    <>
      {/*       <Navbar /> */}
      
        
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <HotelsClient data={formattedHotels} />
          </div>
        </div>
      
    </>
  );
};

export default HotelsPage;

