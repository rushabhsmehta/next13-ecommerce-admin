import prismadb from "@/lib/prismadb";


import Navbar from "@/components/navbar";
import TourPackagePDFGenerator from "./components/tourPackagePDFGenerator";

const tourPackagePage = async ({
  params
}: {
  params: { tourPackageId: string }
}) => {
  const tourPackage = await prismadb.tourPackage.findUnique({
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
        <TourPackagePDFGenerator
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
export default tourPackagePage;
