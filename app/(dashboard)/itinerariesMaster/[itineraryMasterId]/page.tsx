import prismadb from "@/lib/prismadb";

import { ItineraryMasterForm } from "./components/itineraryMaster-form";
import Navbar from "@/components/navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

const ItineraryMasterPage = async ({
  params
}: {
  params: { itineraryMasterId: string }
}) => {
  const itineraryMaster = await prismadb.itineraryMaster.findUnique({
    where: {
      id: params.itineraryMasterId
    },
    include: {
      location: true,
      hotel: true,
      itineraryMasterImages: true,
      activities:
      {
        include: {
          activityImages: true,
        }
      }
    }
  });

  const activitiesMaster = await prismadb.activityMaster.findMany({

    include: {
      activityMasterImages: true,
    },
  }
  );

  const locations = await prismadb.location.findMany({

  });

  const hotels = await prismadb.hotel.findMany({

  });


  return (
    <>{/*       <Navbar /> */}
      <SidebarProvider>
        <AppSidebar />
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <ItineraryMasterForm
              hotels={hotels}
              locations={locations}
              activitiesMaster={activitiesMaster}
              initialData={itineraryMaster}
            />
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}

export default ItineraryMasterPage;
