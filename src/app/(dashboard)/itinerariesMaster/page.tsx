import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { ItineraryMasterColumn } from "./components/columns"
import { ItinerariesMasterClient } from "./components/client";
import Navbar from "@/components/navbar";

// Helper function to strip HTML tags from a string
const stripHtmlTags = (html: string | null | undefined): string => {
  if (!html) return '';
  return html.replace(/<\/?[^>]+(>|$)/g, '');
};



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
    itineraryMasterTitle: stripHtmlTags(item.itineraryMasterTitle) || '',
    //  itineraryDescription : item.itineraryDescription,    
    locationLabel: item.location.label,
    createdAt: format(item.createdAt, 'MMMM d, yyyy'),
  }));

  return (
    <>
      {/*       <Navbar /> */}
      
        
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
            <ItinerariesMasterClient data={formattedItinerariesMaster} />
          </div>
        </div>
      
    </>
  );
};

export default ItinerariesMasterPage;

