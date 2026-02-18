import prismadb from "@/lib/prismadb";


import Navbar from "@/components/navbar";
import TourPackageQueryPDFGenerator from "./components/tourPackageQueryPDFGenerator";
import Link from "next/link";

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
      queryVariantSnapshots: {
        include: {
          hotelSnapshots: {
            orderBy: { dayNumber: 'asc' },
          },
          pricingSnapshots: {
            include: {
              pricingComponentSnapshots: {
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    }
  });
  console.log("Fetched tourPackage Query:", tourPackageQuery);

  const locations = await prismadb.location.findMany({
    
  });

  const hotels = await prismadb.hotel.findMany({
    
    include: {
      images: true,
      destination: true,
      location: true,
    }
  });

  const associatePartners = await prismadb.associatePartner.findMany();

  // Prepared by (latest CREATE audit log)
  const preparedByLog = await prismadb.auditLog.findFirst({
    where: {
      entityId: params.tourPackageQueryId,
      entityType: "TourPackageQuery",
      action: "CREATE",
    },
    orderBy: { createdAt: 'desc' },
  });

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
        {preparedByLog && (
          <div className="text-sm text-gray-600">Prepared by: <span className="font-semibold">{preparedByLog.userName}</span> <span className="ml-2">({preparedByLog.userEmail})</span></div>
        )}
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
