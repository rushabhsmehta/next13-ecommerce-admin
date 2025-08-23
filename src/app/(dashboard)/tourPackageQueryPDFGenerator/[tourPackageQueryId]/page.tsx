import prismadb from "@/lib/prismadb";


import Navbar from "@/components/navbar";
import TourPackageQueryPDFGenerator from "./components/tourPackageQueryPDFGenerator";

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
      flightDetails: {
        include: {
          images: true,
        },
      },
      itineraries: {
        include: {
          itineraryImages: true,
          roomAllocations: {
            include: {
              roomType: true,
              occupancyType: true,
              mealPlan: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
          transportDetails: {
            include: {
              vehicleType: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
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
          dayNumber : 'asc',
        }
      },
      associatePartner: true,
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

  const associatePartners = await prismadb.associatePartner.findMany();

  return (
    <>
    
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
        <TourPackageQueryPDFGenerator
          initialData={tourPackageQuery}
          locations={locations}
          hotels={hotels}
          associatePartners={associatePartners} // Add this line
        />
      </div>
    </div>
    </>
  );
}
export default tourPackageQueryPage;
