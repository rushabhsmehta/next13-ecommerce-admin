import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { VehicleTypesClient } from "./components/client";

const VehicleTypesPage = async () => {
  const vehicleTypes = await prismadb.vehicleType.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
  const formattedVehicleTypes = vehicleTypes.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description || '',
    isActive: item.isActive,
    createdAt: format(item.createdAt, 'MMMM d, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <VehicleTypesClient data={formattedVehicleTypes} />
      </div>
    </div>
  );
};

export default VehicleTypesPage;
