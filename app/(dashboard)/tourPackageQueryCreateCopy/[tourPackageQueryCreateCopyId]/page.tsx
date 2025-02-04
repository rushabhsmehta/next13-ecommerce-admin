import prismadb from "@/lib/prismadb";

import { TourPackageQueryCreateCopyForm } from "./components/tourPackageQueryCreateCopy-form";
import Navbar from "@/components/navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

const tourPackageQueryPage = async ({
  params
}: {
  params: { tourPackageQueryCreateCopyId: string }
}) => {
  const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
    where: {
      id: params.tourPackageQueryCreateCopyId,
    },
    include: {
      images: true,
      flightDetails: true,
      itineraries: {
        include: {
          itineraryImages: true,
          activities:
          {
            include:
            {
              activityImages: true,
            }
          }
        },
        orderBy: {
          dayNumber: 'asc' // or 'desc', depending on the desired order
        }
      }
    }
  });
  // console.log("Fetched tourPackage Query:", tourPackageQuery);

  const locations = await prismadb.location.findMany({

  });

  const hotels = await prismadb.hotel.findMany({

  });

  const activitiesMaster = await prismadb.activityMaster.findMany({

    include: {
      activityMasterImages: true,
    },
  }
  );

  const itinerariesMaster = await prismadb.itineraryMaster.findMany({

    where: {
      locationId: tourPackageQuery?.locationId ?? '',
    },

    include: {
      itineraryMasterImages: true,
      activities: {
        include: {
          activityImages: true,
        }
      },
    }
  });

  return (
    <>
      {/*       <Navbar /> */}
      <SidebarProvider>
        <AppSidebar />
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <TourPackageQueryCreateCopyForm
              initialData={tourPackageQuery}
              locations={locations}
              hotels={hotels}
              activitiesMaster={activitiesMaster}
              itinerariesMaster={itinerariesMaster} />
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
export default tourPackageQueryPage;
