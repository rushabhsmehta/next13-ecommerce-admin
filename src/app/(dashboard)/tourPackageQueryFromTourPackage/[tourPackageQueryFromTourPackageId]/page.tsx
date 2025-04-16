import prismadb from "@/lib/prismadb";
import { TourPackageQueryFromTourPackageForm } from "./components/tourPackageQueryFromTourPackage-form";
import Navbar from "@/components/navbar";

const tourPackageQueryFromTourPackagePage = async ({
  params
}: {
  params: { tourPackageQueryFromTourPackageId: string }
}) => {
  // Use transaction to batch all database queries into a single connection
  const { 
    tourPackage, 
    locations, 
    hotels, 
    activitiesMaster, 
    itinerariesMaster,
    associatePartners 
  } = await prismadb.$transaction(async (tx) => {
    const tourPackage = await tx.tourPackage.findUnique({
      where: {
        id: params.tourPackageQueryFromTourPackageId,
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
    
    const associatePartners = await tx.associatePartner.findMany();
    
    return {
      tourPackage,
      locations,
      hotels,
      activitiesMaster,
      itinerariesMaster,
      associatePartners
    };
  });

  return (
    <>{/*       <Navbar /> */}
      
        
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <TourPackageQueryFromTourPackageForm
              initialData={tourPackage}
              locations={locations}
              hotels={hotels}
              activitiesMaster={activitiesMaster}
              itinerariesMaster={itinerariesMaster}
              associatePartners={associatePartners} // Add this line
            />
          </div>
        </div>
      
    </>
  );
}
export default tourPackageQueryFromTourPackagePage;
