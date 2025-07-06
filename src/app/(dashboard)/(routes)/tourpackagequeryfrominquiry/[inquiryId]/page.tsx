import prismadb from "@/lib/prismadb";
import { TourPackageQueryForm } from "./components/tourpackagequery-form";

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
      associatePartner: true
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
      }
    }
  });

  // Fetch tour package queries
  const tourPackageQueries = await prismadb.tourPackageQuery.findMany({
    where: {
      isArchived: false,
      createdAt: {
        gt: new Date('2024-12-31')
      }
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
      }
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6">
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
