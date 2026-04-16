import prismadb from "@/lib/prismadb";


import Navbar from "@/components/navbar";
import TourPackageQueryPDFGenerator from "./components/tourPackageQueryPDFGenerator";
import Link from "next/link";
import { buildSyntheticSnapshots } from "@/lib/buildSyntheticSnapshots";

const tourPackageQueryPage = async (
  props: {
    params: Promise<{ tourPackageQueryId: string }>
  }
) => {
  const params = await props.params;
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
              extraBeds: {
                include: {
                  occupancyType: true,
                },
              },
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

  // Build synthetic snapshots if DB snapshots are empty but variant data exists
  if (tourPackageQuery && (!tourPackageQuery.queryVariantSnapshots || tourPackageQuery.queryVariantSnapshots.length === 0)) {
    const selectedVariantIds = (tourPackageQuery as any).selectedVariantIds as string[] | null;
    const customQueryVariants = (tourPackageQuery as any).customQueryVariants as any[] | null;
    const hasVariants = (selectedVariantIds && selectedVariantIds.length > 0) || (customQueryVariants && customQueryVariants.length > 0);

    if (hasVariants) {
      let packageVariants: any[] = [];
      if (selectedVariantIds && selectedVariantIds.length > 0) {
        packageVariants = await prismadb.packageVariant.findMany({
          where: { id: { in: selectedVariantIds } },
          include: {
            variantHotelMappings: {
              include: {
                hotel: {
                  include: {
                    images: { orderBy: { createdAt: 'asc' }, take: 1 },
                    location: true,
                  },
                },
                itinerary: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        });
      }

      const syntheticSnapshots = buildSyntheticSnapshots({
        selectedVariantIds,
        packageVariants,
        variantHotelOverrides: (tourPackageQuery as any).variantHotelOverrides,
        variantPricingData: (tourPackageQuery as any).variantPricingData,
        customQueryVariants,
        itineraries: tourPackageQuery.itineraries,
        hotels: hotels as any,
      });

      (tourPackageQuery as any).queryVariantSnapshots = syntheticSnapshots;
    }
  }

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
      {/*  <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <TourPackageQueryForm
          initialData={tourPackageQuery}
          locations={locations}
          hotels={hotels}
        //    itineraries={[]}
        />
      </div>
 */}
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
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
