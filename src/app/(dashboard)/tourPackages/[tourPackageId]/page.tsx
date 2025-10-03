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
  // Clean up any orphaned variantHotelMappings before fetching
  // This prevents Prisma errors when fetching with includes
  try {
    // Find all itinerary IDs for this tour package
    const validItineraries = await prismadb.itinerary.findMany({
      where: { tourPackageId: params.tourPackageId },
      select: { id: true }
    });
    const validItineraryIds = validItineraries.map(i => i.id);

    // Delete orphaned mappings (mappings pointing to non-existent itineraries)
    if (validItineraryIds.length > 0) {
      const deleteResult = await prismadb.variantHotelMapping.deleteMany({
        where: {
          packageVariant: {
            tourPackageId: params.tourPackageId
          },
          NOT: {
            itineraryId: {
              in: validItineraryIds
            }
          }
        }
      });
      
      if (deleteResult.count > 0) {
        console.log(`[CLEANUP] Deleted ${deleteResult.count} orphaned hotel mappings for tour package ${params.tourPackageId}`);
      }
    }
  } catch (cleanupError) {
    console.error('[CLEANUP ERROR] Failed to clean orphaned mappings:', cleanupError);
    // Continue anyway - we'll try to fetch the data
  }

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
      },
      packageVariants: {
        include: {
          variantHotelMappings: {
            include: {
              hotel: {
                include: {
                  images: true
                }
              },
              itinerary: true
            }
          }
        },
        orderBy: { sortOrder: 'asc' }
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
