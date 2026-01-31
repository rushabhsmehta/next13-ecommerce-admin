import prismadb from "@/lib/prismadb";
import { HotelPricingClient } from "./components/client";

const HotelPricingDashboard = async () => {
  // Fetch all active locations
  const locations = await prismadb.location.findMany({
    where: { isActive: true },
    orderBy: { label: 'asc' },
    select: {
      id: true,
      label: true,
    }
  });

  // Fetch all active hotels with their locations
  const hotels = await prismadb.hotel.findMany({
    include: {
      location: true,
      destination: true,
    },
    orderBy: {
      name: 'asc'
    }
  });

  // Fetch configuration data
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
      <div className="flex-1 space-y-4 p-8 pt-6">
        <HotelPricingClient 
          locations={locations}
          hotels={hotels}
          roomTypes={roomTypes}
          occupancyTypes={occupancyTypes}
          mealPlans={mealPlans}
        />
      </div>
    </div>
  );
};

export default HotelPricingDashboard;
