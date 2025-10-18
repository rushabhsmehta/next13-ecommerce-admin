import prismadb from "@/lib/prismadb";

import { TourPackageQueryDisplay } from "./components/tourPackageQueryDisplay";
import Navbar from "@/components/navbar";
import Link from "next/link";

const tourPackageQueryPage = async ({
  params,
  searchParams,
}: {
  params: { tourPackageQueryId: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) => {
  const selectedOptionParam = searchParams?.search;
  const selectedOption = Array.isArray(selectedOptionParam)
    ? selectedOptionParam[0]
    : selectedOptionParam;
  const preferredOption = selectedOption && selectedOption.length ? selectedOption : "AH";
  const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
    where: {
      id: params.tourPackageQueryId,
    },
    include: {
      images: true,      flightDetails: {
        include: {
          images: true,
        },
        orderBy: {
          createdAt: 'asc',
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
      location: true,
      destination: true,
    }
  });

  const associatePartners = await prismadb.associatePartner.findMany();

  // Find latest CREATE audit log entry for this entity (prepared by)
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
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Prepared by: <span className="font-semibold">{preparedByLog.userName}</span> <span className="ml-2">({preparedByLog.userEmail})</span></div>
            {tourPackageQuery && (
              <Link
                href={`/tourPackageQueryPDFGenerator/${tourPackageQuery.id}?search=${preferredOption}`}
                className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-orange-500 text-white hover:bg-orange-600"
              >
                Download PDF
              </Link>
            )}
          </div>
        )}
        <TourPackageQueryDisplay
          initialData={tourPackageQuery}
          locations={locations}
          hotels={hotels}
          associatePartners={associatePartners}
        //    itineraries={[]}
        />
      </div>
    </div>
    </>
  );
}
export default tourPackageQueryPage;
