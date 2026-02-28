import prismadb from "@/lib/prismadb";

import { TourPackageQueryVoucherDisplay } from "./components/tourPackageQueryVoucherDisplay";
import Navbar from "@/components/navbar";

const tourPackageQueryVoucherPage = async (
  props: {
    params: Promise<{ tourPackageQueryVoucherId: string }>
  }
) => {
  const params = await props.params;
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
          roomAllocations: {
            include: {
              roomType: true,
              occupancyType: true,
              mealPlan: true,
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
  console.log("Fetched tourPackage Query Voucher:", tourPackageQueryVoucher);

  const locations = await prismadb.location.findMany({});

  const hotels = await prismadb.hotel.findMany({
    include: { images: true }
  });

  const roomTypes = await prismadb.roomType.findMany({});
  const occupancyTypes = await prismadb.occupancyType.findMany({});
  const mealPlans = await prismadb.mealPlan.findMany({});



  return (
    <>
    
      <div className="flex-col">
      {/*  <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <TourPackageQueryForm
          initialData={tourPackageQuery}
          locations={locations}
          hotels={hotels}
        //    itineraries={[]}
        />
      </div>
 */}
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <TourPackageQueryVoucherDisplay
          initialData={tourPackageQueryVoucher}
          locations={locations}
          hotels={hotels}
          roomTypes={roomTypes}
          occupancyTypes={occupancyTypes}
          mealPlans={mealPlans}
        />
      </div>
    </div>
    </>
  );
}
export default tourPackageQueryVoucherPage;
