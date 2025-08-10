import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import prismadb from "@/lib/prismadb";
import HotelDetailsUpdateForm from "./components/hotel-details-update-form-clean";

const HotelDetailsUpdatePage = async ({
  params
}: {
  params: { tourPackageQueryId: string }
}) => {
  const { userId } = auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
    where: {
      id: params.tourPackageQueryId
    },
    include: {
      itineraries: {
        include: {
          roomAllocations: {
            include: {
              roomType: true,
              occupancyType: true,
              mealPlan: true
            }
          },
          transportDetails: {
            include: {
              vehicleType: true
            }
          }
        },
        orderBy: {
          dayNumber: 'asc'
        }
      }
    }
  });

  if (!tourPackageQuery) {
    redirect('/tourPackageQuery');
  }

  // Fetch lookup data
  const [hotels, roomTypes, occupancyTypes, mealPlans, vehicleTypes] = await Promise.all([
    prismadb.hotel.findMany({
      include: {
        images: true
      },
      orderBy: {
        name: 'asc'
      }
    }),
    prismadb.roomType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    }),
    prismadb.occupancyType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    }),
    prismadb.mealPlan.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    }),
    prismadb.vehicleType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })
  ]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <HotelDetailsUpdateForm
          initialData={tourPackageQuery}
          hotels={hotels}
          roomTypes={roomTypes}
          occupancyTypes={occupancyTypes}
          mealPlans={mealPlans}
          vehicleTypes={vehicleTypes}
        />
      </div>
    </div>
  );
};

export default HotelDetailsUpdatePage;
