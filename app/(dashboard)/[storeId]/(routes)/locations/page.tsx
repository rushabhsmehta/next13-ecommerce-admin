import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { LocationColumn } from "./components/columns"
import { LocationClient } from "./components/client";

const LocationsPage = async ({
  params
}: {
  params: { storeId: string }
}) => {
  const locations = await prismadb.location.findMany({
    where: {
      storeId: params.storeId
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedLocations : LocationColumn[] = locations.map((item) => ({
    id: item.id,
    label: item.label,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <LocationClient data={formattedLocations} />
      </div>
    </div>
  );
};

export default LocationsPage;
