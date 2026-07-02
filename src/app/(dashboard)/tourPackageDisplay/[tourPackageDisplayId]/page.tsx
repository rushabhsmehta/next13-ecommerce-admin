import prismadb from "@/lib/prismadb";

import { TourPackageDisplay } from "./components/tourPackageDisplay";
import Navbar from "@/components/navbar";

const tourPackageDisplayPage = async (
  props: {
    params: Promise<{ tourPackageDisplayId: string }>
  }
) => {
  const params = await props.params;
  const tourPackage = await prismadb.tourPackage.findUnique({
    where: {
      id: params.tourPackageDisplayId,
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
      }
    }
  });
  console.log("Fetched tourPackage :", tourPackage);

  const locations = await prismadb.location.findMany({
   
  });

  const hotels = await prismadb.hotel.findMany({
    
    include: {
      images: true,
      location: true,
      destination: true,
    }
  });



  return (
    <>
      <div className="flex-col">
      {/*  <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <TourPackageForm
          initialData={tourPackage}
          locations={locations}
          hotels={hotels}
        //    itineraries={[]}
        />
      </div>
 */}
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <TourPackageDisplay
          initialData={tourPackage}
          locations={locations}
          hotels={hotels}
        //    itineraries={[]}
        />
      </div>
    </div>
    </>
  );
}
export default tourPackageDisplayPage;
