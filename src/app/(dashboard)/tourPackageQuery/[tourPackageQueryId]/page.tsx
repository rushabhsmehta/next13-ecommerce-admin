import prismadb from "@/lib/prismadb";

import { TourPackageQueryForm } from "./components/tourPackageQuery-form";
import { Turret_Road } from "next/font/google";
import Navbar from "@/components/navbar";

const tourPackageQueryPage = async ({
  params
}: {
  params: { tourPackageQueryId: string }
}) => {
  // Clean up any orphaned variantHotelMappings before fetching
  // This prevents Prisma errors when fetching with includes
  try {
    // Find all itinerary IDs for this tour package query
    const validItineraries = await prismadb.itinerary.findMany({
      where: { tourPackageQueryId: params.tourPackageQueryId },
      select: { id: true }
    });
    const validItineraryIds = validItineraries.map(i => i.id);

    // Delete orphaned mappings (mappings pointing to non-existent itineraries)
    if (validItineraryIds.length > 0) {
      const deleteResult = await prismadb.variantHotelMapping.deleteMany({
        where: {
          packageVariant: {
            tourPackageQueryId: params.tourPackageQueryId
          },
          NOT: {
            itineraryId: {
              in: validItineraryIds
            }
          }
        }
      });
      
      if (deleteResult.count > 0) {
        console.log(`[CLEANUP] Deleted ${deleteResult.count} orphaned hotel mappings for tour package query ${params.tourPackageQueryId}`);
      }
    }
  } catch (cleanupError) {
    console.error('[CLEANUP ERROR] Failed to clean orphaned mappings:', cleanupError);
    // Continue anyway - we'll try to fetch the data
  }

  const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
    where: {
      id: params.tourPackageQueryId,
    },
    include: {
      images: true,
      flightDetails: {
        include: {
          images: true,
        }
      },
      itineraries: {
        orderBy: {
          dayNumber: 'asc' // or 'desc', depending on the desired order
        },
        include: {
          itineraryImages: true,
          roomAllocations: {
            include: {
              roomType: true,
              occupancyType: true,
              mealPlan: true,
            }
          },
          transportDetails: {
            include: {
              vehicleType: true,
            }
          },
          activities: {
            include: {
              activityImages: true,
            }
          }
        }
      },
      packageVariants: {
        include: {
          variantHotelMappings: {
            include: {
              hotel: true
            }
          }
        },
        orderBy: {
          sortOrder: 'asc'
        }
      }
    }
  });
  // console.log("Fetched tourPackage Query:", tourPackageQuery);

  const associatePartners = await prismadb.associatePartner.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });
  const locations = await prismadb.location.findMany({
  });

  const hotels = await prismadb.hotel.findMany({
    include: {
      images: true // Ensure images are included in the query result
    }
  });

  const activitiesMaster = await prismadb.activityMaster.findMany({

    include: {
      activityMasterImages: true,
    },
  }
  );

  const itinerariesMaster = await prismadb.itineraryMaster.findMany({

    where: {
      locationId: tourPackageQuery?.locationId ?? '',
    },
    include: {
      itineraryMasterImages: true,
      activities: {
        include: {
          activityImages: true,
        }
      },
    }
  });
  const tourPackages = await prismadb.tourPackage.findMany({
    where: {
      isArchived: false,
      
    },
    include: {
      images: true,
      flightDetails: true,
      itineraries: {
        include: {
          itineraryImages: true,
          activities: {
            include: {
              activityImages: true
            }
          }
        }
      }
    }
  });

  // Fetch tour package queries for templates
  const tourPackageQueries = await prismadb.tourPackageQuery.findMany({
    where: {
      isArchived: false,
      createdAt: {
        gt: new Date('2024-12-31')
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      images: true,
      flightDetails: true,
      itineraries: {
        include: {
          itineraryImages: true,
          activities: {
            include: {
              activityImages: true
            }
          }
        }
      }
    }
  });

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
