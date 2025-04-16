import ViewMyPDF from "@/components/ViewMyPDF";
import prismadb from "@/lib/prismadb";


const ViewPDFPage = async ({
  params
}: {
  params: { PDFPageID: string }
}) => {
  // Use transaction to batch all database queries into a single connection
  const { tourPackageQuery, locations, hotels } = await prismadb.$transaction(async (tx) => {
    const tourPackageQuery = await tx.tourPackageQuery.findUnique({
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
    
    const locations = await tx.location.findMany({});
    
    const hotels = await tx.hotel.findMany({
      include: {
        images: true,
      }
    });
    
    return { tourPackageQuery, locations, hotels };
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
