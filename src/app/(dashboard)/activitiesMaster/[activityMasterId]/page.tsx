import prismadb from "@/lib/prismadb";

import { ActivityMasterForm } from "./components/activityMaster-form";


const ActivityMasterPage = async (
  props: {
    params: Promise<{ activityMasterId: string }>
  }
) => {
  const params = await props.params;
  const activityMaster = await prismadb.activityMaster.findUnique({
    where: {
      id: params.activityMasterId
    },
    include: {
      activityMasterImages: true,
    },
  });

  const locations = await prismadb.location.findMany({

  });

  const itineraries = await prismadb.itinerary.findMany({

  });

  return (
    <>
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <ActivityMasterForm locations={locations} itineraries={itineraries} initialData={activityMaster} />
        </div>
      </div>
    </>
  );
}

export default ActivityMasterPage;
