import prismadb from "@/lib/prismadb";
import { InquiryForm } from "./components/inquiry-form";

const InquiryPage = async ({
  params
}: {
  params: { inquiryId: string }
}) => {
  const inquiry = await prismadb.inquiry.findUnique({
    where: {
      id: params.inquiryId
    },
    include: {
      location: true,
      associatePartner: true,
      actions: {
        orderBy: {
          actionDate: 'desc'
        }
      }
    }
  });

  const locations = await prismadb.location.findMany();
  const associates = await prismadb.associatePartner.findMany();

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <InquiryForm 
          initialData={inquiry}
          locations={locations}
          associates={associates}
          actions={inquiry?.actions || []}
        />
      </div>
    </div>
  )
}

export default InquiryPage;
