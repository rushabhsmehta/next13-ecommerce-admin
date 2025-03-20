import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { LocationColumn } from "./components/columns"
import { LocationClient } from "./components/client";
import Navbar from "@/components/navbar";



const LocationsPage = async ({

}) => {
  const locations = await prismadb.location.findMany({

    orderBy: {
      createdAt: 'desc'
    }
  });
  

  const formattedLocations: LocationColumn[] = locations.map((item) => ({
    id: item.id,
    label: item.label,
    slug : item.slug ?? '',
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <>
      {/*       <Navbar /> */}
      
        
        <div className="flex flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <LocationClient data={formattedLocations} />
          </div>
        </div>
      
    </>
  );
};

export default LocationsPage;

