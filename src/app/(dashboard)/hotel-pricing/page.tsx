import prismadb from "@/lib/prismadb";
import { HotelPricingClient } from "./components/client";

const HotelPricingDashboard = async ({
  searchParams,
}: {
  searchParams: Promise<{ hotelId?: string }>;
}) => {
  const { hotelId: initialHotelId } = await searchParams;

  const locations = await prismadb.location.findMany({
    where: { isActive: true },
    orderBy: { label: 'asc' },
    select: {
      id: true,
      label: true,
    }
  });

  const hotels = await prismadb.hotel.findMany({
    include: {
      location: true,
      destination: true,
    },
    orderBy: {
      name: 'asc'
    }
  });

  const roomTypes = await prismadb.roomType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  });

  const occupancyTypes = await prismadb.occupancyType.findMany({
    where: { isActive: true },
    orderBy: { rank: 'asc' }
  });

  const mealPlans = await prismadb.mealPlan.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <HotelPricingClient 
          locations={locations}
          hotels={hotels}
          roomTypes={roomTypes}
          occupancyTypes={occupancyTypes}
          mealPlans={mealPlans}
          initialHotelId={initialHotelId}
        />
      </div>
    </div>
  );
};

export default HotelPricingDashboard;
