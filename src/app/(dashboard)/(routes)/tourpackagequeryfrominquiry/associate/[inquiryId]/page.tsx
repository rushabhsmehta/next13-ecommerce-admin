import prismadb from "@/lib/prismadb";
import { TourPackageQueryFromInquiryAssociateForm } from "./components/tourpackagequery-associate-form";

const TourPackageQueryFromInquiryAssociatePage = async ({
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
  const tourPackages = await prismadb.tourPackage.findMany({
    where: {
      isArchived: false,
      locationId: inquiry?.locationId
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
  
  // Fetch associate partners for dropdown
  const associatePartners = await prismadb.associatePartner.findMany();
  
  // Fetch tour package queries for dropdown
  const tourPackageQueries = await prismadb.tourPackageQuery.findMany({
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

  // Fetch hotels for dropdown
  const hotels = await prismadb.hotel.findMany({
    include: {
      images: true
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackageQueryFromInquiryAssociateForm
          inquiry={inquiry}
          locations={locations}
          tourPackages={tourPackages}
          associatePartners={associatePartners}
          tourPackageQueries={tourPackageQueries}
          hotels={hotels}
        />
      </div>
    </div>
  );
}

export default TourPackageQueryFromInquiryAssociatePage;
