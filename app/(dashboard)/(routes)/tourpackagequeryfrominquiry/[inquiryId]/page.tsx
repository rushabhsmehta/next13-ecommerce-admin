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
    }
  });

  const locations = await prismadb.location.findMany();
  const hotels = await prismadb.hotel.findMany();
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

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackageQueryForm 
          inquiry={inquiry}
          locations={locations}
          hotels={hotels}
          activitiesMaster={activitiesMaster}
          itinerariesMaster={itinerariesMaster}
        />
      </div>
    </div>
  );
}

export default TourPackageQueryPage;
