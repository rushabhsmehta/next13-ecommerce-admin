import prismadb from "@/lib/prismadb";

import { ItineraryForm } from "./components/itinerary-form";

const ItineraryPage = async ({
  params
}: {
  params: { itineraryId: string, storeId: string }
}) => {
  const itinerary = await prismadb.itinerary.findUnique({
    where: {
      id: params.itineraryId
    },
    include: {
      location : true,
      hotel : true,
      itineraryImages: true,
      activities :
      {
        include: {
          activityImages : true,
      }
    }
  }});

  const locations = await prismadb.location.findMany({
    where: {
      storeId: params.storeId
    }
  });
  
  const hotels = await prismadb.hotel.findMany({
    where: {
      storeId: params.storeId,
    },
  });


  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ItineraryForm 
        hotels = {hotels}
        locations ={locations } 
        initialData={itinerary} 
        />
      </div>
    </div>
  );
}

export default ItineraryPage;
