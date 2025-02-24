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

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackageQueryForm initialData={null} inquiry={inquiry} />
      </div>
    </div>
  );
}

export default TourPackageQueryPage;
