import prismadb from "@/lib/prismadb";

import { ItineraryForm } from "./components/itinerary-form";

const ItineraryPage = async ({
  params
}: {
  params: { itineraryId: string }
}) => {
  const itinerary = await prismadb.itinerary.findUnique({
    where: {
      id: params.itineraryId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ItineraryForm initialData={itinerary} />
      </div>
    </div>
  );
}

export default ItineraryPage;
