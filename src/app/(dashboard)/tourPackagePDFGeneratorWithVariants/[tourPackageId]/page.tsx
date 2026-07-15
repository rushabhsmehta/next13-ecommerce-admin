import prismadb from "@/lib/prismadb";
import TourPackagePDFGeneratorWithVariants from "./components/tourPackagePDFGeneratorWithVariants";

const TourPackagePDFWithVariantsPage = async (
  props: {
    params: Promise<{ tourPackageId: string }>;
    searchParams: Promise<{ print?: string; search?: string }>;
  }
) => {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const tourPackage = await prismadb.tourPackage.findUnique({
    where: {
      id: params.tourPackageId,
    },
    include: {
      images: true,
      flightDetails: {
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
      packageVariants: {
        include: {
          variantHotelMappings: {
            include: {
              hotel: {
                include: {
                  images: {
                    orderBy: {
                      createdAt: 'asc',
                    },
                  },
                  destination: true,
                  location: true,
                },
              },
              itinerary: true,
            },
            orderBy: {
              itinerary: {
                dayNumber: 'asc',
              },
            },
          },
          tourPackagePricings: {
            include: {
              mealPlan: true,
              vehicleType: true,
              locationSeasonalPeriod: true,
              pricingComponents: {
                include: {
                  pricingAttribute: true,
                },
                orderBy: {
                  pricingAttribute: {
                    sortOrder: 'asc',
                  },
                },
              },
            },
            orderBy: {
              startDate: 'asc',
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        }
      }
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

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <TourPackagePDFGeneratorWithVariants
          initialData={tourPackage}
          locations={locations}
          hotels={hotels}
          printMode={searchParams.print === "1"}
          initialSearchOption={searchParams.search}
        />
      </div>
    </div>
  );
}

export default TourPackagePDFWithVariantsPage;
