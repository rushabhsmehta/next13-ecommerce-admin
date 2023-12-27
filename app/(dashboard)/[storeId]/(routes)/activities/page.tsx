import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { ActivityColumn } from "./components/columns"
import { ActivitiesClient } from "./components/client";

const ActivitiesPage = async ({
  params
}: {
  params: { storeId: string }
}) => {
  const activities = await prismadb.activity.findMany({
    where: {
      storeId: params.storeId
    },
    include: {
      location : true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedActivities: ActivityColumn[] = activities.map((item) => ({
    id: item.id,
    activityTitle : item.activityTitle,
    locationLabel: item.location.label,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ActivitiesClient data={formattedActivities} />
      </div>
    </div>
  );
};

export default ActivitiesPage;
