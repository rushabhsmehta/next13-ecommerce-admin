import prismadb from "@/lib/prismadb";

import { TourPackageForm } from "./components/tourPackage-form.tsx";

const tourPackagePage = async ({
  params
}: {
  params: { tourPackageId: string, storeId: string }
}) => {
  const tourPackage = await prismadb.tourPackage.findUnique({
    where: {
      id: params.tourPackageId,
    },
    include: {
      images: true,
      itineraries: {
        include: {
          activities: true,
        },
        orderBy: {
          days: 'asc' // or 'desc', depending on the desired order
        }
      }
    }
  });
  console.log("Fetched tourPackage:", tourPackage);

  const locations = await prismadb.location.findMany({
    where: {
      storeId: params.storeId,
    },
  });

  const hotels = await prismadb.hotel.findMany({
    where: {
      storeId: params.storeId,
    },
  });



  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackageForm
          initialData={tourPackage}
          locations={locations}
          hotels={hotels}
      //    itineraries={[]}
        />
      </div>
    </div>
  );
}

export default tourPackagePage;
