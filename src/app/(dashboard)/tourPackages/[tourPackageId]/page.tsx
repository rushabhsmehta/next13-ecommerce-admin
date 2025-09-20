import prismadb from "@/lib/prismadb";

import { TourPackageForm } from "./components/tourPackage-form";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { CalendarRange } from "lucide-react";
import Link from "next/link";
import { isCurrentUserAssociate } from "@/lib/associate-utils";



const tourPackagePage = async ({
  params
}: {
  params: { tourPackageId: string }
}) => {
  const tourPackage = await prismadb.tourPackage.findUnique({
    where: {
      id: params.tourPackageId,
    },
    include: {
      images: true,
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
          dayNumber: 'asc' // or 'desc', depending on the desired order
        }
      }
    }
  }
  );

  // Check if current user is an associate (for read-only mode)
  const isAssociate = await isCurrentUserAssociate();


  // console.log("Fetched tourPackage:", tourPackage);

  const locations = await prismadb.location.findMany({

  });

  const hotels = await prismadb.hotel.findMany({
    include: {
      images: true,
    }
  });

  const activitiesMaster = await prismadb.activityMaster.findMany({

    include: {
      activityMasterImages: true,
    },
  }
  );

  const itinerariesMaster = await prismadb.itineraryMaster.findMany({

    where: {
      locationId: tourPackage?.locationId ?? '',
    },

    include: {
      itineraryMasterImages: true,
      activities: {
        include: {
          activityImages: true,
        }
      },
    }
  });
  return (
    <>{/*       <Navbar /> */}
      
        
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
              <div />
              {!isAssociate && (
                <Link href={`/tourPackages/${params.tourPackageId}/pricing`}>
                  <Button variant="outline" className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4" />
                    Manage Seasonal Pricing
                  </Button>
                </Link>
              )}
            </div>
            <TourPackageForm
              initialData={tourPackage}
              locations={locations}
              hotels={hotels}
              activitiesMaster={activitiesMaster}
              itinerariesMaster={itinerariesMaster}
              readOnly={isAssociate} />
          </div>
        </div>
      
    </>
  );
}

export default tourPackagePage;
