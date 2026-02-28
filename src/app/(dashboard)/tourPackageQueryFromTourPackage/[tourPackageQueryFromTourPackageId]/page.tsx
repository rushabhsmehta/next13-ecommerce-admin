import prismadb from "@/lib/prismadb";
import { TourPackageQueryFromTourPackageForm } from "./components/tourPackageQueryFromTourPackage-form";
import Navbar from "@/components/navbar";

const tourPackageQueryFromTourPackagePage = async (
  props: {
    params: Promise<{ tourPackageQueryFromTourPackageId: string }>
  }
) => {
  const params = await props.params;
  const tourPackage = await prismadb.tourPackage.findUnique({
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

  // console.log("Fetched tourPackage Query:", tourPackageQuery);

  const locations = await prismadb.location.findMany({

  });

  const hotels = await prismadb.hotel.findMany({

  });

  const activitiesMaster = await prismadb.activityMaster.findMany({

    include: {
      activityMasterImages: true,
    },
  }
  );

  const itinerariesMaster = await prismadb.itineraryMaster.findMany({
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

  const associatePartners = await prismadb.associatePartner.findMany(); // Add this line

  return (
    <>{/*       <Navbar /> */}
      
        
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
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
