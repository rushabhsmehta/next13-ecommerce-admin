import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { ItineraryMasterColumn } from "./components/columns"
import { ItinerariesMasterClient } from "./components/client";
import Navbar from "@/components/navbar";



const ItinerariesMasterPage = async ({

}) => {
  const itinerariesMaster = await prismadb.itineraryMaster.findMany({

    include: {
      location: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedItinerariesMaster: ItineraryMasterColumn[] = itinerariesMaster.map((item) => ({
    id: item.id,
    itineraryMasterTitle: item.itineraryMasterTitle || '',
    //  itineraryDescription : item.itineraryDescription,    
    locationLabel: item.location.label,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <>
      {/*       <Navbar /> */}
      
        
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <ItinerariesMasterClient data={formattedItinerariesMaster} />
          </div>
        </div>
      
    </>
  );
};

export default ItinerariesMasterPage;
