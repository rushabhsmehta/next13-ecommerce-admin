import prismadb from "@/lib/prismadb";

import { HotelForm } from "./components/hotel-form";

const HotelPage = async ({
  params
}: {
  params: { hotelId: string, storeId: string }
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
    where: {
      storeId: params.storeId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <HotelForm locations ={locations } initialData={hotel} />
      </div>
    </div>
  );
}

export default HotelPage;
