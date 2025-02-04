import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { ActivityColumn } from "./components/columns"
import { ActivitiesClient } from "./components/client";
import Navbar from "@/components/navbar";



const ActivitiesPage = async ({

}: {
  }) => {
  const activities = await prismadb.activity.findMany({

    include: {
      location: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedActivities: ActivityColumn[] = activities.map((item) => ({
    id: item.id,
    //assign item.activityTitle to activityTitle or null
    activityTitle: item.activityTitle ?? null,
    locationLabel: item.location.label,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <>
      {/*       <Navbar /> */}
      
        
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <ActivitiesClient data={formattedActivities} />
          </div>
        </div>
      
    </>
  );
};

export default ActivitiesPage;
