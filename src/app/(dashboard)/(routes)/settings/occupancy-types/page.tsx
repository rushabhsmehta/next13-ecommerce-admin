import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { OccupancyTypesClient } from "./components/client";

const OccupancyTypesPage = async () => {
  const occupancyTypes = await prismadb.occupancyType.findMany({
    orderBy: {
      rank: 'asc',
    },
  });

  const formattedOccupancyTypes = occupancyTypes.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description || '',
    maxPersons: item.maxPersons,
    rank: item.rank,
    isActive: item.isActive,
    createdAt: format(item.createdAt, 'MMMM d, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <OccupancyTypesClient data={formattedOccupancyTypes} />
      </div>
    </div>
  );
};

export default OccupancyTypesPage;
