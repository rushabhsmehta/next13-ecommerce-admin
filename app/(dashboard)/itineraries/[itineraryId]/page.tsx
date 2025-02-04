import prismadb from "@/lib/prismadb";

import { ItineraryForm } from "./components/itinerary-form";
import Navbar from "@/components/navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

const ItineraryPage = async ({
  params
}: {
  params: { itineraryId: string }
}) => {
  const itinerary = await prismadb.itinerary.findUnique({
    where: {
      id: params.itineraryId
    },
    include: {
      location: true,
      hotel: true,
      itineraryImages: true,
      activities:
      {
        include: {
          activityImages: true,
        }
      }
    }
  });

  const locations = await prismadb.location.findMany({

  });

  const hotels = await prismadb.hotel.findMany({

  });


  return (
    <>
      {/*       <Navbar /> */}
      <SidebarProvider>
        <AppSidebar />ઇ
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <ItineraryForm
              hotels={hotels}
              locations={locations}
              initialData={itinerary} />
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}

export default ItineraryPage;
