import prismadb from "@/lib/prismadb";
import { TourPackageQueryForm } from "./components/tourpackagequery-form";

const TourPackageQueryPage = async ({
  params
}: {
  params: { inquiryId: string }
}) => {
  // Use transaction to batch all database queries into a single connection
  const {
    inquiry,
    locations,
    hotels,
    activitiesMaster,
    itinerariesMaster,
    associatePartners
  } = await prismadb.$transaction(async (tx) => {
    const inquiry = await tx.inquiry.findUnique({
      where: {
        id: params.inquiryId
      },
      include: {
        associatePartner: true
      }
    });

    const locations = await tx.location.findMany();
    const hotels = await tx.hotel.findMany();
    const activitiesMaster = await tx.activityMaster.findMany({
      include: {
        activityMasterImages: true
      }
    });
    const itinerariesMaster = await tx.itineraryMaster.findMany({
      include: {
        itineraryMasterImages: true,
        activities: {
          include: {
            activityImages: true
          }
        }
      }
    });
    const associatePartners = await tx.associatePartner.findMany();
    
    return {
      inquiry,
      locations,
      hotels,
      activitiesMaster,
      itinerariesMaster,
      associatePartners
    };  });

  // Use a second transaction for the heavy tour package queries - splitting into two transactions
  // to avoid timeouts while still minimizing connection usage
  const { tourPackages, tourPackageQueries } = await prismadb.$transaction(async (tx) => {
    const tourPackages = await tx.tourPackage.findMany({
      where: {
        isArchived: false
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
  
    // Fetch tour package queries
    const tourPackageQueries = await tx.tourPackageQuery.findMany({
      where: {
        isArchived: false
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

    return { tourPackages, tourPackageQueries };
  }, {
    // Set a longer timeout for this transaction since it's querying large datasets
    timeout: 10000 // 10 seconds
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackageQueryForm
          inquiry={inquiry}
          locations={locations}
          hotels={hotels}
          activitiesMaster={activitiesMaster}
          itinerariesMaster={itinerariesMaster}
          associatePartners={associatePartners}
          tourPackages={tourPackages}
          tourPackageQueries={tourPackageQueries}
        />
      </div>
    </div>
  );
}

export default TourPackageQueryPage;
