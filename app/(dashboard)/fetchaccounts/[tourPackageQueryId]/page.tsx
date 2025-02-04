import prismadb from "@/lib/prismadb";

import { TourPackageQueryDisplay } from "./components/fetchaccounts";
import Navbar from "@/components/navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

const tourPackageQueryPage = async ({
  params
}: {
  params: { tourPackageQueryId: string }
}) => {
  const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
    where: {
      id: params.tourPackageQueryId,
    },
    include: {
      images: true,
      flightDetails: true,
      itineraries: {
        include: {
          itineraryImages: true,
          activities:
          {
            include: {
              activityImages: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          dayNumber: 'asc',
        }
      }
    }
  });
  console.log("Fetched tourPackage Query:", tourPackageQuery);

  const locations = await prismadb.location.findMany({

  });

  const hotels = await prismadb.hotel.findMany({

    include: {
      images: true,
    }
  });



  return (
    <>
      {/*       <Navbar /> */}
      <SidebarProvider>
        <AppSidebar />
        <div className="flex-col">
          {/*  <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackageQueryForm
          initialData={tourPackageQuery}
          locations={locations}
          hotels={hotels}
        //    itineraries={[]}
        />
      </div>
 */}
          <div className="flex-1 space-y-4 p-8 pt-6">
            <TourPackageQueryDisplay
              initialData={tourPackageQuery}
              locations={locations}
              hotels={hotels}
            //    itineraries={[]}
            />
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
export default tourPackageQueryPage;
