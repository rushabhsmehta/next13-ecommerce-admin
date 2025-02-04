import prismadb from "@/lib/prismadb";

import { TourPackageQueryForm } from "./components/accounts-form";
import { Turret_Road } from "next/font/google";
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



  return (
    <>{/*       <Navbar /> */}
      <SidebarProvider>
        <AppSidebar />
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <TourPackageQueryForm
              initialData={tourPackageQuery}
            />
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
export default tourPackageQueryPage;
