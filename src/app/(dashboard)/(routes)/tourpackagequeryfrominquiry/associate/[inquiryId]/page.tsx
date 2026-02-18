import prismadb from "@/lib/prismadb";
import { TourPackageQueryForm } from "./components/tourPackageQuery-form";

const TourPackageQueryPage = async ({
  params
}: {
  params: { inquiryId: string }
}) => {
  const inquiry = await prismadb.inquiry.findUnique({
    where: {
      id: params.inquiryId
    },
    include: {
      associatePartner: true,
      roomAllocations: {
        include: {
          roomType: true,
          occupancyType: true,
          mealPlan: true
        }
      },
      transportDetails: {
        include: {
          vehicleType: true
        }
      }
    }
  });

  const locations = await prismadb.location.findMany();
  const hotels = await prismadb.hotel.findMany({
    include: {
      images: true // Include the images relation
    }
  });
  const activitiesMaster = await prismadb.activityMaster.findMany({
    include: {
      activityMasterImages: true
    }
  });
  const itinerariesMaster = await prismadb.itineraryMaster.findMany({
    include: {
      itineraryMasterImages: true,
      activities: {
        include: {
          activityImages: true
        }
      }
    }
  });
  const associatePartners = await prismadb.associatePartner.findMany();

  const tourPackages = await prismadb.tourPackage.findMany({
    where: {
      isArchived: false,
    },
    include: {
      images: true,
      flightDetails: true,
      itineraries: {
        include: {
          itineraryImages: true,
          activities: {
            include: {
              activityImages: true
            }
          }
        },
        orderBy: { dayNumber: 'asc' }
      },
      packageVariants: {
        include: {
          variantHotelMappings: {
            include: {
              hotel: {
                include: {
                  images: true,
                }
              },
              itinerary: true,
            }
          },
          tourPackagePricings: {
            include: {
              mealPlan: true,
              vehicleType: true,
              locationSeasonalPeriod: true,
              pricingComponents: {
                include: {
                  pricingAttribute: true,
                }
              },
            }
          },
        }
      },
    }
  });



  return (
    <div className="flex-col w-full max-w-full overflow-hidden">
      <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 w-full max-w-full overflow-hidden">
        <TourPackageQueryForm
          inquiry={inquiry}
          locations={locations}
          hotels={hotels}
          activitiesMaster={activitiesMaster}
          itinerariesMaster={itinerariesMaster}
          associatePartners={associatePartners}
          tourPackages={tourPackages}
        />
      </div>
    </div>
  );
}

export default TourPackageQueryPage;
