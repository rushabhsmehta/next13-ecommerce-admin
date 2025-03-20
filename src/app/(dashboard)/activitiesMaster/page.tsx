import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { ActivityMasterColumn } from "./components/columns";
import { ActivitiesMasterClient } from "./components/client";
import { ActivityMaster } from "@prisma/client"; // Add this import

const ActivitiesMasterPage = async ({
  
}) => {
  const activitiesMaster = await prismadb.activityMaster.findMany({
    include: {
      location: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedActivitiesMaster: ActivityMasterColumn[] = activitiesMaster.map((item: ActivityMaster & { location: { label: string } }) => ({
    id: item.id,
    //assign item.activityTitle to activityTitle or null
    activityMasterTitle: item.activityMasterTitle ?? null,
    locationLabel: item.location.label,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <>{/*       <Navbar /> */}
      
        
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <ActivitiesMasterClient data={formattedActivitiesMaster} />
        </div>
      </div>
      
    </>
  );
};

export default ActivitiesMasterPage;

