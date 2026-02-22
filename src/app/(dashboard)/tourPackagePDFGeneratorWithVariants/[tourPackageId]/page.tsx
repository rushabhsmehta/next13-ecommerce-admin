import prismadb from "@/lib/prismadb";
import TourPackagePDFGeneratorWithVariants from "./components/tourPackagePDFGeneratorWithVariants";

const TourPackagePDFWithVariantsPage = async (
  props: {
    params: Promise<{ tourPackageId: string }>
  }
) => {
  const params = await props.params;
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
          activities: {
            include: {
              activityImages: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          dayNumber: 'asc',
        }
      },
      packageVariants: {
        include: {
          variantHotelMappings: {
            include: {
              itinerary: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        }
      }
    }
  });

  const locations = await prismadb.location.findMany({});

  const hotels = await prismadb.hotel.findMany({
    include: {
      images: true,
      destination: true,
      location: true,
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackagePDFGeneratorWithVariants
          initialData={tourPackage}
          locations={locations}
          hotels={hotels}
        />
      </div>
    </div>
  );
}

export default TourPackagePDFWithVariantsPage;
