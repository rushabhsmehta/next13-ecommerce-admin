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
      },
      queryVariantSnapshots: {
        include: {
          hotelSnapshots: {
            orderBy: { dayNumber: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    }
  });

  // Build a dayNumber → hotelId map for the confirmed variant
  const confirmedVariantId = tourPackageQueryVoucher?.confirmedVariantId;
  const confirmedSnapshot = confirmedVariantId
    ? tourPackageQueryVoucher?.queryVariantSnapshots?.find(s => s.sourceVariantId === confirmedVariantId)
    : null;
  const confirmedVariantHotelsByDay: Record<number, string> = {};
  confirmedSnapshot?.hotelSnapshots?.forEach(hs => {
    confirmedVariantHotelsByDay[hs.dayNumber] = hs.hotelId;
  });
  const confirmedVariantName = confirmedSnapshot?.name ?? null;

  const locations = await prismadb.location.findMany({});

  const hotels = await prismadb.hotel.findMany({
    include: { images: true }
  });

  const roomTypes = await prismadb.roomType.findMany({});
  const occupancyTypes = await prismadb.occupancyType.findMany({});
  const mealPlans = await prismadb.mealPlan.findMany({});
  const vehicleTypes = await prismadb.vehicleType.findMany({});

  return (
    <>

      <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <TourPackageQueryVoucherDisplay
          initialData={tourPackageQueryVoucher}
          locations={locations}
          hotels={hotels}
          roomTypes={roomTypes}
          occupancyTypes={occupancyTypes}
          mealPlans={mealPlans}
          vehicleTypes={vehicleTypes}
          confirmedVariantHotelsByDay={confirmedVariantHotelsByDay}
          confirmedVariantName={confirmedVariantName}
        />
      </div>
    </div>
    </>
  );
}
export default tourPackageQueryVoucherPage;
