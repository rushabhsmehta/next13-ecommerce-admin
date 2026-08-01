import { format } from "date-fns";

import prismadb from "@/lib/prismadb";
import { TourPackageQueryClient } from "./components/client";
import { TourPackageQueryColumn } from "./components/columns";
import { resolveQueryQuoteTotal } from "@/lib/resolve-query-quote-total";

const tourPackageQueryPage = async ({

}) => {
  const tourPackageQuery = await prismadb.tourPackageQuery.findMany({

    include: {
      images: true,
      location: true,
      flightDetails: true,
      itineraries: {

        include: {
          itineraryImages: true,
          activities:
          {
            include:
            {
              activityImages: true,
            }
          }
        },
        orderBy: {
          days: 'asc' // or 'desc', depending on the desired order
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  const formattedtourPackageQuery: TourPackageQueryColumn[] = tourPackageQuery.map((item) => {
    const quote = resolveQueryQuoteTotal({
      confirmedVariantId: item.confirmedVariantId,
      variantPricingData: item.variantPricingData,
    });
    return {
      id: item.id,
      tourPackageQueryName: item.tourPackageQueryName ?? '',
      tourPackageQueryType: item.tourPackageQueryType ?? '',
      isFeatured: item.isFeatured,
      isArchived: item.isArchived,
      price: quote.totalDisplay ?? '',
      location: item.location.label,
      createdAt: format(item.createdAt, 'MMMM d, yyyy'),
    };
  });

  return (
    <>
      {/*       <Navbar /> */}
      
        
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
            <TourPackageQueryClient data={formattedtourPackageQuery} />
          </div>
        </div>
      
    </>
  );
};

export default tourPackageQueryPage;

