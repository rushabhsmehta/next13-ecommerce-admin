import ViewMyPDF from "@/components/ViewMyPDF";
import prismadb from "@/lib/prismadb";


const ViewPDFPage = async ({
  params
}: {
  params: { PDFPageID: string }
}) => {
  const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
    where: {
      id: params.PDFPageID,
    },
    include: {
      images: true,
      flightDetails: true,
      itineraries: {
        include: {
          itineraryImages: true,
          activities:
          {
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
      }
    }
  });
  // console.log("Fetched tourPackage Query:", tourPackageQuery);

  const locations = await prismadb.location.findMany({
    
  });

  const hotels = await prismadb.hotel.findMany({
    
    include: {
      images: true,
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ViewMyPDF
          data={tourPackageQuery}
          locations={locations}
          hotels={hotels}
        />
      </div>
    </div>
  )
}
export default ViewPDFPage;
