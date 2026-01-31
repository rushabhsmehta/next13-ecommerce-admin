import { notFound } from "next/navigation";

import prismadb from "@/lib/prismadb";

import { TourPackageQueryForm } from "./components/tourPackageQuery-form";

const IMAGE_SELECT = {
  id: true,
  url: true,
  createdAt: true,
  updatedAt: true,
  tourPackageId: true,
  tourPackageQueryId: true,
  hotelId: true,
  itinerariesId: true,
  activitiesId: true,
  activitiesMasterId: true,
  itinerariesMasterId: true,
  paymentDetailsId: true,
  receiptDetailsId: true,
  expenseDetailsId: true,
  incomeDetailsId: true,
  flightDetailsId: true,
} as const;

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
      images: {
        select: IMAGE_SELECT,
      },
      flightDetails: {
        include: {
          images: {
            select: IMAGE_SELECT,
          },
        },
      },
      itineraries: {
        orderBy: {
          dayNumber: 'asc',
        },
        include: {
          itineraryImages: {
            select: IMAGE_SELECT,
          },
          roomAllocations: {
            include: {
              roomType: true,
              occupancyType: true,
              mealPlan: true,
            },
          },
          transportDetails: {
            include: {
              vehicleType: true,
            },
          },
          activities: {
            include: {
              activityImages: {
                select: IMAGE_SELECT,
              },
            },
          },
        },
      },
    },
  });

  if (!tourPackageQuery && params.tourPackageQueryId !== 'new') {
    notFound();
  }

  const locationId = tourPackageQuery?.locationId ?? undefined;
  const locationFilter = locationId ? { locationId } : undefined;
  const itineraryMasterFilter = locationId ? { locationId } : { locationId: "" };

  // Fetch supporting datasets in parallel to avoid sequential Prisma round-trips.
  const [
    associatePartners,
    locations,
    hotels,
    activitiesMaster,
    itinerariesMaster,
    tourPackages,
    tourPackageQueries,
  ] = await Promise.all([
    prismadb.associatePartner.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        mobileNumber: true,
        updatedAt: true,
        isActive: true,
        gmail: true,
        createdAt: true,
      },
    }),
    prismadb.location.findMany({
      orderBy: {
        label: 'asc',
      },
      select: {
        id: true,
        label: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        slug: true,
        tags: true,
        inclusions: true,
        exclusions: true,
        importantNotes: true,
        paymentPolicy: true,
        usefulTip: true,
        cancellationPolicy: true,
        airlineCancellationPolicy: true,
        termsconditions: true,
        kitchenGroupPolicy: true,
        isActive: true,
        value: true,
      },
    }),
    prismadb.hotel.findMany({
      where: locationFilter,
      include: {
        images: {
          select: IMAGE_SELECT,
        },
      },
      take: 100,
    }),
    prismadb.activityMaster.findMany({
      where: locationFilter,
      include: {
        activityMasterImages: {
          select: IMAGE_SELECT,
        },
      },
      take: 50,
    }),
    prismadb.itineraryMaster.findMany({
      where: itineraryMasterFilter,
      include: {
        itineraryMasterImages: {
          select: IMAGE_SELECT,
        },
        activities: {
          include: {
            activityImages: {
              select: IMAGE_SELECT,
            },
          }
        },
      },
      take: 50,
    }),
    prismadb.tourPackage.findMany({
      where: {
        isArchived: false,
        // For new queries, don't fetch any packages (will be loaded dynamically)
        // For editing, fetch packages for that location
        locationId: locationId || 'no-initial-fetch',
      },
      include: {
        images: {
          select: IMAGE_SELECT,
        },
        flightDetails: {
          include: {
            images: {
              select: IMAGE_SELECT,
            },
          }
        },
        itineraries: {
          include: {
            itineraryImages: {
              select: IMAGE_SELECT,
            },
            activities: {
              include: {
                activityImages: {
                  select: IMAGE_SELECT,
                },
              }
            },
          }
        },
        packageVariants: {
          include: {
            variantHotelMappings: {
              include: {
                hotel: {
                  include: {
                    images: {
                      select: IMAGE_SELECT,
                    },
                  }
                },
                itinerary: true,
              }
            },
            tourPackagePricings: {
              include: {
                mealPlan: true,
                vehicleType: true,
                locationSeasonalPeriod: true,
                pricingComponents: {
                  include: {
                    pricingAttribute: true,
                  }
                },
              }
            },
          }
        },
      },
      orderBy: {
        tourPackageName: 'asc',
      },
      take: 100,
    }),
    prismadb.tourPackageQuery.findMany({
      where: {
        isArchived: false,
        ...(locationId ? { locationId } : {}),
        createdAt: {
          gt: new Date('2024-12-31'),
        },
      },
      include: {
        images: {
          select: IMAGE_SELECT,
        },
        flightDetails: {
          include: {
            images: {
              select: IMAGE_SELECT,
            },
          }
        },
        itineraries: {
          include: {
            itineraryImages: {
              select: IMAGE_SELECT,
            },
            activities: {
              include: {
                activityImages: {
                  select: IMAGE_SELECT,
                },
              }
            },
          }
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 30,
    }),
  ]);

  return (
    <>{/*       <Navbar /> */}
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <TourPackageQueryForm
            initialData={tourPackageQuery}
            locations={locations}
            hotels={hotels}
            activitiesMaster={activitiesMaster}
            itinerariesMaster={itinerariesMaster}
            associatePartners={associatePartners}
            tourPackages={tourPackages}
            tourPackageQueries={tourPackageQueries}
          />
        </div>

        {/*  <div className="flex-1 space-y-4 p-8 pt-6">
      <TourPackageQueryDisplay
        data={tourPackageQuery}
        locations={locations}
        hotels={hotels}
      //    itineraries={[]}
      />
    </div> */}
      </div>

    </>
  );
}
export default tourPackageQueryPage;
