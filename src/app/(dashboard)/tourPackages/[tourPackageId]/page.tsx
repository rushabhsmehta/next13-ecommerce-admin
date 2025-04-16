import prismadb from "@/lib/prismadb";

import { TourPackageForm } from "./components/tourPackage-form";
import Navbar from "@/components/navbar";



const tourPackagePage = async ({
  params
}: {
  params: { tourPackageId: string }
}) => {
  // Use transaction to batch all database queries into a single connection
  const { 
    tourPackage,
    locations,
    hotels,
    activitiesMaster,
    itinerariesMaster
  } = await prismadb.$transaction(async (tx) => {
    const tourPackage = await tx.tourPackage.findUnique({
      where: {
        id: params.tourPackageId,
      },
      include: {
        images: true,
        flightDetails: true,
        itineraries: {
          include: {
            itineraryImages: true,
            activities:
            {
              include:
              {
                activityImages: true,
              }
            }
          },
          orderBy: {
            dayNumber: 'asc' // or 'desc', depending on the desired order
          }
        }
      }
    });

    const locations = await tx.location.findMany({});

    const hotels = await tx.hotel.findMany({});

    const activitiesMaster = await tx.activityMaster.findMany({
      include: {
        activityMasterImages: true,
      },
    });

    const itinerariesMaster = await tx.itineraryMaster.findMany({
      where: {
        locationId: tourPackage?.locationId ?? '',
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
      tourPackage, 
      locations, 
      hotels, 
      activitiesMaster, 
      itinerariesMaster
    };
  });

  return (
    <>{/*       <Navbar /> */}
      
        
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <TourPackageForm
              initialData={tourPackage}
              locations={locations}
              hotels={hotels}
              activitiesMaster={activitiesMaster}
              itinerariesMaster={itinerariesMaster} />
          </div>
        </div>
      
    </>
  );
}

export default tourPackagePage;
