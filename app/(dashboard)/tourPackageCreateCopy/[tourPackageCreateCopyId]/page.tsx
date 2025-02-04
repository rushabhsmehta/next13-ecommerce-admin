import prismadb from "@/lib/prismadb";

import { TourPackageCreateCopyForm } from "./components/tourPackageCreateCopy-form";
import Navbar from "@/components/navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

const tourPackagePage = async ({ params }: { params: { tourPackageCreateCopyId: string } }) => {
  const tourPackage = await prismadb.tourPackage.findUnique({
    where: {
      id: params.tourPackageCreateCopyId,
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
  // console.log("Fetched tourPackage :", tourPackage);

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
      locationId: tourPackage?.locationId ?? '',
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
    <>{/*       <Navbar /> */}
      <SidebarProvider>
        <AppSidebar />
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <TourPackageCreateCopyForm
              initialData={tourPackage}
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
export default tourPackagePage;
