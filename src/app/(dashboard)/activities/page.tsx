import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { ActivityColumn } from "./components/columns"
import { ActivitiesClient } from "./components/client";
import Navbar from "@/components/navbar";
import { Activity } from "@prisma/client"; // Add this import

const ActivitiesPage = async ({
  
}) => {
  const activities = await prismadb.activity.findMany({

    include: {
      location: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedActivities: ActivityColumn[] = activities.map((item: Activity & { location: { label: string } }) => ({
    id: item.id,
    //assign item.activityTitle to activityTitle or null
    activityTitle: item.activityTitle ?? null,
    locationLabel: item.location.label,
    createdAt: format(item.createdAt, 'MMMM d, yyyy'),
  }));

  return (
    <>
      {/*       <Navbar /> */}
      
        
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
            <ActivitiesClient data={formattedActivities} />
          </div>
        </div>
      
    </>
  );
};

export default ActivitiesPage;

