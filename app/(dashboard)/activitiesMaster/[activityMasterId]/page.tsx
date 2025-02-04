import prismadb from "@/lib/prismadb";

import { ActivityMasterForm } from "./components/activityMaster-form";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

const ActivityMasterPage = async ({
  params
}: {
  params: { activityMasterId: string }
}) => {
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
      <SidebarProvider>
        <AppSidebar />
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <ActivityMasterForm locations={locations} itineraries={itineraries} initialData={activityMaster} />
          </div>
        </div>
      </SidebarProvider></>
  );
}

export default ActivityMasterPage;
