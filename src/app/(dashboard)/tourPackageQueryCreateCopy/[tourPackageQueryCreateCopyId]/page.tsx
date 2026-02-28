import prismadb from "@/lib/prismadb";
import Navbar from "@/components/navbar";
import { TourPackageQueryCreateCopyForm } from "./components/tourPackageQueryCreateCopy-form";

const tourPackageQueryPage = async (
  props: {
    params: Promise<{ tourPackageQueryCreateCopyId: string }>
  }
) => {
  const params = await props.params;
  const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
    where: {
      id: params.tourPackageQueryCreateCopyId,
    },    include: {
      images: true,      
      flightDetails: {
        include: {
          images: true,
        }
      },
      itineraries: {
        include: {
          itineraryImages: true,
          roomAllocations: {
            include: {
              roomType: true,
              occupancyType: true,
              mealPlan  : true,
            }
          },
          transportDetails: {
            include: {
              vehicleType: true,
            }
          },
          activities: {
            include: {
              activityImages: true,
            }
          }
        },
        orderBy: {
          dayNumber: 'asc' // or 'desc', depending on the desired order
        }
      },
    }
  });
  // console.log("Fetched tourPackage Query:", tourPackageQuery);

  const associatePartners = await prismadb.associatePartner.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });
  const locations = await prismadb.location.findMany({
  });

  const hotels = await prismadb.hotel.findMany({
    include: {
      images: true // Ensure images are included in the query result
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
      locationId: tourPackageQuery?.locationId ?? '',
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
        }
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

  // Fetch tour package queries for templates
  const tourPackageQueries = await prismadb.tourPackageQuery.findMany({
    where: {
      isArchived: false,
      createdAt: {
        gt: new Date('2024-12-31')
      }
    },
    orderBy: {
      createdAt: 'desc'
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
        }
      }
    }
  });

  return (
    <>{/*       <Navbar /> */}      <div className="flex-col">
        <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
          <TourPackageQueryCreateCopyForm
            initialData={tourPackageQuery}
            locations={locations}
            hotels={hotels}
            activitiesMaster={activitiesMaster}
            itinerariesMaster={itinerariesMaster}
            associatePartners={associatePartners}
            tourPackages={tourPackages}
            tourPackageQueries={tourPackageQueries}
          />
        </div>

        {/*  <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
      <TourPackageQueryDisplay
        data={tourPackageQuery}
        locations={locations}
        hotels={hotels}
      //    itineraries={[]}
      />
    </div> */}
      </div>

    </>
  );
}
export default tourPackageQueryPage;
