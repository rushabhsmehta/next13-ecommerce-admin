import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { OccupancyTypesClient } from "./components/client";

const OccupancyTypesPage = async () => {
  const occupancyTypes = await prismadb.occupancyType.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  const formattedOccupancyTypes = occupancyTypes.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description || '',
    maxPersons: item.maxPersons,
    isActive: item.isActive,
    createdAt: format(item.createdAt, 'MMMM d, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <OccupancyTypesClient data={formattedOccupancyTypes} />
      </div>
    </div>
  );
};

export default OccupancyTypesPage;
