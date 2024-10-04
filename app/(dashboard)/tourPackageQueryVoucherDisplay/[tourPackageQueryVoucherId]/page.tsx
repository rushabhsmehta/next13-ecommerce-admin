import prismadb from "@/lib/prismadb";

import { TourPackageQueryVoucherDisplay } from "./components/tourPackageQueryVoucherDisplay";
import Navbar from "@/components/navbar";

const tourPackageQueryVoucherPage = async ({

  params: { tourPackageQueryVoucherId: string }
}) => {
  const tourPackageQueryVoucher = await prismadb.tourPackageQuery.findUnique({
    where: {
      id: params.tourPackageQueryVoucherId,
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
  console.log("Fetched tourPackage Query Voucher:", tourPackageQueryVoucher);

  const locations = await prismadb.location.findMany({
    where: {
      storeId: params.storeId,
    },
  });

  const hotels = await prismadb.hotel.findMany({
    where: {
      storeId: params.storeId,
    },
    include: {
      images: true,
    }
  });



  return (
    <>
    
      <div className="flex-col">
      {/*  <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackageQueryForm
          initialData={tourPackageQuery}
          locations={locations}
          hotels={hotels}
        //    itineraries={[]}
        />
      </div>
 */}
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackageQueryVoucherDisplay
          initialData={tourPackageQueryVoucher}
          locations={locations}
          hotels={hotels}
        //    itineraries={[]}
        />
      </div>
    </div>
    </>
  );
}
export default tourPackageQueryVoucherPage;
