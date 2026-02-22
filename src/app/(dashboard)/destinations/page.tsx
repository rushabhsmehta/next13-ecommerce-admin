import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { DestinationColumn } from "./components/columns";
import { DestinationsClient } from "./components/client";

const DestinationsPage = async (
  props: {
    searchParams: Promise<{ locationId?: string }>;
  }
) => {
  const searchParams = await props.searchParams;
  const whereClause = searchParams?.locationId
    ? { locationId: searchParams.locationId }
    : {};

  const destinations = await prismadb.tourDestination.findMany({
    where: whereClause,
    include: {
      location: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const selectedLocation = searchParams?.locationId
    ? await prismadb.location.findUnique({
      where: { id: searchParams.locationId },
    })
    : null;

  const formattedDestinations: DestinationColumn[] = destinations.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description || "",
    location: item.location.label,
    locationId: item.locationId,
    isActive: item.isActive,
    createdAt: format(item.createdAt, "MMMM do, yyyy"),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <DestinationsClient
          data={formattedDestinations}
          selectedLocation={selectedLocation}
        />
      </div>
    </div>
  );
};

export default DestinationsPage;
