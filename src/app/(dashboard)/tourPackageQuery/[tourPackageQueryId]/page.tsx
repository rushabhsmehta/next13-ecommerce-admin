import prismadb from "@/lib/prismadb";

import { TourPackageQueryForm } from "./components/tourPackageQuery-form";
import { Turret_Road } from "next/font/google";
import Navbar from "@/components/navbar";

const tourPackageQueryPage = async ({
  params
}: {
  params: { tourPackageQueryId: string }
}) => {
<<<<<<< HEAD
  // Use transaction to batch all database queries into a single connection
  // Split into two transactions to avoid timeout due to complex queries
  const { 
    tourPackageQuery,
    associatePartners,
    locations,
    hotels,
    activitiesMaster,
    itinerariesMaster
  } = await prismadb.$transaction(async (tx) => {
    const tourPackageQuery = await tx.tourPackageQuery.findUnique({
      where: {
        id: params.tourPackageQueryId,
      },
      include: {
        images: true,      
        flightDetails: true,
        itineraries: {
          include: {
            itineraryImages: true,
            roomAllocations: {
              include: {
                roomType: true,
                occupancyType: true,
                mealPlan  : true,
              },
              orderBy: {
                createdAt: 'asc'
              },
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
=======
  const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
    where: {
      id: params.tourPackageQueryId,
    },
    include: {
      images: true,      
      flightDetails: true,
      itineraries: {
        include: {
          itineraryImages: true,
          roomAllocations: {
            include: {
              roomType: true,
              occupancyType: true,
              mealPlan  : true,
            }
          },
          transportDetails: {
            include: {
              vehicleType: true,
>>>>>>> parent of 2f23c33 (.)
            }
          },
          orderBy: {
            dayNumber: 'asc'
          }
        },
      }
    });
    
    const associatePartners = await tx.associatePartner.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    const locations = await tx.location.findMany({});

    const hotels = await tx.hotel.findMany({
      include: {
        images: true
      }
    });

    const activitiesMaster = await tx.activityMaster.findMany({
      include: {
        activityMasterImages: true,
      },
    });

    const itinerariesMaster = await tx.itineraryMaster.findMany({
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
    
    return {
      tourPackageQuery,
      associatePartners,
      locations,
      hotels,
      activitiesMaster,
      itinerariesMaster
    };
  });
  
  // Use a separate transaction for the tour packages query
  // to avoid transaction timeout with large data sets
  const { tourPackages } = await prismadb.$transaction(async (tx) => {
    const tourPackages = await tx.tourPackage.findMany({
      where: {
        isArchived: false
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
    
    return { tourPackages };
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
