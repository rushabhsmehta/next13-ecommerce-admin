import prismadb from "@/lib/prismadb";
import TourPackageQueryPDFGeneratorWithVariants from "./components/tourPackageQueryPDFGeneratorWithVariants";
import { buildSyntheticSnapshots } from "@/lib/buildSyntheticSnapshots";
import {
  filterVariantSnapshotsForDisplay,
  getActiveVariantIds,
  getMissingActiveVariantIds,
  mergeVariantSnapshotsWithSynthetics,
  parseSelectedVariantIds,
} from "@/lib/variant-display-utils";
import { enrichVariantPricingData } from "@/lib/enrich-variant-pricing-data";

const TourPackageQueryPDFWithVariantsPage = async (
  props: {
    params: Promise<{ tourPackageQueryId: string }>;
    searchParams: Promise<{ print?: string; search?: string }>;
  }
) => {
  const params = await props.params;
  const searchParams = await props.searchParams;
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
          activities: {
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
      },
      associatePartner: true,
      queryVariantSnapshots: {
        include: {
          hotelSnapshots: {
            include: {
              hotel: {
                include: {
                  destination: true,
                },
              },
            },
            orderBy: {
              dayNumber: 'asc',
            },
          },
          pricingSnapshots: {
            include: {
              pricingComponentSnapshots: {
                orderBy: {
                  createdAt: 'asc',
                },
              },
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      },
    }
  });

  const locations = await prismadb.location.findMany({});

  const hotels = await prismadb.hotel.findMany({
    include: {
      images: true,
      destination: true,
      location: true,
    }
  });

  if (tourPackageQuery) {
    (tourPackageQuery as any).variantPricingData = await enrichVariantPricingData({
      tourStartsFrom: tourPackageQuery.tourStartsFrom,
      tourEndsOn: tourPackageQuery.tourEndsOn,
      itineraries: tourPackageQuery.itineraries,
      variantRoomAllocations: (tourPackageQuery as any).variantRoomAllocations,
      variantTransportDetails: (tourPackageQuery as any).variantTransportDetails,
      variantPricingData: (tourPackageQuery as any).variantPricingData,
      variantHotelOverrides: (tourPackageQuery as any).variantHotelOverrides,
    });

    const activeVariantIds = getActiveVariantIds(tourPackageQuery);

    if (activeVariantIds.length === 0) {
      (tourPackageQuery as any).queryVariantSnapshots = [];
    } else {
      const filteredSnapshots = filterVariantSnapshotsForDisplay(
        tourPackageQuery.queryVariantSnapshots,
        activeVariantIds
      );
      const missingIds = getMissingActiveVariantIds(
        filteredSnapshots,
        activeVariantIds
      );

      if (missingIds.length === 0) {
        (tourPackageQuery as any).queryVariantSnapshots = filteredSnapshots;
      } else {
        const selectedVariantIds = parseSelectedVariantIds(
          (tourPackageQuery as any).selectedVariantIds
        );
        const customQueryVariants = (tourPackageQuery as any)
          .customQueryVariants as any[] | null;
        const missingSelected = selectedVariantIds.filter((id) =>
          missingIds.includes(id)
        );
        const missingCustoms = Array.isArray(customQueryVariants)
          ? customQueryVariants.filter(
              (cv) => cv?.id && missingIds.includes(cv.id)
            )
          : [];

        let packageVariants: any[] = [];
        if (missingSelected.length > 0) {
          packageVariants = await prismadb.packageVariant.findMany({
            where: { id: { in: missingSelected } },
            include: {
              variantHotelMappings: {
                include: {
                  hotel: {
                    include: {
                      images: { orderBy: { createdAt: "asc" }, take: 1 },
                      location: true,
                    },
                  },
                  itinerary: true,
                },
              },
            },
            orderBy: { sortOrder: "asc" },
          });
        }

        const syntheticSnapshots = buildSyntheticSnapshots({
          selectedVariantIds: missingSelected,
          packageVariants,
          variantHotelOverrides: (tourPackageQuery as any).variantHotelOverrides,
          variantPricingData: (tourPackageQuery as any).variantPricingData,
          customQueryVariants: missingCustoms,
          itineraries: tourPackageQuery.itineraries,
          hotels: hotels as any,
        });

        (tourPackageQuery as any).queryVariantSnapshots =
          mergeVariantSnapshotsWithSynthetics(
            filteredSnapshots,
            filterVariantSnapshotsForDisplay(syntheticSnapshots, activeVariantIds),
            activeVariantIds
          );
      }
    }
  }

  const associatePartners = await prismadb.associatePartner.findMany();

  const roomTypes = await prismadb.roomType.findMany();
  const occupancyTypes = await prismadb.occupancyType.findMany();
  const mealPlans = await prismadb.mealPlan.findMany();
  const vehicleTypes = await prismadb.vehicleType.findMany();

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
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        {preparedByLog && (
          <div className="text-sm text-gray-600">
            Prepared by: <span className="font-semibold">{preparedByLog.userName}</span>
            <span className="ml-2">({preparedByLog.userEmail})</span>
          </div>
        )}
        <TourPackageQueryPDFGeneratorWithVariants
          initialData={tourPackageQuery}
          locations={locations}
          hotels={hotels}
          associatePartners={associatePartners}
          roomTypes={roomTypes}
          occupancyTypes={occupancyTypes}
          mealPlans={mealPlans}
          vehicleTypes={vehicleTypes}
          printMode={searchParams.print === "1"}
          initialSearchOption={searchParams.search}
        />
      </div>
    </div>
  );
}

export default TourPackageQueryPDFWithVariantsPage;
