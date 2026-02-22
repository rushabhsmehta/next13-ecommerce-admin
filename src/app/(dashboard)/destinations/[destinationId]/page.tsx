import prismadb from "@/lib/prismadb";

import { DestinationForm } from "./components/destination-form";

const DestinationPage = async (
  props: {
    params: Promise<{ destinationId: string }>;
    searchParams: Promise<{ locationId?: string }>;
  }
) => {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const destination = await prismadb.tourDestination.findUnique({
    where: {
      id: params.destinationId,
    },
    include: {
      location: true,
    },
  });

  const locations = await prismadb.location.findMany({
    orderBy: {
      label: "asc",
    },
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <DestinationForm
          initialData={destination}
          locations={locations}
          defaultLocationId={searchParams.locationId}
        />
      </div>
    </div>
  );
};

export default DestinationPage;
