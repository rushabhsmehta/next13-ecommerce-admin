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
      flightDetails: true,
      itineraries: {
        include: {
          itineraryImages: true,
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
    }
  });



  return (
    <>
      <div className="flex-col">
      {/*  <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackageForm
          initialData={tourPackage}
          locations={locations}
          hotels={hotels}
        //    itineraries={[]}
        />
      </div>
 */}
      <div className="flex-1 space-y-4 p-8 pt-6">
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
