import prismadb from "@/lib/prismadb";

import { ActivityForm } from "./components/activity-form";

const ActivityPage = async ({ params }: { params: { activityId: string } }) => {
  const activity = await prismadb.activity.findUnique({
    where: {
      id: params.activityId
    },
    include: {
      activityImages: true,      
    },    
  });

  const locations = await prismadb.location.findMany({
   
  });

  const itineraries = await prismadb.itinerary.findMany({
   
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ActivityForm locations ={locations } itineraries = { itineraries } initialData={activity} />
      </div>
    </div>
  );
}

export default ActivityPage;
