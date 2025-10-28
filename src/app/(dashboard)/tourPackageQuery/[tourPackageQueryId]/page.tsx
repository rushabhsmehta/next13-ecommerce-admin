import prismadb from "@/lib/prismadb";

import { TourPackageQueryForm } from "./components/tourPackageQuery-form";
import { Turret_Road } from "next/font/google";
import Navbar from "@/components/navbar";

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
    }
  });
  // console.log("Fetched tourPackage Query:", tourPackageQuery);

  // Optimize: Only fetch active associate partners with minimal fields
  const associatePartners = await prismadb.associatePartner.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50, // Limit to 50 most recent
  });

  // Optimize: Only fetch essential location fields
  const locations = await prismadb.location.findMany({
    orderBy: {
      label: 'asc',
    }
  });

  // Optimize: Only fetch hotels for the specific location if editing
  const hotels = await prismadb.hotel.findMany({
    where: tourPackageQuery?.locationId ? {
      locationId: tourPackageQuery.locationId,
    } : undefined,
    include: {
      images: true,
    },
    take: 100, // Limit hotels
  });

  // Optimize: Only fetch activity masters for the specific location
  const activitiesMaster = await prismadb.activityMaster.findMany({
    where: tourPackageQuery?.locationId ? {
      locationId: tourPackageQuery.locationId,
    } : undefined,
    include: {
      activityMasterImages: true,
    },
    take: 50,
  });

  // Optimize: Only fetch itinerary masters for the specific location
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
    },
    take: 50,
  });

  // Optimize: Only fetch tour packages for the specific location with minimal data
  const tourPackages = await prismadb.tourPackage.findMany({
    where: {
      isArchived: false,
      locationId: tourPackageQuery?.locationId,
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
      },
    },
    take: 20, // Limit to 20 packages
  });

  // Optimize: Only fetch recent tour package queries as templates
  const tourPackageQueries = await prismadb.tourPackageQuery.findMany({
    where: {
      isArchived: false,
      locationId: tourPackageQuery?.locationId,
      createdAt: {
        gt: new Date('2024-12-31')
      }
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
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 30, // Limit to 30 most recent
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
