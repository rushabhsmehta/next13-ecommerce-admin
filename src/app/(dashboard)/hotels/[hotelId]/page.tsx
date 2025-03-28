import prismadb from "@/lib/prismadb";

import { HotelForm } from "./components/hotel-form";
import Navbar from "@/components/navbar";



const HotelPage = async ({
  params
}: {
  params: { hotelId: string }
}) => {
  const hotel = await prismadb.hotel.findUnique({
    where: {
      id: params.hotelId
    },
    include: {
      images: true,
    }
  });

  const locations = await prismadb.location.findMany({

  });

  return (
    <>
      {/*       <Navbar /> */}
      
        
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <HotelForm locations={locations} initialData={hotel} />
          </div>
        </div>
      
    </>
  );
}

export default HotelPage;
