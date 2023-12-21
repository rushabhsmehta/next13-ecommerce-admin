import prismadb from "@/lib/prismadb";

import { TourPackageQueryDisplay } from "./components/tourPackageQueryDisplay";

const tourPackageQueryPage = async ({
  params
}: {
  params: { tourPackageQueryId: string, storeId: string }
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
          activities: true,
        },      
        orderBy: {
          days: 'asc' // or 'desc', depending on the desired order
        }
      }
    }
  });
  console.log("Fetched tourPackage Query:", tourPackageQuery);

  const locations = await prismadb.location.findMany({
    where: {
      storeId: params.storeId,
    },
  });

  const hotels = await prismadb.hotel.findMany({
    where: {
      storeId: params.storeId,
    },
  });



  return (
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
          initialData = {tourPackageQuery}
          locations={locations}
          hotels={hotels}
        //    itineraries={[]}
        />
      </div>
    </div>    
  );
}
export default tourPackageQueryPage;
